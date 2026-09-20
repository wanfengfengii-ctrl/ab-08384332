import { describe, expect, it } from 'vitest';
import { buildConsumption, canonicalOf, solveTurnpike } from './turnpike';
import { parseInput } from './parse';

/** 由整数点集生成两两间距多重集 */
function distancesOf(points: number[]): number[] {
  const ds: number[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      ds.push(points[j] - points[i]);
    }
  }
  return ds;
}

describe('canonicalOf：镜像折叠与规范化', () => {
  it('取镜像中字典序最小者', () => {
    expect(canonicalOf([0, 3, 6, 7])).toEqual([0, 1, 4, 7]);
    expect(canonicalOf([0, 1, 4, 7])).toEqual([0, 1, 4, 7]);
    expect(canonicalOf([0, 2, 3, 5])).toEqual([0, 2, 3, 5]);
  });
});

describe('solveTurnpike：裁决', () => {
  it('唯一解（n=4，含重复距离）', () => {
    const r = solveTurnpike(4, [1000, 3000, 3000, 4000, 6000, 7000]);
    expect(r.verdict).toBe('unique');
    expect(r.canonical?.positions).toEqual([0, 1000, 4000, 7000]);
    expect(r.witness).toBeNull();
    expect(r.solutionCount).toBe(1);
    // 消耗记录与输入多重集精确一致（含重复项）
    const consumed = r.consumption!.map((c) => c.distance).sort((a, b) => a - b);
    expect(consumed).toEqual([1000, 3000, 3000, 4000, 6000, 7000]);
  });

  it('镜像输入得到同一规范布局', () => {
    const r = solveTurnpike(4, distancesOf([0, 3000, 6000, 7000]));
    expect(r.verdict).toBe('unique');
    expect(r.canonical?.positions).toEqual([0, 1000, 4000, 7000]);
  });

  it('多解：同距（homometric）六标记，给出规范最小布局与歧义见证', () => {
    const r = solveTurnpike(6, distancesOf([0, 1, 4, 10, 12, 17]));
    expect(r.verdict).toBe('multiple');
    expect(r.solutionCount).toBeGreaterThanOrEqual(2);
    expect(r.canonical?.positions).toEqual([0, 1, 4, 10, 12, 17]);
    expect(r.witness?.positions).toEqual([0, 1, 8, 11, 13, 17]);
    // 两份布局消耗的多重集完全相同
    const a = r.consumption!.map((c) => c.distance);
    const b = r.witnessConsumption!.map((c) => c.distance);
    expect(a).toEqual(b);
    expect(a).toHaveLength(15);
  });

  it('无解', () => {
    const r = solveTurnpike(4, [1, 2, 3, 4, 5, 9]);
    expect(r.verdict).toBe('none');
    expect(r.canonical).toBeNull();
    expect(r.witness).toBeNull();
    expect(r.consumption).toBeNull();
  });

  it('含零距离 → 无解（位置互异）', () => {
    const r = solveTurnpike(4, [0, 1, 2, 3, 4, 6]);
    expect(r.verdict).toBe('none');
  });

  it('三位小数：统一缩放后求解', () => {
    const parsed = parseInput('4', '0.5 0.75 1.25 1.5 2.25 2.75');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const r = solveTurnpike(parsed.n, parsed.scaled);
    expect(r.verdict).toBe('unique');
    expect(r.canonical?.positions).toEqual([0, 500, 1250, 2750]);
  });

  it('重复距离保留次数（多重集语义）', () => {
    // {0,2,3,5} → 距离 1,2,2,3,3,5
    const r = solveTurnpike(4, distancesOf([0, 2, 3, 5]));
    expect(r.verdict).toBe('unique');
    expect(r.canonical?.positions).toEqual([0, 2, 3, 5]);
    const consumed = r.consumption!.map((c) => c.distance).sort((a, b) => a - b);
    expect(consumed).toEqual([1, 2, 2, 3, 3, 5]);
  });

  it('n=8 较大实例', () => {
    const pts = [0, 2, 5, 9, 14, 20, 26, 33];
    const r = solveTurnpike(8, distancesOf(pts));
    expect(r.verdict).toBe('unique');
    expect(r.canonical?.positions).toEqual(pts);
  });

  it('n=18 上界实例', () => {
    // 间隔不规则的 18 点
    const pts = [0, 3, 7, 12, 18, 25, 31, 40, 46, 55, 63, 72, 80, 91, 100, 112, 125, 139];
    const r = solveTurnpike(18, distancesOf(pts));
    expect(r.verdict).toBe('unique');
    expect(r.canonical?.positions).toEqual(pts);
    expect(r.consumption).toHaveLength(153);
  });

  it('数量不符抛出异常', () => {
    expect(() => solveTurnpike(4, [1, 2, 3])).toThrow(/n\(n−1\)\/2/);
  });

  it('超出节点预算抛出 SearchBudgetExceeded', () => {
    expect(() =>
      solveTurnpike(6, distancesOf([0, 1, 4, 10, 12, 17]), { maxNodes: 0 }),
    ).toThrow(/预算/);
  });
});

describe('buildConsumption：逐距离消耗记录', () => {
  it('记录完整且与多重集一致', () => {
    const rows = buildConsumption([0, 1, 4, 7]);
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.distance)).toEqual([1, 3, 3, 4, 6, 7]);
    expect(rows.map((r) => r.index)).toEqual([1, 2, 3, 4, 5, 6]);
    // 每条记录的距离与端点一致
    for (const r of rows) {
      expect(r.to - r.from).toBe(r.distance);
    }
  });
});
