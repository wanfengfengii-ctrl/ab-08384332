/**
 * 输入解析与整数缩放。
 * 间距为非负、最多三位小数的十进制数，统一乘以 SCALE=1000 转为整数，
 * 多重集中的重复项按次数保留。
 */

export const SCALE = 1000;
export const MIN_N = 4;
export const MAX_N = 18;
/** 缩放后间距上限（即原始值 1_000_000），防止无意义的超大规模搜索 */
export const MAX_SCALED_DISTANCE = 1_000_000_000;

export function expectedCount(n: number): number {
  return (n * (n - 1)) / 2;
}

/** 非负、最多三位小数：允许 "12"、"12.3"、"12.345"、".5" */
const TOKEN_RE = /^(\d+)(?:\.(\d{1,3}))?$|^\.(\d{1,3})$/;

/** 解析单个间距 token，返回缩放后的整数；非法返回 null */
export function parseToken(token: string): number | null {
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const intPart = m[1] ?? '0';
  const fracPart = m[2] ?? m[3] ?? '';
  const scaled = Number(intPart) * SCALE + Number(fracPart.padEnd(3, '0'));
  if (!Number.isSafeInteger(scaled)) return null;
  return scaled;
}

/** 以空白、逗号（含中文逗号、顿号）、分号、竖线分隔 */
export function splitTokens(text: string): string[] {
  return text
    .split(/[\s,;，、|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export type ParseResult =
  | { ok: true; n: number; scaled: number[]; tokenCount: number }
  | { ok: false; errors: string[]; tokenCount: number };

export function parseInput(nText: string, distancesText: string): ParseResult {
  const errors: string[] = [];
  const n = Number(nText);
  const nValid = Number.isInteger(n) && n >= MIN_N && n <= MAX_N;
  if (!nValid) {
    errors.push(`标记数量须为 ${MIN_N}–${MAX_N} 的整数，当前为「${nText}」。`);
  }

  const tokens = splitTokens(distancesText);
  const scaled: number[] = [];
  const invalid: string[] = [];
  let tooLarge = 0;
  for (const t of tokens) {
    const v = parseToken(t);
    if (v === null) {
      invalid.push(t);
    } else if (v > MAX_SCALED_DISTANCE) {
      tooLarge += 1;
    } else {
      scaled.push(v);
    }
  }
  if (invalid.length > 0) {
    errors.push(
      `存在 ${invalid.length} 个非法间距（须为非负、最多三位小数的十进制数）：` +
        `${invalid.slice(0, 5).join('、')}${invalid.length > 5 ? ' …' : ''}`,
    );
  }
  if (tooLarge > 0) {
    errors.push(`存在 ${tooLarge} 个超出量程的间距（缩放后须 ≤ ${MAX_SCALED_DISTANCE}）。`);
  }
  if (nValid) {
    const need = expectedCount(n);
    if (tokens.length !== need) {
      errors.push(`间距数量须恰好为 n(n−1)/2 = ${need}，当前识别到 ${tokens.length} 个。`);
    }
  }

  if (errors.length > 0) return { ok: false, errors, tokenCount: tokens.length };
  return { ok: true, n, scaled, tokenCount: tokens.length };
}

/** 将缩放后的整数格式化为最多三位小数的十进制字符串 */
export function formatScaled(v: number): string {
  const neg = v < 0;
  const a = Math.abs(v);
  const intPart = Math.floor(a / SCALE);
  const frac = a % SCALE;
  let s = String(intPart);
  if (frac !== 0) {
    s += '.' + String(frac).padStart(3, '0').replace(/0+$/, '');
  }
  return (neg ? '-' : '') + s;
}
