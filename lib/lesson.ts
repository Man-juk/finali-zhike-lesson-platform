import { z } from 'zod';
export const culturalTopicSelectionSchema=z.object({id:z.string().min(1).max(200),kind:z.enum(['CulturalStage','Cultural','CulturalLevel1','CulturalLevel2']),name:z.string().min(1).max(300)});
import type {LexicalFeature} from './lexical';
const text = z.string().min(1).max(3000);
/**
 * 展示用的教案不得留占位语（如「（待补充）」）。
 * 缺失内容必须由教师补写成实际内容后再导出，而不是把占位符带进成品。
 *
 * 只匹配真正的占位标记，不误伤「请教师按主题补充」「需教师补充审核」
 * 这类写给教师的正常说明文字。
 */
export const PLACEHOLDER=/待补充|待填写|待完善|待定|TBD|教师自行判断/;
export const hasPlaceholder=(v:string)=>PLACEHOLDER.test(v);
export const placeholderIssues=(l:Lesson):string[]=>{
 const issues:string[]=[];
 const scan=(label:string,value:unknown)=>{if(typeof value==='string'&&hasPlaceholder(value))issues.push(`${label}仍含占位语，请补写实际内容后再导出。`)};
 l.goals.forEach((g,i)=>scan(`教学目标 ${i+1}`,g.text));
 l.difficulties.forEach((d,i)=>scan(`教学难点 ${i+1}`,d.text));
 l.activities.forEach((a,i)=>{scan(`环节「${a.title}」的教师活动`,a.teacher);scan(`环节「${a.title}」的学生活动`,a.students);scan(`环节「${a.title}」的课堂产出`,a.output);scan(`环节「${a.title}」的评价方式`,a.assessment)});
 l.materials.forEach((m,i)=>{scan(`配套材料「${m.title}」`,m.content)});
 l.exercises.forEach((e,i)=>{scan(`检查题 ${i+1} 的题目`,e.question);scan(`检查题 ${i+1} 的参考答案`,e.answer)});
 scan('板书提纲',l.board);scan('课后任务',l.homework);scan('备注',l.notes);
 return issues;
};
/** 课型：教学需求的结构化课型，导出教案时写入「三、课型」。 */
export const courseTypes=['综合课','读写课','听力课'] as const;
export type CourseType=typeof courseTypes[number];
/**
 * 教学对象：国籍、年龄、汉语等级、母语与文化背景。
 * 界面上合并成一个输入框（旧草稿里 audience 曾经是一个字符串）。
 */
