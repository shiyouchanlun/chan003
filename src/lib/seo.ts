import { site } from '../data/site';
import { absUrl } from './url';
import type { Post, PostRef } from './posts';

/**
 * SEO 生成器 —— canonical / OG / 结构化数据的唯一来源。
 * 所有绝对 URL 从 absUrl() 出，这里不拼域名。
 */

export function canonicalFor(pathname: string): string {
  return absUrl(pathname);
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: absUrl('/'),
    description: site.description,
    inLanguage: 'zh-CN',
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: absUrl('/'),
  };
}

/**
 * 文章结构化数据。
 * review / news 用 NewsArticle（时效性内容），learn 用 Article（常青教程）。
 */
export function articleJsonLd(post: Post, pathname: string, imageUrl: string) {
  const data = post.data;
  const isTimeSensitive = data.section === 'review' || data.section === 'news';

  return {
    '@context': 'https://schema.org',
    '@type': isTimeSensitive ? 'NewsArticle' : 'Article',
    headline: data.title,
    description: data.description,
    datePublished: data.pubDate.toISOString(),
    dateModified: (data.updatedDate ?? data.pubDate).toISOString(),
    author: { '@type': 'Person', name: data.author ?? site.author },
    publisher: { '@type': 'Organization', name: site.name },
    image: [imageUrl],
    inLanguage: 'zh-CN',
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(pathname) },
    keywords: data.tags.join(','),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  };
}

export function itemListJsonLd(refs: Array<{ post: Post; ref: PostRef }>, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: refs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absUrl(`/${item.ref.section}/${item.ref.slug}/`),
      name: item.post.data.title,
    })),
  };
}
