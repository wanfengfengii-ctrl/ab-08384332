import { useRef } from 'react';
import { EXAMPLES, type Example } from '../examples';
import type { ParsedDistances } from '../solver/parse';

export interface InputPanelProps {
  nText: string;
  onNChange: (v: string) => void;
  distText: string;
  onDistChange: (v: string) => void;
  nError: string | null;
  expected: number | null;
  parsed: ParsedDistances;
  solving: boolean;
  canSolve: boolean;
  onSolve: () => void;
  onCancel: () => void;
  onImportFile: (file: File) => void;
  onLoadExample: (ex: Example) => void;
  onRandom: () => void;
  onClear: () => void;
}

export default function InputPanel(props: InputPanelProps) {
  const {
    nText,
    onNChange,
    distText,
    onDistChange,
    nError,
    expected,
    parsed,
    solving,
    canSolve,
    onSolve,
    onCancel,
    onImportFile,
    onLoadExample,
    onRandom,
    onClear,
  } = props;
  const fileRef = useRef<HTMLInputElement>(null);

  const countOk =
    expected !== null && parsed.issues.length === 0 && parsed.values.length === expected;

  return (
    <section className="card input-panel" aria-label="输入面板">
      <h2>测量输入</h2>

      <div className="field-row">
        <label className="field">
          <span className="field-label">标记数量 n（4–18，位置互异）</span>
          <input
            type="number"
            min={4}
            max={18}
            value={nText}
            onChange={(e) => onNChange(e.target.value)}
            aria-invalid={nError !== null}
          />
        </label>
        <div className="field expected-box">
          <span className="field-label">所需间距数 n(n−1)/2</span>
          <span className="expected-value">{expected ?? '—'}</span>
        </div>
      </div>
      {nError && <p className="issue">⚠ {nError}</p>}

      <label className="field">
        <span className="field-label">
          两两间距（无序多重集；非负、最多三位小数；空格 / 逗号 / 换行分隔）
        </span>
        <textarea
          rows={9}
          spellCheck={false}
          placeholder={'例如：1 4 6 3 5 2\n或：0.75, 2.5, 3.125, 1.75, 2.375, 0.625'}
          value={distText}
          onChange={(e) => onDistChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSolve) onSolve();
          }}
        />
      </label>

      <div className={`parse-status ${countOk ? 'ok' : parsed.tokenCount > 0 ? 'bad' : ''}`}>
        已解析 {parsed.values.length}
        {expected !== null ? ` / 需 ${expected}` : ''} 个间距
        {parsed.issues.length > 0 && ` · ${parsed.issues.length} 个非法项`}
      </div>
      {parsed.issues.slice(0, 4).map((iss) => (
        <p key={iss.index} className="issue">
          ⚠ 第 {iss.index + 1} 项 “{iss.token}”：{iss.reason}
        </p>
      ))}
      {parsed.issues.length > 4 && (
        <p className="issue">… 其余 {parsed.issues.length - 4} 项问题从略</p>
      )}

      <div className="button-row">
        <button className="primary" disabled={!canSolve} onClick={onSolve}>
          {solving ? '重建中…' : '开始重建'}
        </button>
        {solving && (
          <button className="ghost" onClick={onCancel}>
            取消
          </button>
        )}
        <button
          className="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={solving}
          title='导入 JSON（{"n":…,"distances":[…]} 或纯数字数组）或纯文本数字列表'
        >
          导入文件…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,.csv,application/json,text/plain"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
        <button className="ghost" onClick={onRandom} disabled={solving}>
          随机生成
        </button>
        <button className="ghost" onClick={onClear} disabled={solving}>
          清空
        </button>
      </div>

      <div className="examples">
        <span className="field-label">示例：</span>
        <div className="example-chips">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              className="chip-button"
              title={ex.note}
              onClick={() => onLoadExample(ex)}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <p className="hint">
        计算全程在浏览器内完成（Web Worker），不调用任何后端；间距统一 ×1000
        缩放为整数后精确匹配多重集，重复间距按次数保留。修改输入会清除旧裁决。
      </p>
    </section>
  );
}
