import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { perf, site } from './src/data/site.ts';
import remarkPostImages from './src/lib/remark-post-images.mjs';

/**
 * 构建与托管的解耦点是 dist/ —— 它是标准静态产物。
 * 所以今天发 GitHub Pages、明天发 Cloudflare Pages、后天 rsync 到国内 COS，
 * 只需要换 deploy 步骤，不改一行业务代码。
 */
export default defineConfig({
  site: site.origin,
  base: site.base,

  // 目录格式 + 结尾斜杠：/review/2026-11-17/ 直接命中 /review/2026-11-17/index.html
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  integrations: [
    sitemap({
      // 404 页不进 sitemap
      filter: (page) => !page.includes('/404'),
    }),
  ],

  markdown: {
    remarkPlugins: [
      [
        remarkPostImages,
        {
          threshold: {
            firstImageFailKB: perf.firstImage.failKB,
            bodyImageWarnKB: perf.bodyImage.warnKB,
            imagesWarn: perf.imagesPerPost.warn,
            imagesFail: perf.imagesPerPost.fail,
          },
        },
      ],
    ],
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
