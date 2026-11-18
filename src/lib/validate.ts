import { getAllPosts, slugOf, type Post } from './posts';
import { TAG_NAMES, structuralTags } from '../data/tags';
import { seriesDefs } from '../data/series';

/**
 * 内容完整性校验 —— 构建期守门人。
 *
 * 为什么必须有它：frontmatter 写错时 Astro 不会报错，文章只是「不出现在首页」。
 * 这类事故不会立刻被发现，通常几周后才有人问「我那篇怎么找不到」。
 * 所以凡是能机器判定的规则，一律在这里变成构建错误。
 *
 * 分级原则：
 * - error：违反会导致功能静默失效或链接失效 → 阻断构建
 * - warn：风格与规范问题 → 只提示，不阻断（日更栏目不能被风格问题卡住发布）
 */

type Problem = { level: 'error' | 'warn'; message: string };

const errors: Problem[] = [];
const warnings: Problem[] = [];

const err = (message: string) => errors.push({ level: 'error', message });
const warn = (message: string) => warnings.push({ level: 'warn', message });

/** 缓存的是 Promise 而不是 boolean：多个页面并行构建时，它们会一起等同一份校验结果 */
let task: Promise<void> | null = null;

export function ensureIntegrity(): Promise<void> {
  task ??= run();
  return task;
}

async function run(): Promise<void> {
  const posts = await getAllPosts();

  checkStructure(posts);
  checkSlugUniqueness(posts);
  checkSeriesOrder(posts);
  checkPinned(posts);
  checkStructuralTags();
  checkSoftRules(posts);

  report();
}

/* ── 结构：目录 / section / slug 三者一致 ───────────────── */

function checkStructure(posts: Post[]) {
  const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const DATED_RE = /^\d{4}-\d{2}-\d{2}(-\d{2})?$/;

  for (const post of posts) {
    const id = post.id; // 形如 review/2026/11/2026-11-17
    const dirSection = id.split('/')[0];
    const slug = slugOf(post);
    const { section } = post.data;

    if (dirSection !== section) {
      err(
        `[目录与 section 不一致] content/${id}.md 放在 ${dirSection}/ 下，但 frontmatter 写的是 section: ${section}。` +
          ` 改法：二选一——把文件移到 content/${section}/ 下，或把 section 改成 ${dirSection}。`
      );
    }

    if (!SLUG_RE.test(slug)) {
      err(
        `[slug 格式非法] ${id}.md 的文件名是 "${slug}"。` +
          ` 只能用小写字母、数字和连字符，不能含中文、空格、下划线或大写。` +
          ` 改法：重命名文件，如 "zhongshu-three-forms.md"。`
      );
    }

    // review / news 的 slug 必须是日期，URL 才能保持「一篇文章 = 一个交易日」的不变性
    if ((section === 'review' || section === 'news') && !DATED_RE.test(slug)) {
      err(
        `[slug 不符合日期规范] ${id}.md 属于 ${section} 栏目，文件名应该是 YYYY-MM-DD（同日第二篇加 -02），` +
          `但现在是 "${slug}"。 改法：重命名为如 "2026-11-17.md"。`
      );
    }

    if (section === 'learn' && DATED_RE.test(slug)) {
      err(
        `[知识类文章不应带日期] ${id}.md 是 learn 栏目，但文件名是日期格式。` +
          ` 知识类内容 URL 要稳定，带日期会让几年前的教程看起来过时。` +
          ` 改法：改成内容相关的拼音或英文，如 "zhongshu-three-forms.md"。`
      );
    }
  }
}

/* ── slug 唯一性：作用域是 (section, slug) ──────────────── */

function checkSlugUniqueness(posts: Post[]) {
  const seen = new Map<string, Post>();

  for (const post of posts) {
    const section = post.data.section;
    const slug = slugOf(post);
    const key = `${section}/${slug}`;

    if (seen.has(key)) {
      const hint =
        section === 'learn'
          ? `改法：把文件名换成一个不重复的词（如 ${slug}-2）。`
          : `改法：同日第二篇请把文件名改成 ${slug}-02。`;

      err(`[slug 重复] ${section}/ 下有两篇文件名都是 "${slug}"，它们的 URL 会完全相同。${hint}`);
    } else {
      seen.set(key, post);
    }
  }
}

/* ── 系列：seriesOrder 从 1 开始连续、无重复 ────────────── */

