/** 求解裁决：无解 / 唯一解 / 存在多个非镜像布局 */
export type Verdict = 'none' | 'unique' | 'multiple';

export interface SolveOptions {
  /** 搜索节点预算，超出即中止（默认 4_000_000） */
  maxNodes?: number;
  /** 记录的非镜像布局数量上限（默认 256），达到即截断 */
  maxSolutions?: number;
  /** 进度回调间隔（节点数，默认 65536） */
  progressEvery?: number;
  onProgress?: (nodes: number, placedCount: number) => void;
}

/** 一个规范化布局：位置升序、最左点为 0、镜像已折叠为字典序最小 */
export interface LayoutView {
  positions: number[];
  width: number;
}

/** 逐距离消耗记录：布局中哪一对标记消耗了多重集中的哪一个距离 */
export interface ConsumptionRow {
  /** 在排序后多重集中的序号（从 1 开始，重复距离逐条列出） */
  index: number;
  /** 距离（缩放后的整数） */
  distance: number;
  /** 标记下标（0 基，对应界面 M{i+1}、M{j+1}） */
  i: number;
  j: number;
  from: number;
  to: number;
}

export interface SolveResult {
  verdict: Verdict;
  /** 规范最小布局（无解时为 null） */
  canonical: LayoutView | null;
  /** 第二份歧义见证（仅多解时存在） */
  witness: LayoutView | null;
  /** 搜索发现的非镜像布局数量（截断时为下界） */
  solutionCount: number;
  /** 是否因达到布局数量上限而截断 */
  truncated: boolean;
  /** 访问的搜索节点数 */
  nodes: number;
  elapsedMs: number;
  /** 规范最小布局的逐距离消耗记录 */
  consumption: ConsumptionRow[] | null;
  /** 歧义见证的逐距离消耗记录 */
  witnessConsumption: ConsumptionRow[] | null;
}
