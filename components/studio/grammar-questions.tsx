'use client';
import type {Knowledge} from '@/lib/lesson';
import {selectedGrammarQuestions} from '@/lib/grammar-data';
import {ExerciseCard} from '@/components/studio/exercise-card';
export function GrammarQuestionPicker({item,onChange}:{item:Knowledge;onChange:(item:Knowledge)=>void}){
 if(item.kind!=='Grammar')return null;
 return <section className="kb-block"><h4 className="kb-title">图谱关联例题</h4><p className="kb-note">每个语法点最多三道，选中后加入教学材料；未手动选择时自动使用已返回的例题。</p>
  {item.grammarQuestionStatus==='unavailable'?<p className="helper">本次无法读取关联题目，仍可使用语法释义和例句。</p>:!item.grammarQuestions?.length?<p className="helper">图谱未返回可访问的关联例题。</p>:item.grammarQuestions.map((question,index)=>{
   const checked=item.selectedQuestionIds?.includes(question.id)||false;
   return <article className="grammar-question" key={question.id}>
    <label><input type="checkbox" checked={checked} disabled={!checked&&(item.selectedQuestionIds?.length||0)>=3} onChange={()=>onChange({...item,selectedQuestionIds:checked?(item.selectedQuestionIds||[]).filter(id=>id!==question.id):[...(item.selectedQuestionIds||[]),question.id],scopeConfirmed:false})}/><strong>{question.name||'例题 '+(index+1)}</strong></label>
    <ExerciseCard kindLabel={item.name} index={index+1} question={question}/>
   </article>;
  })}
 </section>;
}
/** 教案预览 ·「练习与评价」：图谱关联语法例题 */
export function GrammarExercises({knowledge}:{knowledge:Knowledge[]}){
 const groups=selectedGrammarQuestions(knowledge).filter(group=>group.questions.length);
 if(!groups.length)return null;
 return <section className="grammar-exercises" aria-label="图谱语法例题">
  <h3 className="exercises-section-title">图谱语法例题</h3>
  <p className="helper exercises-section-lead">来自知识图谱的关联练习，与下方 AI 设计的检查题分开列出。</p>
  <div className="exercise-card-list">
   {groups.flatMap(({item,questions})=>questions.map((question,index)=><ExerciseCard key={item.id+question.id} kindLabel={item.name} index={index+1} question={question} provenance="来源：国际中文教育知识图谱"/>))}
  </div>
 </section>;
}
