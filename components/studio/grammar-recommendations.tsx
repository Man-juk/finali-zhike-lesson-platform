'use client';
import {useEffect,useState} from 'react';
import type {Brief,Knowledge} from '@/lib/lesson';
type Results={matched:Knowledge[];related:Knowledge[];unmatched:string[];message?:string};
export function GrammarRecommendations({brief,connected,username,knowledge,onMatched,onChoose,embedded}:{brief:Brief;connected:boolean;username:string;knowledge:Knowledge[];onMatched:(items:Knowledge[])=>void;onChoose:(item:Knowledge,checked:boolean)=>void;embedded?:boolean}){
 const [results,setResults]=useState<Results|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const context=JSON.stringify({grammar:brief.knowledgeGroups?.grammar||'',topic:brief.topic,passage:brief.passage,outcome:brief.outcome,standard:brief.standard});
 async function recommend(signal?:AbortSignal,force=false){
  if(!connected)return;setError('');
  const apply=(result:Results)=>{setResults(result);queueMicrotask(()=>onMatched(result.matched))};
  if(!force)try{const cached=JSON.parse(sessionStorage.getItem('zhike-grammar-recommendations')||'null');if(cached?.context===context&&cached.username===username&&Date.now()-cached.at<15*60*1000){apply(cached.result);return}}catch{}
  setBusy(true);
  try{
   const response=await fetch('/api/kg/grammar-topics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief}),signal});
   const result=await response.json();if(!response.ok)throw Error(result.error||'语法推荐失败。');if(signal?.aborted)return;
   apply(result);try{sessionStorage.setItem('zhike-grammar-recommendations',JSON.stringify({context,username,result,at:Date.now()}))}catch{}
  }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:'语法推荐失败。')}
  finally{if(!signal?.aborted)setBusy(false)}
 }
 useEffect(()=>{
  setResults(null);setBusy(false);setError('');if(!connected)return;
  const controller=new AbortController(),timer=setTimeout(()=>void recommend(controller.signal),800);
  return ()=>{clearTimeout(timer);controller.abort()};
  // Only changed teaching input or graph account triggers a fresh recommendation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[context,connected,username]);
 return <section className={'cultural-recommendations'+(embedded?' wizard-embedded':'')} aria-label="语法匹配与推荐">
  <div className="knowledge-toolbar"><div>{!embedded&&<><h3>语法匹配与相关推荐</h3><p className="helper">逐条匹配输入的语法点，并根据课文补充相关语法。匹配项自动加入下方知识列表，可调整或排除；每点最多三道关联例题。</p></>}{embedded&&<p className="helper wizard-embedded-lead">自动匹配输入的语法点；补充相关语法可勾选加入本步列表。</p>}</div><button type="button" className="secondary" disabled={!connected||busy} onClick={()=>void recommend(undefined,true)}>{busy?'正在匹配…':'重新匹配'}</button></div>
  {!connected&&!embedded&&<p className="helper">连接图谱后自动匹配。</p>}
  {busy&&<p className="helper" role="status">正在匹配全部输入、检索相关语法及关联例题…</p>}
  {error&&<p className="message error" role="alert">{error}</p>}
  {results?.message&&<p className="helper">{results.message}</p>}
  {!!results?.matched.length&&<p className="helper">已匹配：{results.matched.map(item=>item.name).join('、')}</p>}
  {!!results?.unmatched.length&&<p className="helper">以下输入未找到可靠匹配：{results.unmatched.join('、')}。可调整名称后重试。</p>}
  {!!results?.related.length&&<><h4>补充相关语法（勾选后展开下方知识点，选择例句与例题）</h4><div className="cultural-topic-grid">{results.related.map(item=>{
   const checked=knowledge.some(node=>node.id===item.id&&node.role!=='排除');
   return <label className={'cultural-topic'+(checked?' is-selected':'')} key={item.id}><input type="checkbox" checked={checked} onChange={event=>onChoose(item,event.target.checked)}/><span><strong>{item.name}</strong><small>图谱语法 · {(item.grammarQuestions||[]).length} 道关联例题</small></span></label>;
  })}</div></>}
 </section>;
}
