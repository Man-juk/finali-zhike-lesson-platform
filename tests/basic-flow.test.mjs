import {test} from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const compile=async(entry,plugin)=>{const r=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',plugins:[plugin]});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'))};
const graph=await compile('lib/graph.ts',{name:'graph-source',setup(b){b.onResolve({filter:/^\.\/server$/},()=>({path:'server',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export class AppError extends Error{constructor(m,status=400){super(m);this.status=status}};export const kg=(...args)=>globalThis.graphCall(...args);`,loader:'js'}))}});
const row={name:'方便',nodeId:'fixture-1',labels:['Word'],meaning:'便利。',sentence:'买东西很方便。',pinyin:'fāngbiàn'};
test('character media uses official graph fields without inventing missing URLs or mixing Word nodes',()=>{
 const source={...row,name:'旅',labels:['Character'],animation_url:'/media/travel.gif',stroke_url:'https://kg.chineseplus.net/media/travel.png'};
 const [character]=graph.graphNodes([source],'HSKLevel',['旅']);
 assert.equal(character.animationUrl,'https://kg.chineseplus.net/media/travel.gif');
 assert.equal(character.strokeUrl,source.stroke_url);
 assert.equal(graph.graphNodes([{...source,labels:['Word']}],'HSKLevel',['旅'])[0].animationUrl,undefined);
 assert.equal(graph.graphNodes([{...source,animation_url:'javascript:alert(1)',stroke_url:undefined}],'HSKLevel',['旅'])[0].animationUrl,undefined);
});
test('graph response normalization preserves exact source, keep types separate and reject unrelated names',()=>{const r=graph.graphNodes([row,{...row,labels:['Character']},{...row,name:'未查询'}],'HSKLevel',['方便']);assert.equal(r.length,2);assert.equal(r[0].rawDetail,'便利。');assert.equal(r[0].id,'Word:fixture-1');assert.equal(r[1].kind,'Character')});
test('graph nodes carry pinyin when the source provides it and never invent it',()=>{assert.equal(graph.graphNodes([row],'HSKLevel',['方便'])[0].pinyin,'fāngbiàn');assert.equal(graph.graphNodes([{...row,py:'fāngbiàn',pinyin:undefined}],'HSKLevel',['方便'])[0].pinyin,'fāngbiàn');assert.equal(graph.graphNodes([{...row,pinyin:undefined}],'HSKLevel',['方便'])[0].pinyin,undefined)});
test('supplementary grade failure does not discard returned words',async()=>{let count=0;globalThis.graphCall=async(p,b)=>{count++;assert.deepEqual(b.parameters.terms,['方便']);if(count===1)return {records:[row]};throw Error('Grade metadata unavailable')};const r=await graph.searchGraph('fixture',['方便'],'HSKLevel');assert.equal(r[0].verified,true);assert.deepEqual(r[0].levels,[]);assert.equal(count,3)});
test('unrecognized nonempty response is an error instead of a false no-match',async()=>{globalThis.graphCall=async()=>({records:[{unexpected:true}]});await assert.rejects(graph.searchGraph('fixture',['方便'],'HSKLevel'),/格式无法识别/)});
const route=await compile('app/api/lesson/route.ts',{name:'basic-services',setup(b){b.onResolve({filter:/^@\/lib\/(server|graph|model|cultural-graph)$/},args=>({path:args.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path.endsWith('server')?`export class AppError extends Error{constructor(m,status=400){super(m);this.status=status}};export const body=r=>r.json();export const session=async()=>({id:'graph-user',token:'fixture'});export const config=()=>({});export const json=data=>Response.json(data);export const failure=e=>Response.json({error:e.message},{status:e.status||500});`:args.path.endsWith('cultural-graph')?`export const culturalGraph=async()=>globalThis.culturalCandidates||[];`:args.path.endsWith('graph')?`export const searchGraph=async()=>globalThis.freshKnowledge;`:`export const modelInfo=()=>({configured:true,name:'fixture'});export const modelRequest=async(messages)=>globalThis.getLesson?globalThis.getLesson(messages):globalThis.lessonResult;`,loader:'js'}))}});
const {initialBrief,manualKnowledge,templateLesson}=await import('../lib/lesson.ts');
test('graph-authenticated lesson generation works without website login or database',async()=>{const k={...manualKnowledge(initialBrief)[0],id:'Word:1',name:'方便',verified:true,rawDetail:'便利。',detail:'便利。',example:'',rawExample:'',selectedMeaning:'便利。',selectedExamples:[],scopeConfirmed:true,evidence:{standard:initialBrief.standard,parameters:{terms:['方便']},queries:['fixture']}};globalThis.freshKnowledge=[k];globalThis.lessonResult=templateLesson(initialBrief,[k]);const r=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:initialBrief,knowledge:[k]})}));assert.equal(r.status,200,JSON.stringify(await r.clone().json()));assert.equal((await r.json()).source,'model');const forged=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:initialBrief,knowledge:[{...k,selectedMeaning:'编造知识'}]})}));assert.equal(forged.status,422)});

test('permission-aware upstream queries retain full nodes',()=>{assert.match(graph.nodeQuery,/RETURN n LIMIT/);assert.doesNotMatch(graph.nodeQuery,/ AS /)})

test('lexical graph enrichment preserves direction, removes duplicates and ignores unknown edges',async()=>{
 globalThis.graphCall=async(_path,body)=>{
  if(body.cypher===graph.nodeQuery)return {records:[{...row,syntactic:'形容词'}]};
  if(body.cypher.includes('FROM_LEVEL'))return {records:[]};
  const edge={n:{properties:{name:'方便',nodeId:'fixture-1'}},m:{properties:{name:'便利'}},relationType:'NEAR_SYNONYMOUS_WITH',outgoing:false};
  return {records:[edge,edge,{...edge,relationType:'UNKNOWN'},{...edge,relationType:'ANTITHESIS_WITH',m:{properties:{name:'麻烦'}}},{...edge,relationType:'CILIN'}]};
 };
 const [node]=await graph.searchGraph('fixture',['方便'],'HSKLevel');
 assert.equal(node.lexicalStatus,'available');
 assert.deepEqual(node.lexicalFeatures.map(f=>[f.category,f.value,f.direction]),[['pos','形容词','property'],['synonym','便利','incoming'],['antonym','麻烦','incoming'],['cilin','便利','incoming']]);
 assert.deepEqual(node.selectedFeatureIds,[]);
});

test('consistency and grammar warnings return a usable draft after repair instead of rejecting it',async()=>{
 const knowledge=globalThis.freshKnowledge;const lesson=templateLesson(initialBrief,knowledge);lesson.activities[0].minutes+=3;lesson.board='讲解语法规则';globalThis.getLesson=()=>lesson;
 try{const r=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:initialBrief,knowledge})}));assert.equal(r.status,200);const d=await r.json();assert.ok(d.validationWarnings.some(x=>x.includes('分钟')));assert.ok(d.validationWarnings.some(x=>x.includes('语法')));assert.equal(d.reviewed,false);assert.ok(d.lesson.notes.includes('待审核问题'));assert.equal(d.knowledge[0].selectedMeaning,'便利。')}finally{delete globalThis.getLesson}
});
test('failed automatic repair retains the first complete draft',async()=>{
 const knowledge=globalThis.freshKnowledge,lesson=templateLesson(initialBrief,knowledge);lesson.activities[0].minutes+=1;let calls=0;globalThis.getLesson=()=>{if(++calls>1)throw Error('mock upstream unavailable');return lesson};
 try{const r=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:initialBrief,knowledge})}));const d=await r.json();assert.equal(r.status,200);assert.equal(calls,2);assert.equal(d.lesson.title,lesson.title);assert.ok(d.validationWarnings.some(x=>x.includes('自动修订未完成')))}finally{delete globalThis.getLesson}
});

test('generation automatically uses fresh graph originals when knowledge and examples are omitted',async()=>{
 const saved=globalThis.freshKnowledge;
 const node={...saved[0],scopeConfirmed:false,selectedMeaning:'',selectedExamples:[],rawExample:'交通很方便。'};
 globalThis.freshKnowledge=[node];globalThis.lessonResult=templateLesson(initialBrief,[node]);
 try{
  const response=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:initialBrief})}));
  assert.equal(response.status,200);const draft=await response.json();
  assert.equal(draft.knowledge[0].selectedMeaning,node.rawDetail);
  assert.deepEqual(draft.knowledge[0].selectedExamples,['交通很方便。']);
 }finally{globalThis.freshKnowledge=saved}
});

test('empty optional knowledge fields extract search terms before graph-grounded generation',async()=>{
 const brief={...initialBrief,terms:'',knowledgeGroups:undefined};let calls=0;
 globalThis.getLesson=()=>++calls===1?{terms:['方便']}:templateLesson(brief,globalThis.freshKnowledge);
 try{
  const response=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief,knowledge:[]})}));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.ok(calls>=2);
 }finally{delete globalThis.getLesson}
});
test('selected cultural themes are rechecked and returned as independent graph evidence',async()=>{
 const theme={id:'Cultural:1',kind:'Cultural',name:'饮食礼仪',sentence:'图谱原句',source:'图谱来源',stage:'',level1:'',level2:''};
 globalThis.culturalCandidates=[theme];globalThis.lessonResult=templateLesson(initialBrief,globalThis.freshKnowledge);
 const request=topic=>new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:{...initialBrief,culturalTopics:[topic]}})});
 try{
  const response=await route.POST(request(theme));assert.equal(response.status,200);
  assert.deepEqual((await response.json()).culturalEvidence,[theme]);
  const forged=await route.POST(request({...theme,name:'编造主题'}));assert.equal(forged.status,422);
 }finally{delete globalThis.culturalCandidates}
});

test('structure preferences reach the lesson API with the brief and do not change generation',async()=>{
 const preferences={preset:'detailed',modules:{goals:true,vocabulary:true,grammar:true,steps:true,exercises:true,pitfalls:true,appendix:true},customInstruction:'教学步骤请以表格形式呈现'};
 const brief={...initialBrief,templateConfig:preferences};
 globalThis.lessonResult=templateLesson(brief,globalThis.freshKnowledge);
 try{
  const response=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief,knowledge:globalThis.freshKnowledge})}));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  // 生成逻辑不变：产出仍然是一份完整教案，偏好只作为需求的一部分随行。
  const draft=await response.json();
  assert.ok(draft.lesson.activities.length>0);
  // 偏好本身不会触发格式错误。
  const rejected=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief:{...brief,templateConfig:{preset:'bogus'}},knowledge:globalThis.freshKnowledge})}));
  assert.equal(rejected.status,400,'an unknown preset must be refused');
 }finally{delete globalThis.getLesson}
});

/**
 * 端到端：结构偏好必须真的进入发给模型的 System Prompt，
 * 而不是只停在 brief 里。
 */
test('the system prompt sent to the model carries the module, preset and custom instruction constraints',async()=>{
 const preferences={
  preset:'concise',
  modules:{goals:true,vocabulary:true,grammar:true,steps:true,exercises:false,pitfalls:false,appendix:false},
  customInstruction:'每个环节用「教师指令 / 学生活动 / 产出」三段式排版。',
 };
 const brief={...initialBrief,templateConfig:preferences};
 globalThis.lessonResult=templateLesson(brief,globalThis.freshKnowledge);
 let prompt='';
 globalThis.getLesson=(messages)=>{prompt=messages[0].content;return globalThis.lessonResult};
 try{
  const response=await route.POST(new Request('https://example.test/api/lesson',{method:'POST',body:JSON.stringify({brief,knowledge:globalThis.freshKnowledge})}));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  // 1. 模块开关：未勾选的模块被逐个点名禁止。
  assert.ok(prompt.includes('本次教案绝对不要包含「课堂练习与参考答案」模块'),'练习模块未进入 Prompt');
  assert.ok(prompt.includes('本次教案绝对不要包含「偏误预判与应对」模块'),'偏误模块未进入 Prompt');
  assert.ok(prompt.includes('本次教案绝对不要包含「附录（板书、评价量表等）」模块'),'附录模块未进入 Prompt');
  // 已勾选的模块不得被禁止。
  assert.ok(!prompt.includes('本次教案绝对不要包含「教学目标与重难点」模块'),'已开启的目标模块被误禁');
  // 2. 套餐指令。
  assert.ok(prompt.includes('尽量精简教师用语，只保留核心教学步骤和指令'),'精简版指令未进入 Prompt');
  // 3. 特别要求必须落在 System Prompt 的最后。
  assert.ok(prompt.includes('【用户的特殊排版/风格要求（最高优先级）】'),'特别要求标题未进入 Prompt');
  assert.ok(prompt.includes('每个环节用「教师指令 / 学生活动 / 产出」三段式排版。'),'特别要求正文未进入 Prompt');
  assert.ok(prompt.indexOf('【用户的特殊排版/风格要求（最高优先级）】')>prompt.indexOf('输出结构'),'特别要求必须排在输出结构之后');
 }finally{delete globalThis.getLesson}
});
