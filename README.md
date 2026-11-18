# 十优缠论

缠论知识体系 + 每个交易日收盘复盘的内容站。纯静态、零后端、无账号体系。

- 线上地址：https://www.shiyouchanlun.com（根路径，无子路径）
- 技术栈：Astro 5 + Markdown + GitHub Actions + GitHub Pages
- 完整方案：[`docs/交付方案.md`](docs/交付方案.md)（架构、内容模型、风险清单、决策记录）
- 设计稿：[`design/mockup-home.html`](design/mockup-home.html)、[`design/mockup-article.html`](design/mockup-article.html)

> **`CNAME` 文件不要删**。内容是 `www.shiyouchanlun.com`，删掉域名绑定就失效。

---

## 快速开始

```bash
npm install       # 首次
npm run dev       # 本地开发 http://localhost:4321
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
npm run verify    # 类型检查 + 构建 + 链接校验（提交前跑一遍）
```

---

## 写一篇新文章

### 1. 用脚手架创建

```bash
# 每日复盘 / 消息解读：文件名自动用日期，同日第二篇自动加 -02
npm run new review "11月19日收盘复盘：缩量整理，中枢未见离开段"
npm run new news   "社融数据超预期，为什么盘面没反应"

# 缠论知识：必须手填 slug（英文/拼音 kebab-case）
npm run new learn zhongshu-and-beichi "中枢与背驰的关系"
```

脚手架会生成正确的 frontmatter 和固定骨架，并自动处理两个最容易出错的地方：`pubDate` 的时区、栏目对应的文件名格式。

### 2. frontmatter 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | ≤40 字。复盘固定式：`YYYY-MM-DD 收盘复盘：<一句话结构判断>` |
| `description` | ✅ | 60–120 字，**结论式**。同时用于列表摘要和搜索结果，不要复述正文首段 |
| `pubDate` | ✅ | 必须带时区：`2026-11-17T16:38:00+08:00` |
| `section` | ✅ | `learn` / `review` / `news`，必须与所在目录一致 |
| `tags` | ✅ | 2–5 个，**只能从 22 个受控词里选**（`src/data/tags.ts`），写错词构建失败 |
| `updatedDate` | — | 有实质修订时填 |
| `cover` / `coverAlt` | — | 成对出现，缺一个构建失败。不填就用纯文字卡，这是正常状态 |
| `pinned` | — | 首页置顶，全站上限 2 篇 |
| `series` / `seriesOrder` | — | 成对出现。`seriesOrder` 同系列内必须从 1 连续 |
| `draft` | — | `true` 时不进任何列表、RSS、sitemap |

**没有 `slug` 字段**：slug 由文件名推导（`文件名 = slug = URL 段`，三者完全一致）。不是省字段，而是 YAML 会把 `slug: 2026-11-17` 解析成日期对象，导致构建在离真因很远的地方崩溃。

### 3. 图片规范

| 类型 | 尺寸 | 目标 | 红线 | 加载 |
|---|---|---|---|---|
| **首图**（全文第一张带图注的图） | 宽 ≤1200px | ≤100KB | >150KB **构建失败** | 不懒加载，最高优先级 |
| 正文图 | 宽 ≤1600px | ≤150KB | >300KB 告警 | 全部懒加载 |

单篇 ≤8 张（>12 张构建失败）。格式统一 webp。

图注写在 Markdown 的 title 位，宽高由构建自动注入：

```markdown
![沪指日线，30分钟级别中枢扩张](/images/charts/2026/11/20261117-sh-daily.webp "图 1：沪指日线，2026-11-17，30 分钟级别中枢仍在扩张")
```

**「首图」的判定是「全文第一张带图注的图」**——想让最重要的图优先加载，唯一办法是给它写图注。没有图注的图会被当作装饰图懒加载。

### 4. 提交前自查

- [ ] `description` 是结论式，不是复述首段
- [ ] 每张图都有 `alt` 和图注，编号连续
- [ ] 无「必涨 / 目标价 / 精准买点 / 跟上操作 / 带你赚」这类表述
- [ ] 含个股小节：已打「个股案例」标签，且**写了失效条件**（写不出来就删掉这一节）

