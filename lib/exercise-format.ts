import {decodeHtmlEntities} from './html-entities.ts';

export function cleanExerciseText(raw:string):string{
 return decodeHtmlEntities(raw).replace(/\r\n/g,'\n').replace(/[ \t]+\n/g,'\n').trim();
}

const IMAGE_URL=/https?:\/\/[^\s<>"']+\.(?:jpe?g|png|webp|gif)(?:\?[^\s'"<>]*)?/gi;

export function isImageUrl(value:string):boolean{
 return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(value.trim());
}

export type ChoiceItem={letter:string;text:string};

/** 将图谱选项串解析为 A/B/C/D 列表（如「A甲 B乙」或「A. … B. …」）。 */
export function parseChoiceItems(raw:string):ChoiceItem[]{
 const text=cleanExerciseText(raw);
 if(!text)return [];
 const dotted=[...text.matchAll(/([A-Da-d])[.、：:)\]】]\s*([\s\S]+?)(?=\s+[A-Da-d][.、：:)\]】]|\s*$)/g)];
 if(dotted.length>=2)return dotted.map(part=>({letter:part[1].toUpperCase(),text:cleanExerciseText(part[2])}));
 const tight=[...text.matchAll(/(?:^|\s)([A-D])([^\sA-D]+)/g)];
 if(tight.length>=2)return tight.map(part=>({letter:part[1],text:cleanExerciseText(part[2])}));
 const lines=text.split(/\n+/).map(line=>line.trim()).filter(Boolean);
 const lineItems=lines.map(line=>{
  const head=line.match(/^([A-Da-d])[.、：:)\]】\s]+(.+)$/);
  return head?{letter:head[1].toUpperCase(),text:cleanExerciseText(head[2])}:null;
 }).filter((row):row is ChoiceItem=>!!row?.text);
 if(lineItems.length>=2)return lineItems;
 return [];
}

export type ContentSegment={type:'text';value:string}|{type:'image';url:string};

export function segmentExerciseContent(raw:string):ContentSegment[]{
 const text=cleanExerciseText(raw);
 if(!text)return [];
 const trimmed=text.trim();
 if(/^https?:\/\//i.test(trimmed)&&isImageUrl(trimmed))return [{type:'image',url:trimmed}];
 const segments:ContentSegment[]=[];
 let lastIndex=0;
 for(const part of text.matchAll(IMAGE_URL)){
  const index=part.index??0;
  if(index>lastIndex){
   const chunk=text.slice(lastIndex,index).trim();
   if(chunk)segments.push({type:'text',value:chunk});
  }
  segments.push({type:'image',url:part[0]});
  lastIndex=index+part[0].length;
 }
 if(lastIndex<text.length){
  const chunk=text.slice(lastIndex).trim();
  if(chunk)segments.push({type:'text',value:chunk});
 }
 if(!segments.length)segments.push({type:'text',value:text});
 return segments;
}

/** 去掉字段正文开头重复的「说明：」等标签，避免与区块标题粘连。 */
export function stripDuplicateFieldLabel(text:string,label:string):string{
 const cleaned=cleanExerciseText(text);
 const re=new RegExp(`^${label}[：:\\s]*`,'u');
 return cleaned.replace(re,'').trim();
}
