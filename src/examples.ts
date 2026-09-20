import { distancesFromPositions } from './solver/layout';

export interface Example {
  id: string;
  label: string;
  note: string;
  n: number;
  /** 缩放后的整数间距 */
  distances: number[];
}

const fromPositions = (id: string, label: string, note: string, positions: number[]): Example => ({
  id,
  label,
  note,
  n: positions.length,
  distances: distancesFromPositions(positions),
});

/**
 * 内置示例（间距均为缩放后的整数，即原始值 ×1000）。
 * 各示例的预期裁决已由 verify 验收套件固化。
 */
export const EXAMPLES: Example[] = [
  fromPositions(
    'unique6',
    '唯一解 · 6 标记',
    '预期裁决：唯一布局（镜像已归并）',
    [0, 2000, 7000, 8000, 11000, 13000],
  ),
  fromPositions(
    'ambiguous6',
    '歧义对 · 6 标记',
    '经典同距对：预期裁决为多个非镜像布局（恰 2 个）',
    [0, 1000, 4000, 10000, 12000, 17000],
  ),
  fromPositions(
    'decimal4',
    '三位小数 · 4 标记',
    '含 0.75 / 2.5 / 3.125 等三位小数间距，演示 ×1000 整数缩放',
    [0, 750, 2500, 3125],
  ),
  fromPositions(
    'duplicate4',
    '重复间距 · 4 标记',
    '间距多重集为 {1,1,2,2,3,4}，演示重复项次数保留',
    [0, 1000, 2000, 4000],
  ),
  {
    id: 'none4',
    label: '无解 · 4 标记',
    note: '间距 {1,2,3,4,5,9} 无法排布，预期裁决：无解',
    n: 4,
    distances: [1000, 2000, 3000, 4000, 5000, 9000],
  },
];
