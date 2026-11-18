/**
 * 新建文章脚手架。
 *
 * 用法：
 *   npm run new review "11月19日收盘复盘：缩量整理，中枢未见离开段"
 *   npm run new news   "社融数据超预期，为什么盘面没反应"
 *   npm run new learn  zhongshu-and-beichi "中枢与背驰的关系"
 *
 * 为什么需要它：frontmatter 里两个地方极容易写错，而且报错很难懂——
 * 1. pubDate 不带 +08:00 会被按 UTC 解析，文章时间差 8 小时甚至差一天
 * 2. review/news 的文件名必须是日期，learn 必须是英文/拼音
 * 脚手架把这两件事变成不可能出错。
 */

import fs from 'node:fs';
import path from 'node:path';

const SECTION_NAMES = {
  review: '每日复盘',
  news: '消息解读',
  learn: '缠论知识',
};

const BODY_TEMPLATES = {
  review: `## 一、今日结构

（当天指数与板块的结构描述，含 1–3 张带图注的结构图）

## 二、当前级别判定

- **日线级别**：
- **30 分钟级别**：
- **关键点位**：

## 三、个股结构拆解

（可选小节。写了就必须打「个股案例」标签，且必须写失效条件）

- **级别**：
- **关键位置**：
- **失效条件**：

## 四、明日观察点

只写观察条件，不写操作建议：

1. 
2. 

## 五、消息面一句话

（当天 1–3 条重要消息 + 一句缠论视角的解读）
`,

  news: `## 事件

（一句话说清发生了什么）

## 缠论视角解读

（这段是与新闻搬运的唯一区别。没有这一段，这篇就不该发）

## 不延伸预测

本文不对后市方向做判断。
`,

  learn: `## 读完你将学会

1. 
2. 
3. 

## 一、定义

## 二、图解

## 三、常见错误

**错误一：**

**错误二：**

## 四、自测题

> 

答案：
`,
};

const DEFAULT_TAGS = {
  review: `["大盘复盘", "中枢"]`,
  news: `["消息面", "大盘复盘"]`,
  learn: `["入门", "图解"]`,
};

function beijingNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    year: get('year'),
    month: get('month'),
  };
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const [section, ...rest] = process.argv.slice(2);

if (!section || !SECTION_NAMES[section]) {
  fail(
    `第一个参数必须是栏目：review / news / learn\n` +
      `   例：npm run new review "11月19日收盘复盘：缩量整理"`
  );
}

let slug = '';
let title = '';

if (section === 'learn') {
  // learn 的 slug 不能自动生成（中文转拼音不可靠），必须手填
  if (rest.length < 2) {
    fail(
      `知识类文章需要显式指定 slug（英文/拼音 kebab-case）：\n` +
        `   npm run new learn zhongshu-and-beichi "中枢与背驰的关系"`
    );
  }
  slug = rest[0];
  title = rest.slice(1).join(' ');

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    fail(`slug 只能用小写字母、数字和连字符，收到的是 "${slug}"`);
  }
} else {
  title = rest.join(' ');
}

if (!title) fail('标题不能为空');

const now = beijingNow();
const contentRoot = path.join(process.cwd(), 'content');

/** review / news 按年/月分目录存，URL 里不带年月的层级 */
const dir =
  section === 'learn'
    ? path.join(contentRoot, 'learn')
    : path.join(contentRoot, section, now.year, now.month);

fs.mkdirSync(dir, { recursive: true });

let fileName;
if (section === 'learn') {
  fileName = `${slug}.md`;
} else {
  // 同日第二篇自动加 -02，而不是等构建报错再让人去猜
  fileName = `${now.date}.md`;
  let counter = 2;
  while (fs.existsSync(path.join(dir, fileName))) {
    fileName = `${now.date}-${String(counter).padStart(2, '0')}.md`;
    counter += 1;
  }
}

const frontmatter = `---
title: "${title}"
description: ""
pubDate: ${now.date}T${now.time}:00+08:00
section: ${section}
tags: ${DEFAULT_TAGS[section]}
---
`;

const fullPath = path.join(dir, fileName);

if (fs.existsSync(fullPath)) {
  fail(`文件已存在：${path.relative(process.cwd(), fullPath)}`);
}

fs.writeFileSync(fullPath, `${frontmatter}\n${BODY_TEMPLATES[section]}`, 'utf8');

const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
const publicPath =
  section === 'learn' ? `/learn/${slug}/` : `/${section}/${fileName.replace(/\.md$/, '')}/`;

console.log(`
✓ 已创建 ${rel}

  上线后地址：${publicPath}

  提交前请确认：
  - [ ] description 写了 60–120 字，结论式，不复述首段
  - [ ] tags 从 22 个受控词里选 2–5 个
  - [ ] 每张图都有 alt 和图注（图注写在 Markdown 的 title 位）
  - [ ] 单篇图片 ≤ 8 张，首图 ≤ 100KB
  - [ ] 无「必涨 / 目标价 / 精准买点 / 跟上操作」这类表述
  - [ ] 含个股小节：已打「个股案例」标签，且写了失效条件
`);
