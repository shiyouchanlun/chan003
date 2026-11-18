/**
 * 系列课程枚举 —— 3 个固定值。
 *
 * series 是选填字段，但一旦填了，seriesOrder 必须同填，
 * 且同一系列内的 seriesOrder 必须从 1 开始连续、无重复、无空洞（构建期校验）。
 */

export type SeriesDef = {
  slug: string;
  name: string;
  desc: string;
};

export const seriesDefs: readonly SeriesDef[] = [
  {
    slug: 'chan-basics',
    name: '基础概念',
    desc: '分型、笔、线段、级别——把最小的构件认清楚，后面的判断才有地基。',
  },
  {
    slug: 'chan-practice',
    name: '中枢与买卖点',
    desc: '中枢如何形成与扩张，背驰怎么判定，三类买卖点的结构条件分别是什么。',
  },
  {
    slug: 'chan-reading',
    name: '读图与实战',
    desc: '拿真实走势逐段标注，看同一张图在不同级别下的两种读法，以及最常见的误判。',
  },
] as const;

export const SERIES_SLUGS = seriesDefs.map((s) => s.slug) as [string, ...string[]];

const seriesMap = new Map(seriesDefs.map((s) => [s.slug, s]));

export function getSeries(slug: string): SeriesDef | undefined {
  return seriesMap.get(slug);
}