function checkSeriesOrder(posts: Post[]) {
  for (const series of seriesDefs) {
    const list = posts
      .filter((p) => p.data.series === series.slug)
      .map((p) => ({ slug: slugOf(p), order: p.data.seriesOrder ?? 0 }))
      .sort((a, b) => a.order - b.order);

    if (list.length === 0) {
      warn(
        `[空系列] 系列「${series.name}」(${series.slug}) 一篇文章都没有。` +
          ` 这一般没问题（还没开始写），但如果打算上线就该补内容，否则不要在任何地方链接它。`
      );
      continue;
    }

    const orders = list.map((x) => x.order);
    const expected = Array.from({ length: list.length }, (_, i) => i + 1);
    const ok = orders.every((o, i) => o === expected[i]);

    if (!ok) {
      err(
        `[seriesOrder 不连续] 系列「${series.name}」(${series.slug}) 的顺序号是 [${orders.join(', ')}]，` +
          `但应该从 1 开始连续排列，即 [${expected.join(', ')}]。` +
          ` 当前成员：${list.map((x) => `${x.slug}=${x.order}`).join('、')}。` +
          ` 改法：重新编号，确保没有重复也没有跳号（中间删过文章就要补齐）。`
      );
    }
  }
}

/* ── 置顶数量 ───────────────────────────────────────────── */

const PINNED_MAX = 2;

function checkPinned(posts: Post[]) {
  const pinned = posts.filter((p) => p.data.pinned);
  if (pinned.length > PINNED_MAX) {
    err(
      `[置顶过多] 有 ${pinned.length} 篇设置了 pinned: true，上限是 ${PINNED_MAX} 篇。` +
        ` 置顶超过 2 篇等于没有置顶。当前：${pinned.map((p) => p.data.title).join(' / ')}。`
    );
  }
}

/* ── 结构性标签必须在词表内 ─────────────────────────────── */

function checkStructuralTags() {
  const all = new Set(TAG_NAMES);
  for (const tag of structuralTags) {
    if (!all.has(tag)) {
      err(
        `[结构性标签丢失] 代码依赖的标签「${tag}」不在 22 词表里。` +
          ` 它驱动首页「结构案例」栏，删掉会让那一栏静默变空。` +
          ` 改法：把它加回 src/data/tags.ts。`
      );
    }
  }
}

/* ── 软规范：只警告，不阻断发布 ─────────────────────────── */

function checkSoftRules(posts: Post[]) {
  for (const post of posts) {
    const { title, description, pubDate, tags, section } = post.data;
    const where = `${section}/${slugOf(post)}`;

    if (title.length > 40) {
      warn(`[标题过长] ${where} 标题 ${title.length} 字，规范是 40 字以内。长标题在列表卡和搜索结果里会被截断。`);
    }

    if (description.length > 120) {
      warn(
        `[摘要过长] ${where} description ${description.length} 字，规范是 60–120 字。` +
          ` 它同时用于列表摘要和 meta description，超长会被截断，且截断位置不可控。`
      );
    }

    // 时间落在 00:00:00 且无时区偏移，通常意味着 pubDate 没写 +08:00，构建机按 UTC 解析会早 8 小时
    if (pubDate.getUTCHours() === 16 && pubDate.getUTCMinutes() === 0) {
      warn(
        `[pubDate 疑似未带时区] ${where} 的 pubDate 换算后正好是 UTC 16:00（= 北京时间 0 点），` +
          `很可能是写成了不带时区的日期。规范写法："2026-11-17T16:30:00+08:00"。`
      );
    }

    if (!post.body || post.body.trim().length === 0) {
      err(`[空正文] ${where} 没有任何正文内容。`);
    }

    if (section === 'review' && !tags.includes('大盘复盘')) {
      warn(`[复盘未打标签] ${where} 是 review 栏目但没打「大盘复盘」标签，栏目聚合和用户筛选会漏掉它。`);
    }
  }
}

/* ── 输出 ───────────────────────────────────────────────── */

function report() {
  if (warnings.length > 0) {
    console.warn(`\n⚠️  内容规范提示 ${warnings.length} 条（不阻断构建）：`);
    for (const w of warnings) console.warn(`   - ${w.message}`);
    console.warn('');
  }

  if (errors.length > 0) {
    console.error(`\n❌ 内容校验失败，共 ${errors.length} 个错误：\n`);
    for (const e of errors) console.error(`   - ${e.message}\n`);
    throw new Error(
      `内容校验未通过（${errors.length} 个错误）。上面每一条都写了怎么改，改完重新构建即可。`
    );
  }

  console.log(`✓ 内容校验通过（${warnings.length} 条提示）`);
}