export const audienceSchema=z.object({nationality:z.string().max(60).default(''),age:z.string().max(20).default(''),level:z.string().max(10).default('3'),motherTongue:z.string().max(100).default(''),culturalBackground:z.enum(['','单一国家','多国混合']).default('')});
export type Audience=z.infer<typeof audienceSchema>;
export const knowledgeColumns=[{key:'characters',label:'汉字',example:'旅、游、比'},{key:'vocabulary',label:'词汇',example:'便宜、方便、建议'},{key:'grammar',label:'语法',example:'比字句、把字句'},{key:'culture',label:'文化',example:'节日习俗、饮食礼仪'},{key:'other',label:'其他',example:'跨文化交际任务、学习策略'}] as const;
export const knowledgeGroupsSchema=z.object({characters:z.string().max(1200).default(''),vocabulary:z.string().max(1200).default(''),grammar:z.string().max(1200).default(''),culture:z.string().max(1200).default(''),other:z.string().max(1200).default('')});
export type KnowledgeGroups=z.infer<typeof knowledgeGroupsSchema>;
const emptyKnowledgeGroups=(terms=''):KnowledgeGroups=>({characters:'',vocabulary:terms,grammar:'',culture:'',other:''});
export function getKnowledgeGroups(brief:{terms:string;knowledgeGroups?:Partial<KnowledgeGroups>|KnowledgeGroups}):KnowledgeGroups{
 const base=emptyKnowledgeGroups(brief.terms||'');
 if(!brief.knowledgeGroups||typeof brief.knowledgeGroups!=='object')return base;
 return {...base,...brief.knowledgeGroups};
}
export function graphTermsFromGroups(groups:Partial<KnowledgeGroups>|KnowledgeGroups|undefined):string{
 const split=(raw:unknown)=>typeof raw==='string'&&raw?raw.split(/[、，,；;\n]+/).map(t=>t.trim()).filter(Boolean):[];
 return [...new Set(split(groups?.characters).concat(split(groups?.vocabulary),split(groups?.grammar)))].join('、');
}
/** 节点名称是否出现在 brief 对应类别的指定词中（类别与 kind 必须一致，避免「吃」同时当汉字和词汇残留）。 */
export function knowledgeInBriefScope(item:Knowledge,brief:{terms:string;knowledgeGroups?:Partial<KnowledgeGroups>|KnowledgeGroups}):boolean{
 const g=getKnowledgeGroups(brief);
 if(item.kind==='Character')return splitTerms(g.characters).includes(item.name);
 if(item.kind==='Word')return splitTerms(g.vocabulary).includes(item.name);
 if(item.kind==='Grammar')return splitTerms(g.grammar).includes(item.name);
 if(item.kind==='Idiom'){
  const vocab=new Set(splitTerms(g.vocabulary));
  return vocab.has(item.name);
 }
 return false;
}
/** 只保留仍出现在 knowledgeGroups 指定范围内的节点，去掉 localStorage 里与当前 brief 无关的历史项。 */
export function pruneKnowledgeToBrief(list:Knowledge[],brief:{terms:string;knowledgeGroups?:Partial<KnowledgeGroups>|KnowledgeGroups}):Knowledge[]{
 return list.filter(k=>knowledgeInBriefScope(k,brief));
}
export const graphSearchStandards=['InternationalLevel','HSKLevel','HSK30Level'] as const;
export type GraphSearchStandard=typeof graphSearchStandards[number];
/** 图谱检索使用的等级体系，缺省为国际中文教育等级标准。 */
export function graphSearchStandard(brief:{standard?:string}):GraphSearchStandard{
 const s=brief.standard;
 return graphSearchStandards.includes(s as GraphSearchStandard)?(s as GraphSearchStandard):'InternationalLevel';
}
/** 向导本步刚搜索的词写入 knowledgeGroups，避免 prune 在标签尚未同步时误删匹配结果。 */
export function augmentBriefWithStepTerms(brief:Brief,stepKey:'characters'|'vocabulary'|'grammar',terms:string[]):Brief{
 const groups={...getKnowledgeGroups(brief)};
 groups[stepKey]=[...new Set([...splitTerms(groups[stepKey]),...terms])].filter(Boolean).join('、');
 const merged:Partial<KnowledgeGroups>={};
 for(const k of ['characters','vocabulary','grammar','culture','other'] as const){const v=groups[k]?.trim();if(v)merged[k]=v}
 const knowledgeGroups=Object.keys(merged).length?(merged as KnowledgeGroups):undefined;
 return {...brief,knowledgeGroups,terms:graphTermsFromGroups(getKnowledgeGroups({...brief,knowledgeGroups,terms:brief.terms}))};
}
/**
 * 旧草稿迁移：
 *   · audience 曾经是字符串（如「来华留学生」）；
 *   · 学习者等级（level）曾经是 brief 的顶层字段。
 * 现在教学对象合并为 {nationality, age, level}，旧数据需要搬过来，
 * 否则老存档会丢失学生水平。
 */
function migrateBrief(raw:unknown):unknown{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
 const r={...(raw as Record<string,unknown>)};
 const legacyLevel=typeof r.level==='string'?r.level:'';
 const rawAud=r.audience;
 const hasAud=rawAud!==undefined&&rawAud!==null;
 const a:Record<string,unknown>=hasAud?(typeof rawAud==='string'?{nationality:rawAud}:{...(rawAud as Record<string,unknown>)}):{};
 if(!a.level&&legacyLevel)a.level=legacyLevel;
 // 完全没有 audience 时留 undefined，交给 schema 的 .default()，保持与旧默认值一致。
 r.audience=(hasAud||legacyLevel)?a:undefined;
 if(r.knowledgeGroups&&typeof r.knowledgeGroups==='object'){const groups=knowledgeGroupsSchema.safeParse(r.knowledgeGroups);if(groups.success)r.terms=graphTermsFromGroups(groups.data);}
 delete r.level;
 return r;
}
/* ======================================================================
   教案结构偏好（templateConfig）
   ----------------------------------------------------------------------
   只在前端收集老师的排版偏好，不改变底层生成逻辑：
   预设套餐 + 模块开关 + 特别要求，合并成一个对象存进 brief，
   生成时随 brief 一起传给 /api/lesson，供后续接入生成管线使用。
   ====================================================================== */

