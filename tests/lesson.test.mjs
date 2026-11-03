import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBrief,manualKnowledge,templateLesson,lessonSchema,checkLesson,briefSchema,objectiveDomains,normalizeBrief,withBriefDefaults,courseTypes} from '../lib/lesson.ts';
import {formatAudience} from '../lib/evidence.ts';
test('15 to 180 minute templates have exact timing and complete goal/knowledge coverage',()=>{for(let minutes=15;minutes<=180;minutes++){const b={...initialBrief,minutes};const k=manualKnowledge(b);const l=templateLesson(b,k);assert.ok(lessonSchema.safeParse(l).success);assert.equal(l.activities.reduce((s,a)=>s+a.minutes,0),minutes);assert.equal(checkLesson(l,b,k).filter(x=>x.severity==='error').length,0)}});
test('checks reject wrong times and references outside confirmed knowledge',()=>{const b={...initialBrief,templateConfig:{...initialBrief.templateConfig,modules:{...initialBrief.templateConfig.modules,exercises:true}}};const k=manualKnowledge(b),l=templateLesson(b,k);l.activities[0].minutes+=1;l.activities[0].knowledgeIds.push('invented');l.exercises=[];const issues=checkLesson(l,b,k);assert.ok(issues.some(x=>x.text.includes('不一致')));assert.ok(issues.some(x=>x.text.includes('invented')));assert.ok(issues.some(x=>x.text.includes('没有检查题')))});
// 练习模块关闭时，「没有检查题」不是错误：老师不要练习，模型不产出才是对的
test('a disabled exercises module is not reported as a missing check',()=>{const b={...initialBrief,templateConfig:{...initialBrief.templateConfig,modules:{...initialBrief.templateConfig.modules,exercises:false}}};const k=manualKnowledge(b),l=templateLesson(b,k);l.exercises=[];const issues=checkLesson(l,b,k);assert.ok(!issues.some(x=>x.text.includes('没有检查题')))});
test('missing graph verification is visible',()=>{const k=manualKnowledge(initialBrief);assert.ok(checkLesson(templateLesson(initialBrief,k),initialBrief,k).some(x=>x.text.includes('未通过图谱核验')))});

test('brief carries audience and reference material with safe defaults',()=>{assert.equal(briefSchema.parse(initialBrief).audience.nationality,'来华留学生');assert.equal(briefSchema.parse(initialBrief).referenceMaterial,'《HSK标准教程》3');const bare=briefSchema.parse({...initialBrief,audience:undefined,referenceMaterial:undefined});assert.ok(bare.audience.nationality.length>0);assert.ok(bare.referenceMaterial.length>0)});

test('brief carries a course type that defaults to the general class',()=>{assert.equal(briefSchema.parse(initialBrief).courseType,'综合课');assert.deepEqual(courseTypes,['综合课','读写课','听力课']);assert.equal(briefSchema.parse({...initialBrief,courseType:undefined}).courseType,'综合课');assert.equal(briefSchema.parse({...initialBrief,courseType:'听力课'}).courseType,'听力课');assert.equal(briefSchema.safeParse({...initialBrief,courseType:'口语课'}).success,false)});

test('the teaching object is stored as nationality, age and level',()=>{const a=briefSchema.parse({...initialBrief,audience:{nationality:'美国',age:'20',level:'3'}}).audience;assert.equal(a.nationality,'美国');assert.equal(a.age,'20');assert.equal(a.level,'3');assert.equal(formatAudience(a),'美国，20岁，HSK 3级')});

test('the teaching object summary omits the parts that are not filled in',()=>{assert.equal(formatAudience({nationality:'美国',age:'',level:'3'}),'美国，HSK 3级');assert.equal(formatAudience({nationality:'',age:'20',level:''}),'20岁');assert.equal(formatAudience({nationality:'',age:'',level:''}),'')});

