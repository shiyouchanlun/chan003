/**
 * 生成 OG 分享图与公众号二维码占位图。
 *
 * 用 SVG → PNG（sharp），因为中文字体在 SVG 里由系统渲染，不需要额外字体文件。
 * 这是一次性脚本，产物提交进仓库；不需要每次构建都跑。
 *
 * 用法：node scripts/make-assets.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'images');

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#101C29"/>
  <rect x="84" y="232" width="7" height="170" fill="#A82C2C"/>
  <text x="116" y="300" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="62" font-weight="700" fill="#FFFFFF">十优缠论</text>
  <text x="120" y="366" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="26" fill="#B3C0CE">缠论结构 · 每日复盘 · 一起看图</text>
  <text x="120" y="416" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="20" fill="#8B9AA9">不荐股 · 不喊单 · 不收费</text>
  <text x="790" y="566" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="19" fill="#8B9AA9">shiyouchanlun.com</text>
</svg>
`;

const qrSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
  <rect width="360" height="360" fill="#FFFFFF"/>
  <rect x="0" y="0" width="360" height="360" fill="none" stroke="#D3CDC3" stroke-width="2" stroke-dasharray="10 8"/>
  <text x="180" y="168" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="22" fill="#656F7B">公众号二维码</text>
  <text x="180" y="204" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="16" fill="#8B9AA9">把官方二维码图替换到此处</text>
  <text x="180" y="232" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="14" fill="#A82C2C">images/wechat/official-qr.png</text>
</svg>
`;

async function main() {
  fs.mkdirSync(path.join(OUT_DIR, 'wechat'), { recursive: true });

  await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, 'og-default.png'));

  const qrPath = path.join(OUT_DIR, 'wechat', 'official-qr.png');
  // 不覆盖已存在的真实二维码
  if (!fs.existsSync(qrPath)) {
    await sharp(Buffer.from(qrSvg)).png({ compressionLevel: 9 }).toFile(qrPath);
  }

  for (const rel of ['og-default.png', 'wechat/official-qr.png']) {
    const stat = fs.statSync(path.join(OUT_DIR, rel));
    console.log(`${rel}  ${Math.round(stat.size / 1024)}KB`);
  }
}

main().catch((error) => {
  console.error('生成失败：', error.message);
  process.exit(1);
});
