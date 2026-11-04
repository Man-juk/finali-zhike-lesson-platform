'use client';
import type {Draft} from '@/lib/lesson';
import type {LessonEditorLayout} from '@/lib/lesson-editor-layout';
import {ModuleConsole} from '@/components/studio/lesson-editor/module-console';
import {LessonA4Preview} from '@/components/studio/lesson-editor/lesson-a4-preview';

export function LessonAssembleView({draft,layout,onLayoutChange,total}:{draft:Draft;layout:LessonEditorLayout;onLayoutChange:(layout:LessonEditorLayout)=>void;total:number}){
 return <div className="lesson-workspace">
  <ModuleConsole draft={draft} layout={layout} onLayoutChange={onLayoutChange} total={total}/>
  <LessonA4Preview draft={draft} layout={layout} total={total}/>
 </div>;
}
