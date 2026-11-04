'use client';
import {useEffect,useState} from 'react';
import type {Brief,Knowledge} from '@/lib/lesson';
import {idiomContext,idiomOrigins} from '@/lib/idioms';
export function IdiomMatches({brief,connected,username,knowledge,onChoose,embedded}:{brief:Brief;connected:boolean;username:string;knowledge:Knowledge[];onChoose:(item:Knowledge,checked:boolean)=>void;embedded?:boolean}){
 const [idioms,setIdioms]=useState<Knowledge[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const context=idiomContext(brief),cacheKey='zhike-idiom-matches';
 async function search(signal?:AbortSignal,force=false){
  if(!connected)return;setError('');
  if(!force)try{const cache=JSON.parse(sessionStorage.getItem(cacheKey)||'null');if(cache?.context===context&&cache.username===username&&Date.now()-cache.at<15*60*1000){setIdioms(cache.idioms);setLoaded(true);return}}catch{}
  setBusy(true);
  try{
   const response=await fetch('/api/kg/idioms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief}),signal});
   const result=await response.json();if(!response.ok)throw Error(result.error||'成语查询失败。');if(signal?.aborted)return;
   setIdioms(result.idioms);setLoaded(true);
   try{sessionStorage.setItem(cacheKey,JSON.stringify({context,username,idioms:result.idioms,at:Date.now()}))}catch{}
  }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:'成语查询失败。')}
  finally{if(!signal?.aborted)setBusy(false)}
 }
 useEffect(()=>{
  setIdioms([]);setLoaded(false);setError('');setBusy(false);if(!connected)return;
  const controller=new AbortController(),timer=setTimeout(()=>void search(controller.signal),600);
  return ()=>{clearTimeout(timer);controller.abort()};
  // Only the input text and account affect graph matches, not the checked items.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[context,connected,username]);
 return <section className={'cultural-recommendations'+(embedded?' wizard-embedded':'')} aria-label="图谱成语匹配">
  <div className="knowledge-toolbar"><div>{!embedded&&<><h3>成语匹配（选填）</h3><p className="helper">从教师输入和课文中查找图谱实际收录的成语。勾选后可在下方知识点中查看释义、典故并选择例句。</p></>}{embedded&&<p className="helper wizard-embedded-lead">根据本课输入与课文，从图谱匹配成语；勾选后在下方卡片中确认例句。</p>}</div><button type="button" className="secondary" disabled={!connected||busy} onClick={()=>void search(undefined,true)}>{busy?'正在查询…':'重新查询'}</button></div>
  {!connected&&!embedded&&<p className="helper">连接图谱后自动查询，无需调用 AI。</p>}
  {busy&&<p className="helper" role="status">正在查询图谱成语节点…</p>}
  {error&&<p className="message error" role="alert">{error}</p>}
  {loaded&&!idioms.length&&<p className="helper">当前输入未匹配到可访问的图谱成语。</p>}
  <div className="cultural-topic-grid">{idioms.map(item=>{
   const checked=knowledge.some(node=>node.id===item.id&&node.role!=='排除');
   return <label className={'cultural-topic'+(checked?' is-selected':'')} key={item.id}><input type="checkbox" checked={checked} onChange={event=>onChoose(item,event.target.checked)}/><span><strong>{item.name}{item.pinyin&&'（'+item.pinyin+'）'}</strong><small>成语 · {idiomOrigins(item.name,brief).join(' / ')} · 知识图谱</small></span></label>;
  })}</div>
 </section>;
}
