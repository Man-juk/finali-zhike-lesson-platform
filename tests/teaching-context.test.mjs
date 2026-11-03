import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBrief,normalizeBrief,briefSchema,withBriefDefaults} from '../lib/lesson.ts';
import {formatTeachingContext,lessonPrompt} from '../lib/evidence.ts';
test('old drafts keep their level and do not invent student backgrounds',()=>{
 const restored=normalizeBrief({...initialBrief,teachingLocation:undefined,audience:{nationality:'日本',age:'20',level:'2'}});
 assert.equal(restored.audience.level,'2');
 assert.equal(restored.audience.motherTongue,'');
 assert.equal(restored.audience.culturalBackground,'');
 assert.equal(restored.teachingLocation,'');
 assert.equal(withBriefDefaults(restored).audience.motherTongue,'');
});
test('new context survives validation and reaches the model and document summary',()=>{
 for(const teachingLocation of ['中国','海外'])for(const culturalBackground of ['单一国家','多国混合']){
 const brief=briefSchema.parse({...initialBrief,teachingLocation,audience:{nationality:'日本、泰国',motherTongue:'日语、泰语',age:'20',level:'2',culturalBackground}});
 for(const output of [formatTeachingContext(brief),lessonPrompt(brief,[],{})]){
 for(const value of [teachingLocation,culturalBackground,'日语、泰语','《等级标准》 2级'])assert.ok(output.includes(value),value);
 }
 assert.deepEqual(normalizeBrief(JSON.parse(JSON.stringify(brief))),brief);
 }
});
test('unknown environment and cultural categories are rejected',()=>{
 assert.equal(briefSchema.safeParse({...initialBrief,teachingLocation:'月球'}).success,false);
 assert.equal(briefSchema.safeParse({...initialBrief,audience:{...initialBrief.audience,culturalBackground:'未知类别'}}).success,false);
});
test('general courses require an actionable culture comparison adapted to student background',()=>{
 const brief={...initialBrief,courseType:'综合课',minutes:60,teachingLocation:'海外',audience:{...initialBrief.audience,motherTongue:'日语、泰语',culturalBackground:'多国混合'}};
 const prompt=lessonPrompt(brief,[],{});
 for(const requirement of ['【综合课：中外文化比较】','实际写入 activities','异同对照表','评价标准','情感领域目标','多国混合班级','不得仅凭国籍推断','个人经历不代表整个国家或群体','总时长仍严格等于 60 分钟','修订时也须保留'])assert.ok(prompt.includes(requirement),requirement);
 assert.ok(prompt.includes('日语、泰语'));
 for(const courseType of ['读写课','听力课'])assert.ok(!lessonPrompt({...brief,courseType},[],{}).includes('【综合课：中外文化比较】'));
});
