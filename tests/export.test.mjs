import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {initialBrief,manualKnowledge,templateLesson,placeholderIssues} from '../lib/lesson.ts';

const compile=async(entry,plugin)=>{const r=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',plugins:[plugin]});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'))};

const b=initialBrief;
const k=manualKnowledge(b).map((x,i)=>({...x,id:`Word:${i}`,pinyin:'fāngbiàn',verified:true,rawDetail:'便利。',detail:'便利。',selectedMeaning:'便利。',selectedExamples:['买东西很方便。'],scopeConfirmed:true,evidence:{standard:b.standard,parameters:{terms:['方便']},queries:[]}}));
const draft={brief:b,knowledge:k,lesson:templateLesson(b,k),source:'template',createdAt:new Date().toISOString(),reviewed:false};

test('standard structure export contains the six required sections and no placeholder',async()=>{
 const {makeWord}=await compile('lib/export.ts',{name:'export-fixture',setup(b){b.onResolve({filter:/^\.\/server$/},()=>({path:'server',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const config=()=>({});export class AppError extends Error{}`,loader:'js'}))}});
 const blob=await makeWord(draft,'teacher');
 const bytes=Buffer.from(await blob.arrayBuffer());
 // 引擎用 store-only 打包，document.xml 以明文存在 ZIP 中
 const text=bytes.toString('utf8').replace(/<[^>]*>/g,'\n');
 for(const section of ['一、教学对象','二、参考教材','三、课型','四、课时','五、教学目标','六、教学重点与难点'])
  assert.ok(text.includes(section),'missing section '+section);
 assert.ok(text.includes('认知领域')&&text.includes('技能领域')&&text.includes('情感领域'),'missing objective domains');
 assert.ok(text.includes('来华留学生'),'missing audience');
 assert.ok(text.includes('《HSK标准教程》3'),'missing reference material');
 assert.ok(!text.includes('待补充'),'export contains 待补充');
});

test('export refuses a lesson that still contains placeholder text',async()=>{
 const {makeWord}=await compile('lib/export.ts',{name:'export-fixture-2',setup(b){b.onResolve({filter:/^\.\/server$/},()=>({path:'server',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const config=()=>({});export class AppError extends Error{}`,loader:'js'}))}});
 const bad=structuredClone(draft);bad.lesson.materials[0].content='费用待补充';
 await assert.rejects(makeWord(bad,'teacher'),/占位语/);
 const bad2=structuredClone(draft);bad2.lesson.goals[0].text='待填写';
 await assert.rejects(makeWord(bad2,'student'),/占位语/);
});

test('placeholder scan points at the field that needs writing',()=>{
 const l=structuredClone(templateLesson(b,k));
 assert.deepEqual(placeholderIssues(l),[]);
 l.activities[0].output='待补充';
 const issues=placeholderIssues(l);
 assert.equal(issues.length,1);
 assert.ok(issues[0].includes('课堂产出'));
});

test('objective numbering restarts per domain in teacher and student documents',async()=>{
 const {buildTeacherDocx,buildStudentDocx}=await compile('lib/lib/exporter/docbuild.js',{name:'docbuild-fixture',setup(){}});
 const objectives=[
  {domain:'认知领域',text:'目标认知1'},
  {domain:'认知领域',text:'目标认知2'},
  {domain:'技能领域',text:'目标技能说'},
  {domain:'技能领域',text:'目标技能读'},
  {domain:'技能领域',text:'目标技能写'},
  {domain:'情感领域',text:'目标情感1'},
  {domain:'情感领域',text:'目标情感2'},
 ];
 const lesson={title:'编号验证',objectives,stages:[],keyPoints:['重点'],difficulties:['难点'],materials:[],vocabulary:[],grammar:[],culture:[],exercises:[],homework:[],assessment:[],errors:[],board:'板书',notes:'备注'};
 const ctx={lesson,brief:{audience:'来华留学生',minutes:45,referenceMaterial:'《HSK标准教程》3'},courseType:{name:'综合课'},topic:{title:'编号验证'}};
 const read=async(buf)=>Buffer.from(buf).toString('utf8').replace(/<[^>]*>/g,'\n');
 const teacher=await read(buildTeacherDocx(ctx));
 const student=await read(buildStudentDocx(ctx));
 // 认知领域 1、2；技能领域 1、2、3；情感领域 1、2 —— 每个领域各自重新编号
 for(const doc of [teacher,student]){
  assert.ok(doc.includes('1. 目标认知1'),'认知领域未从 1 开始');
  assert.ok(doc.includes('2. 目标认知2'),'认知领域编号不连续');
  assert.ok(doc.includes('1. 目标技能说'),'技能领域未从 1 开始');
  assert.ok(doc.includes('2. 目标技能读'),'技能领域编号不连续');
  assert.ok(doc.includes('3. 目标技能写'),'技能领域编号不连续');
  assert.ok(doc.includes('1. 目标情感1'),'情感领域未从 1 开始');
  assert.ok(doc.includes('2. 目标情感2'),'情感领域编号不连续');
 }
});

