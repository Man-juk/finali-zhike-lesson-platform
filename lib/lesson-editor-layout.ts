import type {Draft} from '@/lib/lesson';

export const EDITOR_LAYOUT_STORAGE_KEY = 'zhike-lesson-editor-layout';

export const lessonEditorModuleIds = [
 'intro',
 'goals',
 'vocabulary',
 'grammar',
 'steps',
 'exercises',
 'appendix',
] as const;
export type LessonEditorModuleId = (typeof lessonEditorModuleIds)[number];

export const lessonEditorModules: {id: LessonEditorModuleId; label: string}[] = [
 {id: 'intro', label: '课程基本信息（标题与对象）'},
 {id: 'goals', label: '教学目标'},
 {id: 'vocabulary', label: '核心词汇'},
 {id: 'grammar', label: '语法点'},
 {id: 'steps', label: '教学步骤'},
 {id: 'exercises', label: '课堂练习'},
 {id: 'appendix', label: '板书与作业'},
];

export type LessonEditorLayout = {
 visible: Record<LessonEditorModuleId, boolean>;
 order: LessonEditorModuleId[];
};

export function defaultEditorLayout(): LessonEditorLayout {
 return {
  visible: {
   intro: true,
   goals: true,
   vocabulary: true,
   grammar: true,
   steps: true,
   exercises: true,
   appendix: true,
  },
  order: [...lessonEditorModuleIds],
 };
}

/** 合并旧存档（缺 intro / order）与非法字段，保证 order 含全部模块且唯一。 */
export function normalizeEditorLayout(input: unknown): LessonEditorLayout {
 const base = defaultEditorLayout();
 if (!input || typeof input !== 'object') return base;
 const raw = input as Partial<LessonEditorLayout>;
 const visible = {...base.visible};
 if (raw.visible && typeof raw.visible === 'object') {
  for (const id of lessonEditorModuleIds) {
   const v = (raw.visible as Record<string, unknown>)[id];
   if (typeof v === 'boolean') visible[id] = v;
  }
 }
 let order: LessonEditorModuleId[] = Array.isArray(raw.order)
  ? raw.order.filter((id): id is LessonEditorModuleId =>
     typeof id === 'string' && (lessonEditorModuleIds as readonly string[]).includes(id),
    )
  : [];
 if (!order.length) order = [...base.order];
 for (const id of lessonEditorModuleIds) {
  if (!order.includes(id)) order.push(id);
 }
 order = [...new Set(order)];
 return {visible, order};
}

export function readStoredEditorLayout(): LessonEditorLayout {
 if (typeof window === 'undefined') return defaultEditorLayout();
 try {
  const raw = window.localStorage.getItem(EDITOR_LAYOUT_STORAGE_KEY);
  if (!raw) return defaultEditorLayout();
  return normalizeEditorLayout(JSON.parse(raw));
 } catch {
  return defaultEditorLayout();
 }
}

export function persistEditorLayout(layout: LessonEditorLayout): void {
 if (typeof window === 'undefined') return;
 try {
  window.localStorage.setItem(
   EDITOR_LAYOUT_STORAGE_KEY,
   JSON.stringify(normalizeEditorLayout(layout)),
  );
 } catch {
  /* 隐私模式等 */
 }
}

export function moduleLabel(id: LessonEditorModuleId): string {
 return lessonEditorModules.find(m => m.id === id)?.label ?? id;
}

export function orderedModuleIds(layout: LessonEditorLayout): LessonEditorModuleId[] {
 return normalizeEditorLayout(layout).order;
}

export function reorderModules(
 order: LessonEditorModuleId[],
 from: LessonEditorModuleId,
 to: LessonEditorModuleId,
): LessonEditorModuleId[] {
 if (from === to) return order;
 const next = [...order];
 const fromIndex = next.indexOf(from);
 const toIndex = next.indexOf(to);
 if (fromIndex < 0 || toIndex < 0) return order;
 next.splice(fromIndex, 1);
 next.splice(toIndex, 0, from);
 return next;
}

export function coreKnowledge(draft: Draft) {
 return draft.knowledge.filter(k => k.verified && k.role !== '排除');
}

export function vocabularyNodes(draft: Draft) {
 return coreKnowledge(draft).filter(k => k.kind === 'Word' || k.kind === 'Idiom');
}

export function grammarNodes(draft: Draft) {
 return coreKnowledge(draft).filter(k => k.kind === 'Grammar');
}
