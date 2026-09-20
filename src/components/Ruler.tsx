import { formatScaled } from '../solver/parse';

export interface Highlight {
  /** 解在 solutions 数组中的下标 */
  sol: number;
  from: number;
  to: number;
}

interface RulerProps {
  /** 共用同一刻度尺的候选布局（缩放整数，已平移至 0 起） */
  solutions: number[][];
  highlight: Highlight | null;
}

/** 选取“漂亮”的刻度步长（1/2/5/10 × 10^k，缩放整数域内）。 */
function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) {
    if (m * mag >= raw) return m * mag;
  }
  return 10 * mag;
}

const W = 960;
const PAD_L = 76;
const PAD_R = 28;
const AXIS_Y = 36;
const LANE_H = 62;

/**
 * 共用刻度尺：所有候选布局共用同一坐标轴，便于对照标记位置；
 * 悬停消耗记录时高亮对应间距区间。
 */
export default function Ruler({ solutions, highlight }: RulerProps) {
  const width = solutions[0][solutions[0].length - 1];
  const height = AXIS_Y + 26 + solutions.length * LANE_H;
  const x = (v: number) => PAD_L + (v / width) * (W - PAD_L - PAD_R);

  const step = niceStep(Math.max(1, Math.round(width / 9)));
  const ticks: number[] = [];
  for (let t = 0; t <= width; t += step) ticks.push(t);
  const hasEndTick = ticks[ticks.length - 1] === width;

  return (
    <div className="ruler-wrap">
      <h3>共用刻度尺 · 候选布局对照</h3>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="ruler"
        role="img"
        aria-label="候选布局共用刻度尺"
      >
        {/* 网格线 */}
        {ticks.map((t) => (
          <line
            key={`g${t}`}
            x1={x(t)}
            y1={AXIS_Y}
            x2={x(t)}
            y2={height - 8}
            className="grid-line"
          />
        ))}
        {/* 主轴 */}
        <line x1={PAD_L} y1={AXIS_Y} x2={W - PAD_R} y2={AXIS_Y} className="axis-line" />
        {ticks.map((t) => (
          <g key={`t${t}`}>
            <line x1={x(t)} y1={AXIS_Y} x2={x(t)} y2={AXIS_Y + 6} className="axis-tick" />
            <text x={x(t)} y={AXIS_Y - 8} className="tick-label" textAnchor="middle">
              {formatScaled(t)}
            </text>
          </g>
        ))}
        {!hasEndTick && (
          <g>
            <line x1={x(width)} y1={AXIS_Y} x2={x(width)} y2={AXIS_Y + 6} className="axis-tick end" />
            <text x={x(width)} y={AXIS_Y - 8} className="tick-label end" textAnchor="middle">
              {formatScaled(width)}
            </text>
          </g>
        )}

        {/* 各候选布局泳道 */}
        {solutions.map((sol, li) => {
          const y = AXIS_Y + 26 + li * LANE_H + LANE_H / 2 - 8;
          return (
            <g key={li}>
              <text x={8} y={y + 4} className="lane-label">
                布局 {li + 1}
              </text>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} className="lane-line" />
              {highlight && highlight.sol === li && (
                <g>
                  <line
                    x1={x(highlight.from)}
                    y1={y - 14}
                    x2={x(highlight.to)}
                    y2={y - 14}
                    className="highlight-seg"
                  />
                  <line x1={x(highlight.from)} y1={y - 19} x2={x(highlight.from)} y2={y - 9} className="highlight-seg" />
                  <line x1={x(highlight.to)} y1={y - 19} x2={x(highlight.to)} y2={y - 9} className="highlight-seg" />
                  <text
                    x={(x(highlight.from) + x(highlight.to)) / 2}
                    y={y - 22}
                    textAnchor="middle"
                    className="highlight-label"
                  >
                    {formatScaled(highlight.to - highlight.from)}
                  </text>
                </g>
              )}
              {sol.map((p, pi) => (
                <g key={pi}>
                  <circle cx={x(p)} cy={y} r={5} className="marker">
                    <title>
                      标记 {pi + 1}：位置 {formatScaled(p)}
                    </title>
                  </circle>
                  <text x={x(p)} y={y + 17} textAnchor="middle" className="marker-idx">
                    {pi + 1}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <p className="hint">
        所有候选布局共用同一坐标轴（最左点已平移至 0，镜像已归并）。悬停下方消耗记录可在此高亮对应间距。
      </p>
    </div>
  );
}
