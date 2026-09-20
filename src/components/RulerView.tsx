import { formatScaled } from '../solver/parse';

export interface RulerLayout {
  key: string;
  label: string;
  positions: number[];
}

interface Props {
  layouts: RulerLayout[];
  highlight: { layoutKey: string; i: number; j: number } | null;
}

const W = 780;
const PAD_L = 72;
const PAD_R = 28;
const RULER_Y = 46;
const TOP = 84;
const LANE_H = 96;

/** 选取「漂亮」刻度步长（缩放整数域上的 1/2/5×10^k），保证刻度数量适中 */
function niceStep(maxV: number): number {
  const target = maxV / 8;
  let mag = 1;
  while (mag * 10 <= target) mag *= 10;
  for (const m of [1, 2, 5, 10]) {
    const s = m * mag;
    if (s >= target) return s;
  }
  return 10 * mag;
}

export default function RulerView({ layouts, highlight }: Props) {
  const maxWidth = Math.max(1, ...layouts.map((l) => l.positions[l.positions.length - 1] ?? 0));
  const x = (v: number) => PAD_L + (v / maxWidth) * (W - PAD_L - PAD_R);
  const step = niceStep(maxWidth);
  const ticks: number[] = [];
  for (let t = 0; t <= maxWidth; t += step) ticks.push(Math.round(t));
  const H = TOP + layouts.length * LANE_H + 14;

  return (
    <svg className="ruler" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="共用刻度尺对照图">
      {/* 共用刻度尺 */}
      <line x1={PAD_L} y1={RULER_Y} x2={W - PAD_R} y2={RULER_Y} className="axis" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={RULER_Y - 6} x2={x(t)} y2={RULER_Y} className="tick" />
          <text x={x(t)} y={RULER_Y - 10} className="tick-label" textAnchor="middle">
            {formatScaled(t)}
          </text>
          <line x1={x(t)} y1={RULER_Y} x2={x(t)} y2={H - 10} className="grid" />
        </g>
      ))}
      <text x={PAD_L - 10} y={RULER_Y - 10} className="axis-label" textAnchor="end">
        共用刻度
      </text>

      {layouts.map((layout, li) => {
        const y = TOP + li * LANE_H + 40;
        const hl = highlight && highlight.layoutKey === layout.key ? highlight : null;
        const hx1 = hl ? x(layout.positions[hl.i]) : 0;
        const hx2 = hl ? x(layout.positions[hl.j]) : 0;
        return (
          <g key={layout.key}>
            <text x={PAD_L - 10} y={y + 4} className="axis-label" textAnchor="end">
              {layout.label}
            </text>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} className={`lane lane-${layout.key}`} />
            {layout.positions.map((p, i) => (
              <g key={i}>
                <line
                  x1={x(p)}
                  y1={y - 14}
                  x2={x(p)}
                  y2={y + 14}
                  className={`marker marker-${layout.key}`}
                />
                <text x={x(p)} y={y - 20} className="marker-label" textAnchor="middle">
                  M{i + 1}
                </text>
                <text
                  x={x(p)}
                  y={y + 30 + (i % 2) * 12}
                  className="marker-value"
                  textAnchor="middle"
                >
                  {formatScaled(p)}
                </text>
              </g>
            ))}
            {hl && (
              <>
                <path
                  className="arc"
                  d={`M ${hx1} ${y - 30} Q ${(hx1 + hx2) / 2} ${y - 66} ${hx2} ${y - 30}`}
                />
                <text x={(hx1 + hx2) / 2} y={y - 62} className="arc-label" textAnchor="middle">
                  {formatScaled(layout.positions[hl.j] - layout.positions[hl.i])}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
