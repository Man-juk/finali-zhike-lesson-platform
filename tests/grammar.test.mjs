import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {grammarQuestion,grammarQuestionMaterials} from '../lib/grammar-data.ts';
import {allGrammarTerms,grammarCatalogQuery,resolveGrammarRanking,mergeGrammarMatches} from '../lib/grammar-recommendations.ts';
import {selectionSchema,knowledgeSelection,automaticSelections,validateSelections,groundedBlocks,lessonPrompt} from '../lib/evidence.ts';
import {initialBrief} from '../lib/lesson.ts';
const rawQuestion={properties:{id:'q1',name:'真题',desc:'选择合适的词语',stem:'https://kg.chineseplus.net/q1.png',corpus:'图谱语料',chooses:'A甲 B乙',answer:'B',listen_stem:'/audio/stem.mp3'}};
const question=grammarQuestion(rawQuestion);
const node={id:'Grammar:g1',kind:'Grammar',name:'比字句',role:'核心',verified:true,rawDetail:'图谱内容',detail:'图谱内容',example:'他比我高。',rawExample:'他比我高。',levels:[],relations:[],grammarQuestions:[question],evidence:{standard:initialBrief.standard,parameters:{terms:['比字句']},queries:[]}};
test('grammar meaning is automatic and confirmed grammar choices need no selected example',()=>{
 const choice=selectionSchema.parse({...knowledgeSelection(node),selectedMeaning:'',selectedMeanings:[],selectedExamples:[],scopeConfirmed:true});
 const prepared=automaticSelections([node],[choice]);
 const checked=validateSelections(prepared,[node],initialBrief);
 assert.deepEqual(checked.problems,[]);
 assert.equal(checked.knowledge[0].selectedMeaning,node.rawDetail);
 assert.deepEqual(checked.knowledge[0].selectedExamples,[]);
});
test('passage grammar examples are required with and without selected graph examples and retain a distinct source',()=>{
 const brief={...initialBrief,passage:'小王比小李高。今天我们一起去学校。'};
 for(const selectedExamples of [[],['他比我高。']]){
  const prompt=lessonPrompt(brief,[{...node,selectedExamples,scopeConfirmed:true}],{});
  assert.ok(prompt.includes(brief.passage));
  for(const requirement of ['【课文语法例句：始终参考】','无论用户是否勾选','逐字引用至少一条对应课文原句','标注“课文原句”','不得将其写入图谱 examples','未找到对应课文原句','课文为空时不声称已参考课文'])assert.ok(prompt.includes(requirement),requirement);
 }
});
test('official Question fields retain stems, choices, answers and separate stem links',()=>{
 assert.equal(question.stem,rawQuestion.properties.stem);
 assert.equal(question.choices,'A甲 B乙');
 assert.equal(question.answer,'B');
 assert.deepEqual(question.links,[{label:'题干链接',url:'https://kg.chineseplus.net/q1.png'},{label:'听力题干链接',url:'https://kg.chineseplus.net/audio/stem.mp3'}]);
 assert.equal(grammarQuestion({properties:{name:'缺失题干'}}).stem,'');
 assert.deepEqual(grammarQuestion({properties:{id:'bad',stem:'javascript:alert(1)'}}).links,[]);
});
test('only three verified linked questions can enter generation and exported materials',()=>{
 const selected=automaticSelections([node],[]);
 assert.deepEqual(selected[0].selectedQuestionIds,[question.id]);
 const checked=validateSelections(selected,[node],initialBrief);assert.deepEqual(checked.problems,[]);
 assert.deepEqual(groundedBlocks(checked.knowledge)[0].grammarQuestions,[question]);
 assert.ok(grammarQuestionMaterials(checked.knowledge)[0].content.includes('题干链接：https://kg.chineseplus.net/q1.png'));
 assert.ok(grammarQuestionMaterials(checked.knowledge)[0].content.includes('图谱答案：B'));
 assert.ok(!grammarQuestionMaterials(checked.knowledge,false)[0].content.includes('图谱答案：B'));
 assert.ok(validateSelections([{...selected[0],selectedQuestionIds:['forged']}],[node],initialBrief).problems.length);
 assert.equal(selectionSchema.safeParse({...selected[0],selectedQuestionIds:['1','2','3','4']}).success,false);
});
test('all input grammar terms are attempted and extra related points are never replaced by the matched count',()=>{
 const inputs=Array.from({length:30},(_,index)=>'语法'+index);
 assert.equal(allGrammarTerms(inputs.join('、')).length,30);
 const catalog=[...inputs,'相关语法'].map((name,index)=>({...node,id:'Grammar:'+index,name}));
 const resolved=resolveGrammarRanking({matches:[],relatedIds:['Grammar:30']},inputs,catalog);
 assert.equal(resolved.matches.length,30);assert.equal(resolved.related[0].name,'相关语法');
 assert.throws(()=>resolveGrammarRanking({matches:[],relatedIds:[]},inputs,catalog));
 assert.throws(()=>resolveGrammarRanking({matches:[],relatedIds:['made-up']},inputs,catalog));
 assert.throws(()=>resolveGrammarRanking({matches:[],relatedIds:['Grammar:30']},['未知别名'],catalog));
});
test('refreshed grammar results retain teacher selections and replace manual duplicates',()=>{
 const manual={...node,id:'manual-1',verified:false};
 assert.equal(mergeGrammarMatches([manual],[node]).length,1);
 const existing={...node,selectedQuestionIds:[question.id],selectedExamples:['他比我高。'],role:'复习'};
 const fresh={...node,grammarQuestionStatus:'available'};
 const merged=mergeGrammarMatches([existing],[fresh])[0];
 assert.equal(merged.role,'复习');assert.equal(merged.grammarQuestionStatus,'available');assert.deepEqual(merged.selectedQuestionIds,[question.id]);
});
const plugin={name:'grammar-services',setup(builder){
 builder.onResolve({filter:/^(?:@\/lib\/|\.\/)server$/},args=>({path:args.path,namespace:'fixture'}));
 builder.onResolve({filter:/^@\/lib\/model$/},args=>({path:args.path,namespace:'fixture'}));
 builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path.endsWith('model')?`export const modelInfo=()=>({configured:true});export const modelRequest=async messages=>globalThis.grammarModel(messages);`:`export class AppError extends Error{constructor(message,status=400){super(message);this.status=status}};export const body=r=>r.json();export const session=async()=>({id:'fixture',token:'fixture'});export const kg=(...args)=>globalThis.grammarCall(...args);export const json=data=>Response.json(data);export const failure=e=>Response.json({error:e.message},{status:e.status||500});`}));
}};
const compile=async entry=>{const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',plugins:[plugin]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))};
const service=await compile('lib/grammar-questions.ts');
test('question enrichment caps each grammar separately, deduplicates and preserves unavailable status',async()=>{
 const nodes=[{...node,evidence:{...node.evidence,queries:[]}},{...node,id:'Grammar:g2',name:'把字句',evidence:{...node.evidence,queries:[]}}];
 globalThis.grammarCall=async()=>({records:nodes.flatMap(item=>Array.from({length:5},(_,id)=>({n:{properties:{id:item.id.slice(8),name:item.name}},q:{properties:{...rawQuestion.properties,id:String(id)}}})))});
 await service.enrichGrammarQuestions('fixture',nodes);
 assert.deepEqual(nodes.map(item=>item.grammarQuestions.length),[3,3]);
 globalThis.grammarCall=async()=>{throw Error('no question permission')};
 await service.enrichGrammarQuestions('fixture',nodes);assert.deepEqual(nodes.map(item=>item.grammarQuestionStatus),['unavailable','unavailable']);
});
const route=await compile('app/api/kg/grammar-topics/route.ts');
test('grammar recommendation matches more than twenty inputs in batches and still adds related points with three questions each',async()=>{
 const inputs=Array.from({length:42},(_,index)=>'别称'+index);
 const rows=Array.from({length:50},(_,index)=>({n:{labels:['Grammar'],properties:{id:String(index),name:'语法'+index,content:'图谱释义'+index,sentence:'图谱原句'+index}}}));
 let matchingCalls=0,rankingCalls=0;
 globalThis.grammarCall=async(_path,payload)=>{
  if(payload.cypher===grammarCatalogQuery)return {records:rows};
  if(payload.cypher.includes('RETURN DISTINCT m'))return {records:[]};
  return {records:payload.parameters.terms.flatMap(name=>Array.from({length:3},(_,id)=>({n:{properties:{id:name.slice(2),name}},q:{properties:{...rawQuestion.properties,id:name+'-'+id}}})))};
 };
 globalThis.grammarModel=async messages=>{
  const data=JSON.parse(messages[1].content);
  if(data.catalog){matchingCalls++;return {matches:data.inputs.map(input=>({index:input.index,id:'Grammar:'+input.name.slice(2)}))}}
  rankingCalls++;return {relatedIds:data.candidates.slice(0,10).map(item=>item.id)};
 };
 const brief={...initialBrief,passage:'课文内容',knowledgeGroups:{characters:'',vocabulary:'',grammar:inputs.join('、'),culture:'',other:''}};
 const response=await route.POST(new Request('https://example.test/api/kg/grammar-topics',{method:'POST',body:JSON.stringify({brief})}));
 assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 const data=await response.json();assert.equal(data.matched.length,42);assert.equal(data.related.length,8);assert.deepEqual(data.unmatched,[]);
 assert.equal(matchingCalls,2);assert.equal(rankingCalls,1);
 assert.ok([...data.matched,...data.related].every(item=>item.grammarQuestions.length===3));
 assert.ok(data.matched.every(item=>item.evidence.parameters.terms.length===1));
});
