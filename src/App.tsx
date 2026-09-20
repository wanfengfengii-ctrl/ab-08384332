import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InputPanel from './components/InputPanel';
import VerdictBanner from './components/VerdictBanner';
import Ruler, { type Highlight } from './components/Ruler';
import SolutionCard from './components/SolutionCard';
import { EXAMPLES, type Example } from './examples';
import {
  expectedDistanceCount,
  solveTurnpike,
  type SolveOutput,
} from './solver/turnpike';
import { distancesFromPositions } from './solver/layout';
import {
  formatScaled,
  parseDistanceText,
  parseMarkerCount,
} from './solver/parse';

/** 解析导入文件内容：支持 JSON（对象或数组）与纯文本数字列表。 */
function interpretImport(text: string): { n: number | null; distancesText: string } {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data: unknown = JSON.parse(trimmed);
      if (Array.isArray(data) && data.every((v) => typeof v === 'number')) {
        return { n: null, distancesText: (data as number[]).join(' ') };
      }
      if (data && typeof data === 'object' && Array.isArray((data as { distances?: unknown }).distances)) {
        const obj = data as { n?: unknown; distances: unknown[] };
        if (obj.distances.every((v) => typeof v === 'number')) {
          const n = typeof obj.n === 'number' && Number.isInteger(obj.n) ? obj.n : null;
          return { n, distancesText: (obj.distances as number[]).join(' ') };
        }
      }
    } catch {
      // 非 JSON：按纯文本数字列表处理
    }
  }
  return { n: null, distancesText: text };
}

export default function App() {
  const [nText, setNText] = useState('6');
  const [distText, setDistText] = useState(() =>
    EXAMPLES[0].distances.map(formatScaled).join(' '),
  );
  const [result, setResult] = useState<SolveOutput | null>(null);
  const [solving, setSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const nParsed = useMemo(() => parseMarkerCount(nText), [nText]);
  const distParsed = useMemo(() => parseDistanceText(distText), [distText]);
  const expected = nParsed.n !== null ? expectedDistanceCount(nParsed.n) : null;
  const canSolve =
    !solving &&
    nParsed.n !== null &&
    distParsed.issues.length === 0 &&
    expected !== null &&
    distParsed.values.length === expected;

  const cancelWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setSolving(false);
  }, []);

  useEffect(() => cancelWorker, [cancelWorker]);

  /** 任何输入变化都会清除旧裁决（并终止进行中的求解）。 */
  const clearVerdict = useCallback(() => {
    cancelWorker();
    setResult(null);
    setSolveError(null);
    setHighlight(null);
  }, [cancelWorker]);

  const handleNChange = (v: string) => {
    setNText(v);
    clearVerdict();
  };
  const handleDistChange = (v: string) => {
    setDistText(v);
    clearVerdict();
  };

  const handleSolve = () => {
    if (!canSolve || nParsed.n === null) return;
    cancelWorker();
    setResult(null);
    setSolveError(null);
    setHighlight(null);
    setSolving(true);
    const payload = { n: nParsed.n, distances: distParsed.values };
    try {
      const worker = new Worker(new URL('./solverWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;
      worker.onmessage = (e: MessageEvent<SolveOutput>) => {
        setResult(e.data);
        setSolving(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.onerror = (e) => {
        setSolveError(`求解器异常：${e.message ?? '未知错误'}`);
        setSolving(false);
        worker.terminate();
        workerRef.current = null;
      };
      worker.postMessage(payload);
    } catch {
      // Worker 不可用（如某些嵌入式环境）：回退到主线程同步求解
      try {
        setResult(solveTurnpike(payload.n, payload.distances));
      } catch (err) {
        setSolveError(err instanceof Error ? err.message : String(err));
      }
      setSolving(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const { n, distancesText } = interpretImport(text);
    if (n !== null) setNText(String(n));
    setDistText(distancesText);
    clearVerdict();
  };

  const handleLoadExample = (ex: Example) => {
    setNText(String(ex.n));
    setDistText(ex.distances.map(formatScaled).join(' '));
    clearVerdict();
  };

  const handleRandom = () => {
    const n = nParsed.n ?? 6;
    const span = 40000; // 0–40.000（三位小数）
    const set = new Set<number>();
    while (set.size < n) set.add(Math.floor(Math.random() * (span + 1)));
    const positions = [...set].sort((a, b) => a - b);
    const base = positions[0];
    const normalized = positions.map((p) => p - base);
    setDistText(distancesFromPositions(normalized).map(formatScaled).join(' '));
    clearVerdict();
  };

  const handleClear = () => {
    setDistText('');
    clearVerdict();
  };

  const shown = result ? result.solutions.slice(0, 2) : [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>标记布局重建工作台</h1>
        <p>
          超声导轨校准夹具 · 反射标记标签脱落后，仅凭全部两两间距的无序多重集重建标记位置
          （Turnpike 重建）。纯前端计算，不调用业务后端。
        </p>
      </header>

      <main className="app-main">
        <InputPanel
          nText={nText}
          onNChange={handleNChange}
          distText={distText}
          onDistChange={handleDistChange}
          nError={nParsed.error}
          expected={expected}
          parsed={distParsed}
          solving={solving}
          canSolve={canSolve}
          onSolve={handleSolve}
          onCancel={cancelWorker}
          onImportFile={handleImportFile}
          onLoadExample={handleLoadExample}
          onRandom={handleRandom}
          onClear={handleClear}
        />

        <section className="card result-panel" aria-label="结果面板">
          <h2>重建结果</h2>
          {solveError && <p className="issue">⚠ {solveError}</p>}
          {!result && !solving && !solveError && (
            <p className="placeholder">
              尚未运行重建。请在左侧输入或导入间距多重集，然后点击「开始重建」。
            </p>
          )}
          {solving && <p className="placeholder">正在后台完整搜索全部非镜像布局…</p>}
          {result && (
            <>
              <VerdictBanner output={result} />
              {shown.length > 0 && (
                <>
                  <Ruler solutions={shown} highlight={highlight} />
                  <div className={`solution-grid ${shown.length > 1 ? 'two' : ''}`}>
                    {shown.map((s, i) => (
                      <SolutionCard
                        key={s.join(',')}
                        index={i + 1}
                        role={
                          i === 0
                            ? result.verdict === 'unique'
                              ? '规范形式（唯一）'
                              : '规范最小布局'
                            : '第二份歧义见证'
                        }
                        solution={s}
                        onHighlight={setHighlight}
                      />
                    ))}
                  </div>
                  {result.stats.solutionCount > shown.length && (
                    <p className="hint">
                      另有 {result.stats.solutionCount - shown.length} 个非镜像布局未展示（按字典序取前两个）。
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        模型：4–18 个位置互异的标记 · 恰 n(n−1)/2 条非负、至多三位小数的间距 · 统一 ×1000
        整数缩放 · 镜像归并 · 最左点平移至零
      </footer>
    </div>
  );
}
