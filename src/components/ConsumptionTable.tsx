import type { ConsumptionRow } from '../solver/types';
import { formatScaled } from '../solver/parse';

interface Props {
  rows: ConsumptionRow[];
  layoutKey: string;
  onHighlight: (h: { layoutKey: string; i: number; j: number } | null) => void;
}

/** 逐距离消耗记录：多重集中每个距离（含重复项）由哪一对标记消耗 */
export default function ConsumptionTable({ rows, layoutKey, onHighlight }: Props) {
  return (
    <div className="table-wrap">
      <table className="consumption">
        <thead>
          <tr>
            <th>#</th>
            <th>距离</th>
            <th>消耗点对</th>
            <th>位置区间</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.index}
              onMouseEnter={() => onHighlight({ layoutKey, i: r.i, j: r.j })}
              onMouseLeave={() => onHighlight(null)}
            >
              <td className="mono">{r.index}</td>
              <td className="mono">{formatScaled(r.distance)}</td>
              <td>
                M{r.i + 1} – M{r.j + 1}
              </td>
              <td className="mono">
                {formatScaled(r.from)} → {formatScaled(r.to)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        共 {rows.length} 条消耗记录，与输入多重集一一对应（重复距离按次数逐条列出）；悬停行可在刻度尺上查看对应点对。
      </p>
    </div>
  );
}
