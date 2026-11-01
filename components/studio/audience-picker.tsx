'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { formatAudience } from '@/lib/evidence';
import type { Audience } from '@/lib/lesson';

/**
 * 组合式「教学对象」输入面板。
 *
 * 界面上是一个只读输入框（带下拉箭头），点开后才展开国籍 / 年龄 / 水平三个字段。
 * 底层仍保留三个子字段（nationality / age / level），只是不直接平铺在页面上。
 */
export default function AudiencePicker({
  value,
  onChange,
}: {
  value: Audience;
  onChange: (next: Audience) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Audience>(value);
  const rootRef = useRef<HTMLDivElement>(null);

  // 打开时把当前值复制到草稿，取消不影响已保存的值。
  useEffect(() => {
    if (!open) return;
    setDraft(value);
    // 面板展开后把焦点交给第一个输入框，键盘用户可直接填写。
    const t = setTimeout(() => {
      rootRef.current?.querySelector<HTMLInputElement>('.audience-panel input')?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, value]);

  // 点击面板外部收起（等同取消，不写回）。
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const summary = formatAudience(value);

  function confirm() {
    onChange({
      nationality: draft.nationality.trim(),
      age: draft.age.trim(),
      level: draft.level,
    });
    setOpen(false);
  }

  return (
    <div className="audience-picker" ref={rootRef}>
      <button
        type="button"
        className={'audience-trigger' + (open ? ' open' : '')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={summary ? '' : 'placeholder'}>{summary || '例如：美国，20岁，HSK 3级'}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="audience-panel" role="dialog" aria-label="教学对象">
          <div className="audience-panel-grid">
            <label className="field">
              国籍
              <input
                value={draft.nationality}
                maxLength={60}
                onChange={e => setDraft(d => ({ ...d, nationality: e.target.value }))}
                placeholder="例如：美国"
              />
            </label>
            <label className="field">
              年龄
              <input
                value={draft.age}
                maxLength={20}
                onChange={e => setDraft(d => ({ ...d, age: e.target.value }))}
                placeholder="例如：20"
              />
            </label>
            <label className="field">
              水平
              <select value={draft.level} onChange={e => setDraft(d => ({ ...d, level: e.target.value }))}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(x => (
                  <option key={x} value={x}>
                    HSK {x}级
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="audience-panel-actions">
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              取消
            </button>
            <button type="button" className="primary" onClick={confirm}>
              <Check size={15} />
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
