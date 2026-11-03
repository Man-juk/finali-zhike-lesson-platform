'use client';
import { useState } from 'react';
import { ChevronDown, Check, LayoutTemplate, SlidersHorizontal } from 'lucide-react';
import {
 templatePresets,
 templateModules,
 presetModules,
 enabledTemplateModules,
 isCustomizedTemplate,
 type TemplateConfig,
 type TemplatePreset,
 type TemplateModuleKey,
} from '@/lib/lesson';

/**
 * 「教案结构偏好」配置区。
 *
 * 只在前端收集老师的排版偏好，不改变底层生成逻辑：
 * 预设套餐 + 模块开关 + 特别要求，合并成 templateConfig 随 brief 一起
 * 提交到 /api/lesson，供后续接入生成管线使用。
 *
 * 做成可折叠面板：折叠时只显示一行摘要（套餐名 + 已选模块数），
 * 避免在侧栏挤占教学需求表单的注意力。
 */
export default function TemplateConfigPanel({
 value,
 onChange,
 defaultOpen = false,
}: {
 value: TemplateConfig;
 onChange: (next: TemplateConfig) => void;
 /** 弹窗形态下直接展开，折叠态没有意义。 */
 defaultOpen?: boolean;
}) {
 const [open, setOpen] = useState(defaultOpen);
 const enabled = enabledTemplateModules(value);
 const customized = isCustomizedTemplate(value);
 const preset = templatePresets.find(p => p.id === value.preset) ?? templatePresets[0];

 // 选套餐：重置该套餐的模块开关，并清掉「已自定义」提示。
 function pickPreset(id: TemplatePreset) {
  onChange({ ...value, preset: id, modules: { ...presetModules[id] } });
 }

 // 单独开关一个模块：只改这一项，其余保持老师当前的选择。
 function toggleModule(key: TemplateModuleKey) {
  onChange({ ...value, modules: { ...value.modules, [key]: !value.modules[key] } });
 }

 return (
  <div className={'template-config' + (open ? ' open' : '')}>
    <button
      type="button"
      className="template-config-trigger"
      aria-expanded={open}
      aria-controls="template-config-body"
      onClick={() => setOpen(o => !o)}
    >
      <span className="template-config-icon"><LayoutTemplate size={17}/></span>
      <span className="template-config-summary">
        <span className="template-config-title">教案结构偏好</span>
        <span className="template-config-hint">
          {preset.label}
          {customized && <em> · 已自定义</em>}
          {' · '}{enabled.length}/{templateModules.length} 个模块
        </span>
      </span>
      <ChevronDown size={16}/>
    </button>

    {open && (
      <div className="template-config-body" id="template-config-body">
        <section className="template-config-section">
          <span className="template-config-label"><SlidersHorizontal size={13}/>预设模板</span>
          <div className="template-preset-grid" role="radiogroup" aria-label="预设模板">
            {templatePresets.map(p => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={value.preset === p.id}
                className={'template-preset' + (value.preset === p.id ? ' chosen' : '')}
                onClick={() => pickPreset(p.id)}
              >
                <span className="template-preset-name">
                  {value.preset === p.id && <Check size={13}/>}
                  {p.label}
                </span>
                <span className="template-preset-hint">{p.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="template-config-section">
          <span className="template-config-label">
            模块开关
            <em>{enabled.length}/{templateModules.length} 个已选</em>
          </span>
          <div className="template-module-list">
            {templateModules.map(m => (
              <label className="template-module" key={m.key}>
                <input
                  type="checkbox"
                  checked={value.modules[m.key]}
                  onChange={() => toggleModule(m.key)}
                />
                <span className="template-module-track" aria-hidden="true"><span/></span>
                <span className="template-module-label">{m.label}</span>
              </label>
            ))}
          </div>
          <p className="helper">
            开关只决定教案里保留哪些部分，不影响知识核验与图谱证据。
          </p>
        </section>

        <section className="template-config-section">
          <label className="template-config-label" htmlFor="template-custom-instruction">
            特别要求
          </label>
          <textarea
            id="template-custom-instruction"
            rows={3}
            maxLength={1000}
            value={value.customInstruction}
            onChange={e => onChange({ ...value, customInstruction: e.target.value })}
            placeholder="您对教案排版、行文风格有什么特别要求？（例如：教学步骤请以表格形式呈现 / 请多用全中文撰写，少用英文）"
          />
          <p className="helper">
            特别要求会随教学需求一起提交，供生成环节参考；不会覆盖已核验的知识内容。
          </p>
        </section>
      </div>
    )}
  </div>
 );
}
