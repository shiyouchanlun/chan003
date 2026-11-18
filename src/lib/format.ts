/** 日期与文本格式化。日期一律按北京时间显示，不受构建机时区影响。 */

const DATE_FMT = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const TIME_FMT = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 2026-11-17 */
export function formatDate(date: Date): string {
  const parts = DATE_FMT.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 2026-11-17 16:30 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${TIME_FMT.format(date)}`;
}

/** 2026 年 11 月 17 日 */
export function formatDateCN(date: Date): string {
  const [y, m, d] = formatDate(date).split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

/** 中文按字符数估算阅读时长（300 字/分钟，缠论图多留余量） */
export function readingMinutes(body: string): number {
  const chars = body.replace(/\s/g, '').length;
  return Math.max(1, Math.round(chars / 300));
}
