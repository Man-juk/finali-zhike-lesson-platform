'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { formatAudience } from '@/lib/evidence';
import { standardNames, type Audience } from '@/lib/lesson';

/**
 * 组合式「教学对象」输入面板。
 *
 * 界面上是一个只读输入框（带下拉箭头），点开后才展开国家／地区、年龄、汉语等级、母语和文化背景字段。
 * 底层仍保留三个子字段（nationality / age / level），只是不直接平铺在页面上。
 */
export default function AudiencePicker({
  value,
  standard,
  onChange,
}: {
  value: Audience;
  standard: string;
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

  const summary = formatAudience(value,standard);

  function confirm() {
    onChange({
      ...draft,
      motherTongue: (draft.motherTongue||'').trim(),
      culturalBackground: draft.culturalBackground||'',
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
              学生国家／地区
              <input
                value={draft.nationality}
                maxLength={60}
                onChange={e => setDraft(d => ({ ...d, nationality: e.target.value }))}
                placeholder="例如：日本；或日本、泰国、法国"
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
              当前汉语等级
              <select value={draft.level} onChange={e => setDraft(d => ({ ...d, level: e.target.value }))}>
                <option value="">未指定</option>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(x => (
                  <option key={x} value={x}>
                    {standardNames[standard]} {x}级
                  </option>
                ))}
              </select>
            </label>
            <label className="field">学生母语
              <input value={draft.motherTongue||''} maxLength={100} onChange={e=>setDraft(d=>({...d,motherTongue:e.target.value}))} placeholder="例如：日语；或英语、泰语等多种母语"/>
            </label>
            <label className="field">文化背景构成
              <select value={draft.culturalBackground||''} onChange={e=>setDraft(d=>({...d,culturalBackground:e.target.value as Audience['culturalBackground']}))}>
                <option value="">未指定</option><option value="单一国家">单一国家背景</option><option value="多国混合">多国混合背景</option>
              </select>
            </label>
          </div>
          <p className="helper">多国班级可填写多个国家与母语；国籍不会自动决定学生母语或文化习惯。</p>
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
