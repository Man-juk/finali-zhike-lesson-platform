'use client';
import type {GrammarQuestion} from '@/lib/grammar-data';
import {cleanExerciseText,parseChoiceItems,segmentExerciseContent,stripDuplicateFieldLabel} from '@/lib/exercise-format';

type FieldSpec={key:string;label:string;value:string;mode:'rich'|'choices'};

function fieldValue(question:GrammarQuestion,key:FieldSpec['key']):string{
 switch(key){
  case 'description':return question.description;
  case 'corpus':return question.corpus;
  case 'stem':return question.stem;
  case 'listenCorpus':return question.listenCorpus;
  case 'listenStem':return question.listenStem;
  case 'choices':return question.choices;
  default:return '';
 }
}

function buildFields(question:GrammarQuestion):FieldSpec[]{
 const defs:[FieldSpec['key'],FieldSpec['label'],FieldSpec['mode']][]=[
  ['description','说明','rich'],
  ['corpus','语料','rich'],
  ['stem','题干','rich'],
  ['listenCorpus','听力语料','rich'],
  ['listenStem','听力题干','rich'],
  ['choices','选项','choices'],
 ];
 return defs.map(([key,label,mode])=>{
  const raw=fieldValue(question,key);
  const value=stripDuplicateFieldLabel(raw,label);
  return {key,label,value,mode};
 }).filter(row=>!!cleanExerciseText(row.value));
}

function RichContent({text}:{text:string}){
 const segments=segmentExerciseContent(text);
 return <>{segments.map((segment,index)=>segment.type==='image'
  ?<img key={index} className="exercise-card-img" src={segment.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
  :<p key={index} className="exercise-card-text">{segment.value}</p>)}</>;
}

function ChoiceList({text}:{text:string}){
 const items=parseChoiceItems(text);
 if(items.length>=2){
  return <ul className="exercise-card-options">{items.map(item=><li key={item.letter}><span className="exercise-card-option-letter" aria-hidden="true">{item.letter}</span><span className="exercise-card-option-text">{item.text}</span></li>)}</ul>;
 }
 return <RichContent text={text}/>;
}

function FieldBlock({label,mode,value}:{label:string;mode:'rich'|'choices';value:string}){
 return <section className="exercise-card-block">
  <h5 className="exercise-card-field-title">{label}</h5>
  <div className="exercise-card-block-body">{mode==='choices'?<ChoiceList text={value}/>:<RichContent text={value}/>}</div>
 </section>;
}

export function ExerciseCard({kindLabel,index,question,provenance}:{kindLabel:string;index:number;question:GrammarQuestion;provenance?:string}){
 const title=cleanExerciseText(question.name)||`${kindLabel} · 例题 ${index}`;
 const fields=buildFields(question);
 const answer=cleanExerciseText(question.answer);
 const externalLinks=question.links.filter(link=>!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(link.url));
 return <article className="exercise-card">
  <header className="exercise-card-head">
   <span className="exercise-card-kind">{kindLabel}</span>
   <h4 className="exercise-card-title">{title}</h4>
  </header>
  <div className="exercise-card-body">
   {fields.length?fields.map(field=><FieldBlock key={field.key} label={field.label} mode={field.mode} value={field.value}/>):<p className="exercise-card-text exercise-card-empty">图谱未返回可展示的题干内容。</p>}
   {externalLinks.length>0&&<div className="exercise-card-links">{externalLinks.map(link=><a className="exercise-card-link" key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}
  </div>
  {answer&&<details className="exercise-card-answer"><summary>查看图谱参考答案</summary><div className="exercise-card-answer-body"><RichContent text={answer}/></div></details>}
  <footer className="exercise-card-foot">
   <small className="exercise-card-id">{question.id}</small>
   {provenance&&<small className="exercise-card-source">{provenance}</small>}
  </footer>
 </article>;
}
