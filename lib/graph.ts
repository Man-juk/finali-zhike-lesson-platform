import {graphResourceUrl} from './character-resources';
import {enrichGrammarQuestions} from './grammar-questions';
import type {Knowledge} from './lesson';
import {kg,AppError} from './server';
import {wordPropertyFeatures,lexicalFeature,lexicalRelationCategory} from './lexical';
const levels=['InternationalLevel','HSKLevel','HSK30Level'];
const kinds=['Word','Grammar','Character','Idiom'] as const;
// Return full nodes: the upstream permission filter requires their labels.
export const nodeQuery='MATCH (n) WHERE (n:Word OR n:Grammar OR n:Character OR n:Idiom) AND n.name IN $terms RETURN n LIMIT 80';
export function graphNodes(rows:Record<string,any>[],standard:string,terms:string[],query=nodeQuery):Knowledge[]{
 const result:Knowledge[]=[];
 for(const row of rows){const node=row.n||row.node||row,properties=node.properties||node.data||node;const p={...properties,...row};const labels=row.labels||node.labels||[];const kind=kinds.find(k=>labels.includes(k))||(/^(Word|Grammar|Character|Idiom)$/.test(row.kind)?row.kind:null);const name=String(p.name||p['n.name']||'').trim();if(!name||!kind||!terms.includes(name))continue;
 const detail=String(p.meaning||p.content||p.definition||'').slice(0,10000),example=String(p.sentence||'').slice(0,10000),pinyin=String(p.pinyin||p.py||p.phonetic||p.pronunciation||'').trim().slice(0,120);const item:Knowledge={id:`${kind}:${p.nodeId??p.id??name}`,kind,name,pinyin:pinyin||undefined,...(kind==='Idiom'?{idiomSource:String(p.source||'').slice(0,3000),idiomAllusion:String(p.allusion||'').slice(0,10000),idiomFeeling:String(p.feeling||'').slice(0,300)}:{}),...(kind==='Character'?{animationUrl:graphResourceUrl(p.animation_url),strokeUrl:graphResourceUrl(p.stroke_url)}:{}),lexicalFeatures:kind==='Word'?wordPropertyFeatures(p):[],selectedFeatureIds:[],role:'核心',verified:true,detail,rawDetail:detail,example,rawExample:example,selectedMeaning:'',selectedExamples:[],scopeConfirmed:false,evidence:{standard,parameters:{terms},queries:[query]},levels:[],relations:[],query,checkedAt:new Date().toISOString()};if(!result.some(x=>x.id===item.id))result.push(item);
 }for(const item of result)if(item.kind==='Character'&&result.some(x=>x.name===item.name&&x.kind==='Word'))item.role='排除';
 return result;
}
export async function searchGraph(token:string,terms:string[],standard:string):Promise<Knowledge[]>{
 terms=[...new Set(terms.map(t=>t.trim()).filter(Boolean))];if(!levels.includes(standard)||!terms.length||terms.length>20||terms.some(t=>t.length>80))throw new AppError('查询条件无效。');
 const d=await kg('intelligent/execute-cypher',{cypher:nodeQuery,parameters:{terms},limit:80},token);if(!Array.isArray(d.records))throw new AppError('图谱查询结果结构异常，请稍后重试。',502);
 const result=graphNodes(d.records,standard,terms);if(d.records.length&&!result.length)throw new AppError('图谱已返回数据，但节点格式无法识别，不能将其当作“未收录”。请联系管理员。',502);
 if(!result.length)return [];
 const levelQuery=`MATCH (n)-[:FROM_LEVEL]->(m:${standard}) WHERE (n:Word OR n:Grammar OR n:Character OR n:Idiom) AND n.name IN $terms RETURN n, m LIMIT 100`;
 // Grade metadata is supplementary: lack of access must not discard real words.
 try{const ld=await kg('intelligent/execute-cypher',{cypher:levelQuery,parameters:{terms},limit:100},token);for(const row of ld.records||[]){const name=row.name||row.n?.properties?.name||row.n?.name,level=row.level||row.m?.properties?.name||row.m?.name,labels=row.labels||row.n?.labels||[];for(const item of result.filter(x=>x.name===name&&(!labels.length||labels.includes(x.kind))))if(level&&!item.levels.includes(String(level)))item.levels.push(String(level))}for(const item of result)item.evidence!.queries.push(levelQuery)}catch(e){if(e instanceof AppError&&e.status===401)throw e;/* No grades are invented if unavailable. */}

 await enrichGrammarQuestions(token,result);
 const wordTerms=result.filter(x=>x.kind==='Word').map(x=>x.name);
 if(wordTerms.length){
 const relationQuery='MATCH (n:Word)-[r]-(m) WHERE n.name IN $terms RETURN n, r, m, type(r) AS relationType, startNode(r) = n AS outgoing LIMIT 400';
 try{
 const data=await kg('intelligent/execute-cypher',{cypher:relationQuery,parameters:{terms:wordTerms},limit:400},token);
 if(!Array.isArray(data.records))throw new AppError('词汇关系返回结构异常。',502);
 for(const item of result.filter(x=>x.kind==='Word')){item.lexicalStatus=data.records.length>=400?'truncated':'available';item.evidence!.queries.push(relationQuery)}
 for(const row of data.records){
 const n=row.n?.properties||row.n?.data||row.n||{},m=row.m?.properties||row.m?.data||row.m||{},r=row.r?.properties||row.r?.data||row.r||{};
 const type=String(row.relationType||row.r?.type||'').slice(0,100),category=lexicalRelationCategory(type);
 if(!category||typeof m.name!=='string'||!m.name.trim()||typeof row.outgoing!=='boolean')continue;
 const source=String(n.name||''),nodeId=n.nodeId??n.id;
 for(const item of result.filter(x=>x.kind==='Word'&&x.name===source&&(nodeId===undefined||x.id==='Word:'+nodeId))){
 const feature=lexicalFeature(category,m.name,String(r.meaning||r.description||r.content||''),type,row.outgoing?'outgoing':'incoming');
 item.lexicalFeatures??=[];if(!item.lexicalFeatures.some(x=>x.id===feature.id))item.lexicalFeatures.push(feature);
 }
 }
 }catch(e){if(e instanceof AppError&&e.status===401)throw e;for(const item of result.filter(x=>x.kind==='Word'))item.lexicalStatus='unavailable'}
 }
 for(const item of result)if(item.kind==='Character'&&result.some(x=>x.name===item.name&&x.kind==='Word'))item.role='排除';
 return result;
}
