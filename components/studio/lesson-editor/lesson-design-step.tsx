'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,ArrowRight,ArrowLeft,Sparkles,AlertCircle,Clock,Users} from 'lucide-react';
import type {Draft,Goal,Lesson} from '@/lib/lesson';
import {objectiveDomains} from '@/lib/lesson';
import {formatTeachingContext} from '@/lib/evidence';
import {PaperReveal,TabBar} from '@/components/studio/motion';
import {DurationBreakdown} from '@/components/studio/duration';
import {CharacterMaterials} from '@/components/studio/character-materials';
import {GrammarExercises} from '@/components/studio/grammar-questions';
import {EvidenceView} from '@/components/studio/evidence';
import {defaultEditorLayout,persistEditorLayout,readStoredEditorLayout,type LessonEditorLayout} from '@/lib/lesson-editor-layout';
import {LessonAssembleView} from '@/components/studio/lesson-editor/lesson-assemble-view';

const contentTabs=['教学过程','配套材料','练习与评价','板书与作业','图谱原文'];
const designViews=['内容编辑','A4 预览与组装'] as const;
type DesignView=(typeof designViews)[number];

export type LessonDesignStepProps={
 draft:Draft;
 tab:number;
 setTab:(i:number)=>void;
 total:number;
 durationSlices:{name:string;minutes:number}[];
 currentMismatch:boolean;
 busy:string;
 revision:string;
 setRevision:(v:string)=>void;
 editLesson:(f:(l:Lesson)=>Lesson)=>void;
 editActivity:(index:number,key:string,value:string|number)=>void;
 generate:(revise?:boolean)=>void;
 setStep:(n:number)=>void;
};

