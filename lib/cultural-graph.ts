import {kg,AppError} from './server';
import {culturalCandidates,culturalTopicQuery} from './cultural-topics';
export async function culturalGraph(token:string){
 const data=await kg('intelligent/execute-cypher',{cypher:culturalTopicQuery,parameters:{},limit:1000},token);
 if(!Array.isArray(data.records))throw new AppError('文化图谱查询返回格式异常。',502);
 const candidates=culturalCandidates(data.records);
 if(data.records.length&&!candidates.length)throw new AppError('文化图谱节点格式无法识别。',502);
 if(data.records.length>=1000)throw new AppError('文化图谱候选已超出查询上限，请联系管理员调整查询范围。',502);
 return candidates;
}
