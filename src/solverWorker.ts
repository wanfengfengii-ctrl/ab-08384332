/**
 * 求解 Web Worker：在后台线程执行完整搜索，避免阻塞界面。
 * 纯前端计算，不发起任何网络请求。
 */
import { solveTurnpike, type SolveOutput } from './solver/turnpike';

export interface SolveRequest {
  n: number;
  /** 缩放后的整数间距多重集 */
  distances: number[];
}

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { n, distances } = e.data;
  const output: SolveOutput = solveTurnpike(n, distances);
  ctx.postMessage(output);
};