test('template covers all three objective domains and states difficulties',()=>{const l=templateLesson(initialBrief,manualKnowledge(initialBrief));for(const d of objectiveDomains)assert.ok(l.goals.some(g=>g.domain===d),'missing domain '+d);assert.ok(l.difficulties.length>0);assert.ok(l.difficulties.every(d=>d.text.length>0))});

test('checks reject a missing domain and missing difficulties',()=>{const k=manualKnowledge(initialBrief),l=templateLesson(initialBrief,k);l.goals=l.goals.filter(g=>g.domain!=='情感领域');l.difficulties=[];const issues=checkLesson(l,initialBrief,k);assert.ok(issues.some(x=>x.text.includes('情感领域')));assert.ok(issues.some(x=>x.text.includes('教学难点')))});

test('lesson schema refuses an unknown objective domain',()=>{const l=templateLesson(initialBrief,manualKnowledge(initialBrief));l.goals[0].domain='学习策略';assert.equal(lessonSchema.safeParse(l).success,false);l.goals[0].domain='认知领域';assert.equal(lessonSchema.safeParse(l).success,true)});

// 旧草稿没有 audience / referenceMaterial，受控输入框的 value 会是 undefined
const oldBrief={topic:'比较方案',standard:'InternationalLevel',level:'3',minutes:45,students:20,mode:'线下课堂',outcome:'能比较方案',passage:'',terms:'便宜、方便'};

test('an old brief without the new fields is restored with defaults instead of undefined',()=>{
 // 关键：safeParse 会通过，但原始对象的字段仍是 undefined —— 不能直接 setBrief(原始对象)
 assert.equal(briefSchema.safeParse(oldBrief).success,true);
 assert.equal(oldBrief.audience,undefined);
 const restored=normalizeBrief(oldBrief);
 assert.ok(restored,'normalizeBrief should accept an old brief');
 // 旧草稿的学习者等级（顶层 level）搬进教学对象
 assert.equal(restored.audience.level,'3');
 assert.equal(restored.audience.nationality,'');
 assert.equal(restored.referenceMaterial,'《HSK标准教程》3');
});

test('an old brief with a plain-text audience and a top-level level is migrated',()=>{
 const legacy={...oldBrief,audience:'来华留学生'};
 const restored=normalizeBrief(legacy);
 assert.ok(restored,'normalizeBrief should accept a legacy brief');
 assert.equal(restored.audience.nationality,'来华留学生');
 assert.equal(restored.audience.level,'3');
 assert.equal(restored.audience.age,'');
 // 顶层 level 不再是 brief 的字段
 assert.equal('level' in restored,false);
});

test('withBriefDefaults fills every missing field so no input stays uncontrolled',()=>{
 const filled=withBriefDefaults({...oldBrief,audience:undefined,referenceMaterial:undefined,terms:undefined});
 for(const f of ['topic','referenceMaterial','outcome','passage','terms'])
  assert.equal(typeof filled[f],'string',f+' must be a string');
 assert.equal(typeof filled.audience,'object');
 for(const f of ['nationality','age','level'])
  assert.equal(typeof filled.audience[f],'string',f+' must be a string');
 assert.equal(typeof filled.minutes,'number');
 assert.equal(typeof filled.students,'number');
 assert.equal(typeof filled.standard,'string');
 assert.equal(typeof filled.mode,'string');
 assert.notEqual(filled.audience,undefined);
 assert.notEqual(filled.referenceMaterial,undefined);
});

test('withBriefDefaults keeps the values the teacher already entered',()=>{
 const filled=withBriefDefaults({...oldBrief,audience:{nationality:'日本零基础',age:'22',level:'2'},referenceMaterial:'《大学汉语》'});
 assert.equal(filled.audience.nationality,'日本零基础');
 assert.equal(filled.audience.age,'22');
 assert.equal(filled.audience.level,'2');
 assert.equal(filled.referenceMaterial,'《大学汉语》');
});
