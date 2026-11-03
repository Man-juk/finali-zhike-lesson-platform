import {z} from 'zod';
export const culturalKinds={CulturalStage:'文化大纲层级',Cultural:'文化知识点',CulturalLevel1:'一级项目',CulturalLevel2:'二级项目'} as const;
export const culturalTopicSchema=z.object({id:z.string().min(1).max(200),kind:z.enum(['CulturalStage','Cultural','CulturalLevel1','CulturalLevel2']),name:z.string().min(1).max(300)});
export type CulturalTopic=z.infer<typeof culturalTopicSchema>;
export type CulturalCandidate=CulturalTopic&{sentence:string;source:string;stage:string;level1:string;level2:string};
export const culturalCandidateSchema=culturalTopicSchema.extend({sentence:z.string().max(1000),source:z.string().max(1000),stage:z.string().max(1000),level1:z.string().max(1000),level2:z.string().max(1000)});
export const culturalTopicQuery='MATCH (n) WHERE n:CulturalStage OR n:Cultural OR n:CulturalLevel1 OR n:CulturalLevel2 RETURN n LIMIT 1000';
export function culturalCandidates(rows:Record<string,any>[]):CulturalCandidate[]{
 const result:CulturalCandidate[]=[];
 for(const row of rows){
  const node=row.n||row.node||row,p=node.properties||node.data||node,labels=node.labels||row.labels||[];
  const kind=(Object.keys(culturalKinds) as CulturalTopic['kind'][]).find(kind=>labels.includes(kind));
  if(!kind||typeof p.name!=='string'||!p.name.trim())continue;
  const name=p.name.trim().slice(0,300),id=`${kind}:${p.id??node.id??name}`;
  if(id.length>200||result.some(item=>item.id===id))continue;
  const value=(key:string)=>typeof p[key]==='string'?p[key].slice(0,1000):'';
  result.push({id,kind,name,sentence:value('sentence'),source:value('source'),stage:value('cultural_stage'),level1:value('cultural_level1'),level2:value('cultural_level2')});
 }
 return result;
}
export function rankedCulturalTopics(raw:unknown,candidates:CulturalCandidate[]):CulturalCandidate[]{
 const count=Math.min(10,candidates.length);
 const parsed=z.object({ids:z.array(z.string()).length(count)}).safeParse(raw);
 if(!parsed.success||new Set(parsed.data.ids).size!==count)throw new Error('文化主题推荐格式不完整，请重试。');
 return parsed.data.ids.map(id=>{const node=candidates.find(node=>node.id===id);if(!node)throw new Error('文化主题推荐包含图谱之外的条目，请重试。');return node});
}
