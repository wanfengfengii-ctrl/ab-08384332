/**
 * 间距文本解析与统一整数缩放。
 *
 * 业务约定：间距为非负、最多三位小数的十进制数。所有计算统一乘以
 * SCALE（1000）转换为整数，避免浮点误差；重复间距的次数（多重集
 * 多重性）在后续多重集结构中原样保留。
 */

export const SCALE = 1000;
export const MAX_DECIMALS = 3;
export const MIN_MARKERS = 4;
export const MAX_MARKERS = 18;

export interface TokenIssue {
  /** 在拆分后的 token 序列中的下标 */
  index: number;
  token: string;
  reason: string;
}

export interface ParsedDistances {
  /** 已成功缩放的整数值（单位：1/SCALE） */
  values: number[];
  issues: TokenIssue[];
  tokenCount: number;
}

/** 支持空格、换行、中英文逗号、分号、顿号、竖线分隔。 */
export function splitTokens(text: string): string[] {
  return text
    .split(/[\s,;，、；|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export type ScaleResult = { ok: true; value: number } | { ok: false; reason: string };

/**
 * 将单个十进制 token 精确缩放为整数（字符串级运算，无浮点误差）。
 */
export function scaleToken(token: string): ScaleResult {
  if (!/^\d+(\.\d+)?$/.test(token)) {
    return { ok: false, reason: '需为非负数字（整数或小数）' };
  }
  const dot = token.indexOf('.');
  const intPart = dot === -1 ? token : token.slice(0, dot);
  const fracPart = dot === -1 ? '' : token.slice(dot + 1);
  if (fracPart.length > MAX_DECIMALS) {
    return { ok: false, reason: `小数位超过 ${MAX_DECIMALS} 位` };
  }
  const scaled = Number(intPart) * SCALE + Number((fracPart + '000').slice(0, 3));
  if (!Number.isSafeInteger(scaled)) {
    return { ok: false, reason: '数值超出安全整数范围' };
  }
  return { ok: true, value: scaled };
}

export function parseDistanceText(text: string): ParsedDistances {
  const tokens = splitTokens(text);
  const values: number[] = [];
  const issues: TokenIssue[] = [];
  tokens.forEach((token, index) => {
    const r = scaleToken(token);
    if (r.ok) values.push(r.value);
    else issues.push({ index, token, reason: r.reason });
  });
  return { values, issues, tokenCount: tokens.length };
}

/** 将缩放后的整数格式化为最多三位小数的十进制字符串。 */
export function formatScaled(v: number): string {
  const neg = v < 0;
  const a = Math.abs(v);
  const intPart = Math.floor(a / SCALE);
  const frac = String(a % SCALE)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return (neg ? '-' : '') + intPart + (frac ? '.' + frac : '');
}

export interface MarkerCountParse {
  n: number | null;
  error: string | null;
}

export function parseMarkerCount(text: string): MarkerCountParse {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return { n: null, error: '标记数需为正整数' };
  const n = Number(t);
  if (n < MIN_MARKERS || n > MAX_MARKERS) {
    return { n: null, error: `标记数需在 ${MIN_MARKERS}–${MAX_MARKERS} 之间` };
  }
  return { n, error: null };
}
