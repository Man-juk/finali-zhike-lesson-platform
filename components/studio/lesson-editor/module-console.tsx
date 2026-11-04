'use client';
import {useState} from 'react';
import {ChevronDown,GripVertical,Sparkles} from 'lucide-react';
import type {Draft} from '@/lib/lesson';
import {formatTeachingContext} from '@/lib/evidence';
import {
 moduleLabel,
 orderedModuleIds,
 reorderModules,
 type LessonEditorLayout,
 type LessonEditorModuleId,
} from '@/lib/lesson-editor-layout';
import {grammarNodes,vocabularyNodes} from '@/lib/lesson-editor-layout';
import {selectedGrammarQuestions} from '@/lib/grammar-data';

function ModuleBody({id,draft,total}:{id:LessonEditorModuleId;draft:Draft;total:number}){
 const lesson=draft.lesson;
 const brief=draft.brief;
 if(id==='intro'){
  return <div className="lesson-module-body">
   <p><strong>标题</strong> · {lesson.title||brief.topic||'（未填写）'}</p>
   <p><strong>副标题</strong> · {brief.courseType} · {total} 分钟 · {brief.students} 人 · {formatTeachingContext(brief)||'教学对象未填写'}</p>
  </div>;
 }
 if(id==='goals'){
  return <div className="lesson-module-body">
   {lesson.goals.map(g=><p key={g.id}><strong>{g.domain}</strong> · {g.text||'（未填写）'}</p>)}
   {lesson.difficulties.length>0&&<><p className="lesson-module-subhead">教学难点</p>{lesson.difficulties.map((d,i)=><p key={i}>{d.text}</p>)}</>}
  </div>;
 }
 if(id==='vocabulary'){
  const words=vocabularyNodes(draft);
  return <div className="lesson-module-body">
   {words.length?words.map(k=><p key={k.id} className="lesson-module-graph-line"><span className="lesson-graph-tag">图谱</span>{k.name}{k.pinyin?`（${k.pinyin}）`:''}</p>):<p className="helper">暂无已核验词汇节点。</p>}
   {lesson.materials.map((m,i)=><p key={i}><strong>{m.title}</strong> · {(m.content||'').slice(0,120)}{(m.content||'').length>120?'…':''}</p>)}
  </div>;
 }
 if(id==='grammar'){
  const nodes=grammarNodes(draft);
  return <div className="lesson-module-body">
   {nodes.length?nodes.map(k=><p key={k.id} className="lesson-module-graph-line"><span className="lesson-graph-tag">图谱</span>{k.name}</p>):<p className="helper">暂无已核验语法点。</p>}
  </div>;
 }
 if(id==='steps'){
  return <div className="lesson-module-body">
   {lesson.activities.map((a,i)=><p key={a.id}><strong>{String(i+1).padStart(2,'0')} {a.title}</strong> · {a.minutes} 分钟</p>)}
  </div>;
 }
 if(id==='exercises'){
  const graphCount=selectedGrammarQuestions(draft.knowledge).reduce((n,g)=>n+g.questions.length,0);
  return <div className="lesson-module-body">
   {graphCount>0&&<p>图谱语法例题 {graphCount} 道</p>}
   {lesson.exercises.map((q,i)=><p key={i}>检查题 {i+1} · {(q.question||'').slice(0,80)}{(q.question||'').length>80?'…':''}</p>)}
   {!graphCount&&!lesson.exercises.length&&<p className="helper">暂无练习内容。</p>}
  </div>;
 }
 return <div className="lesson-module-body">
  {lesson.board&&<p><strong>板书</strong> · {lesson.board.slice(0,100)}{lesson.board.length>100?'…':''}</p>}
  {lesson.homework&&<p><strong>课后任务</strong> · {lesson.homework.slice(0,100)}{lesson.homework.length>100?'…':''}</p>}
  {lesson.notes&&<p className="helper">{lesson.notes.slice(0,120)}</p>}
 </div>;
}

export function ModuleConsole({draft,layout,onLayoutChange,total}:{draft:Draft;layout:LessonEditorLayout;onLayoutChange:(next:LessonEditorLayout)=>void;total:number}){
 const [dragId,setDragId]=useState<LessonEditorModuleId|null>(null);
 const [dropTarget,setDropTarget]=useState<LessonEditorModuleId|null>(null);
 const toggle=(id:LessonEditorModuleId)=>{
  onLayoutChange({...layout,visible:{...layout.visible,[id]:!layout.visible[id]}});
 };
 const ids=orderedModuleIds(layout);
 const onDrop=(target:LessonEditorModuleId)=>{
  if(!dragId||dragId===target){setDragId(null);setDropTarget(null);return}
  onLayoutChange({...layout,order:reorderModules(layout.order,dragId,target)});
  setDragId(null);
  setDropTarget(null);
 };
 return <aside className="lesson-module-console" aria-label="A4 模块控制台">
  {ids.map(id=><details
   className={'lesson-module-panel'+(dropTarget===id?' lesson-module-panel-drop':dragId===id?' lesson-module-panel-dragging':'')}
   key={id}
   open
   onDragOver={e=>{e.preventDefault();setDropTarget(id)}}
   onDragLeave={()=>{if(dropTarget===id)setDropTarget(null)}}
   onDrop={e=>{e.preventDefault();onDrop(id)}}
  >
   <summary className="lesson-module-summary">
    <span
     className="lesson-module-grip"
     draggable
     title="拖拽调整模块顺序"
     onDragStart={e=>{setDragId(id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id)}}
     onDragEnd={()=>{setDragId(null);setDropTarget(null)}}
     onClick={e=>e.stopPropagation()}
    ><GripVertical size={16}/></span>
    <span className="lesson-module-name">{moduleLabel(id)}</span>
    <span className="lesson-module-actions" onClick={e=>{e.preventDefault();e.stopPropagation();}}>
     <label className="lesson-module-toggle" onClick={e=>e.stopPropagation()}>
      <input type="checkbox" checked={layout.visible[id]} onChange={()=>toggle(id)} onClick={e=>e.stopPropagation()}/>
      <span>{layout.visible[id]?'显示':'隐藏'}</span>
     </label>
     <button type="button" className="lesson-module-regen" disabled title="局部重新生成即将支持"><Sparkles size={14}/>重新生成</button>
    </span>
    <ChevronDown size={16} className="lesson-module-chevron" aria-hidden="true"/>
   </summary>
   <ModuleBody id={id} draft={draft} total={total}/>
  </details>)}
 </aside>;
}