export function LessonDesignStep(props:LessonDesignStepProps){
 const {draft,tab,setTab,total,durationSlices,currentMismatch,busy,revision,setRevision,editLesson,editActivity,generate,setStep}=props;
 const [designView,setDesignView]=useState<DesignView>('内容编辑');
 const [editorLayout,setEditorLayout]=useState<LessonEditorLayout>(defaultEditorLayout);
 const skipPersist=useRef(true);
 useEffect(()=>{setEditorLayout(readStoredEditorLayout())},[]);
 useEffect(()=>{
  if(skipPersist.current){skipPersist.current=false;return}
  persistEditorLayout(editorLayout);
 },[editorLayout]);
 const viewIndex=designView==='内容编辑'?0:1;

 return <>
  {(draft.validationWarnings?.length||0)>0&&<div className="message warn" role="status"><AlertCircle size={18}/><div><strong>已生成待审核草稿，可继续编辑和导出</strong><ul>{draft.validationWarnings!.map((text,i)=><li key={i}>{text}</li>)}</ul><button className="text-button" disabled={!!busy} onClick={()=>setRevision('请修复以下检查问题，保留已确认的图谱原文，不新增未经核验的规则：'+draft.validationWarnings!.join('；'))}>将问题填入修订要求</button></div></div>}
  <PaperReveal className="paper-reveal">
   <div className="paper">
    <div className="paper-lesson">
     <div className="card-heading"><span className="section-icon"><BookOpen size={22}/></span><div><h2>让教学设计落到每一步</h2><p>{draft.source!=='template'?'AI 设计建议 · 原文知识单独存档':'规则模板草稿 · 需补充具体情境和材料'}</p></div><span className="step-counter">03 / 04</span></div>
     <div className="lesson-intro">
      <input className="lesson-title" aria-label="教案标题" value={draft.lesson.title} onChange={e=>editLesson(l=>({...l,title:e.target.value}))}/>
      <div className="lesson-meta"><span><Clock size={14}/>{total} 分钟</span><span><Users size={14}/>{draft.brief.students} 人</span><span>{draft.brief.courseType} · {formatTeachingContext(draft.brief)||'教学对象未填写'}</span><span className="badge pending">教师待审核</span></div>
      {currentMismatch&&<div className="message error">需求或知识范围已修改。当前仍显示旧版教案，请返回知识确认后重新生成。</div>}
      <div className="goals"><strong>本课学习目标</strong>{draft.lesson.goals.map((g,i)=><label key={g.id}><span>{String(i+1).padStart(2,'0')}</span><select aria-label={'目标领域'+(i+1)} value={g.domain} onChange={e=>editLesson(l=>({...l,goals:l.goals.map((x,n)=>n===i?{...x,domain:e.target.value as Goal['domain']}:x)}))}>{objectiveDomains.map(d=><option key={d}>{d}</option>)}</select><textarea aria-label={'教学目标'+(i+1)} value={g.text} onChange={e=>editLesson(l=>({...l,goals:l.goals.map((x,n)=>n===i?{...x,text:e.target.value}:x)}))} rows={2}/></label>)}</div>
      <DurationBreakdown slices={durationSlices} total={total}/>
     </div>
     <div className="lesson-design-viewbar">
      <TabBar tabs={[...designViews]} active={viewIndex} onSelect={i=>setDesignView(designViews[i]??'内容编辑')}/>
     </div>
     {designView==='内容编辑'&&<>
      <TabBar tabs={contentTabs} active={tab} onSelect={setTab}/>
      <div className="lesson-content">
       {tab!==4&&<div className="source-banner generated"><Sparkles size={17}/><div><strong>{draft.source==='template'?'规则模板设计区':'AI 教学设计区'}</strong><p>本区活动、练习、情境与说明不等于图谱事实；图谱原文请查看独立标签。</p></div></div>}
       {tab===0&&draft.lesson.activities.map((a,i)=><article className="activity" key={a.id}><div className="activity-heading"><span className="activity-index">{String(i+1).padStart(2,'0')}</span><input aria-label={'环节'+(i+1)+'名称'} value={a.title} onChange={e=>editActivity(i,'title',e.target.value)}/><label><input type="number" aria-label={a.title+'分钟数'} min={1} max={180} value={a.minutes} onChange={e=>editActivity(i,'minutes',Number(e.target.value))}/>分钟</label></div><div className="activity-tags"><span>{a.grouping}</span><span>目标 {a.goalIds.join(' / ')}</span>{a.knowledgeIds.map(id=><span key={id}>{draft.knowledge.find(k=>k.id===id)?.name||id}</span>)}</div>{(['teacher','students','output','assessment'] as const).map(key=><label className="activity-field" key={key}><strong>{{teacher:'教师引导',students:'学生操作',output:'课堂产出',assessment:'评价方式'}[key]}</strong><textarea rows={key==='teacher'||key==='students'?3:2} aria-label={a.title+key} value={a[key]} onChange={e=>editActivity(i,key,e.target.value)}/></label>)}</article>)}
       {tab===1&&<CharacterMaterials knowledge={draft.knowledge}/>}
       {tab===1&&draft.lesson.materials.map((m,i)=><article className="material" key={i}><h3>{m.title}</h3><textarea aria-label={m.title} rows={8} value={m.content} onChange={e=>editLesson(l=>({...l,materials:l.materials.map((x,n)=>n===i?{...x,content:e.target.value}:x)}))}/></article>)}
       {tab===2&&<GrammarExercises knowledge={draft.knowledge}/>}
       {tab===2&&!!draft.lesson.exercises.length&&<h3 className="exercises-section-title exercises-section-title-secondary">教案检查题</h3>}
       {tab===2&&draft.lesson.exercises.map((q,i)=><article className="material exercise-lesson-item" key={i}><h3>检查题 {i+1}<span className="badge">目标 {q.goalIds.join(' / ')}</span></h3><label className="field">题目<textarea rows={3} value={q.question} onChange={e=>editLesson(l=>({...l,exercises:l.exercises.map((x,n)=>n===i?{...x,question:e.target.value}:x)}))}/></label><label className="field">参考答案 / 评分标准<textarea rows={3} value={q.answer} onChange={e=>editLesson(l=>({...l,exercises:l.exercises.map((x,n)=>n===i?{...x,answer:e.target.value}:x)}))}/></label></article>)}
       {tab===4&&<EvidenceView knowledge={draft.knowledge}/>}
       {tab===3&&<><label className="field">教学难点<textarea rows={4} value={draft.lesson.difficulties.map(d=>d.text).join('\n')} onChange={e=>editLesson(l=>({...l,difficulties:e.target.value.split('\n').map(t=>t.trim()).filter(Boolean).map(text=>({text}))}))} placeholder="每行一条本课学生最可能卡住的具体问题"/></label><label className="field">板书提纲<textarea rows={8} value={draft.lesson.board} onChange={e=>editLesson(l=>({...l,board:e.target.value}))}/></label><label className="field">课后与分层任务<textarea rows={6} value={draft.lesson.homework} onChange={e=>editLesson(l=>({...l,homework:e.target.value}))}/></label><p className="helper">{draft.lesson.notes}</p></>}
      </div>
     </>}
     {designView==='A4 预览与组装'&&<div className="lesson-assemble-stage"><LessonAssembleView draft={draft} layout={editorLayout} onLayoutChange={setEditorLayout} total={total}/></div>}
    </div>
   </div>
  </PaperReveal>
  <div className="revision"><label htmlFor="revision"><Sparkles size={16}/>让 AI 协助修订</label><div><input id="revision" value={revision} maxLength={1000} onChange={e=>setRevision(e.target.value)} placeholder="例如：保留信息差，把小组活动换成两人活动"/><button className="secondary" disabled={!!busy||!revision.trim()||currentMismatch} onClick={()=>generate(true)}>修订</button></div><small>缩短课时请先修改教学需求，再重新确认并生成。</small></div>
  <div className="card-footer"><button className="text-button" onClick={()=>setStep(1)}><ArrowLeft size={16}/>返回知识范围</button><button className="primary" onClick={()=>setStep(3)}>检查教案并导出<ArrowRight size={17}/></button></div>
 </>;
}
