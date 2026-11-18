import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 微信群二维码状态 —— 一个可整体删除的模块。
 *
 * 背景：微信群二维码 7 天就失效。静态站做不到实时检测，但可以做三件事：
 *   1. 页面渲染「二维码更新于 {date}」
 *   2. 超过 7 天 → 构建告警（运营每次发布都看得到）
 *   3. 超过 7 天 → 构建期自动隐藏群码，只留公众号路径
 *
 * 第 3 层是关键：即使运营彻底忘了换码，只要下次正常发布触发构建，死码就自动从页面消失。
 *
 * qrUpdatedAt 不从 frontmatter 手写，而是从 git 提交时间推导。
 * 理由是手写字段会有两种故障：换了图忘改日期（→ 永久误判过期，群码再也不出现）、
 * 改了日期忘换图（→ 警告永不响，一直挂着死码）。后者比全忘更危险。
 * 用 git 推导后，换图与改日期在物理上是同一个动作。
 *
 * 如果将来拿到营业执照、改用企业微信「客户群活码」（永不过期），
 * 删掉这个文件 + community.astro 里引用它的 3 行即可，全站 CTA 不受影响。
 */

const QR_RELATIVE_PATH = 'public/images/wechat/group-qr.png';
const MAX_AGE_DAYS = 7;

export type GroupQrState =
  | { status: 'missing' }
  | { status: 'fresh'; updatedAt: Date; ageDays: number }
  | { status: 'stale'; updatedAt: Date; ageDays: number };

function fromGit(filePath: string): Date | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!out) return null;
    const date = new Date(out);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function getGroupQrState(): GroupQrState {
  const absolute = path.join(process.cwd(), QR_RELATIVE_PATH);

  if (!fs.existsSync(absolute)) return { status: 'missing' };

  // 优先 git 提交时间；浅克隆或非 git 环境回退到文件 mtime
  const updatedAt = fromGit(QR_RELATIVE_PATH) ?? fs.statSync(absolute).mtime;

  const ageDays = Math.floor((Date.now() - updatedAt.getTime()) / 86_400_000);

  if (ageDays > MAX_AGE_DAYS) {
    console.warn(
      `⚠️  群二维码已 ${ageDays} 天未更新（微信码 7 天失效）。` +
        ` 本次构建已自动隐藏群码，只保留公众号入口。换码后重新构建即可恢复。`
    );
    return { status: 'stale', updatedAt, ageDays };
  }

  return { status: 'fresh', updatedAt, ageDays };
}