test('a list with one item is printed without a number',async()=>{
 const {buildTeacherDocx,buildStudentDocx}=await compile('lib/lib/exporter/docbuild.js',{name:'docbuild-fixture',setup(){}});
 const lesson={
  title:'单条列表',
  objectives:[{domain:'认知领域',text:'唯一的认知目标'}],
  stages:[{name:'唯一环节',minutes:10,content:'',teacher:'',students:'',purpose:'',subSteps:[]}],
  keyPoints:['唯一的重点'],
  difficulties:['唯一的难点'],
  materials:[],vocabulary:[],grammar:[],culture:[],
  exercises:[{question:'唯一的题目',answer:'答案'}],
  homework:[],assessment:[],errors:[],board:'',notes:'',
 };
 const ctx={lesson,brief:{audience:'来华留学生',minutes:45,referenceMaterial:'《HSK标准教程》3'},courseType:{name:'综合课'},topic:{title:'单条列表'}};
 const read=async(buf)=>Buffer.from(buf).toString('utf8').replace(/<[^>]*>/g,'\n');
 const teacher=await read(buildTeacherDocx(ctx));
 const student=await read(buildStudentDocx(ctx));
 // 单条时不加 "1. "
 assert.ok(teacher.includes('唯一的重点'),'缺少教学重点');
 assert.ok(!teacher.includes('1. 唯一的重点'),'单条教学重点不应带编号');
 assert.ok(!teacher.includes('1. 唯一的难点'),'单条教学难点不应带编号');
 assert.ok(!teacher.includes('1. 唯一的认知目标'),'单条认知目标不应带编号');
 assert.ok(!teacher.includes('练习 1'),'单条练习不应带编号');
 assert.ok(!student.includes('1. 唯一的认知目标'),'学生单条目标不应带编号');
 assert.ok(!student.includes('1. 唯一环节'),'学生单条课堂任务不应带编号');
 assert.ok(!student.includes('1. 唯一的题目'),'学生单条练习不应带编号');
});

test('a list with several items still gets 1. 2. 3. numbering',async()=>{
 const {buildTeacherDocx}=await compile('lib/lib/exporter/docbuild.js',{name:'docbuild-fixture',setup(){}});
 const lesson={
  title:'多条列表',
  objectives:[{domain:'认知领域',text:'认知甲'},{domain:'认知领域',text:'认知乙'}],
  stages:[],
  keyPoints:['重点甲','重点乙','重点丙'],
  difficulties:['难点甲','难点乙'],
  materials:[],vocabulary:[],grammar:[],culture:[],
  exercises:[{question:'题目甲',answer:'答案'},{question:'题目乙',answer:'答案'}],
  homework:[],assessment:[],errors:[],board:'',notes:'',
 };
 const ctx={lesson,brief:{audience:'来华留学生',minutes:45,referenceMaterial:'《HSK标准教程》3'},courseType:{name:'综合课'},topic:{title:'多条列表'}};
 const teacher=Buffer.from(buildTeacherDocx(ctx)).toString('utf8').replace(/<[^>]*>/g,'\n');
 assert.ok(teacher.includes('1. 重点甲'),'多条教学重点应从 1 编号');
 assert.ok(teacher.includes('2. 重点乙'));
 assert.ok(teacher.includes('3. 重点丙'));
 assert.ok(teacher.includes('1. 难点甲'));
 assert.ok(teacher.includes('2. 难点乙'));
 assert.ok(teacher.includes('1. 认知甲'));
 assert.ok(teacher.includes('2. 认知乙'));
 assert.ok(teacher.includes('练习 1'),'多条练习应带编号');
 assert.ok(teacher.includes('练习 2'));
});

test('teacher Word export preserves learner background and classroom environment',async()=>{
 const {makeWord}=await compile('lib/export.ts',{name:'context-export',setup(b){b.onResolve({filter:/^\.\/server$/},()=>({path:'server',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const config=()=>({});export class AppError extends Error{}`,loader:'js'}))}});
 const contextual={...draft,brief:{...draft.brief,teachingLocation:'海外',audience:{...draft.brief.audience,motherTongue:'日语、泰语',culturalBackground:'多国混合'}}};
 const blob=await makeWord(contextual,'teacher');
 const text=Buffer.from(await blob.arrayBuffer()).toString('utf8');
 for(const value of ['日语、泰语','多国混合','授课地点：海外','《等级标准》 3级'])assert.ok(text.includes(value),'missing context '+value);
});
test('grammar example questions and stem links enter teacher and student materials while student export omits graph answers',async()=>{
 const {makeWord}=await compile('lib/export.ts',{name:'grammar-export',setup(b){b.onResolve({filter:/^\.\/server$/},()=>({path:'server',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const config=()=>({});export class AppError extends Error{}`,loader:'js'}))}});
 const question={id:'Question:fixture',name:'图谱例题标题',description:'请选择恰当的表达。',stem:'https://kg.chineseplus.net/fixture-stem.png',corpus:'图谱语料',choices:'A甲 B乙',answer:'独立答案标记',listenStem:'',listenCorpus:'',links:[{label:'题干链接',url:'https://kg.chineseplus.net/fixture-stem.png'}]};
 const knowledge=[{...k[0],kind:'Grammar',grammarQuestions:[question],selectedQuestionIds:[question.id]}];
 for(const kind of ['teacher','student']){
  const blob=await makeWord({...draft,knowledge},kind),text=Buffer.from(await blob.arrayBuffer()).toString('utf8');
  assert.ok(text.includes('图谱例题标题'));
  assert.ok(text.includes('https://kg.chineseplus.net/fixture-stem.png'));
  assert.equal(text.includes('独立答案标记'),kind==='teacher');
 }
});
