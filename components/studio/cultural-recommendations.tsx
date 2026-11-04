'use client';
import {useEffect,useState} from 'react';
import type {Brief} from '@/lib/lesson';
import {culturalKinds,type CulturalTopic} from '@/lib/cultural-topics';

export function CulturalRecommendations({brief,connected,username,onChange,embedded}:{brief:Brief;connected:boolean;username:string;onChange:(topics:CulturalTopic[])=>void;embedded?:boolean}){
 const [topics,setTopics]=useState<CulturalTopic[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const context=JSON.stringify({topic:brief.topic,passage:brief.passage,outcome:brief.outcome,audience:brief.audience});
 const cacheKey='zhike-cultural-recommendations';
 async function recommend(signal?:AbortSignal,force=false){
  if(!connected)return;
  setError('');setMessage('');
  if(!force)try{const cached=JSON.parse(sessionStorage.getItem(cacheKey)||'null');if(cached?.context===context&&cached?.username===username&&Date.now()-cached.at<15*60*1000){setTopics(cached.topics);return}}catch{}
  setBusy(true);
  try{
   const response=await fetch('/api/kg/cultural-topics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief}),signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'文化主题推荐失败。');
   if(signal?.aborted)return;
   setTopics(data.topics);setMessage(data.message||'');
   try{sessionStorage.setItem(cacheKey,JSON.stringify({context,username,topics:data.topics,at:Date.now()}))}catch{}
  }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:'文化主题推荐失败。')}
  finally{if(!signal?.aborted)setBusy(false)}
 }
 useEffect(()=>{
  setTopics([]);setError('');setBusy(false);
  if(!connected)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{void recommend(controller.signal)},350);
  return ()=>{clearTimeout(timer);controller.abort()};
  // Recommendation context excludes checked topics, so selecting one never requests a new ranking.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[context,connected,username]);
 const selected=brief.culturalTopics||[];
 const visible=[...topics,...selected.filter(item=>!topics.some(topic=>topic.id===item.id))];
 return <section className={'cultural-recommendations'+(embedded?' wizard-embedded':'')} aria-label="文化主题推荐">
  <div className="knowledge-toolbar"><div>{!embedded&&<><h3>相关文化主题词（选填）</h3><p className="helper">根据主题、课文与预期成果，从图谱四类文化节点中推荐最多 10 项。勾选后用于教案设计。</p></>}{embedded&&<p className="helper wizard-embedded-lead">从图谱推荐文化主题，勾选后用于本课设计（最多 10 项）。</p>}</div><button type="button" className="secondary" disabled={!connected||busy} onClick={()=>void recommend(undefined,true)}>{busy?'正在推荐…':'重新推荐'}</button></div>
  {!connected&&!embedded&&<p className="helper">连接知识图谱后自动获取推荐。</p>}
  {busy&&<p role="status" className="helper">正在查询文化图谱并匹配相关主题…</p>}
  {error&&<p role="alert" className="message error">{error}</p>}
  {message&&<p role="status" className="helper">{message}</p>}
  <div className="cultural-topic-grid">{visible.map(topic=>{
   const checked=selected.some(item=>item.id===topic.id);
   return <label key={topic.id} className={'cultural-topic'+(checked?' is-selected':'')}><input type="checkbox" checked={checked} disabled={!checked&&selected.length>=10} onChange={()=>onChange(checked?selected.filter(item=>item.id!==topic.id):[...selected,{id:topic.id,kind:topic.kind,name:topic.name}])}/><span><strong>{topic.name}</strong><small>{culturalKinds[topic.kind]} · 知识图谱</small></span></label>;
  })}</div>
  {!!selected.length&&<p className="helper">已选 {selected.length} 项。{selected.map(topic=>topic.name).join('、')}</p>}
 </section>;
}
