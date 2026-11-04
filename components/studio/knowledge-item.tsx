'use client';

import {ChevronDown} from 'lucide-react';
import type {Knowledge} from '@/lib/lesson';
import {EvidencePicker} from './evidence';
import {characterPronunciation} from '@/lib/evidence';

export function KnowledgeItem({item,standard,onChange,defaultOpen,searchHint}:{item:Knowledge;standard:string;onChange:(item:Knowledge)=>void;defaultOpen?:boolean;searchHint?:string}){
 const pinyin=item.kind==='Character'?(item.pinyin||characterPronunciation(item.rawDetail??item.detail).pinyin):item.kind==='Idiom'?item.pinyin||'':'';
 return <details className="knowledge-item knowledge-fold lg-surface" open={defaultOpen}>
  <summary className="knowledge-summary">
   <span className="knowledge-summary-name"><strong>{item.name}{pinyin&&<span className="knowledge-pinyin">（{pinyin}）</span>}</strong><span className="node-kind">{{Word:'词汇',Grammar:'语法',Character:'汉字',Idiom:'成语'}[item.kind]}</span></span>
   <span className="knowledge-summary-state"><span className={'badge '+(item.verified?'verified':'pending')}>{item.role==='排除'?'已排除':item.verified?(item.scopeConfirmed?'已确认':'待确认'):'待核验'}</span><ChevronDown size={18} aria-hidden="true"/></span>
  </summary>
  <div className="knowledge-fold-content">
   <label className="knowledge-role">教学分类<select aria-label={item.name+'教学分类'} value={item.role} onChange={event=>onChange({...item,role:event.target.value as Knowledge['role']})}>{['核心','复习','拓展','排除'].map(role=><option key={role}>{role}</option>)}</select></label>
   {item.relations.length>0&&<details><summary>查看 {item.relations.length} 条相关知识</summary><ul>{item.relations.map((relation,index)=><li key={index}><span>{relation.type}</span> {relation.name}{relation.detail&&<small>{relation.detail}</small>}</li>)}</ul></details>}
   <EvidencePicker item={item} standard={standard} onChange={onChange} searchHint={searchHint}/>
   {item.query&&<details className="provenance"><summary>查询依据与来源</summary><small>来源：kg.chineseplus.net · {item.checkedAt}<br/>节点：{item.id}</small><pre>{item.query}</pre></details>}
  </div>
 </details>;
}
