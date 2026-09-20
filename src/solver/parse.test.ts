import { describe, expect, it } from 'vitest';
import {
  expectedCount,
  formatScaled,
  MAX_N,
  MIN_N,
  parseInput,
  parseToken,
  SCALE,
  splitTokens,
} from './parse';

describe('parseToken：非负、最多三位小数 → 整数缩放', () => {
  it('整数与小数正确缩放', () => {
    expect(parseToken('0')).toBe(0);
    expect(parseToken('12')).toBe(12_000);
    expect(parseToken('0.5')).toBe(500);
    expect(parseToken('.5')).toBe(500);
    expect(parseToken('12.345')).toBe(12_345);
    expect(parseToken('3.140')).toBe(3_140);
  });

  it('拒绝超过三位小数、负数与非数字', () => {
    expect(parseToken('1.2345')).toBeNull();
    expect(parseToken('-1')).toBeNull();
    expect(parseToken('-0.5')).toBeNull();
    expect(parseToken('abc')).toBeNull();
    expect(parseToken('1e3')).toBeNull();
    expect(parseToken('1.')).toBeNull();
    expect(parseToken('')).toBeNull();
  });
});

describe('splitTokens：分隔符', () => {
  it('支持空白、逗号、分号、中文逗号与顿号', () => {
    expect(splitTokens('1 2,3;4，5、6\n7\t8')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });
});

describe('parseInput：整体校验', () => {
  it('合法输入通过并缩放', () => {
    const r = parseInput('4', '1 2.5 0.125 3 4 6');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.n).toBe(4);
      expect(r.scaled).toEqual([1000, 2500, 125, 3000, 4000, 6000]);
    }
  });

  it('间距数量必须恰好为 n(n−1)/2', () => {
    const r = parseInput('4', '1 2 3');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('')).toContain(String(expectedCount(4)));
  });

  it('n 越界被拒绝', () => {
    expect(parseInput(String(MIN_N - 1), '1').ok).toBe(false);
    expect(parseInput(String(MAX_N + 1), '1').ok).toBe(false);
    expect(parseInput('4.5', '1').ok).toBe(false);
  });

  it('非法 token 被点名', () => {
    const r = parseInput('4', '1 2 3 4 5 6.1234');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('')).toContain('6.1234');
  });

  it('expectedCount 边界', () => {
    expect(expectedCount(4)).toBe(6);
    expect(expectedCount(18)).toBe(153);
  });
});

describe('formatScaled：格式化还原', () => {
  it('整数与小数', () => {
    expect(formatScaled(0)).toBe('0');
    expect(formatScaled(SCALE)).toBe('1');
    expect(formatScaled(1250)).toBe('1.25');
    expect(formatScaled(5)).toBe('0.005');
    expect(formatScaled(12_000)).toBe('12');
    expect(formatScaled(12_345)).toBe('12.345');
  });

  it('与 parseToken 互逆', () => {
    for (const s of ['0', '1', '0.5', '1.25', '0.005', '12.345', '999.999']) {
      expect(formatScaled(parseToken(s)!)).toBe(s);
    }
  });
});
