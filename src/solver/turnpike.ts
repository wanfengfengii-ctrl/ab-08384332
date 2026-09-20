/**
 * Turnpike 重建求解器：由全部两两间距的无序多重集，完整搜索所有
 * 与多重集精确一致的标记布局。
 *
 * 约定：
 * - 输入为缩放后的整数间距（长度恰为 n(n-1)/2，可含重复，可含 0）；
 * - 标记位置互异，因此任何为 0 的剩余间距都无法被消耗；
 * - 输出布局一律将最左点平移至 0；
 * - 镜像布局视为同一布局，以字典序较小者作为规范形式；
 * - 搜索为完整回溯枚举（Skiena 最大间距剪枝），直到枚举尽全部
 *   非镜像布局或达到安全预算（节点数 / 解数上限）。
 */

export type Verdict = 'none' | 'unique' | 'multiple' | 'unknown';

export interface SolveStats {
  /** 访问的搜索节点数 */
  nodes: number;
  elapsedMs: number;
  /** 找到的规范（非镜像）布局数 */
  solutionCount: number;
  /** 是否因安全预算提前终止（此时裁决可能为 unknown） */
  truncated: boolean;
}

export interface SolveOutput {
  verdict: Verdict;
  /** 规范布局，按字典序升序；[0] 为规范最小布局，[1] 为第二份歧义见证 */
  solutions: number[][];
  stats: SolveStats;
}

export interface SolveOptions {
  /** 最多记录的规范布局数（超出则标记 truncated） */
  maxSolutions?: number;
  /** 搜索节点预算（超出则标记 truncated） */
  nodeBudget?: number;
  now?: () => number;
}

export function expectedDistanceCount(n: number): number {
  return (n * (n - 1)) / 2;
}

export function lexCompare(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

/**
 * 布局规范化：输入必须为升序且首元素为 0 的布局；
 * 取其与镜像（关于中点反射后重新平移）中字典序较小者。
 */
export function canonicalLayout(sorted: number[]): number[] {
  const width = sorted[sorted.length - 1];
  const mirror = sorted.map((v) => width - v).reverse();
  return lexCompare(sorted, mirror) <= 0 ? sorted.slice() : mirror;
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function solveTurnpike(
  n: number,
  distances: number[],
  options: SolveOptions = {},
): SolveOutput {
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`标记数 n 需为不小于 2 的整数，收到 ${n}`);
  }
  if (distances.length !== expectedDistanceCount(n)) {
    throw new Error(
      `间距数量 ${distances.length} 与标记数 ${n} 不匹配（应为 ${expectedDistanceCount(n)}）`,
    );
  }
  for (const d of distances) {
    if (!Number.isInteger(d)) throw new Error(`间距须为缩放后的整数，收到 ${d}`);
    if (d < 0) throw new Error(`间距须为非负值，收到 ${d}`);
  }

  const maxSolutions = options.maxSolutions ?? 10_000;
  const nodeBudget = options.nodeBudget ?? 4_000_000;
  const now = options.now ?? defaultNow;
  const t0 = now();

  const finish = (solutions: number[][], nodes: number, truncated: boolean): SolveOutput => {
    solutions.sort(lexCompare);
    let verdict: Verdict;
    if (solutions.length === 0) verdict = truncated ? 'unknown' : 'none';
    else if (solutions.length === 1) verdict = truncated ? 'unknown' : 'unique';
    else verdict = 'multiple';
    return {
      verdict,
      solutions,
      stats: { nodes, elapsedMs: now() - t0, solutionCount: solutions.length, truncated },
    };
  };

  const width = Math.max(...distances);
  // 最大间距为 0 意味着所有标记重合，与“位置互异”矛盾。
  if (width === 0) return finish([], 0, false);

  // 多重集：值 -> 剩余次数（重复项次数在此保留）
  const counts = new Map<number, number>();
  for (const d of distances) counts.set(d, (counts.get(d) ?? 0) + 1);
  // 最大间距必由最左、最右两个端点消耗：放置 0 与 width。
  counts.set(width, (counts.get(width) ?? 0) - 1);

  const uniqDesc = [...counts.keys()].sort((a, b) => b - a);
  const placed: number[] = [0, width];
  const occupied = new Set<number>([0, width]);
  const found = new Map<string, number[]>();
  let nodes = 0;
  let truncated = false;

  const consume = (d: number) => counts.set(d, (counts.get(d) ?? 0) - 1);
  const release = (d: number) => counts.set(d, (counts.get(d) ?? 0) + 1);

  const maxRemaining = (): number => {
    for (const d of uniqDesc) {
      if ((counts.get(d) ?? 0) > 0) return d;
    }
    return -1;
  };

  /** 候选点 x 与全部已放置点的间距是否都能从多重集中消耗；可行则返回需消耗的间距列表。 */
  const tryPlace = (x: number): number[] | null => {
    const need: number[] = [];
    const local = new Map<number, number>();
    for (const p of placed) {
      const d = x > p ? x - p : p - x;
      if (d === 0) return null; // 位置互异：不允许重合
      const c = (local.get(d) ?? 0) + 1;
      local.set(d, c);
      if (c > (counts.get(d) ?? 0)) return null;
      need.push(d);
    }
    return need;
  };

  const search = (): void => {
    if (truncated) return;
    if (found.size >= maxSolutions) {
      truncated = true;
      return;
    }
    if (placed.length === n) {
      // 放置 n 个点时累计消耗恰为 n(n-1)/2 条间距，多重集必然精确一致。
      const sorted = [...placed].sort((a, b) => a - b);
      const canon = canonicalLayout(sorted);
      const key = canon.join(',');
      if (!found.has(key)) found.set(key, canon);
      return;
    }
    if (nodes >= nodeBudget) {
      truncated = true;
      return;
    }
    nodes++;

    const d = maxRemaining();
    if (d <= 0) return; // 剩余最大间距为 0：只能由重合点产生，不可行

    // 最大剩余间距必由新点与某一端点（0 或 width）形成。
    const candidates = d * 2 === width ? [d] : [d, width - d];
    for (const x of candidates) {
      if (x <= 0 || x >= width || occupied.has(x)) continue;
      const need = tryPlace(x);
      if (need === null) continue;
      for (const v of need) consume(v);
      placed.push(x);
      occupied.add(x);
      search();
      occupied.delete(x);
      placed.pop();
      for (const v of need) release(v);
      if (truncated) return;
    }
  };

  search();
  return finish([...found.values()], nodes, truncated);
}
