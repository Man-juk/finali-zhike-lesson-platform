import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 initialBrief,
 briefSchema,
 normalizeBrief,
 withBriefDefaults,
 defaultTemplateConfig,
 presetModules,
 templateModules,
 templatePresets,
 enabledTemplateModules,
 isCustomizedTemplate,
} from '../lib/lesson.ts';

test('the seven module toggles are exactly the ones the teachers were promised',()=>{
 assert.deepEqual(templateModules.map(m=>m.key),['goals','vocabulary','grammar','steps','exercises','pitfalls','appendix']);
 assert.deepEqual(templateModules.map(m=>m.label),['教学目标与重难点','核心词汇表','语法点与例句','教学步骤明细（师生活动）','课堂练习与参考答案','偏误预判与应对','附录（板书、评价量表等）']);
});

test('the four presets are offered with their short descriptions',()=>{
 assert.deepEqual(templatePresets.map(p=>p.id),['standard','concise','detailed','taskDriven']);
 assert.deepEqual(templatePresets.map(p=>p.label),['综合课标准模板','精简版','详细版','任务驱动型']);
 assert.ok(templatePresets.every(p=>p.hint.length>0));
});

test('the default preference is the general standard template',()=>{
 const config=briefSchema.parse(initialBrief).templateConfig;
 assert.equal(config.preset,'standard');
 assert.deepEqual(config.modules,presetModules.standard);
 assert.equal(config.customInstruction,'');
 assert.equal(isCustomizedTemplate(config),false);
});

test('an old draft without preferences is restored with the standard template',()=>{
 const oldBrief={topic:'比较方案',standard:'InternationalLevel',level:'3',minutes:45,students:20,mode:'线下课堂',outcome:'能比较方案',passage:'',terms:'便宜、方便'};
 const restored=normalizeBrief(oldBrief);
 assert.ok(restored,'normalizeBrief should accept an old brief');
 assert.equal(restored.templateConfig.preset,'standard');
 assert.deepEqual(restored.templateConfig.modules,presetModules.standard);
 assert.equal(restored.templateConfig.customInstruction,'');
});

test('withBriefDefaults fills the preferences so no control stays uncontrolled',()=>{
 const filled=withBriefDefaults({...initialBrief,templateConfig:undefined});
 assert.equal(filled.templateConfig.preset,'standard');
 assert.deepEqual(filled.templateConfig.modules,presetModules.standard);
 assert.equal(typeof filled.templateConfig.customInstruction,'string');
});

test('a partial module list is completed from the chosen preset',()=>{
 const brief=briefSchema.parse({...initialBrief,templateConfig:{preset:'concise',modules:{steps:true}}});
 assert.equal(brief.templateConfig.modules.steps,true);
 assert.equal(brief.templateConfig.modules.vocabulary,false,'unlisted modules follow the preset');
 assert.equal(brief.templateConfig.modules.grammar,false);
 assert.equal(brief.templateConfig.modules.appendix,false);
});

test('a listed module overrides the preset default',()=>{
 const brief=briefSchema.parse({...initialBrief,templateConfig:{preset:'detailed',modules:{exercises:false}}});
 assert.equal(brief.templateConfig.modules.exercises,false,'the teacher choice wins');
 assert.equal(brief.templateConfig.modules.pitfalls,true,'unlisted modules follow the preset');
});

test('the four presets differ in which modules they switch on',()=>{
 assert.ok(presetModules.concise.vocabulary===false);
 assert.ok(presetModules.detailed.exercises===true);
 assert.ok(presetModules.detailed.pitfalls===true);
 assert.ok(presetModules.taskDriven.exercises===true);
 assert.ok(presetModules.taskDriven.appendix===false);
});

test('enabled modules are reported in the declared order',()=>{
 const config={preset:'standard',modules:{...presetModules.standard,exercises:true},customInstruction:''};
 assert.deepEqual(enabledTemplateModules(config),['goals','vocabulary','grammar','steps','exercises','appendix']);
 assert.equal(enabledTemplateModules({...config,modules:presetModules.concise}).length,2);
});

test('a teacher who changed a switch is marked as customized',()=>{
 assert.equal(isCustomizedTemplate({preset:'standard',modules:presetModules.standard,customInstruction:''}),false);
 assert.equal(isCustomizedTemplate({preset:'standard',modules:{...presetModules.standard,exercises:true},customInstruction:''}),true);
 // 特别要求本身也算偏离预设，但只影响模块开关的一致性判断，不在此列。
 assert.equal(isCustomizedTemplate({preset:'standard',modules:presetModules.standard,customInstruction:'用表格'}),false);
});

test('unknown presets, unknown module keys and unknown fields are refused',()=>{
 assert.equal(briefSchema.safeParse({...initialBrief,templateConfig:{preset:'bogus'}}).success,false);
 assert.equal(briefSchema.safeParse({...initialBrief,templateConfig:{preset:'standard',modules:{goals:true,foo:true}}}).success,false);
 assert.equal(briefSchema.safeParse({...initialBrief,templateConfig:{preset:'standard',modules:presetModules.standard,extra:1}}).success,false);
 assert.equal(briefSchema.safeParse({...initialBrief,templateConfig:{preset:'standard',modules:presetModules.standard,customInstruction:'x'}}).success,true);
});

test('the special requirement text is kept and length limited',()=>{
 const brief=briefSchema.parse({...initialBrief,templateConfig:{preset:'standard',modules:presetModules.standard,customInstruction:'教学步骤请以表格形式呈现'}});
 assert.equal(brief.templateConfig.customInstruction,'教学步骤请以表格形式呈现');
 assert.equal(briefSchema.safeParse({...initialBrief,templateConfig:{preset:'standard',modules:presetModules.standard,customInstruction:'x'.repeat(1001)}}).success,false);
});

test('the default preference object is independent from the preset table',()=>{
 defaultTemplateConfig.modules.exercises=true;
 assert.equal(presetModules.standard.exercises,false,'the preset table must not be mutated');
 defaultTemplateConfig.modules.exercises=false;
});
