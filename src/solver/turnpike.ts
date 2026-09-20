import type { ConsumptionRow, SolveOptions, SolveResult, Verdict } from './types';

/** 搜索超出节点预算时抛出（属于求解中止，而非裁决） */
export class SearchBudgetExceeded extends Error {
  constructor(public readonly budget: number) {
    super(`搜索超出节点预算（${budget.toLocaleString()}），已中止。请核对输入是否合法。`);
    this.name = 'SearchBudgetExceeded';
  }
}

/** 字典序比较两个升序位置数组 */
export function comparePositions(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

/**
 * 规范化布局：位置升序且最左点为 0；
 * 镜像 {width − p} 视为同一布局，取两者字典序最小者作为规范形。
 */
export function canonicalOf(sortedPositions: number[]): number[] {
  const width = sortedPositions[sortedPositions.length - 1];
  const mirror = sortedPositions.map((p) => width - p).reverse();
  return comparePositions(sortedPositions, mirror) <= 0 ? sortedPositions.slice() : mirror;
}

/** 由布局生成逐距离消耗记录：每对标记消耗一个距离，重复距离逐条列出 */
export function buildConsumption(positions: number[]): ConsumptionRow[] {
  const rows: ConsumptionRow[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      rows.push({
        index: 0,
        distance: positions[j] - positions[i],
        i,
        j,
        from: positions[i],
        to: positions[j],
      });
    }
  }
  rows.sort((a, b) => a.distance - b.distance || a.i - b.i || a.j - b.j);
  rows.forEach((r, idx) => {
    r.index = idx + 1;
  });
  return rows;
}

/**
 * 收费公路（turnpike）重建：给定全部两两间距的多重集（已缩放为整数），
 * 完整搜索所有与多重集精确一致的布局。
 *
 * 经典回溯：最大距离即宽度 width，端点 0 与 width 必在布局中；
 * 每一步取剩余最大距离 d，则新点必为 x=d（到 0 的距离）或 x=width−d（到 width 的距离），
 * 仅当 x 到所有已放置点的距离都能从多重集中消耗时递归放置。
 * 镜像通过 canonicalOf 折叠，重复布局按规范形去重。
 */
export function solveTurnpike(
  n: number,
  scaledDistances: number[],
  opts: SolveOptions = {},
): SolveResult {
  const startedAt = Date.now();
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`标记数量非法：${n}`);
  }
  const m = (n * (n - 1)) / 2;
  if (scaledDistances.length !== m) {
    throw new Error(`间距数量须恰好为 n(n−1)/2 = ${m}，实际为 ${scaledDistances.length}。`);
  }
  const maxNodes = opts.maxNodes ?? 4_000_000;
  const maxSolutions = opts.maxSolutions ?? 256;
  const progressEvery = opts.progressEvery ?? 65_536;

  // 多重集：距离 → 剩余次数（重复项按次数保留）
  const counts = new Map<number, number>();
  for (const d of scaledDistances) {
    if (!Number.isInteger(d) || d < 0) {
      throw new Error(`非法间距（缩放后须为非负整数）：${d}`);
    }
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const keys = Array.from(counts.keys()).sort((a, b) => a - b);
  const width = keys[keys.length - 1];

  let remaining = m;
  const dec = (d: number) => {
    counts.set(d, (counts.get(d) ?? 0) - 1);
    remaining -= 1;
  };
  const inc = (d: number) => {
    counts.set(d, (counts.get(d) ?? 0) + 1);
    remaining += 1;
  };

  dec(width);
  const placed: number[] = [0, width];
  const inSet = new Set<number>(placed); // 位置互异

  let nodes = 0;
  let truncated = false;
  const solutions = new Map<string, number[]>(); // 规范形 → 位置

  const maxRemaining = (): number => {
    for (let i = keys.length - 1; i >= 0; i--) {
      if ((counts.get(keys[i]) ?? 0) > 0) return keys[i];
    }
    return -1;
  };

  const recordSolution = () => {
    const sorted = placed.slice().sort((a, b) => a - b);
    const canon = canonicalOf(sorted);
    const key = canon.join(',');
    if (!solutions.has(key)) solutions.set(key, canon);
  };

  const dfs = (): void => {
    if (solutions.size >= maxSolutions) {
      truncated = true;
      return;
    }
    if (remaining === 0) {
      recordSolution();
      return;
    }
    nodes += 1;
    if (nodes > maxNodes) throw new SearchBudgetExceeded(maxNodes);
    if (nodes % progressEvery === 0) opts.onProgress?.(nodes, placed.length);

    const d = maxRemaining();
    for (let c = 0; c < 2; c++) {
      const x = c === 0 ? d : width - d;
      if (c === 1 && x === d) continue; // 两候选相同，去重
      if (x <= 0 || x >= width || inSet.has(x)) continue;
      // 本次放置需要消耗的距离多重集（x 到各已放置点的距离可能彼此重复，
      // 必须先按次数汇总再与剩余计数比较，不能逐个检查）
      const need = new Map<number, number>();
      const ds: number[] = [];
      let ok = true;
      for (const p of placed) {
        const dist = x > p ? x - p : p - x;
        const used = need.get(dist) ?? 0;
        if ((counts.get(dist) ?? 0) - used <= 0) {
          ok = false;
          break;
        }
        need.set(dist, used + 1);
        ds.push(dist);
      }
      if (!ok) continue;
      for (const dist of ds) dec(dist);
      placed.push(x);
      inSet.add(x);
      dfs();
      placed.pop();
      inSet.delete(x);
      for (const dist of ds) inc(dist);
      if (truncated) return;
    }
  };

  dfs();

  const all = Array.from(solutions.values()).sort(comparePositions);
  const verdict: Verdict = all.length === 0 ? 'none' : all.length === 1 ? 'unique' : 'multiple';
  const toLayout = (positions: number[]) => ({
    positions,
    width: positions[positions.length - 1],
  });
  const canonical = all.length > 0 ? toLayout(all[0]) : null;
  const witness = all.length > 1 ? toLayout(all[1]) : null;

  return {
    verdict,
    canonical,
    witness,
    solutionCount: all.length,
    truncated,
    nodes,
    elapsedMs: Date.now() - startedAt,
    consumption: canonical ? buildConsumption(canonical.positions) : null,
    witnessConsumption: witness ? buildConsumption(witness.positions) : null,
  };
}
