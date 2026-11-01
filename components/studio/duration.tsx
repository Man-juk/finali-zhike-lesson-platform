'use client';
import { useEffect,useRef,useState } from 'react';

/**
 * 教学环节时长分配 —— 横向堆叠条。
 * 用 AntV G2 承载真实的分钟数分配；G2 不可用时降级为等价的 CSS 堆叠条（数据一致）。
 */

export type DurationSlice={name:string;minutes:number};

/* 莫兰迪绿家族色阶：与全站主色统一，深浅有序，色盲友好 */
const PALETTE=['#81B29A','#6E9E87','#A6CDBA','#5C8B75','#C3DED1','#4A7361'];

export function DurationBreakdown({slices,total}:{slices:DurationSlice[];total:number}){
 const boxRef=useRef<HTMLDivElement>(null);
 const [chartReady,setChartReady]=useState(false);
 const data=slices.filter(s=>s.minutes>0);
 const key=data.map(d=>d.name+'|'+d.minutes).join(',');

 useEffect(()=>{
  const el=boxRef.current;
  if(!el||!data.length)return;
  let cancelled=false;
  let chart:any=null;
  (async()=>{
   try{
    const {Chart}=await import('@antv/g2');
    if(cancelled||!el)return;
    chart=new Chart({container:el,autoFit:true,height:14,theme:'classic'});
    await chart.options({
     data,
     axis:false,
     legend:false,
     padding:0,
     style:{viewStyle:{plotArea:{padding:0}}},
     scale:{y:{domain:[0,Math.max(total,1)]}},
     children:[{
      type:'interval',
      transform:[{type:'stackY'}],
      encode:{
       x:{type:'field',value:()=>'课时'},
       y:{type:'field',value:(d:DurationSlice)=>d.minutes},
       color:{type:'field',value:(d:DurationSlice)=>d.name},
      },
      style:{radius:4},
      scale:{color:{type:'ordinal',domain:data.map(d=>d.name),range:PALETTE.slice(0,data.length)}},
      animate:false,
     }],
     coordinate:{transform:[{type:'transpose'}]},
    } as any);
    await chart.render();
    if(!cancelled)setChartReady(true);
   }catch{
    // G2 不可用时保留 CSS 降级条
   }
  })();
  return()=>{
   cancelled=true;
   setChartReady(false);
   try{chart?.destroy();}catch{}
  };
 },[key,total]);

 if(!data.length)return null;
 return (
  <div className="duration-block">
   <div className="duration-head">
    <strong>教学环节时长分配</strong>
    <span>共 {total} 分钟 · {data.length} 个环节</span>
   </div>
   <div className="duration-chart" ref={boxRef} aria-hidden="true"/>
   {!chartReady&&<div className="duration-fallback" aria-hidden="true">
    {data.map((s,i)=><i key={s.name} style={{width:(s.minutes/Math.max(total,1))*100+'%',background:PALETTE[i%PALETTE.length]}}/>)}
   </div>}
   <div className="duration-legend">
    {data.map((s,i)=><span key={s.name}><i style={{background:PALETTE[i%PALETTE.length]}}/>{s.name} · {s.minutes} 分钟</span>)}
   </div>
  </div>
 );
}

export default DurationBreakdown;
