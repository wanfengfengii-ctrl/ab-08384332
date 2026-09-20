/**
 * 求解 Web Worker：在浏览器本地线程中执行完整搜索，不访问任何网络/后端。
 */
import { solveTurnpike } from '../solver/turnpike';

interface SolveInMessage {
  type: 'solve';
  n: number;
  scaled: number[];
}

type OutMessage =
  | { type: 'progress'; nodes: number; placed: number }
  | { type: 'result'; result: unknown }
  | { type: 'error'; message: string };

const ctx = self as unknown as {
  onmessage: ((ev: MessageEvent<SolveInMessage>) => void) | null;
  postMessage: (message: OutMessage) => void;
};

ctx.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'solve') return;
  try {
    const result = solveTurnpike(msg.n, msg.scaled, {
      onProgress: (nodes, placed) => ctx.postMessage({ type: 'progress', nodes, placed }),
    });
    ctx.postMessage({ type: 'result', result });
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