/** 预设套餐：不同老师对教案颗粒度的偏好。 */
export const templatePresetIds=['standard','concise','detailed','taskDriven'] as const;
export type TemplatePreset=typeof templatePresetIds[number];

export const templatePresets=[
 {id:'standard',label:'综合课标准模板',hint:'当前默认：目标、词汇、语法、步骤与附录齐备'},
 {id:'concise',label:'精简版',hint:'只看核心步骤'},
 {id:'detailed',label:'详细版',hint:'含详细教师用语与逐字稿'},
 {id:'taskDriven',label:'任务驱动型',hint:'侧重学生活动与产出'},
] as const satisfies readonly {id:TemplatePreset;label:string;hint:string}[];

/** 教案的七个可选模块。key 必须与 templateModuleSchema 的字段一一对应。 */
export const templateModules=[
 {key:'goals',label:'教学目标与重难点'},
 {key:'vocabulary',label:'核心词汇表'},
 {key:'grammar',label:'语法点与例句'},
 {key:'steps',label:'教学步骤明细（师生活动）'},
 {key:'exercises',label:'课堂练习与参考答案'},
 {key:'pitfalls',label:'偏误预判与应对'},
 {key:'appendix',label:'附录（板书、评价量表等）'},
] as const;
export type TemplateModuleKey=typeof templateModules[number]['key'];

/**
 * 模块开关对象用 strict：多传一个不认识的键就直接判为格式错误，
 * 避免「前端写错了字段名、后端悄悄丢掉」这种情况无声通过。
 */
export const templateModuleSchema=z.strictObject({
 goals:z.boolean().default(true),
 vocabulary:z.boolean().default(true),
 grammar:z.boolean().default(true),
 steps:z.boolean().default(true),
 exercises:z.boolean().default(false),
 pitfalls:z.boolean().default(false),
 appendix:z.boolean().default(true),
});
export type TemplateModules=z.infer<typeof templateModuleSchema>;

/** 各预设套餐对应的模块开关默认值。 */
export const presetModules:Record<TemplatePreset,TemplateModules>={
 standard:{goals:true,vocabulary:true,grammar:true,steps:true,exercises:false,pitfalls:false,appendix:true},
 concise:{goals:true,vocabulary:false,grammar:false,steps:true,exercises:false,pitfalls:false,appendix:false},
 detailed:{goals:true,vocabulary:true,grammar:true,steps:true,exercises:true,pitfalls:true,appendix:true},
 taskDriven:{goals:true,vocabulary:true,grammar:true,steps:true,exercises:true,pitfalls:false,appendix:false},
};

/**
 * 套餐与模块开关必须自洽：
 * 选了「精简版」却开着全部模块，界面会显示成互相矛盾的状态。
 *
 * 这里把缺失的模块补成所选套餐的默认值：
 * · modules 整个没给 → 整套用该套餐的默认值；
 * · modules 只给了一部分 → 未提及的部分取该套餐的默认值，已提及的按老师的选择。
 * 界面始终提交完整 modules，所以老师手动改过的开关不会被套餐覆盖。
 */
export const templateConfigSchema=z.preprocess((raw)=>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
 const r={...(raw as Record<string,unknown>)};
 const preset=(typeof r.preset==='string'&&r.preset in presetModules)?r.preset as TemplatePreset:'standard';
 const base=presetModules[preset];
 if(r.modules&&typeof r.modules==='object'&&!Array.isArray(r.modules)){
  r.modules={...base,...(r.modules as Record<string,unknown>)};
 }else if(r.modules===undefined||r.modules===null){
  r.modules={...base};
 }
 return r;
},z.strictObject({
 preset:z.enum(templatePresetIds).default('standard'),
 modules:templateModuleSchema.default({goals:true,vocabulary:true,grammar:true,steps:true,exercises:false,pitfalls:false,appendix:true}),
 customInstruction:z.string().max(1000).default(''),
}));
export type TemplateConfig=z.infer<typeof templateConfigSchema>;

