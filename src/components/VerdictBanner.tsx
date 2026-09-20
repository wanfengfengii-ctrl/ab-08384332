import type { SolveOutput, Verdict } from '../solver/turnpike';

const VERDICT_TEXT: Record<Verdict, { title: string; desc: string }> = {
  none: {
    title: '裁决：无解',
    desc: '不存在与该间距多重集精确一致的标记布局（已完整搜索）。',
  },
  unique: {
    title: '裁决：唯一布局',
    desc: '存在且仅存在一个布局（镜像视为同一布局，已完整搜索）。',
  },
  multiple: {
    title: '裁决：多个非镜像布局',
    desc: '存在多个互不为镜像的布局；下方给出规范最小布局与第二份歧义见证。',
  },
  unknown: {
    title: '裁决：无法判定',
    desc: '搜索安全预算耗尽，未能完成完整枚举；请检查输入或提高预算。',
  },
};

export default function VerdictBanner({ output }: { output: SolveOutput }) {
  const { verdict, stats } = output;
  const t = VERDICT_TEXT[verdict];
  return (
    <div className={`verdict verdict-${verdict}`} role="status">
      <div className="verdict-title">{t.title}</div>
      <div className="verdict-desc">{t.desc}</div>
      <div className="verdict-stats">
        搜索节点 {stats.nodes.toLocaleString()} · 用时 {stats.elapsedMs.toFixed(1)} ms · 规范布局{' '}
        {stats.solutionCount.toLocaleString()} 个
        {stats.truncated ? '（达到安全上限，枚举不完整）' : '（解空间已完整枚举）'}
      </div>
    </div>
  );
}
