/**
 * 布局（标记位置序列）相关的多重集工具。
 * 所有数值均为缩放后的整数。
 */

/** 由位置序列计算全部两两间距的无序多重集（保留重复项次数）。 */
export function distancesFromPositions(positions: number[]): number[] {
  const ds: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      ds.push(Math.abs(positions[j] - positions[i]));
    }
  }
  return ds;
}

/** 一条“逐距离消耗记录”：某条间距由哪一对标记消耗。 */
export interface ConsumptionRecord {
  distance: number;
  /** 左标记在布局中的下标 */
  i: number;
  /** 右标记在布局中的下标 */
  j: number;
  from: number;
  to: number;
}

/**
 * 对给定布局生成逐距离消耗记录：每个间距出现一次（含重复），
 * 按间距升序、再按端点排序，总数恰为 n(n-1)/2。
 */
export function buildConsumption(solution: number[]): ConsumptionRecord[] {
  const recs: ConsumptionRecord[] = [];
  for (let i = 0; i < solution.length; i++) {
    for (let j = i + 1; j < solution.length; j++) {
      recs.push({
        distance: solution[j] - solution[i],
        i,
        j,
        from: solution[i],
        to: solution[j],
      });
    }
  }
  recs.sort((a, b) => a.distance - b.distance || a.from - b.from || a.to - b.to);
  return recs;
}

/** 判断两个整数多重集是否精确一致（长度与各值次数均相同）。 */
export function multisetEquals(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<number, number>();
  for (const v of a) counts.set(v, (counts.get(v) ?? 0) + 1);
  for (const v of b) {
    const next = (counts.get(v) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(v, next);
  }
  for (const c of counts.values()) if (c !== 0) return false;
  return true;
}

/** 统计多重集中每个值的重复次数。 */
export function multiplicities(values: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}
