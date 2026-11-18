import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { SERIES_SLUGS } from './data/series';
import { TAG_NAMES } from './data/tags';

/**
 * 内容契约 —— frontmatter 的唯一真相。
 *
 * 设计原则：能在这里拦住的问题，绝不留给运行时。
 * 但这里只做「结构性」硬校验；长度、图片体积这类软规范放 validate.ts 出 warning，
 * 因为硬失败会阻断发布，而发布节奏对日更栏目是命脉。
 */

/** 日期字段：YAML 会把带时区的时间戳解析成 Date，也允许显式字符串。 */
const dateField = z.union([z.date(), z.string()]).transform((v) => (typeof v === 'string' ? new Date(v) : v));

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content' }),
  schema: z
    .object({
      title: z.string().trim().min(1, '标题不能为空').max(80, '标题超过 80 字，几乎肯定写错了'),
      description: z.string().trim().min(10, 'description 至少 10 字，它同时用于列表摘要和搜索结果').max(300),
      pubDate: dateField,
      updatedDate: dateField.optional(),

      section: z.enum(['learn', 'review', 'news']),

      /**
       * 注意：这里刻意没有 slug 字段。
       *
       * slug 由文件名推导（见 lib/posts.ts 的 slugOf）。
       * 原因不是省一个字段，而是 YAML 会把 `slug: 2026-11-17` 解析成 Date 对象，
       * 而 Astro 的内容层在 schema 校验之前就用 data.slug 生成内部 id，
       * 于是整个构建在 "id.endsWith is not a function" 处崩溃——报错位置离真因非常远。
       *
       * 文件名 = slug = URL 段，三者本来就要求完全一致。
       * 既然一致，就没有理由让作者再手写一遍。
       */

      tags: z
        .array(z.enum(TAG_NAMES))
        .min(2, '至少要 2 个标签')
        .max(5, '最多 5 个标签，标签多了等于没有标签'),

      cover: z.string().optional(),
      coverAlt: z.string().optional(),

      pinned: z.boolean().default(false),
      series: z.enum(SERIES_SLUGS).optional(),
      seriesOrder: z.number().int().positive().optional(),

      author: z.string().optional(),
      draft: z.boolean().default(false),

      /** 免责声明。不填时按 section 推导：review / news 默认渲染，learn 默认不渲染。 */
      disclaimer: z.boolean().optional(),
      /** 首发于其它平台时填，用于 canonical 归位 */
      canonical: z.string().url().optional(),
      /** 首版无调用方，保留字段但不实现调用方 */
      noindex: z.boolean().default(false),
    })
    .superRefine((data, ctx) => {
      // cover 与 coverAlt 成对出现：没有 alt 的封面图对无障碍和图片 SEO 都是负资产
      if (data.cover && !data.coverAlt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['coverAlt'],
          message: '填了 cover 就必须填 coverAlt（写清这张图画的是什么）',
        });
      }
      if (data.coverAlt && !data.cover) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cover'],
          message: '填了 coverAlt 却没有 cover',
        });
      }

      // series 与 seriesOrder 同生共死
      if (data.series && data.seriesOrder === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['seriesOrder'],
          message: '属于某个系列就必须写 seriesOrder（该系列内的第几篇，从 1 开始）',
        });
      }
      if (data.seriesOrder !== undefined && !data.series) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['series'],
          message: '写了 seriesOrder 却没有 series，不知道属于哪个系列',
        });
      }
    }),
});

export const collections = { posts };
