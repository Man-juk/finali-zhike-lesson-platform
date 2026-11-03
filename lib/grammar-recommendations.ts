import {z} from 'zod';
import type {Knowledge} from './lesson';
export const grammarCatalogQuery='MATCH (n:Grammar) RETURN n ORDER BY n.name LIMIT 3000';
export function allGrammarTerms(value:string){return [...new Set(value.split(/[、，,；;\r\n]+/).map(value=>value.trim()).filter(Boolean))]}
export function mergeGrammarMatches(existing:Knowledge[],matched:Knowledge[]):Knowledge[]{
 const kept=existing.filter(node=>node.verified||!matched.some(item=>item.name===node.name&&item.kind===node.kind));
 return [...kept.map(node=>{
  const fresh=matched.find(item=>item.id===node.id);if(!fresh)return node;
  return {...fresh,role:node.role,selectedMeaning:node.selectedMeaning,selectedMeanings:node.selectedMeanings,selectedExamples:node.selectedExamples,selectedFeatureIds:node.selectedFeatureIds,selectedQuestionIds:node.selectedQuestionIds,scopeConfirmed:node.scopeConfirmed};
 }),...matched.filter(item=>!kept.some(node=>node.id===item.id))];
}
export function resolveGrammarRanking(raw:unknown,inputs:string[],catalog:Knowledge[]){
 const schema=z.object({matches:z.array(z.object({index:z.number().int().min(0),id:z.string().nullable()})),relatedIds:z.array(z.string()).max(10)});
 const parsed=schema.safeParse(raw);if(!parsed.success)throw Error('语法推荐格式异常，请重试。');
 const matches=inputs.map((input,index)=>{
  const exact=catalog.find(item=>item.name===input);
  if(exact)return {input,node:exact};
  const matching=parsed.data.matches.filter(match=>match.index===index);
  if(matching.length!==1)throw Error('语法推荐未覆盖所有输入，请重试。');
  const id=matching[0].id,node=id===null?undefined:catalog.find(item=>item.id===id);
  if(id!==null&&!node)throw Error('语法匹配包含图谱之外的节点，请重试。');
  return {input,node};
 });
 const matchedIds=new Set(matches.flatMap(match=>match.node?[match.node.id]:[]));
 const related:Knowledge[]=[];
 for(const id of parsed.data.relatedIds){const node=catalog.find(node=>node.id===id);if(!node)throw Error('相关语法包含图谱之外的节点，请重试。');if(!matchedIds.has(id)&&!related.some(node=>node.id===id))related.push(node)}
 if(catalog.some(node=>!matchedIds.has(node.id))&&!related.length)throw Error('未返回补充相关语法，请重试。');
 return {matches,related};
}
