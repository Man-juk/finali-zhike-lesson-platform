import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBrief,defaultTemplateConfig,presetModules} from '../lib/lesson.ts';
import {lessonPrompt,templateStructurePrompt,templateCustomInstructionPrompt} from '../lib/evidence.ts';

/** 造一份只改了结构偏好的 brief。 */
function withTemplate(patch){return {...initialBrief,templateConfig:{...defaultTemplateConfig,...patch}};}
function withModules(modules){return withTemplate({modules:{...defaultTemplateConfig.modules,...modules}});}

const shape={goals:[],activities:[],exercises:[]};

test('a disabled module is forbidden by name in the prompt',()=>{
 const brief=withModules({exercises:false,pitfalls:false,appendix:false});
 const p=lessonPrompt(brief,[],shape);
 assert.ok(p.includes('本次教案绝对不要包含它们'),'缺少禁用模块的总述');
 assert.ok(p.includes('本次教案绝对不要包含「课堂练习与参考答案」模块'),'缺少练习模块的禁用指令');
 assert.ok(p.includes('本次教案绝对不要包含「偏误预判与应对」模块'),'缺少偏误模块的禁用指令');
 assert.ok(p.includes('本次教案绝对不要包含「附录（板书、评价量表等）」模块'),'缺少附录模块的禁用指令');
 assert.ok(p.includes('不要输出 exercises'),'缺少 exercises 的禁用指令');
 assert.ok(p.includes('不要输出 errors'),'缺少偏误的禁用指令');
 assert.ok(p.includes('不要输出 board、assessment、homework'),'缺少附录的禁用指令');
});

test('an enabled module is not forbidden',()=>{
 const brief=withModules({exercises:true,pitfalls:true,appendix:true});
 const p=lessonPrompt(brief,[],shape);
 assert.ok(!p.includes('本次教案绝对不要包含它们'),'全部开启时不应出现禁用总述');
 assert.ok(!p.includes('不要输出 exercises'));
 assert.ok(!p.includes('不要输出 errors'));
 assert.ok(!p.includes('不要输出 board、assessment、homework'));
});

test('the disabled module list follows every checkbox the teacher turned off',()=>{
 const brief=withModules({goals:false,vocabulary:false,grammar:false,steps:false,exercises:false,pitfalls:false,appendix:false});
 const p=templateStructurePrompt(brief);
 for(const label of ['教学目标与重难点','核心词汇表','语法点与例句','教学步骤明细（师生活动）','课堂练习与参考答案','偏误预判与应对','附录（板书、评价量表等）']){
  assert.ok(p.includes(label),'缺少禁用模块：'+label);
 }
});

test('the preset directive is injected into the prompt',()=>{
 const concise=templateStructurePrompt(withTemplate({preset:'concise'}));
 assert.ok(concise.includes('尽量精简教师用语，只保留核心教学步骤和指令'),'精简版指令缺失');
 const detailed=templateStructurePrompt(withTemplate({preset:'detailed'}));
 assert.ok(detailed.includes('请扩充教师的逐字稿与详细的师生活动说明'),'详细版指令缺失');
 const taskDriven=templateStructurePrompt(withTemplate({preset:'taskDriven'}));
 assert.ok(taskDriven.includes('以学生产出和任务为核心来组织教学环节'),'任务驱动型指令缺失');
});

test('the preset directive also reaches the full prompt',()=>{
 assert.ok(lessonPrompt(withTemplate({preset:'concise'}),[],shape).includes('尽量精简教师用语，只保留核心教学步骤和指令'));
 assert.ok(lessonPrompt(withTemplate({preset:'detailed'}),[],shape).includes('请扩充教师的逐字稿与详细的师生活动说明'));
 assert.ok(lessonPrompt(withTemplate({preset:'taskDriven'}),[],shape).includes('以学生产出和任务为核心来组织教学环节'));
});

test('the custom instruction is appended as the highest priority constraint at the very end',()=>{
 const brief=withTemplate({customInstruction:'所有活动用三列表格呈现，教师用语全部加粗。'});
 const p=lessonPrompt(brief,[],shape);
 assert.ok(p.includes('【用户的特殊排版/风格要求（最高优先级）】'),'缺少特别要求标题');
 assert.ok(p.includes('所有活动用三列表格呈现，教师用语全部加粗。'),'缺少特别要求正文');
 const tail=p.slice(p.lastIndexOf('【用户的特殊排版/风格要求（最高优先级）】'));
 assert.ok(tail.includes('所有活动用三列表格呈现'),'特别要求未落在提示词末尾');
 assert.ok(p.trimEnd().endsWith('与上述硬约束冲突，以硬约束为准，并在 notes 中说明未采用该条要求及原因。'),'特别要求之后还有内容');
});

test('an empty custom instruction adds nothing',()=>{
 const brief=withTemplate({customInstruction:'   '});
 assert.equal(templateCustomInstructionPrompt(brief),'');
 assert.ok(!lessonPrompt(brief,[],shape).includes('【用户的特殊排版/风格要求'));
});

test('the prompt requires full JSON keys even when modules are disabled',()=>{
 const brief=withModules({exercises:false,appendix:false});
 const p=lessonPrompt(brief,[],shape);
 assert.ok(p.includes('【JSON 形状】'),'缺少 JSON 形状说明');
 assert.ok(p.includes('九个键'),'未说明必填键');
 assert.ok(p.includes('exercises 用空数组'),'未说明 exercises 可为空数组');
});

test('the preset and the module switches stay consistent with each other',()=>{
 // 精简版默认不带练习与附录：提示词必须按开关说话，而不是按套餐名说话
 const brief=withTemplate({preset:'concise',modules:presetModules.concise});
 const p=lessonPrompt(brief,[],shape);
 assert.ok(p.includes('尽量精简教师用语，只保留核心教学步骤和指令'));
 assert.ok(p.includes('不要输出 exercises'));
 assert.ok(p.includes('不要输出 board、assessment、homework'));
});
