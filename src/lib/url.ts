import { site } from '../data/site';

/**
 * URL 工具 —— 全站路径与绝对 URL 的唯一出口。
 *
 * 规则（架构冻结契约）：
 * - 页面/资源路径一律走 withBase()
 * - 图片一律走 assetUrl()，禁止在业务代码里直接拼 '/images/...'
 * - canonical / OG / RSS / sitemap 一律走 absUrl()
 * 其它任何地方出现站点域名字面量，都算违规。
 */

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/** 站内路径加基路径前缀。外链、锚点、mailto 原样返回。 */
export function withBase(path: string): string {
  if (!path) return path;
  if (EXTERNAL.test(path) || path.startsWith('#')) return path;

  const base = site.base.endsWith('/') ? site.base : `${site.base}/`;
  const rest = path.startsWith('/') ? path.slice(1) : path;
  return base === '/' ? `/${rest}` : `${base}${rest}`;
}

/** 绝对 URL。canonical、OG、RSS、sitemap 用。 */
export function absUrl(path: string): string {
  if (EXTERNAL.test(path)) return path;
  return new URL(withBase(path), site.origin).href;
}

/**
 * 图片 / 静态资源的 src 出口。
 * 现在返回站内路径；将来图片外迁 COS/CDN 时，只需把 site.assetOrigin 填上，
 * 全站 1300+ 处图片路径一处都不用改。
 */
export function assetUrl(path: string): string {
  if (!path) return path;
  if (EXTERNAL.test(path)) return path;
  if (!site.assetOrigin) return withBase(path);

  const origin = site.assetOrigin.endsWith('/') ? site.assetOrigin : `${site.assetOrigin}/`;
  const rest = path.startsWith('/') ? path.slice(1) : path;
  return new URL(rest, origin).href;
}

/** 绝对版本的资源 URL，用于 og:image（爬虫不解析相对路径） */
export function assetAbsUrl(path: string): string {
  const url = assetUrl(path);
  return EXTERNAL.test(url) ? url : absUrl(url);
}
