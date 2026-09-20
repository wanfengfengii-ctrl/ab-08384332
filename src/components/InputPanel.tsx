import { useRef } from 'react';
import { expectedCount, MAX_N, MIN_N, type ParseResult } from '../solver/parse';
import { SAMPLES } from '../samples';

interface Props {
  nText: string;
  distText: string;
  parsed: ParseResult;
  solving: boolean;
  onNChange: (v: string) => void;
  onDistChange: (v: string) => void;
  onSample: (n: string, distances: string) => void;
  onSolve: () => void;
  onCancel: () => void;
}

export default function InputPanel(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const n = Number(props.nText);
  const need = Number.isInteger(n) && n >= MIN_N && n <= MAX_N ? expectedCount(n) : null;

  const handleFile = async (file: File) => {
    const text = await file.text();
    let body = text.trim();
    // 支持 JSON 数组（如 [1, 2.5, 3]），其余按纯文本/CSV 解析
    if (body.startsWith('[')) {
      try {
        const arr: unknown = JSON.parse(body);
        if (Array.isArray(arr)) body = arr.map(String).join(' ');
      } catch {
        /* 保留原文本 */
      }
    }
    props.onDistChange(body);
  };

  return (
    <section className="card input-panel">
      <h2>测量输入</h2>

      <div className="field-row">
        <label htmlFor="marker-count">标记数量 n（{MIN_N}–{MAX_N}，位置互异）</label>
        <input
          id="marker-count"
          type="number"
          min={MIN_N}
          max={MAX_N}
          step={1}
          value={props.nText}
          onChange={(e) => props.onNChange(e.target.value)}
        />
        <span className="hint">{need !== null ? `需恰好 n(n−1)/2 = ${need} 个间距` : '—'}</span>
      </div>

      <div className="field">
        <label htmlFor="distances">两两间距多重集（非负、最多三位小数；空白 / 逗号分隔）</label>
        <textarea
          id="distances"
          rows={9}
          spellCheck={false}
          value={props.distText}
          onChange={(e) => props.onDistChange(e.target.value)}
          placeholder="例如：1 3 3 4 6 7"
        />
        <div className="token-count">
          已识别 <strong>{props.parsed.tokenCount}</strong>
          {need !== null ? ` / ${need}` : ''} 个间距
        </div>
      </div>

      {!props.parsed.ok && (
        <ul className="errors">
          {props.parsed.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="button-row">
        {props.solving ? (
          <button className="btn btn-danger" onClick={props.onCancel}>
            取消求解
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={!props.parsed.ok}
            onClick={props.onSolve}
            title={props.parsed.ok ? '在浏览器本地完整搜索布局' : '请先修正输入'}
          >
            开始重建
          </button>
        )}
        <button className="btn" onClick={() => fileRef.current?.click()}>
          导入文件…
        </button>
        <button className="btn" onClick={() => props.onDistChange('')}>
          清空
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.json,text/plain,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="samples">
        {SAMPLES.map((s) => (
          <button key={s.key} className="btn btn-link" onClick={() => props.onSample(s.n, s.distances)}>
            {s.label}
          </button>
        ))}
      </div>

      <p className="note">修改任意输入将自动清除当前裁决与求解进度。</p>
    </section>
  );
}
