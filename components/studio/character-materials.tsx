'use client';
import type {Knowledge} from '@/lib/lesson';
import {characterResources} from '@/lib/character-resources';

export function CharacterMaterials({knowledge}:{knowledge:Knowledge[]}){
 const resources=characterResources(knowledge);
 if(!resources.length)return null;
 return <section className="character-materials"><h3>汉字笔顺材料 · 图谱原始资源</h3>{resources.map(item=><article className="material" key={item.id}>
  <h3>{item.name}</h3><div className="character-resource-grid">
   {([{label:'笔顺动画',url:item.animationUrl},{label:'笔顺图',url:item.strokeUrl}]).map(({label,url})=><div key={label}><h4>{label}</h4>{url?<>
    {/\.(mp4|webm|ogg)(\?|$)/i.test(url)?<video src={url} controls preload="none" aria-label={item.name+label}/>:<img src={url} alt={item.name+label} loading="lazy" referrerPolicy="no-referrer"/>}
    <a href={url} target="_blank" rel="noopener noreferrer">打开{label}原始资源</a>
   </>:<p className="helper">图谱未返回{label}资源。</p>}</div>)}
  </div><small>来源：国际中文教育知识图谱 · 节点：{item.id}</small>
 </article>)}</section>;
}
