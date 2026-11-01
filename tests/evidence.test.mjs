import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSelections,exampleChoices} from '../lib/evidence.ts';
import {initialBrief} from '../lib/lesson.ts';
const b={standard:'InternationalLevel'};
const node={id:'Word:1',name:'方便',kind:'Word',role:'核心',verified:true,detail:'⒈ 便利。⒉ 上厕所。',rawDetail:'⒈ 便利。⒉ 上厕所。',example:'交通很方便。││买东西很方便。',levels:['二级'],relations:[],evidence:{standard:'InternationalLevel',parameters:{terms:['方便']},queries:[]}};
const selection={id:'Word:1',name:'方便',kind:'Word',role:'核心',selectedMeaning:'⒈ 便利。',selectedExamples:['交通很方便。'],scopeConfirmed:true};
test('accepts only confirmed source excerpts and original whole examples',()=>assert.equal(validateSelections([selection],[node],b).problems.length,0));
test('rejects forged node id even when name matches',()=>assert.ok(validateSelections([{...selection,id:'Word:99'}],[node],b).problems.some(p=>p.includes('节点未匹配'))));
test('rejects rewritten meaning, invented examples, wrong standards and missing confirmation',()=>{for(const patch of [{selectedMeaning:'方便表示价格低。'},{selectedExamples:['这条路十分方便。']},{scopeConfirmed:false}])assert.ok(validateSelections([{...selection,...patch}],[node],b).problems.length);assert.ok(validateSelections([selection],[node],{standard:'HSKLevel'}).problems.length)});
test('same-name character cannot satisfy word identity',()=>assert.ok(validateSelections([{...selection,kind:'Character'}],[node],b).problems.length));
test('missing fields are never invented',()=>{const n={...node,rawDetail:'',detail:'',example:'',rawExample:''};assert.equal(validateSelections([{...selection,selectedMeaning:'',selectedExamples:[]}],[n],b).problems.length,0)});
test('splits source sentence separators without paraphrase',()=>assert.deepEqual(exampleChoices('甲。││乙。\n甲。'),['甲。','乙。']));

test('blocks grammar instruction without a grammar evidence node', async()=>{
 const {checkEvidenceBoundary}=await import('../lib/evidence.ts');
 assert.equal(checkEvidenceBoundary({board:'A比B句式'},[{kind:'Word'}]).length,1);
 assert.equal(checkEvidenceBoundary({board:'原文例句与交通情境任务'},[{kind:'Word'}]).length,0);
 assert.equal(checkEvidenceBoundary({board:'A比B句式'},[{kind:'Grammar'}]).length,0);
});

test('the prompt states a hard constraint that the title equals the course topic',async()=>{
 const {lessonPrompt}=await import('../lib/evidence.ts');
 const brief={topic:'V1着+V2',standard:'InternationalLevel',courseType:'综合课',minutes:45,students:20,mode:'线下课堂',audience:{nationality:'来华留学生',age:'20',level:'3'},referenceMaterial:'《HSK标准教程》3',outcome:'能比较方案',passage:'',terms:'着'};
 const prompt=lessonPrompt(brief,[],{title:'课程标题'});
 assert.ok(prompt.includes('标题硬约束'),'prompt 缺少标题硬约束');
 assert.ok(prompt.includes('lesson.title'),'prompt 未点名 title 字段');
 assert.ok(prompt.includes('原封不动'),'prompt 未强调逐字一致');
 // 必须明确否定课型/时长等后缀
 assert.ok(/课型/.test(prompt)&&/时长/.test(prompt),'prompt 未禁止课型、时长后缀');
 // 反例要写进 prompt
 assert.ok(prompt.includes('V1着+V2'),'prompt 缺少反例主题');
 assert.ok(prompt.includes('（90分钟）'),'prompt 缺少错误写法示例');
});

test('the lesson title is forced to the course topic, whatever the model returned',async()=>{
 const {withFixedTitle}=await import('../lib/lesson.ts');
 const modelTitle='HSK3 词汇与"V1着+V2"交际运用（90分钟）';
 const fixed=withFixedTitle({title:modelTitle,goals:[]},'V1着+V2');
 assert.equal(fixed.title,'V1着+V2');
 // 标点原样保留
 assert.equal(withFixedTitle({title:'随便'},'A+B').title,'A+B');
 // 不改动其他字段
 const lesson={title:modelTitle,goals:[{id:'g1'}],notes:'备注'};
 const out=withFixedTitle(lesson,'V1着+V2');
 assert.equal(out.title,'V1着+V2');
 assert.equal(out.notes,'备注');
 assert.deepEqual(out.goals,[{id:'g1'}]);
 assert.equal(lesson.title,modelTitle,'不应修改入参');
});

test('a blank topic does not wipe out the title',async()=>{
 const {withFixedTitle}=await import('../lib/lesson.ts');
 assert.equal(withFixedTitle({title:'原标题'},'   ').title,'原标题');
});

test('the forced title is exactly equal to brief.topic',async()=>{
 const {withFixedTitle}=await import('../lib/lesson.ts');
 for(const topic of ['V1着+V2','比较周末出游方案并提出建议','《HSK标准教程》第三册 第5课','A/B 测试（必修）']){
  const brief={...initialBrief,topic};
  const fixed=withFixedTitle({title:'模型自己编的标题'},brief.topic);
  // 严格相等：不是 includes，也不是去空格后相等
  assert.equal(fixed.title,brief.topic);
  assert.equal(fixed.title.length,brief.topic.length);
 }
});
