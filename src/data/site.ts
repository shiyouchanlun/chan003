/**
 * 站点配置 —— 全站唯一配置源。
 *
 * 约束（来自架构冻结契约）：
 * 1. 导航文案只能在这里出现，Header / Footer 组件内不得写任何导航字符串。
 * 2. CTA 文案只能在这里出现，组件内不得写任何时间字符串（全站禁止承诺具体推送时点）。
 * 3. 性能阈值、广告开关、图片尺寸上限全部集中在这里，不得散落硬编码。
 */

export const site = {
  name: '十优缠论',
  title: '十优缠论 - 缠论知识体系与A股每日复盘',
  description:
    '缠论知识体系、每个交易日收盘复盘与消息解读。用结构、级别与逻辑推演理解市场，不荐股、不喊单、不收费。',

  /** 站点绝对源，不带结尾斜杠。canonical / OG / RSS / sitemap 的唯一来源。 */
  origin: 'https://www.shiyouchanlun.com',

  /**
   * 部署基路径。绑自定义域名后站点服务在根路径，所以是 '/'。
   * 保留这个字段而不是删掉，是为了将来做 Cloudflare Pages 预览环境（挂在子路径）时零改动。
   */
  base: '/',

  /**
   * 图片资源的独立源。将来图片外迁 COS/CDN 时只改这一行，业务代码零改动。
   * 显式标注为 string（而不是让 as const 收窄成 ''），否则那三个使用它的
   * 类型分支会被 TS 判定为 never。
   */
  assetOrigin: '' as string,

  lang: 'zh-CN',
  author: '十优',
  locale: 'zh_CN',

  /** GitHub 仓库地址（页脚与关于页用） */
  repoUrl: 'https://github.com/shiyouchanlun/chan003',
} as const;

/** 一级导航。4 项是 375px 下的硬上限，不允许再加第 5 项。 */
export type NavItem = {
  text: string;
  href: string;
  /** 视觉权重高于其它项。全站唯一的业务目标入口（社群）用这个。 */
  emphasis?: boolean;
};

export const nav: readonly NavItem[] = [
  { text: '缠论知识', href: '/learn/' },
  { text: '每日复盘', href: '/review/' },
  { text: '消息解读', href: '/news/' },
  { text: '社群', href: '/community/', emphasis: true },
] as const;

/** 页脚导航。归档与关于都降级到这里，不占一级位置。 */
export const footerNav: readonly NavItem[] = [
  { text: '关于本站', href: '/community/' },
  { text: '全部归档', href: '/archive/' },
  { text: '免责声明', href: '/community/#disclaimer' },
  { text: '公众号', href: '/community/#wechat' },
] as const;

/**
 * 公众号 —— 全站 CTA 的唯一形态。
 * 微信群二维码 7 天失效，不能作为长期 CTA；群码只在 /community/ 出现一次。
 */
export const wechat = {
  name: '十优缠论',
  /** 公众号二维码。走 assetUrl()，不要直接拼路径。 */
  qrImage: '/images/wechat/official-qr.png',
  qrAlt: '十优缠论公众号二维码',
  /** 后台关键词自动回复的引导词 */
  keywords: {
    group: '入群',
    material: '缠论',
  },
} as const;

/**
 * CTA 文案 —— 定稿版。
 * 硬禁令：任何位置不得出现具体的复盘推送时点（"16:30 推送""18:00 前送达"）。
 * 承诺"每个交易日"是承诺频率的确定性；承诺时点等于每天给自己造一次可被验证的违约。
 */
export const cta = {
  main: {
    title: '关注公众号「十优缠论」',
    body: '每个交易日收盘后，复盘直接推到你手机上——不用再刷网页等。',
  },
  sub: {
    body: '回复「缠论」可领《缠论核心术语速查表（图解版）》。',
  },
  /** 社群页主位文案 */
  community: {
    title: '一个人复盘容易走偏',
    body: '群里每天一起拆结构、对级别。不荐股、不喊单、不收费。',
  },
} as const;

/**
 * 图片与性能阈值。全部为构建期检查，不引入任何运行时逻辑。
 * 体积单位 KB。
 */
export const perf = {
  /** 优先图：正文第一张带图注的 figure。它大概率是 LCP 元素。 */
  firstImage: { maxWidth: 1200, targetKB: 100, failKB: 150 },
  /** 正文图：其余全部，懒加载，不参与 LCP，尺寸可以放宽。 */
  bodyImage: { maxWidth: 1600, targetKB: 150, warnKB: 300 },
  /** 单篇图片数量 */
  imagesPerPost: { warn: 8, fail: 12 },
  /** 全文字节体积（含图），超出只告警不阻断 */
  postTotalWarnMB: 2,
} as const;

/**
 * 广告位。首版 enabled:false —— 组件返回 null，不输出空 div，不写任何运行时代码。
 * 明确禁止：IntersectionObserver、同屏广告数量检测、loader 骨架。
 * minHeight 是给将来开启时用的，现在只作为配置存在，不渲染。
 */
export const ads = {
  enabled: false,
  slots: {
    'home-top': { provider: 'none', minHeight: 100 },
    'list-inline': { provider: 'none', minHeight: 120 },
    'article-head': { provider: 'none', minHeight: 100 },
    'article-foot': { provider: 'none', minHeight: 250 },
    'sidebar': { provider: 'none', minHeight: 600 },
  },
} as const;

export type AdSlotName = keyof typeof ads.slots;

/** 首页右栏「结构案例」的渲染规则：要么不存在，要么正好 3 条，没有中间态。 */
export const structureCases = {
  /** 数据来源：review 栏目下打了这个标签的文章。它是结构性标签，不可从词表删除。 */
  tag: '个股案例',
  /** 少于这个篇数，整栏不渲染 */
  minCount: 3,
  /** 渲染条数，固定 */
  renderCount: 3,
} as const;

/** 栏目元信息。section 枚举只在这里和 content.config.ts 出现两次，必须一致。 */
export const sections = {
  learn: {
    name: '缠论知识',
    path: '/learn/',
    desc: '从分型、笔、线段到中枢与买卖点，按依赖顺序成体系的图解笔记。',
  },
  review: {
    name: '每日复盘',
    path: '/review/',
    desc: '每个交易日收盘后的结构拆解：当前级别、关键点位、明日观察条件。',
  },
  news: {
    name: '消息解读',
    path: '/news/',
    desc: '重要消息的缠论视角解读——不是新闻搬运，只讲它改变了什么结构预期。',
  },
} as const;
