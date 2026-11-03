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
export function getKnowledgeGroups(brief:{terms:string;knowledgeGroups?:KnowledgeGroups}):KnowledgeGroups{
 return brief.knowledgeGroups??{characters:'',vocabulary:brief.terms||'',grammar:'',culture:'',other:''};
}
export function graphTermsFromGroups(groups:KnowledgeGroups):string{
 return [...new Set([groups.characters,groups.vocabulary,groups.grammar].flatMap(x=>x.split(/[、，,；;\n]+/).map(t=>t.trim()).filter(Boolean)))].join('、');
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
export const briefSchema = z.preprocess(migrateBrief,z.object({topic:text.max(120), standard:z.enum(['InternationalLevel','HSKLevel','HSK30Level']).default('InternationalLevel'),courseType:z.enum(courseTypes).default('综合课'),minutes:z.number().int().min(15).max(180),students:z.number().int().min(1).max(100),mode:z.enum(['线下课堂','线上课堂']).default('线下课堂'),teachingLocation:z.enum(['','中国','海外']).default(''),audience:z.preprocess(v=>typeof v==='string'?{nationality:v}:v,audienceSchema).default({nationality:'来华留学生',age:'',level:'3',motherTongue:'',culturalBackground:''}),referenceMaterial:z.string().max(200).default('《HSK标准教程》3'),outcome:text.max(600),passage:z.string().max(8000),terms:z.string().max(1200),knowledgeGroups:knowledgeGroupsSchema.optional(),culturalTopics:z.array(culturalTopicSelectionSchema).max(10).optional()}));
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
 };
}
export type Knowledge={id:string;kind:'Word'|'Grammar'|'Character'|'Idiom';name:string;pinyin?:string;idiomSource?:string;idiomAllusion?:string;idiomFeeling?:string;animationUrl?:string;strokeUrl?:string;grammarQuestions?:import('./grammar-data').GrammarQuestion[];selectedQuestionIds?:string[];grammarQuestionStatus?:'available'|'unavailable';lexicalFeatures?:LexicalFeature[];selectedFeatureIds?:string[];lexicalStatus?:'available'|'unavailable'|'truncated';role:'核心'|'复习'|'拓展'|'排除';verified:boolean;detail:string;example:string;levels:string[];relations:{type:string;name:string;detail:string}[];query?:string;checkedAt?:string;rawDetail?:string;rawExample?:string;characterTeachingMeaning?:string;selectedMeanings?:string[];selectedMeaning?:string;selectedExamples?:string[];scopeConfirmed?:boolean;evidence?:{standard:string;parameters:{terms:string[];text?:string};queries:string[]};};
export const objectiveDomains=['认知领域','技能领域','情感领域'] as const;
export type ObjectiveDomain=typeof objectiveDomains[number];
export const goalSchema=z.object({id:text.max(30),domain:z.enum(objectiveDomains),text,knowledgeIds:z.array(z.string().max(160)).max(1000)});
export type Goal=z.infer<typeof goalSchema>;
export const activitySchema=z.object({id:text.max(30),title:text.max(100),minutes:z.number().int().min(1).max(180),goalIds:z.array(z.string().max(30)).max(10),knowledgeIds:z.array(z.string().max(160)).max(1000),teacher:text,students:text,grouping:text.max(100),output:text,assessment:text});
export const difficultySchema=z.object({text:text.max(500)});
export const lessonSchema=z.object({title:text.max(150),goals:z.array(goalSchema).min(1).max(8),difficulties:z.array(difficultySchema).min(1).max(8),activities:z.array(activitySchema).min(2).max(12),materials:z.array(z.object({title:text.max(100),content:text})).max(12),exercises:z.array(z.object({question:text,answer:text,goalIds:z.array(z.string().max(30)).max(10),knowledgeIds:z.array(z.string().max(160)).max(1000)})).min(1).max(12),board:text,homework:text,notes:z.string().max(3000)});
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
export const initialBrief:Brief={topic:'比较周末出游方案并提出建议',standard:'InternationalLevel',courseType:'综合课',minutes:45,students:20,mode:'线下课堂',teachingLocation:'',audience:{nationality:'来华留学生',age:'20',level:'3',motherTongue:'',culturalBackground:''},referenceMaterial:'《HSK标准教程》3',outcome:'学生能比较两个出游方案，提出建议，并用至少两条理由说明小组的选择。',passage:'',terms:'便宜、方便、建议、比较、比'};
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
 const total=l.activities.reduce((s,a)=>s+a.minutes,0);if(total!==b.minutes)add(`环节共 ${total} 分钟，与课时 ${b.minutes} 分钟不一致。`,'error');
 const ks=new Set(k.filter(x=>x.role!=='排除').map(x=>x.id)),gs=new Set(l.goals.map(g=>g.id));
 for(const g of l.goals){if(!l.activities.some(a=>a.goalIds.includes(g.id)))add(`目标「${g.text}」没有活动训练。`,'error');if(!l.exercises.some(e=>e.goalIds.includes(g.id)))add(`目标「${g.text}」没有检查题。`,'error')}
 for(const d of objectiveDomains)if(!l.goals.some(g=>g.domain===d))add(`教学目标缺少「${d}」分类。`,'error');
 if(!l.difficulties.length)add('缺少教学难点。','error');
 for(const issue of placeholderIssues(l))add(issue,'error');
 for(const x of k.filter(x=>x.role==='核心')){if(!l.activities.some(a=>a.knowledgeIds.includes(x.id)))add(`核心知识「${x.name}」未关联活动。`,'error');if(!l.exercises.some(e=>e.knowledgeIds.includes(x.id)))add(`核心知识「${x.name}」未关联练习。`,'error')}
 for(const x of [...l.goals,...l.activities,...l.exercises])for(const id of x.knowledgeIds)if(!ks.has(id))add(`出现未确认或已排除的知识标识：${id}。`,'error');
 for(const x of [...l.activities,...l.exercises])for(const id of x.goalIds)if(!gs.has(id))add(`引用不存在的教学目标：${id}。`,'error');
 const pending=k.filter(x=>!x.verified&&x.role!=='排除');if(pending.length)add(`${pending.length} 个知识点未通过图谱核验，不能作为图谱事实引用。`);
 if(k.filter(x=>x.role==='核心').length>Math.ceil(b.minutes/5))add('本课核心知识量可能偏多，建议按学生基础删减。');
 if(!k.some(x=>x.role==='核心'))add('尚未确认本课核心知识。','error');
 if(l.goals.some((g,i)=>l.goals.findIndex(x=>x.id===g.id)!==i))add('教学目标标识重复。','error');
 if(l.activities.some((a,i)=>l.activities.findIndex(x=>x.id===a.id)!==i))add('课堂环节标识重复。','error');
 for(const x of k.filter(x=>x.verified&&x.role!=='排除'))if(!x.scopeConfirmed)add(`「${x.name}」尚未确认适合本课的义项与例句。`);
 add('结构与引用检查不等于内容准确性认证；AI活动、练习及新编表达必须由教师审核。');return issues;
}
export const standardNames:Record<string,string>={InternationalLevel:'《等级标准》',HSKLevel:'HSK 2.0',HSK30Level:'HSK 3.0'};