/** 默认结构偏好：综合课标准模板 + 无特别要求。 */
export const defaultTemplateConfig:TemplateConfig={preset:'standard',modules:{...presetModules.standard},customInstruction:''};

/** 选出当前开启的模块，供界面显示「已选 N 个模块」。 */
export function enabledTemplateModules(config:TemplateConfig):TemplateModuleKey[]{
 return templateModules.filter(m=>config.modules[m.key]).map(m=>m.key);
}

/** 开关是否已偏离所选套餐（用于提示老师「已自定义」）。 */
export function isCustomizedTemplate(config:TemplateConfig):boolean{
 const preset=presetModules[config.preset];
 return templateModules.some(m=>config.modules[m.key]!==preset[m.key]);
}

/* ======================================================================
   模块开关 → 生成约束
   ----------------------------------------------------------------------
   老师关掉某个模块，生成端就必须真的不产出它。
   这里给出每个模块在教案结构里对应的字段与「不许出现」的措辞，
   供 Prompt 拼接与一致性检查共用同一份定义，避免两处各写一套。
   ====================================================================== */

/** 模块 → 教案里对应的字段（用于说明「不要包含哪些字段」）。 */
export const templateModuleFields:Record<TemplateModuleKey,string[]>={
 goals:['goals','difficulties'],
 vocabulary:['vocabulary（核心词汇表）'],
 grammar:['grammar（语法点与例句）'],
 steps:['activities（教学步骤明细）'],
 exercises:['exercises（课堂练习与参考答案）'],
 pitfalls:['errors（偏误预判与应对）'],
 appendix:['board（板书）、assessment（评价量表）、homework（课后与分层任务）'],
};

/** 各套餐对生成颗粒度的要求。 */
export const templatePresetDirectives:Record<TemplatePreset,string>={
 standard:'按综合课标准结构生成：目标、词汇、语法、教学步骤与附录齐备，每个字段写出教师可直接使用的实际内容。',
 concise:'尽量精简教师用语，只保留核心教学步骤和指令：教师活动写一句话即可，删除铺垫性说明、例行鼓励语与重复提示；教学步骤数量取最少够用的环节。',
 detailed:'请扩充教师的逐字稿与详细的师生活动说明：教师活动写出可直接照念的完整话语与操作细节，学生活动写出具体动作、话轮与产出物，每个环节补足支架与追问。',
 taskDriven:'以学生产出和任务为核心来组织教学环节：环节顺序围绕「信息输入 → 学生处理 → 交际产出 → 反馈修正」推进，教师活动退居支架位置，每个环节都写清学生要完成的任务与可观察产出。',
};

/**
 * 老师关掉了哪些模块。
 *
 * 没有 templateConfig 的旧草稿按默认套餐处理（standard），
 * 因此旧草稿不会因为这项改动突然丢掉练习或附录。
 */
export function disabledTemplateModules(config:TemplateConfig|undefined):TemplateModuleKey[]{
 const modules=config?.modules??presetModules.standard;
 return templateModules.filter(m=>!modules[m.key]).map(m=>m.key);
}

/** 某模块是否被老师关闭。 */
export function isModuleEnabled(config:TemplateConfig|undefined,key:TemplateModuleKey):boolean{
 return !disabledTemplateModules(config).includes(key);
}

