/**
 * 标签受控词表 —— 封闭集合，22 个。作者只能从这里选，写错词构建直接失败。
 *
 * 分两层：
 * - structuralTags：有代码依赖，不可删除、不可改名（删了对应功能会静默失效）
 * - 普通标签：纯分类信号
 *
 * 为什么用封闭词表：自由标签在 200 篇之后必然碎片化，会出现十几个只有 1 篇文章的标签。
 */

export type TagDef = {
  /** 中文标签名，即 frontmatter 里写的值 */
  name: string;
  /** 拼音 slug，用于标签页 URL */
  slug: string;
  /** 分组，仅用于文档与索引排序 */
  group: '结构构件' | '动力学' | '买卖点' | '实战' | '学习';
};

export const tagDefs: readonly TagDef[] = [
  // 结构构件
  { name: '分型', slug: 'fenxing', group: '结构构件' },
  { name: '笔', slug: 'bi', group: '结构构件' },
  { name: '线段', slug: 'xianduan', group: '结构构件' },
  { name: '中枢', slug: 'zhongshu', group: '结构构件' },
  { name: '走势类型', slug: 'zoushi-leixing', group: '结构构件' },
  { name: '级别', slug: 'jibie', group: '结构构件' },

  // 动力学
  { name: '背驰', slug: 'beichi', group: '动力学' },
  { name: '趋势背驰', slug: 'qushi-beichi', group: '动力学' },
  { name: '盘整背驰', slug: 'panzheng-beichi', group: '动力学' },
  { name: '力度', slug: 'lidu', group: '动力学' },

  // 买卖点
  { name: '第一类买点', slug: 'diyilei-maidian', group: '买卖点' },
  { name: '第二类买点', slug: 'dierlei-maidian', group: '买卖点' },
  { name: '第三类买点', slug: 'disanlei-maidian', group: '买卖点' },
  { name: '卖点', slug: 'maidian', group: '买卖点' },

  // 实战
  { name: '大盘复盘', slug: 'dapan-fupan', group: '实战' },
  { name: '板块轮动', slug: 'bankuai-lundong', group: '实战' },
  { name: '个股案例', slug: 'gegu-anli', group: '实战' },
  { name: '交易纪律', slug: 'jiaoyi-jilv', group: '实战' },
  { name: '消息面', slug: 'xiaoximian', group: '实战' },

  // 学习
  { name: '入门', slug: 'rumen', group: '学习' },
  { name: '图解', slug: 'tujie', group: '学习' },
  { name: '常见错误', slug: 'changjian-cuowu', group: '学习' },
] as const;

/** 全部合法标签名，供 zod 的 z.enum 使用 */
export const TAG_NAMES = tagDefs.map((t) => t.name) as [string, ...string[]];

/** 中文标签 → slug */
const tagSlugMap = new Map(tagDefs.map((t) => [t.name, t.slug]));

export function tagSlug(name: string): string | undefined {
  return tagSlugMap.get(name);
}

/**
 * 结构性标签：代码依赖它，不能删、不能改名。
 * 删掉后首页「结构案例」会静默变空，没有任何报错——所以必须由 validate 拦住。
 *
 * 升级触发条件：当它覆盖的文章超过 20 篇（成为重要流量位）时，
 * 应升级为独立 frontmatter 字段 hasStockSection: boolean。
 * 理由是 tag 语义重载在词表整理时必然被误伤，独立字段不会。现在不做。
 */
export const structuralTags = ['个股案例'] as const;

/** 标签页只在某标签下 >= 这个篇数时才生成，避免产生一批"能打开但没内容"的薄页面 */
export const TAG_PAGE_MIN_POSTS = 3;
