'use client';
import type {Knowledge} from '@/lib/lesson';
import {selectedGrammarQuestions,type GrammarQuestion} from '@/lib/grammar-data';
export function GrammarQuestionContent({question}:{question:GrammarQuestion}){
 return <div className="grammar-question-content">
  {[question.description,question.corpus,question.stem,question.listenCorpus,question.listenStem,question.choices].filter(Boolean).map((text,index)=><p key={index}>{text}</p>)}
  {question.links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
  {question.answer&&<details><summary>查看图谱答案</summary><p>{question.answer}</p></details>}
 </div>;
}
export function GrammarQuestionPicker({item,onChange}:{item:Knowledge;onChange:(item:Knowledge)=>void}){
 if(item.kind!=='Grammar')return null;
 return <section className="kb-block"><h4 className="kb-title">图谱关联例题</h4><p className="kb-note">每个语法点最多三道，选中后加入教学材料；未手动选择时自动使用已返回的例题。</p>
  {item.grammarQuestionStatus==='unavailable'?<p className="helper">本次无法读取关联题目，仍可使用语法释义和例句。</p>:!item.grammarQuestions?.length?<p className="helper">图谱未返回可访问的关联例题。</p>:item.grammarQuestions.map((question,index)=>{
   const checked=item.selectedQuestionIds?.includes(question.id)||false;
   return <article className="grammar-question" key={question.id}>
    <label><input type="checkbox" checked={checked} disabled={!checked&&(item.selectedQuestionIds?.length||0)>=3} onChange={()=>onChange({...item,selectedQuestionIds:checked?(item.selectedQuestionIds||[]).filter(id=>id!==question.id):[...(item.selectedQuestionIds||[]),question.id],scopeConfirmed:false})}/><strong>{question.name||'例题 '+(index+1)}</strong></label>
    <GrammarQuestionContent question={question}/>
   </article>;
  })}
 </section>;
}
export function GrammarMaterials({knowledge}:{knowledge:Knowledge[]}){
 const groups=selectedGrammarQuestions(knowledge).filter(group=>group.questions.length);
 if(!groups.length)return null;
 return <section className="grammar-materials"><h3>语法例题 · 图谱教学材料</h3>{groups.flatMap(({item,questions})=>questions.map((question,index)=><article className="material" key={item.id+question.id}><h3>{item.name} · 例题 {index+1}</h3><GrammarQuestionContent question={question}/><small>来源：国际中文教育知识图谱 · 语法节点：{item.id} · 题目：{question.id}</small></article>))}</section>;
}
