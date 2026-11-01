'use client';
import { useLayoutEffect,useRef } from 'react';
import { Check } from 'lucide-react';
import gsap from 'gsap';

/**
 * 动效（GSAP）
 * - 主序列：AI 生成完成 → 纸张浮现（预览页白纸落位，标题与元信息依次进场）
 * - 次级联动：标签下划线滑动到当前标签
 * 边界：prefers-reduced-motion 时不位移、不缩放，直接落位，内容与状态完全保留。
 * 卸载即 revert（gsap.context）。
 */

function prefersReduced(){return typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}

/** 纸张浮现：包裹纸内容，挂载时落位。 */
export function PaperReveal({children,className}:{children:React.ReactNode;className?:string}){
 const scope=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const root=scope.current;
  if(!root)return;
  const ctx=gsap.context(()=>{
   if(prefersReduced())return;
   const paper=root.querySelector('.paper');
   if(!paper)return;
   gsap.fromTo(paper,
    {opacity:0,y:26,scale:.985},
    {opacity:1,y:0,scale:1,duration:.62,ease:'power3.out',clearProps:'transform,opacity'});
   const parts=root.querySelectorAll('.paper-lesson .lesson-intro > *, .paper-lesson .goals, .paper-lesson .duration-block');
   if(parts.length)gsap.fromTo(parts,
    {opacity:0,y:14},
    {opacity:1,y:0,duration:.5,stagger:.06,delay:.08,ease:'power2.out',clearProps:'transform,opacity'});
  },root);
  return()=>ctx.revert();
 },[]);
 return <div ref={scope} className={className}>{children}</div>;
}

/** 步骤条：激活标记从旧位置移动到新位置（共享对象位移）。 */
export function StepRail({steps,active,subtitles,onSelect,disabled}:{steps:string[];active:number;subtitles:string[];onSelect:(i:number)=>void;disabled:(i:number)=>boolean}){
 const rootRef=useRef<HTMLElement>(null);
 const markerRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const root=rootRef.current;
  const marker=markerRef.current;
  if(!root||!marker)return;
  const btn=root.querySelectorAll('button')[active] as HTMLElement|undefined;
  if(!btn)return;
  const place=()=>{
   const left=btn.offsetLeft;
   const width=btn.offsetWidth;
   if(prefersReduced()){
    marker.style.left=left+'px';
    marker.style.width=width+'px';
    return;
   }
   gsap.to(marker,{left,width,duration:.42,ease:'power3.out'});
  };
  place();
  const t=setTimeout(place,80);
  window.addEventListener('resize',place);
  return()=>{clearTimeout(t);window.removeEventListener('resize',place);gsap.killTweensOf(marker);};
 },[active,steps.length]);
 return (
  <nav className="steps lg-surface" ref={rootRef} aria-label="教案设计步骤">
   {steps.map((s,i)=>(
    <button key={s} className={i===active?'selected':i<active?'completed':''} disabled={disabled(i)} onClick={()=>onSelect(i)}>
     <span>{i<active?<Check size={16}/>:String(i+1).padStart(2,'0')}</span>
     <div>{s}<small>{subtitles[i]}</small></div>
     {i!==steps.length-1&&<div className="step-line"/>}
    </button>
   ))}
   <div className="step-marker" ref={markerRef} aria-hidden="true"/>
  </nav>
 );
}

/** 标签栏 + 滑动下划线。tabs 与选中态由调用方控制。 */
export function TabBar({tabs,active,onSelect}:{tabs:string[];active:number;onSelect:(i:number)=>void}){
 const barRef=useRef<HTMLDivElement>(null);
 const indicatorRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const root=barRef.current;
  const bar=indicatorRef.current;
  if(!root||!bar)return;
  const btn=root.querySelectorAll('button')[active] as HTMLElement|undefined;
  if(!btn)return;
  const place=()=>{
   const left=btn.offsetLeft;
   const width=btn.offsetWidth;
   if(prefersReduced()){
    bar.style.left=left+'px';
    bar.style.width=width+'px';
    return;
   }
   gsap.to(bar,{left,width,duration:.32,ease:'power3.out'});
  };
  place();
  const t=setTimeout(place,80);
  window.addEventListener('resize',place);
  return()=>{clearTimeout(t);window.removeEventListener('resize',place);gsap.killTweensOf(bar);};
 },[active,tabs.length]);
 return (
  <div className="tabbar" ref={barRef}>
   {tabs.map((t,i)=><button className={active===i?'selected':''} key={t} onClick={()=>onSelect(i)}>{t}</button>)}
   <div className="tab-indicator" ref={indicatorRef}/>
  </div>
 );
}
