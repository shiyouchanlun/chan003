/**
 * 构建产物链接校验 —— CI 必经步骤，失败则不部署。
 *
 * 它同时干三件事，第二件是意外收获但价值最大：
 *
 * 1. 站内死链：所有以 / 开头的 href/src 必须能在 dist/ 里找到对应文件
 * 2. 错误路径守卫：出现旧的 /chan003/ 子路径字面量立即失败
 *    （站点已绑自定义域名，子路径时代的所有地址都失效了，这类残留肉眼很难查）
 * 3. 标签页死链：标签不足 3 篇时不生成页面，LinkList 必须条件化渲染，
 *    这条规则自动兜住「文章页批量指向 /tags/xxx/ 但页面不存在」的情况
 *
 * 外链不校验：网络依赖会让 CI 变得不稳定，而且那不是我们自己的错。
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const DEPRECATED_PREFIX = '/chan003/';

const LINK_RE = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

function walkHtml(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 不检查静态资源目录里的 HTML（目前没有，防御性处理）
      walkHtml(full, acc);
    } else if (entry.name.endsWith('.html')) {
      acc.push(full);
    }
  }
  return acc;
}

const isExternal = (url) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
const isSkippable = (url) =>
  !url ||
  url.startsWith('#') ||
  url.startsWith('mailto:') ||
  url.startsWith('tel:') ||
  url.startsWith('data:') ||
  url.startsWith('javascript:');

/** 把 URL 路径解析到 dist 里的实际文件 */
function resolveTarget(urlPath) {
  const clean = decodeURI(urlPath.split('#')[0].split('?')[0]);
  if (!clean) return null;

  const absolute = path.join(DIST, clean);

  if (fs.existsSync(absolute)) {
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      const index = path.join(absolute, 'index.html');
      return fs.existsSync(index) ? index : null;
    }
    return absolute;
  }

  // /review/2026-11-17/ → dist/review/2026-11-17/index.html
  const asDirIndex = path.join(absolute, 'index.html');
  if (fs.existsSync(asDirIndex)) return asDirIndex;

  return null;
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist/ 不存在，请先运行 npm run build');
    process.exit(1);
  }

  const files = walkHtml(DIST);
  const problems = [];
  const deprecated = [];
  let checked = 0;

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const relFile = path.relative(DIST, file).replace(/\\/g, '/');

    for (const match of html.matchAll(LINK_RE)) {
      const url = match[1].trim();

      if (isSkippable(url) || isExternal(url)) continue;

      // 旧子路径残留
      if (url.startsWith(DEPRECATED_PREFIX) || url === '/chan003') {
        deprecated.push({ file: relFile, url });
        continue;
      }

      // 只校验站内绝对路径；相对路径视为同目录资源，不在此检查范围
      if (!url.startsWith('/')) continue;

      checked += 1;
      if (!resolveTarget(url)) {
        problems.push({ file: relFile, url });
      }
    }
  }

  if (deprecated.length > 0) {
    console.error(`\n❌ 发现旧子路径 /chan003/ 残留 ${deprecated.length} 处：\n`);
    for (const d of deprecated.slice(0, 30)) {
      console.error(`   ${d.file}  →  ${d.url}`);
    }
    console.error(
      '\n   站点已绑定自定义域名，服务在根路径。这些地址上线后全部 404。' +
        '\n   改法：把所有 /chan003/xxx 改成 /xxx。\n'
    );
    process.exit(1);
  }

  if (problems.length > 0) {
    console.error(`\n❌ 站内死链 ${problems.length} 处：\n`);
    for (const p of problems.slice(0, 40)) {
      console.error(`   ${p.file}  →  ${p.url}`);
    }
    if (problems.length > 40) {
      console.error(`   …… 还有 ${problems.length - 40} 处`);
    }
    console.error('\n   常见原因：链接指向了未生成的页面（如不足 3 篇的标签页），或图片未放进 public/。\n');
    process.exit(1);
  }

  console.log(`✓ 链接校验通过：${files.length} 个页面，${checked} 个站内链接，0 死链`);
}

main();
