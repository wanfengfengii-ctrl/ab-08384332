export interface Sample {
  key: string;
  label: string;
  n: string;
  distances: string;
}

/** 内置示例：唯一解 / 三位小数 / 多解（同距 homometric）/ 无解 */
export const SAMPLES: Sample[] = [
  {
    key: 'unique',
    label: '示例 · 唯一解',
    n: '4',
    // 布局 {0, 1, 4, 7}
    distances: '1 3 3 4 6 7',
  },
  {
    key: 'decimal',
    label: '示例 · 三位小数',
    n: '4',
    // 布局 {0, 0.5, 1.25, 2.75}
    distances: '0.5 0.75 1.25 1.5 2.25 2.75',
  },
  {
    key: 'multiple',
    label: '示例 · 多解（同距）',
    n: '6',
    // {0,1,4,10,12,17} 与 {0,1,8,11,13,17} 互为非镜像同距布局
    distances: '1 2 3 4 5 6 7 8 9 10 11 12 13 16 17',
  },
  {
    key: 'none',
    label: '示例 · 无解',
    n: '4',
    distances: '1 2 3 4 5 9',
  },
];
