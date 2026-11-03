import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {initialBrief} from '../lib/lesson.ts';
import {idiomContext,idiomOrigins,chooseIdiom,idiomSearchQuery} from '../lib/idioms.ts';
import {automaticSelections,knowledgeSelection,selectionSchema,validateSelections,groundedBlocks} from '../lib/evidence.ts';
const brief={...initialBrief,terms:'亡羊补牢、旅游方案',passage:'他做事刻舟求剑，还说一不做二不休。'};
const idiom={id:'Idiom:i1',kind:'Idiom',name:'刻舟求剑',pinyin:'kè zhōu qiú jiàn',role:'核心',verified:true,detail:'比喻拘泥成法。',rawDetail:'比喻拘泥成法。',example:'他这样做是刻舟求剑。',rawExample:'他这样做是刻舟求剑。',idiomSource:'图谱出处',idiomAllusion:'图谱典故',idiomFeeling:'贬义',levels:[],relations:[],evidence:{standard:brief.standard,parameters:{terms:['刻舟求剑']},queries:[]}};
test('idiom input covers teacher terms and full passage, including non-four-character graph idioms',()=>{
 assert.ok(idiomContext(brief).includes('亡羊补牢'));
 assert.ok(idiomContext(brief).includes('一不做二不休'));
 assert.deepEqual(idiomOrigins('亡羊补牢',brief),['教师输入']);
 assert.deepEqual(idiomOrigins('刻舟求剑',brief),['课文']);
});
test('idioms remain optional, distinct from same-name words, and can be revalidated as teaching evidence',()=>{
 const word={...idiom,id:'Word:i1',kind:'Word'};
 assert.equal(chooseIdiom([word],idiom,true).length,2);
 const checked=chooseIdiom([],idiom,true);assert.equal(checked[0].role,'核心');
 assert.equal(chooseIdiom(checked,idiom,false)[0].role,'排除');
 const choices=automaticSelections([idiom],[selectionSchema.parse(knowledgeSelection(idiom))]);
 const verified=validateSelections(choices,[idiom],brief);assert.deepEqual(verified.problems,[]);
 assert.equal(groundedBlocks(verified.knowledge)[0].idiomAllusion,'图谱典故');
 assert.ok(validateSelections(choices,[word],brief).problems.length);
});
const plugin={name:'idiom-services',setup(builder){
 builder.onResolve({filter:/^(?:@\/lib\/|\.\/)server$/},args=>({path:args.path,namespace:'fixture'}));
 builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:`export class AppError extends Error{constructor(message,status=400){super(message);this.status=status}};export const body=r=>r.json();export const session=async()=>({token:'fixture'});export const kg=(...args)=>globalThis.idiomCall(...args);export const json=data=>Response.json(data);export const failure=e=>Response.json({error:e.message},{status:e.status||500});`}));
}};
const compile=async entry=>{const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',plugins:[plugin]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))};
const route=await compile('app/api/kg/idioms/route.ts');
const workspace=await compile('lib/workspace.ts');
test('idiom query returns only actual matching Idiom nodes, without model generation or treating every four-character phrase as an idiom',async()=>{
 globalThis.idiomCall=async(_path,payload,token)=>{
  assert.equal(token,'fixture');assert.equal(payload.cypher,idiomSearchQuery);assert.ok(payload.parameters.text.includes(brief.passage));
  return {records:[{n:{labels:['Idiom'],properties:{id:'i1',name:idiom.name,meaning:idiom.detail,pinyin:idiom.pinyin,source:idiom.idiomSource,allusion:idiom.idiomAllusion,sentence:idiom.example}}},{n:{labels:['Word'],properties:{name:'旅游方案'}}},{n:{labels:['Idiom'],properties:{id:'i2',name:'亡羊补牢',meaning:'图谱释义'}}},{n:{labels:['Idiom'],properties:{id:'i3',name:'一不做二不休',meaning:'图谱释义'}}},{n:{labels:['Idiom'],properties:{id:'unrelated',name:'无关成语'}}}]};
 };
 const response=await route.POST(new Request('https://example.test/api/kg/idioms',{method:'POST',body:JSON.stringify({brief})}));
 assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 const data=await response.json();assert.deepEqual(data.idioms.map(item=>item.name),['刻舟求剑','亡羊补牢','一不做二不休']);
 const restored=workspace.knowledgeSchema.parse(data.idioms[0]);
 assert.equal(restored.kind,'Idiom');assert.equal(restored.idiomAllusion,'图谱典故');
 assert.equal(restored.evidence.parameters.text,idiomContext(brief));
});
