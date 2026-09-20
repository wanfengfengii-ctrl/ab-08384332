import { useMemo } from 'react';
import { buildConsumption, multiplicities } from '../solver/layout';
import { formatScaled } from '../solver/parse';
import type { Highlight } from './Ruler';

interface SolutionCardProps {
  /** 1 起始的展示序号 */
  index: number;
  role: string;
  solution: number[];
  onHighlight: (h: Highlight | null) => void;
}

/**
 * 单个候选布局卡片：位置序列 + 逐距离消耗记录（每条间距出现一次，
 * 重复间距按次数逐条列出）。
 */
export default function SolutionCard({ index, role, solution, onHighlight }: SolutionCardProps) {
  const records = useMemo(() => buildConsumption(solution), [solution]);
  const mult = useMemo(
    () => multiplicities(records.map((r) => r.distance)),
    [records],
  );
  const solIndex = index - 1;

  return (
    <article className="card solution-card">
      <h3>
        布局 {index} <span className="solution-role">{role}</span>
      </h3>
      <div className="positions">
        {solution.map((p, i) => (
          <span key={i} className="position-chip" title={`标记 ${i + 1}`}>
            {formatScaled(p)}
          </span>
        ))}
      </div>
      <h4>逐距离消耗记录（共 {records.length} 条）</h4>
      <div className="consumption-scroll">
        <table className="consumption">
          <thead>
            <tr>
              <th>#</th>
              <th>间距</th>
              <th>消耗点对</th>
              <th>区间</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, k) => (
              <tr
                key={k}
                onMouseEnter={() => onHighlight({ sol: solIndex, from: r.from, to: r.to })}
                onMouseLeave={() => onHighlight(null)}
              >
                <td className="num">{k + 1}</td>
                <td className="num">
                  {formatScaled(r.distance)}
                  {(mult.get(r.distance) ?? 0) > 1 && (
                    <span className="mult-badge">×{mult.get(r.distance)}</span>
                  )}
                </td>
                <td>
                  标记 {r.i + 1} ↔ 标记 {r.j + 1}
                </td>
                <td className="num">
                  [{formatScaled(r.from)}, {formatScaled(r.to)}]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