export const briefSchema = z.preprocess(migrateBrief,z.object({topic:text.max(120), standard:z.enum(['InternationalLevel','HSKLevel','HSK30Level']).default('InternationalLevel'),courseType:z.enum(courseTypes).default('综合课'),minutes:z.number().int().min(15).max(180),students:z.number().int().min(1).max(100),mode:z.enum(['线下课堂','线上课堂']).default('线下课堂'),teachingLocation:z.enum(['','中国','海外']).default(''),audience:z.preprocess(v=>typeof v==='string'?{nationality:v}:v,audienceSchema).default({nationality:'来华留学生',age:'',level:'3',motherTongue:'',culturalBackground:''}),referenceMaterial:z.string().max(200).default('《HSK标准教程》3'),outcome:text.max(600),passage:z.string().max(8000),terms:z.string().max(1200),knowledgeGroups:knowledgeGroupsSchema.optional(),culturalTopics:z.array(culturalTopicSelectionSchema).max(10).optional(),templateConfig:templateConfigSchema.default(defaultTemplateConfig)}));
export type Brief=z.infer<typeof briefSchema>;
/**
 * 把旧草稿里的 brief 补全成完整结构。
 *
 * 旧存档（localStorage / 导入的 JSON）里没有 audience、referenceMaterial，
 * 直接使用会让受控输入框的 value 变成 undefined，触发
 * “A component is changing a controlled input to be uncontrolled”。
 *
 * 这里不只做 schema 校验，而是真正 parse 一遍，让 zod 的 .default() 生效。
 */
export function normalizeBrief(raw:unknown):Brief|null{
 const parsed=briefSchema.safeParse(raw);
 return parsed.success?parsed.data:null;
}
/**
 * 在保留已有值的前提下，为缺失字段补上默认值。
 * 任何 undefined 的字符串字段都退化成 ''，避免受控输入框收到 undefined。
 */
export function withBriefDefaults(brief:Brief):Brief{
 const merged:Brief={...initialBrief,...brief};
 return {
  ...merged,
  topic:merged.topic??'',
  standard:merged.standard??initialBrief.standard,
  courseType:merged.courseType??initialBrief.courseType,
  mode:merged.mode??initialBrief.mode,
  teachingLocation:merged.teachingLocation??'',
  minutes:merged.minutes??initialBrief.minutes,
  students:merged.students??initialBrief.students,
  audience:{
   nationality:merged.audience?.nationality??initialBrief.audience.nationality,
   age:merged.audience?.age??initialBrief.audience.age,
   level:merged.audience?.level??initialBrief.audience.level,
   motherTongue:merged.audience?.motherTongue??'',
   culturalBackground:merged.audience?.culturalBackground??'',
  },
  referenceMaterial:merged.referenceMaterial??initialBrief.referenceMaterial,
  outcome:merged.outcome??'',
  passage:merged.passage??'',
  terms:merged.terms??'',
  templateConfig:{
   preset:merged.templateConfig?.preset??initialBrief.templateConfig.preset,
   modules:{...initialBrief.templateConfig.modules,...merged.templateConfig?.modules},
   customInstruction:merged.templateConfig?.customInstruction??'',
  },
 };
}
export type Knowledge={id:string;kind:'Word'|'Grammar'|'Character'|'Idiom';name:string;pinyin?:string;idiomSource?:string;idiomAllusion?:string;idiomFeeling?:string;animationUrl?:string;strokeUrl?:string;grammarQuestions?:import('./grammar-data').GrammarQuestion[];selectedQuestionIds?:string[];grammarQuestionStatus?:'available'|'unavailable';lexicalFeatures?:LexicalFeature[];selectedFeatureIds?:string[];lexicalStatus?:'available'|'unavailable'|'truncated';role:'核心'|'复习'|'拓展'|'排除';verified:boolean;detail:string;example:string;levels:string[];relations:{type:string;name:string;detail:string}[];query?:string;checkedAt?:string;rawDetail?:string;rawExample?:string;characterTeachingMeaning?:string;selectedMeanings?:string[];selectedMeaning?:string;selectedExamples?:string[];scopeConfirmed?:boolean;evidence?:{standard:string;parameters:{terms:string[];text?:string};queries:string[]};};
export const objectiveDomains=['认知领域','技能领域','情感领域'] as const;
export type ObjectiveDomain=typeof objectiveDomains[number];
export const goalSchema=z.object({id:text.max(30),domain:z.enum(objectiveDomains),text,knowledgeIds:z.array(z.string().max(160)).max(1000)});
export type Goal=z.infer<typeof goalSchema>;
export const activitySchema=z.object({id:text.max(30),title:text.max(100),minutes:z.number().int().min(1).max(180),goalIds:z.array(z.string().max(30)).max(10),knowledgeIds:z.array(z.string().max(160)).max(1000),teacher:text,students:text,grouping:text.max(100),output:text,assessment:text});
export const difficultySchema=z.object({text:text.max(500)});
/**
 * 教案结构（成品 JSON）。
 *
 * goals / difficulties / exercises / board / homework 允许为空数组或空字符串：
 * 老师可以在「教案结构偏好」里关掉这些模块，此时模型应当产出空值，
 * 结构校验不能因此把整份教案判为格式错误。
 * 「该模块开启时必须非空」由 checkLesson 按 moduleConfig 校验，
 * 这样提示词、结构校验与一致性检查三处口径一致。
 * 字段本身始终存在，排版引擎（docbuild.js）读到的形状保持不变。
 */
