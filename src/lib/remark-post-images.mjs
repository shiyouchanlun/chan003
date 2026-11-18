/**
 * remark 图片插件 —— 在 Markdown 编译阶段一次性解决图片的全部工程问题：
 *
 * 1. 自动注入 width / height（从 public/ 读真实像素）→ CLS 天然为 0，作者不用管
 * 2. 自动 loading="lazy" + decoding="async"
 * 3. 第一张「带图注」的图 → 不 lazy + fetchpriority="high"（它大概率是 LCP 元素）
 * 4. `![alt](src "图注")` → <figure><img><figcaption>，用 Markdown 原生 title 位当图注，零学习成本
 * 5. 构建期校验：缺 alt → fail；图片不存在 → fail；单篇 >12 张 → fail；>8 张 → warn
 *
 * 为什么优先图判定是「第一张带图注的图」而不是「第一张图」：
 * LCP 元素是页面上最大的图，不是第一张。作者首图放个小 logo 时，
 * 「第一张图 = 高优先级」会让真正的 LCP 图变成 lazy，反而更慢。
 * 这条规则同时是设计出来的激励——想让重要图优先加载，唯一办法是给它写图注。
 */

import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';

const PRIORITY_CLASS = 'post-figure--priority';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 把站内绝对路径映射到磁盘路径，并校验存在性 */
function resolveAsset(src, cwd) {
  if (/^https?:\/\//i.test(src)) return { external: true, file: null, bytes: 0 };
  const clean = src.split('?')[0].split('#')[0];
  const rel = clean.startsWith('/') ? clean.slice(1) : clean;
  const file = path.join(cwd, 'public', rel);
  if (!fs.existsSync(file)) return { external: false, file, bytes: 0, missing: true };
  return { external: false, file, bytes: fs.statSync(file).size };
}

function measure(file) {
  try {
    const { width, height } = imageSize(fs.readFileSync(file));
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

export default function remarkPostImages(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const threshold = options.threshold ?? {
    firstImageFailKB: 150,
    bodyImageWarnKB: 300,
    imagesWarn: 8,
    imagesFail: 12,
  };

  return (tree, file) => {
    const filePath = file?.path ?? file?.history?.[0] ?? '(unknown)';
    const complaints = [];
    const images = [];

    // 收集所有图片节点（不做 unist-util-visit 依赖，手写遍历）
    const walk = (node, parent) => {
      if (node.type === 'image') {
        images.push({ node, parent });
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child, node);
      }
    };
    walk(tree, null);

    if (images.length === 0) return;

    // ── 数量校验 ──
    if (images.length > threshold.imagesFail) {
      complaints.push({
        fatal: true,
        text: `本篇有 ${images.length} 张图，超过上限 ${threshold.imagesFail} 张。缠论图要能看清，堆图反而降低阅读完成率。`,
      });
    } else if (images.length > threshold.imagesWarn) {
      complaints.push({
        fatal: false,
        text: `本篇有 ${images.length} 张图，超过建议值 ${threshold.imagesWarn} 张。`,
      });
    }

    let priorityAssigned = false;

    for (const { node } of images) {
      const src = node.url ?? '';
      const alt = node.alt ?? '';
      const caption = node.title ?? '';
      const asset = resolveAsset(src, cwd);

      if (!alt.trim()) {
        complaints.push({ fatal: true, text: `图片缺少 alt：${src}（为看不到图的人写，不是为搜索引擎写）` });
      }

      if (asset.missing) {
        complaints.push({ fatal: true, text: `图片文件不存在：public/${src.replace(/^\//, '')}` });
      }

      const size = asset.file && !asset.missing ? measure(asset.file) : null;
      const isPriority = Boolean(caption) && !priorityAssigned;
      if (isPriority) priorityAssigned = true;

      // ── 体积校验 ──
      if (asset.bytes > 0) {
        const kb = Math.round(asset.bytes / 1024);
        if (isPriority && kb > threshold.firstImageFailKB) {
          complaints.push({
            fatal: true,
            text: `首图 ${src} 体积 ${kb}KB，超过红线 ${threshold.firstImageFailKB}KB。首图是 LCP 元素，直接决定打开速度。`,
          });
        } else if (!isPriority && kb > threshold.bodyImageWarnKB) {
          complaints.push({
            fatal: false,
            text: `正文图 ${src} 体积 ${kb}KB，超过建议值 ${threshold.bodyImageWarnKB}KB。`,
          });
        }
      }

      // ── 渲染成 figure（段落里只有这一张图时）──
      const attrs = [
        `src="${esc(src)}"`,
        `alt="${esc(alt)}"`,
        size ? `width="${size.width}"` : '',
        size ? `height="${size.height}"` : '',
        isPriority ? 'fetchpriority="high"' : 'loading="lazy"',
        'decoding="async"',
      ]
        .filter(Boolean)
        .join(' ');

      const figureHtml = caption
        ? `<figure class="post-figure${isPriority ? ` ${PRIORITY_CLASS}` : ''}">` +
          `<img ${attrs}>` +
          `<figcaption>${esc(caption)}</figcaption>` +
          `</figure>`
        : `<figure class="post-figure post-figure--bare"><img ${attrs}></figure>`;

      node.__figureHtml = figureHtml;
      node.title = null;
    }

    // 把「段落里只有一个图片」的段落替换成 figure HTML
    const replace = (node) => {
      if (!Array.isArray(node.children)) return;
      for (let i = 0; i < node.children.length; i += 1) {
        const child = node.children[i];
        if (
          child.type === 'paragraph' &&
          child.children?.length === 1 &&
          child.children[0].type === 'image' &&
          child.children[0].__figureHtml
        ) {
          node.children[i] = { type: 'html', value: child.children[0].__figureHtml };
          continue;
        }
        if (child.type === 'image' && child.__figureHtml) {
          node.children[i] = { type: 'html', value: child.__figureHtml };
          continue;
        }
        replace(child);
      }
    };
    replace(tree);

    // ── 汇报 ──
    const fatal = complaints.filter((c) => c.fatal);
    const soft = complaints.filter((c) => !c.fatal);

    if (soft.length > 0) {
      console.warn(`⚠️  ${path.relative(cwd, filePath)}`);
      for (const c of soft) console.warn(`    ${c.text}`);
    }

    if (fatal.length > 0) {
      const message = [
        `图片校验未通过：${path.basename(filePath)}`,
        ...fatal.map((c) => `  - ${c.text}`),
        '  规范见 docs/作者写作规范 或 交付方案第 6 章。',
      ].join('\n');

      if (file?.fail) file.fail(message);
      else throw new Error(message);
    }
  };
}
