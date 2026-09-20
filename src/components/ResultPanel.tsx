import { useEffect, useState } from 'react';
import type { SolveState } from '../App';
import { formatScaled } from '../solver/parse';
import RulerView, { type RulerLayout } from './RulerView';
import ConsumptionTable from './ConsumptionTable';

const VERDICT_TEXT = {
  none: {
    title: '裁决：无解',
    desc: '不存在与该间距多重集精确一致的标记布局，请复核测量记录。',
  },
  unique: {
    title: '裁决：唯一解',
    desc: '仅存在一种布局（镜像视为同一布局），以下为其规范最小布局。',
  },
  multiple: {
    title: '裁决：存在多个非镜像布局',
    desc: '该多重集对应至少两种互为非镜像的布局，给出规范最小布局与第二份歧义见证。',
  },
} as const;

export default function ResultPanel({ solve }: { solve: SolveState }) {
  const [highlight, setHighlight] = useState<{ layoutKey: string; i: number; j: number } | null>(
    null,
  );
  const [tab, setTab] = useState<'canonical' | 'witness'>('canonical');

  useEffect(() => {
    if (solve.status === 'done') {
      setTab('canonical');
      setHighlight(null);
    }
  }, [solve]);

  if (solve.status === 'idle') {
    return (
      <section className="card result-panel">
        <h2>重建结果</h2>
        <p className="placeholder">
          输入合法后点击「开始重建」。求解在浏览器本地 Web Worker 中完整搜索，不访问任何后端。
        </p>
      </section>
    );
  }

  if (solve.status === 'running') {
    return (
      <section className="card result-panel">
        <h2>重建结果</h2>
        <div className="solving">
          <div className="spinner" aria-hidden="true" />
          <p>正在完整搜索布局空间……</p>
          <p className="mono muted">
            已访问节点 {solve.nodes.toLocaleString()} · 已放置标记 {solve.placed}
          </p>
        </div>
      </section>
    );
  }

  if (solve.status === 'error') {
    return (
      <section className="card result-panel">
        <h2>重建结果</h2>
        <div className="banner banner-none">
          <strong>求解中止</strong>
          <span>{solve.message}</span>
        </div>
      </section>
    );
  }

  const r = solve.result;
  const v = VERDICT_TEXT[r.verdict];
  const layouts: RulerLayout[] = [];
  if (r.canonical) {
    layouts.push({
      key: 'canonical',
      label: r.verdict === 'multiple' ? '规范最小布局' : '规范布局',
      positions: r.canonical.positions,
    });
  }
  if (r.witness) {
    layouts.push({ key: 'witness', label: '歧义见证', positions: r.witness.positions });
  }
  const activeConsumption = tab === 'witness' && r.witnessConsumption ? r.witnessConsumption : r.consumption;
  const activeKey = tab === 'witness' && r.witnessConsumption ? 'witness' : 'canonical';

  return (
    <section className="card result-panel">
      <h2>重建结果</h2>

      <div className={`banner banner-${r.verdict}`}>
        <strong>{v.title}</strong>
        <span>{v.desc}</span>
      </div>

      <div className="meta mono">
        耗时 {r.elapsedMs} ms · 访问节点 {r.nodes.toLocaleString()} · 非镜像布局数 {r.solutionCount}
        {r.truncated ? '（已达记录上限，计数为下界）' : ''}
      </div>

      {layouts.length > 0 && (
        <>
          <h3>候选位置对照（共用刻度尺）</h3>
          <RulerView layouts={layouts} highlight={highlight} />
          <div className="layout-lines">
            {layouts.map((l) => (
              <div key={l.key} className="layout-line">
                <span className={`dot dot-${l.key}`} />
                <span className="layout-label">{l.label}</span>
                <code>{l.positions.map(formatScaled).join('  ')}</code>
              </div>
            ))}
          </div>
        </>
      )}

      {activeConsumption && (
        <>
          <h3>逐距离消耗记录</h3>
          {r.witnessConsumption && (
            <div className="tabs">
              <button
                className={tab === 'canonical' ? 'tab active' : 'tab'}
                onClick={() => setTab('canonical')}
              >
                规范最小布局
              </button>
              <button
                className={tab === 'witness' ? 'tab active' : 'tab'}
                onClick={() => setTab('witness')}
              >
                歧义见证
              </button>
            </div>
          )}
          <ConsumptionTable rows={activeConsumption} layoutKey={activeKey} onHighlight={setHighlight} />
        </>
      )}
    </section>
  );
}