export const lessonSchema=z.object({title:text.max(150),goals:z.array(goalSchema).max(8),difficulties:z.array(difficultySchema).max(8),activities:z.array(activitySchema).min(2).max(12),materials:z.array(z.object({title:text.max(100),content:text})).max(12),exercises:z.array(z.object({question:text,answer:text,goalIds:z.array(z.string().max(30)).max(10),knowledgeIds:z.array(z.string().max(160)).max(1000)})).max(12),board:z.string().max(3000),homework:z.string().max(3000),notes:z.string().max(3000)});
export type Lesson=z.infer<typeof lessonSchema>;

/**
 * 教案标题必须原封不动等于教师输入的课程主题。
 *
 * 模型常自作主张地加后缀，例如把「V1着+V2」写成
 * 「HSK3 词汇与“V1着+V2”交际运用（90分钟）」。
 * 标题是教师认定的课程名，多加任何内容都会与需求表不符，
 * 所以这里在代码层强制覆盖，不依赖模型自觉。
 */
export function withFixedTitle<T extends {title:string}>(lesson:T,topic:string):T{
 // 逐字使用教师输入的主题（不做 trim），保证 title 与 brief.topic 完全相等
 if(!topic.trim())return lesson;
 return {...lesson,title:topic};
}
export type Draft={culturalEvidence?:import('./cultural-topics').CulturalCandidate[];brief:Brief;knowledge:Knowledge[];lesson:Lesson;source:'template'|'deepseek'|'model';createdAt:string;promptVersion?:string;model?:string;reviewed?:boolean;validationWarnings?:string[];messages?:{role:'user'|'assistant';content:string;at:string}[]};
export const initialBrief:Brief={topic:'比较周末出游方案并提出建议',standard:'InternationalLevel',courseType:'综合课',minutes:45,students:20,mode:'线下课堂',teachingLocation:'',audience:{nationality:'来华留学生',age:'20',level:'3',motherTongue:'',culturalBackground:''},referenceMaterial:'《HSK标准教程》3',outcome:'学生能比较两个出游方案，提出建议，并用至少两条理由说明小组的选择。',passage:'',terms:'便宜、方便、建议、比较、比',templateConfig:defaultTemplateConfig};
/** 新建教案时的 brief：不含上次指定的 knowledgeGroups / 文化主题，图谱检索词为空。 */
export function freshBriefForNewLesson():Brief{
 return {...initialBrief,knowledgeGroups:undefined,culturalTopics:undefined,terms:''};
}
export function splitTerms(s:string){return [...new Set(s.split(/[、，,；;\n]+/).map(s=>s.trim()).filter(Boolean))].slice(0,20)}
export function manualKnowledge(brief:Brief):Knowledge[]{
 const groups=brief.knowledgeGroups;
 const entries=groups?([['characters','Character'],['vocabulary','Word'],['grammar','Grammar']] as const).flatMap(([key,kind])=>splitTerms(groups[key]).map(name=>({name,kind}))):splitTerms(brief.terms).map(name=>({name,kind:'Word' as const}));
 return entries.map(({name,kind},i)=>({id:`manual-${i}`,kind,name,role:'核心',verified:false,detail:'教师指定，尚未通过知识图谱核验。',example:'',levels:[],relations:[]}));
}
export function templateLesson(b:Brief,k:Knowledge[]):Lesson{
 const ids=k.filter(x=>x.role==='核心').map(x=>x.id), names=k.filter(x=>x.role==='核心').map(x=>x.name).join('、')||'教师确认的目标表达';
 const weights=[5,8,10,15,7];let allocated=0;const times=weights.map((w,i)=>{const t=i===4?b.minutes-allocated:Math.max(1,Math.floor(b.minutes*w/45));allocated+=t;return t});
 const goals=[{id:'g1',domain:'认知领域' as const,text:`在“${b.topic}”情境中理解并尝试使用${names}。`,knowledgeIds:ids},{id:'g2',domain:'技能领域' as const,text:b.outcome,knowledgeIds:ids},{id:'g3',domain:'情感领域' as const,text:`愿意在真实情境中主动使用${names}表达看法，并对同伴的表达提出回应。`,knowledgeIds:ids}];
 const steps=[
 ['复习与情境导入','展示本课情境，询问学生已有经验；用已学内容完成一次示范。','两人互问，记录已知信息和一个需要解决的问题。','两人一组','一份已知信息清单','观察是否能用已学表达回应。',['g1']],
 ['知识呈现与理解','呈现确认过的知识点及例句，标明用法；请学生解释表达的作用。未核验例句由教师补充。','比较例句，在语境中选择恰当表达，并说明理由。','全班与同伴','目标表达及适用情境配对','用一问一答检查理解，及时纠正。',['g1']],
 ['信息差操练','向 A、B 发放不同信息卡，要求通过提问补全信息，不能直接展示卡片。','轮流提问、回答，使用目标表达补全表格。','两人一组','一张双方共同完成的信息表','抽查信息准确性和目标表达使用情况。',['g1','g2']],
 ['合作交际任务','提出与主题相关、需要共同决策的问题。要求小组比较信息、协商并说明理由；巡视提供支架。','分工交流各自信息，协商方案，形成有理由的共同结论。',`${Math.min(4,b.students)}人一组`,'一个小组结论及至少两条理由','观察信息交换、理由是否明确，记录目标表达的使用。',['g2']],
 ['成果展示与反馈','邀请代表汇报，用目标对应的检查题进行评价，并给出一条改进建议。','展示结论，回应同伴问题，完成出口条。','小组汇报与个人反思','汇报和一张个人出口条','按内容完成、表达恰当、理由充分三项反馈。',['g1','g2','g3']]
 ];
 return {title:b.topic,goals,difficulties:[{text:`${names}在具体语境中的适用条件判断，以及由信息差到协商结论的成段表达。`},{text:`学生用目标表达说明理由时的信息组织与逻辑衔接。`}],activities:steps.map((s,i)=>({id:`a${i+1}`,title:s[0] as string,minutes:times[i],teacher:s[1] as string,students:s[2] as string,grouping:s[3] as string,output:s[4] as string,assessment:s[5] as string,goalIds:s[6] as string[],knowledgeIds:ids})),materials:[{title:'信息卡 A',content:'情境：'+b.topic+'\n你知道：方案一的费用、时间。\n你不知道：方案二的信息。\n任务：向同伴询问信息；共同作出选择。\n费用、时间及地点等具体信息请教师按主题补充。'},{title:'信息卡 B',content:'你知道：方案二的费用、时间。\n你不知道：方案一的信息。\n任务：回答同伴提问，并提出一个不同意见。'},{title:'课堂观察表',content:'□ 信息交换完整　□ 使用目标表达　□ 给出理由　□ 回应同伴\n记录：学生表现、需要补充的知识、下一课调整。'}],exercises:[{question:'选择本课一个目标表达，在本课情境中说一句话，并说明它表达的意思。',answer:'教师根据已确认的释义和使用条件核验；观察表达是否符合语境。',goalIds:['g1'],knowledgeIds:ids},{question:'结合小组任务说出你的选择，并说明理由。',answer:'开放答案；检查任务完成、理由清晰、目标表达恰当三项。',goalIds:['g2','g3'],knowledgeIds:ids}],board:`主题：${b.topic}\n核心表达：${names}\n任务：交换信息 → 比较 → 协商 → 说明理由`,homework:'用本课目标表达完成一段与主题相关的表达，标出使用的知识点；下次课与同伴交换反馈。',notes:'规则模板草稿，未调用大模型。具体情境、信息卡数据、例句适切性和活动难度需教师补充审核。'};
}
export function checkLesson(l:Lesson,b:Brief,k:Knowledge[]){
 const issues:{severity:'warning'|'error';text:string}[]=[];const add=(text:string,severity:'warning'|'error'='warning')=>issues.push({text,severity});
 /**
  * 模块开关：老师关掉的模块，模型不产出是正确行为，不能报「缺失」错误。
  * 反过来，开启的模块必须真的有内容，否则就是模型没照做。
  */
 const off=new Set(disabledTemplateModules(b.templateConfig));
 const total=l.activities.reduce((s,a)=>s+a.minutes,0);if(total!==b.minutes)add(`环节共 ${total} 分钟，与课时 ${b.minutes} 分钟不一致。`,'error');
 const ks=new Set(k.filter(x=>x.role!=='排除').map(x=>x.id)),gs=new Set(l.goals.map(g=>g.id));
 for(const g of l.goals){if(!l.activities.some(a=>a.goalIds.includes(g.id)))add(`目标「${g.text}」没有活动训练。`,'error');if(!off.has('exercises')&&!l.exercises.some(e=>e.goalIds.includes(g.id)))add(`目标「${g.text}」没有检查题。`,'error')}
 if(!off.has('goals')){
  for(const d of objectiveDomains)if(!l.goals.some(g=>g.domain===d))add(`教学目标缺少「${d}」分类。`,'error');
  if(!l.difficulties.length)add('缺少教学难点。','error');
 }
 for(const issue of placeholderIssues(l))add(issue,'error');
 for(const x of k.filter(x=>x.role==='核心')){if(!l.activities.some(a=>a.knowledgeIds.includes(x.id)))add(`核心知识「${x.name}」未关联活动。`,'error');if(!off.has('exercises')&&!l.exercises.some(e=>e.knowledgeIds.includes(x.id)))add(`核心知识「${x.name}」未关联练习。`,'error')}
 for(const x of [...l.goals,...l.activities,...l.exercises])for(const id of x.knowledgeIds)if(!ks.has(id))add(`出现未确认或已排除的知识标识：${id}。`,'error');
 for(const x of [...l.activities,...l.exercises])for(const id of x.goalIds)if(!gs.has(id))add(`引用不存在的教学目标：${id}。`,'error');
 /**
  * 开启的模块必须真的有内容：老师开着「练习」而模型没给，
  * 属于没照做，必须让模型自己修，而不是把空结果交给老师。
  */
 if(!off.has('exercises')&&!l.exercises.length)add('已开启「课堂练习与参考答案」模块，但教案中没有练习。','error');
 if(!off.has('appendix')){
  if(!l.board.trim())add('已开启「附录」模块，但缺少板书设计。','error');
  if(!l.homework.trim())add('已开启「附录」模块，但缺少课后与分层任务。','error');
 }
 const pending=k.filter(x=>!x.verified&&x.role!=='排除');if(pending.length)add(`${pending.length} 个知识点未通过图谱核验，不能作为图谱事实引用。`);
 if(k.filter(x=>x.role==='核心').length>Math.ceil(b.minutes/5))add('本课核心知识量可能偏多，建议按学生基础删减。');
 if(!k.some(x=>x.role==='核心'))add('尚未确认本课核心知识。','error');
 if(l.goals.some((g,i)=>l.goals.findIndex(x=>x.id===g.id)!==i))add('教学目标标识重复。','error');
 if(l.activities.some((a,i)=>l.activities.findIndex(x=>x.id===a.id)!==i))add('课堂环节标识重复。','error');
 for(const x of k.filter(x=>x.verified&&x.role!=='排除'))if(!x.scopeConfirmed)add(`「${x.name}」尚未确认适合本课的义项与例句。`);
 add('结构与引用检查不等于内容准确性认证；AI活动、练习及新编表达必须由教师审核。');return issues;
}
export const standardNames:Record<string,string>={InternationalLevel:'《等级标准》',HSKLevel:'HSK 2.0',HSK30Level:'HSK 3.0'};
