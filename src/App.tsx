import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseInput } from './solver/parse';
import type { SolveResult } from './solver/types';
import { SAMPLES } from './samples';
import InputPanel from './components/InputPanel';
import ResultPanel from './components/ResultPanel';

export type SolveState =
  | { status: 'idle' }
  | { status: 'running'; nodes: number; placed: number }
  | { status: 'done'; result: SolveResult }
  | { status: 'error'; message: string };

export default function App() {
  const [nText, setNText] = useState<string>(SAMPLES[2].n);
  const [distText, setDistText] = useState<string>(SAMPLES[2].distances);
  const [solve, setSolve] = useState<SolveState>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);

  const parsed = useMemo(() => parseInput(nText, distText), [nText, distText]);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => stopWorker, [stopWorker]);

  // 任何输入修改都会中止进行中的求解并清除旧裁决
  const handleNChange = useCallback(
    (v: string) => {
      setNText(v);
      stopWorker();
      setSolve({ status: 'idle' });
    },
    [stopWorker],
  );

  const handleDistChange = useCallback(
    (v: string) => {
      setDistText(v);
      stopWorker();
      setSolve({ status: 'idle' });
    },
    [stopWorker],
  );

  const handleSample = useCallback(
    (n: string, distances: string) => {
      setNText(n);
      setDistText(distances);
      stopWorker();
      setSolve({ status: 'idle' });
    },
    [stopWorker],
  );

  const startSolve = useCallback(() => {
    if (!parsed.ok) return;
    stopWorker();
    setSolve({ status: 'running', nodes: 0, placed: 0 });
    const worker = new Worker(new URL('./worker/solver.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg?.type === 'progress') {
        setSolve((s) =>
          s.status === 'running'
            ? { status: 'running', nodes: msg.nodes as number, placed: msg.placed as number }
            : s,
        );
      } else if (msg?.type === 'result') {
        setSolve({ status: 'done', result: msg.result as SolveResult });
        stopWorker();
      } else if (msg?.type === 'error') {
        setSolve({ status: 'error', message: String(msg.message) });
        stopWorker();
      }
    };
    worker.onerror = () => {
      setSolve({ status: 'error', message: '求解器 Worker 异常终止。' });
      stopWorker();
    };
    worker.postMessage({ type: 'solve', n: parsed.n, scaled: parsed.scaled });
  }, [parsed, stopWorker]);

  const cancelSolve = useCallback(() => {
    stopWorker();
    setSolve({ status: 'idle' });
  }, [stopWorker]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>标记布局重建工作台</h1>
        <p>
          超声导轨校准夹具 · 反射标记标签脱落后的布局重建 —— 由全部两两间距的无序多重集完整搜索标记位置，
          纯前端运行，不调用任何业务后端。
        </p>
      </header>
      <main className="app-main">
        <InputPanel
          nText={nText}
          distText={distText}
          parsed={parsed}
          solving={solve.status === 'running'}
          onNChange={handleNChange}
          onDistChange={handleDistChange}
          onSample={handleSample}
          onSolve={startSolve}
          onCancel={cancelSolve}
        />
        <ResultPanel solve={solve} />
      </main>
      <footer className="app-footer">
        距离统一按 ×1000 缩放为整数计算并保留重复项次数；最左点平移至 0；镜像视为同一布局；
        修改任意输入将自动清除当前裁决。
      </footer>
    </div>
  );
}
