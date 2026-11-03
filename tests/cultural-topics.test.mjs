import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {culturalCandidates,rankedCulturalTopics} from '../lib/cultural-topics.ts';
import {initialBrief,briefSchema} from '../lib/lesson.ts';
const kinds=['CulturalStage','Cultural','CulturalLevel1','CulturalLevel2'];
const rows=Array.from({length:12},(_,id)=>({n:{labels:[kinds[id%4]],properties:{id:String(id),name:'主题'+id,sentence:'图谱原句'+id,cultural_stage:'基础阶段'}}}));
const candidates=culturalCandidates(rows);
test('culture catalog preserves four node types, original text and separate same-name identities',()=>{
 assert.deepEqual([...new Set(candidates.map(item=>item.kind))],kinds);
 assert.equal(candidates[0].sentence,'图谱原句0');
 assert.equal(candidates[0].stage,'基础阶段');
 assert.equal(culturalCandidates([...rows,rows[0],{n:{labels:['Word'],properties:{name:'非文化'}}}]).length,12);
 const same=culturalCandidates(kinds.map(kind=>({n:{labels:[kind],properties:{name:'同名'}}})));
 assert.equal(new Set(same.map(item=>item.id)).size,4);
});
test('AI ranking returns exactly ten graph candidates in ranked order and rejects invented or duplicate IDs',()=>{
 const selected=candidates.slice(0,10).reverse().map(item=>item.id);
 assert.deepEqual(rankedCulturalTopics({ids:selected},candidates).map(item=>item.id),selected);
 for(const ids of [selected.slice(1),[...selected.slice(1),'fabricated'],Array(10).fill(selected[0])])assert.throws(()=>rankedCulturalTopics({ids},candidates));
 assert.equal(rankedCulturalTopics({ids:[candidates[0].id]},candidates.slice(0,1)).length,1);
});
test('selected culture references survive brief validation without becoming language graph terms',()=>{
 const selected=candidates.slice(0,10).map(({id,kind,name})=>({id,kind,name}));
 const brief=briefSchema.parse({...initialBrief,culturalTopics:selected});
 assert.deepEqual(brief.culturalTopics,selected);
 assert.equal(brief.terms,initialBrief.terms);
 assert.equal(briefSchema.safeParse({...brief,culturalTopics:[...selected,selected[0]]}).success,false);
});
const result=await build({entryPoints:['app/api/kg/cultural-topics/route.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'culture-services',setup(builder){
 builder.onResolve({filter:/^@\/lib\/(server|model|cultural-graph)$/},args=>({path:args.path,namespace:'fixture'}));
 builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path.endsWith('server')?`export class AppError extends Error{constructor(message,status=400){super(message);this.status=status}};export const body=r=>r.json();export const session=async()=>({token:'fixture',id:'user'});export const json=data=>Response.json(data);export const failure=e=>Response.json({error:e.message},{status:e.status||500});`:args.path.endsWith('cultural-graph')?`export const culturalGraph=async()=>globalThis.cultureCatalog;`:`export const modelInfo=()=>({configured:true});export const modelRequest=async(messages)=>{globalThis.cultureMessages=messages;return globalThis.cultureRanking};`}));
 }}]});
const route=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('recommendation endpoint grounds ten ranked topics in graph results and includes teaching input',async()=>{
 globalThis.cultureCatalog=candidates;globalThis.cultureRanking={ids:candidates.slice(0,10).map(item=>item.id)};
 const request=()=>new Request('https://example.test/api/kg/cultural-topics',{method:'POST',body:JSON.stringify({brief:initialBrief})});
 let response=await route.POST(request());assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.topics.length,10);assert.equal(data.topics[0].sentence,'图谱原句0');
 assert.ok(globalThis.cultureMessages[1].content.includes(initialBrief.topic));
 globalThis.cultureRanking={ids:Array(10).fill('forged')};response=await route.POST(request());assert.equal(response.status,502);
 globalThis.cultureCatalog=[];response=await route.POST(request());assert.deepEqual((await response.json()).topics,[]);
});
