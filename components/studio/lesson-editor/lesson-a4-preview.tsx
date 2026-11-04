'use client';
import type {Draft} from '@/lib/lesson';
import {objectiveDomains} from '@/lib/lesson';
import {formatTeachingContext} from '@/lib/evidence';
import {GrammarExercises} from '@/components/studio/grammar-questions';
import {orderedModuleIds,type LessonEditorLayout,type LessonEditorModuleId} from '@/lib/lesson-editor-layout';
import {grammarNodes,vocabularyNodes} from '@/lib/lesson-editor-layout';

function A4Section({id,draft,total}:{id:LessonEditorModuleId;draft:Draft;total:number}){
 const lesson=draft.lesson;
 if(id==='intro') return null;
 if(id==='goals'){
  return <section className="lesson-a4-section">
   <h2 className="lesson-a4-section-title">教学目标</h2>
   {objectiveDomains.map(domain=>{
    const items=lesson.goals.filter(g=>g.domain===domain);
    if(!items.length)return null;
    return <div key={domain} className="lesson-a4-subsection">
     <h3 className="lesson-a4-subtitle">{domain}</h3>
     <ol className="lesson-a4-list">{items.map(g=><li key={g.id}>{g.text}</li>)}</ol>
    </div>;
   })}
   {lesson.difficulties.length>0&&<>
    <h3 className="lesson-a4-subtitle">教学难点</h3>
    <ul className="lesson-a4-list">{lesson.difficulties.map((d,i)=><li key={i}>{d.text}</li>)}</ul>
   </>}
  </section>;
 }
 if(id==='vocabulary'){
  return <section className="lesson-a4-section">
   <h2 className="lesson-a4-section-title">核心词汇</h2>
   {vocabularyNodes(draft).length>0&&<ul className="lesson-a4-tag-list">{vocabularyNodes(draft).map(k=><li key={k.id} className="lesson-a4-graph-chip">{k.name}{k.pinyin?` · ${k.pinyin}`:''}</li>)}</ul>}
   {lesson.materials.map((m,i)=><div key={i} className="lesson-a4-block"><h3 className="lesson-a4-subtitle">{m.title}</h3><p className="lesson-a4-paragraph">{m.content}</p></div>)}
   {!vocabularyNodes(draft).length&&!lesson.materials.length&&<p className="lesson-a4-muted">（暂无词汇与材料）</p>}
  </section>;
 }
 if(id==='grammar'){
  return <section className="lesson-a4-section">
   <h2 className="lesson-a4-section-title">语法点</h2>
   {grammarNodes(draft).map(k=><div key={k.id} className="lesson-a4-graph-block">
    <h3 className="lesson-a4-subtitle lesson-a4-graph-chip inline">{k.name}</h3>
    <p className="lesson-a4-paragraph">{(k.selectedMeaning||k.detail||'').slice(0,800)}</p>
    {(k.selectedExamples||[]).map((ex,i)=><p key={i} className="lesson-a4-example">例：{ex}</p>)}
   </div>)}
   {!grammarNodes(draft).length&&<p className="lesson-a4-muted">（暂无语法点）</p>}
  </section>;
 }
 if(id==='steps'){
  return <section className="lesson-a4-section">
   <h2 className="lesson-a4-section-title">教学步骤</h2>
   {lesson.activities.map((a,i)=><div key={a.id} className="lesson-a4-step">
    <h3 className="lesson-a4-subtitle">{String(i+1).padStart(2,'0')} {a.title} <span className="lesson-a4-muted">（{a.minutes} 分钟 · {a.grouping}）</span></h3>
    <p className="lesson-a4-paragraph"><strong>教师：</strong>{a.teacher}</p>
    <p className="lesson-a4-paragraph"><strong>学生：</strong>{a.students}</p>
    <p className="lesson-a4-paragraph"><strong>产出：</strong>{a.output}</p>
    <p className="lesson-a4-paragraph"><strong>评价：</strong>{a.assessment}</p>
   </div>)}
  </section>;
 }
 if(id==='exercises'){
  return <section className="lesson-a4-section lesson-a4-section-exercises">
   <h2 className="lesson-a4-section-title">课堂练习与评价</h2>
   <div className="lesson-a4-exercises-wrap"><GrammarExercises knowledge={draft.knowledge}/></div>
   {lesson.exercises.map((q,i)=><div key={i} className="lesson-a4-block">
    <h3 className="lesson-a4-subtitle">检查题 {i+1}</h3>
    <p className="lesson-a4-paragraph">{q.question}</p>
    <details className="lesson-a4-answer-fold"><summary>参考答案 / 评分标准</summary><p>{q.answer}</p></details>
   </div>)}
  </section>;
 }
 return <section className="lesson-a4-section">
  <h2 className="lesson-a4-section-title">板书与作业</h2>
  {lesson.board&&<div className="lesson-a4-block"><h3 className="lesson-a4-subtitle">板书提纲</h3><p className="lesson-a4-paragraph pre">{lesson.board}</p></div>}
  {lesson.homework&&<div className="lesson-a4-block"><h3 className="lesson-a4-subtitle">课后与分层任务</h3><p className="lesson-a4-paragraph pre">{lesson.homework}</p></div>}
  {lesson.notes&&<p className="lesson-a4-muted">{lesson.notes}</p>}
 </section>;
}

export function LessonA4Preview({draft,layout,total}:{draft:Draft;layout:LessonEditorLayout;total:number}){
 const lesson=draft.lesson;
 const brief=draft.brief;
 const show=(id:LessonEditorModuleId)=>layout.visible[id];
 const bodyOrder=orderedModuleIds(layout).filter(id=>id!=='intro');
 return <div className="lesson-a4-scroll">
  <article className="lesson-a4-sheet" aria-label="教案 A4 预览">
   {show('intro')&&<header className="lesson-a4-header">
    <h1 className="lesson-a4-doc-title">{lesson.title||brief.topic||'未命名教案'}</h1>
    <p className="lesson-a4-meta">{brief.courseType} · {total} 分钟 · {brief.students} 人 · {formatTeachingContext(brief)||'教学对象未填写'}</p>
   </header>}
   {bodyOrder.map(id=>show(id)?<A4Section key={id} id={id} draft={draft} total={total}/>:null)}
  </article>
 </div>;
}
