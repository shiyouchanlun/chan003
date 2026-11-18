import rss from '@astrojs/rss';

import { site } from '../data/site';
import { getAllPosts, postPath, slugOf, type PostRef } from '../lib/posts';
import { absUrl } from '../lib/url';

/**
 * RSS。只输出最近 30 篇——全量 RSS 会在内容增长后变成几 MB 的文件。
 * link 必须是绝对 URL：阅读器不解析相对路径。
 */
export async function GET() {
  const posts = await getAllPosts();

  const items = posts.slice(0, 30).map((post) => {
    const ref: PostRef = { section: post.data.section, slug: slugOf(post) };

    return {
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: absUrl(postPath(ref)),
      categories: post.data.tags,
    };
  });

  return rss({
    title: site.title,
    description: site.description,
    site: site.origin,
    items,
    customData: '<language>zh-cn</language>',
  });
}