---

## 目录结构

```
content/                  ← 内容区，写文章只碰这里
├─ learn/                 缠论知识（slug 英文，不带日期）
├─ review/YYYY/MM/        每日复盘（文件名 = 日期）
└─ news/YYYY/MM/          消息解读（文件名 = 日期）

src/
├─ content.config.ts      frontmatter 契约（zod schema）
├─ data/site.ts           站点配置：导航 / CTA 文案 / 性能阈值 / 广告开关
├─ data/tags.ts           22 个受控标签 + 拼音映射
├─ data/series.ts         3 个系列枚举
├─ lib/posts.ts           内容查询（PostRef 类型契约在这里）
├─ lib/url.ts             路径与绝对 URL 的唯一出口
├─ lib/validate.ts        构建期内容校验
├─ lib/seo.ts             canonical / OG / JSON-LD
├─ lib/remark-post-images.mjs  图片宽高注入、figure 化、体积校验
├─ layouts/               3 个布局：Base / Post / List
├─ components/            Header / Footer / PostCard / Toc / CtaWechat / AdSlot …
├─ pages/                 路由
└─ styles/                tokens.css + global.css

public/                   静态资源，原样拷贝到 dist
scripts/
├─ new-post.mjs           新建文章脚手架
├─ check-links.mjs        死链 + 错误路径守卫（CI 必经）
└─ make-assets.mjs        生成 OG 图与二维码占位图
```

---

## 部署

### 必须做的一次性设置

仓库 **Settings → Pages → Source 必须选 `GitHub Actions`**。

如果还停在 "Deploy from a branch"，Actions 部署会静默不生效——你 push 了、CI 绿了，但线上还是旧内容，而且不会有任何报错。

> 根目录那个 `index.html` 是切到 Actions 之前用的过渡页。切换完成后它不会被打包（Actions 只上传 `dist/`），可以删除。

### 日常发布

```bash
git add -A
git commit -m "post: 11月19日复盘"
git push
```

push 后 Actions 自动：安装 → 类型检查 → 构建 → **链接校验** → 部署。任何一步失败，线上保持上一个版本。

> **CDN 缓存约 10 分钟**：push 到生效大约 2 分钟，但读者看到新内容可能再晚几分钟。所以复盘要 18:00 前完成 push，验收口径是「18:00 前提交、18:15 前可见」。实时性交给公众号推送，站点做沉淀。

---

## 三条不可逆的约定

改这些的代价不是改代码，是**所有已分享的链接失效**（静态站没有服务端 301）。

1. **URL 结构**：`/review/2026-11-17/`、`/learn/zhongshu-three-forms/`、`/community/`
2. **`section` 枚举**：只有 `learn` / `review` / `news`。加一个要同时改 schema、路由、导航、归档、RSS
3. **文件名 = slug**：发布后不能改文件名

---

## 常见问题

**构建报 `id.endsWith is not a function`**
frontmatter 里写了 `slug:` 字段，而且值看起来像日期。本项目不接收 `slug` 字段，删掉它即可。

**文章写了但首页没有**
三种可能：`pubDate` 是未来时间（按设计不展示）、`draft: true`、或者 `section` 与所在目录不一致（这时构建会报错）。

**`check-links.mjs` 报死链**
最常见的是链接指向了没生成的页面：标签不足 3 篇时标签页不生成、系列 0 篇时系列页不生成。这类链接必须条件化渲染，参照 `TagList.astro` 与首页的系列卡片。

**群二维码不显示了**
微信码 7 天失效。超过 7 天后构建会**自动隐藏**群码、只留公众号路径。把新码覆盖到 `public/images/wechat/group-qr.png` 再 push 即可恢复（日期从 git 提交时间自动推导，不需要手改任何字段）。

**要接广告了**
改 `src/data/site.ts` 的 `ads.enabled = true` 并填 slot 的 provider。首版所有插槽位置已经在布局里预留好，不需要改页面代码。
