import { getCollection, type CollectionEntry } from 'astro:content';

import { structureCases } from '../data/site';
import { withBase } from './url';

/**
 * 内容查询层 —— 页面只能通过这里拿数据，禁止在页面里直接调 getCollection()。
 *
 * 核心类型契约：PostRef = { section, slug }。
 *
 * 为什么不用裸 slug 做引用键：slug 的唯一性作用域是 (section, slug)，
 * 同一天发复盘和消息解读时两者 slug 都是 '2026-11-17'。
 * 只要有一个地方裸用 slug，就会跳到另一个栏目。
 * 所以让裸 slug 在类型层面无法作为引用使用。
 */

export type Section = 'learn' | 'review' | 'news';

export type PostRef = {
  section: Section;
  slug: string;
};

export type Post = CollectionEntry<'posts'>;

/**
 * slug 由文件名推导，不从 frontmatter 读。
 *
 * 契约是「文件名 = slug = URL 段」，三者本来就完全一致，所以没有必要让作者手写一遍。
 * 更重要的是：YAML 会把 `slug: 2026-11-17` 解析成 Date，而内容层在 schema 校验前
 * 就用它生成内部 id，导致构建在离真因很远的地方崩溃。去掉这个字段，陷阱消失。
 */
export function slugOf(entry: Post): string {
  const segments = entry.id.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? entry.id;
  return last.replace(/\.mdx?$/, '');
}

/* ── 路径构造 ───────────────────────────────────────────── */

/** 站内路径（不带 base），唯一构造点 */
export function postPath(ref: PostRef): string {
  return `/${ref.section}/${ref.slug}/`;
}

/** 可直接放进 href 的路径 */
export function postUrl(ref: PostRef): string {
  return withBase(postPath(ref));
}

export function sectionPath(section: Section): string {
  return `/${section}/`;
}

export function sectionUrl(section: Section): string {
  return withBase(sectionPath(section));
}

export function refOf(entry: Post): PostRef {
  return { section: entry.data.section as Section, slug: slugOf(entry) };
}

/* ── 内部排序 ───────────────────────────────────────────── */

const byDateDesc = (a: Post, b: Post) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

/** 草稿与「未来时间」的文章不进入任何列表、RSS、sitemap */
function visible(post: Post, now: Date): boolean {
  if (post.data.draft) return false;
  return post.data.pubDate.valueOf() <= now.valueOf();
}

/* ── 查询 ───────────────────────────────────────────────── */

/** 全站文章。pinnedFirst 仅首页用，列表页按时间倒序更符合预期。 */
export async function getAllPosts(options: { pinnedFirst?: boolean } = {}): Promise<Post[]> {
  const now = new Date();
  const posts = (await getCollection('posts')).filter((p) => visible(p, now));

  return posts.sort((a, b) => {
    if (options.pinnedFirst) {
      const pin = Number(b.data.pinned) - Number(a.data.pinned);
      if (pin !== 0) return pin;
    }
    return byDateDesc(a, b);
  });
}

export async function getBySection(section: Section): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.data.section === section);
}

export async function getByTag(tagName: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.data.tags.includes(tagName));
}

/** 标签 → 篇数。标签页只在 >= TAG_PAGE_MIN_POSTS 时生成，链接也要按此条件化。 */
export async function getTagCounts(): Promise<Map<string, number>> {
  const posts = await getAllPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

export async function getSeriesPosts(seriesSlug: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts
    .filter((p) => p.data.series === seriesSlug)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

/**
 * 同栏目内的上下篇。跨栏目相邻无语义，所以作用域限定在 section 内。
 * 返回 null 表示到边界。
 */
export async function getAdjacent(
  ref: PostRef
): Promise<{ prev: Post | null; next: Post | null }> {
  const posts = await getBySection(ref.section);
  const index = posts.findIndex((p) => slugOf(p) === ref.slug);
  if (index === -1) return { prev: null, next: null };

  // 列表是时间倒序：前一个元素更新，后一个元素更早
  return {
    prev: index > 0 ? (posts[index - 1] ?? null) : null,
    next: index < posts.length - 1 ? (posts[index + 1] ?? null) : null,
  };
}

/** 相关阅读：同标签重合度最高的 3 篇，构建期算好，运行时零成本 */
export async function getRelated(ref: PostRef, limit = 3): Promise<Post[]> {
  const posts = await getBySection(ref.section);
  const current = posts.find((p) => slugOf(p) === ref.slug);
  if (!current) return [];

  return posts
    .filter((p) => slugOf(p) !== ref.slug)
    .map((p) => ({
      post: p,
      score: p.data.tags.filter((t) => current.data.tags.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post))
    .slice(0, limit)
    .map((x) => x.post);
}

/**
 * 首页右栏「结构案例」。
 * 数据源是 review 栏目里带结构性标签的文章，不走标签页（标签页可能根本没生成）。
 * 规则：要么正好 renderCount 条，要么整栏不渲染——没有中间态。
 */
export async function getStructureCases(): Promise<Post[]> {
  const posts = await getBySection('review');
  const matched = posts.filter((p) => p.data.tags.includes(structureCases.tag));
  if (matched.length < structureCases.minCount) return [];
  return matched.slice(0, structureCases.renderCount);
}

/** 归档：按年月分组，键为 'YYYY-MM' */
export async function getArchive(): Promise<Array<{ key: string; label: string; posts: Post[] }>> {
  const posts = await getAllPosts();
  const groups = new Map<string, Post[]>();

  for (const post of posts) {
    const d = post.data.pubDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(post);
    else groups.set(key, [post]);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({
      key,
      label: `${key.slice(0, 4)} 年 ${Number(key.slice(5))} 月`,
      posts: list,
    }));
}

/** 首页混合流：各栏目最新混合，pinned 优先 */
export async function getHomeFeed(limit = 12): Promise<Post[]> {
  const posts = await getAllPosts({ pinnedFirst: true });
  return posts.slice(0, limit);
}
