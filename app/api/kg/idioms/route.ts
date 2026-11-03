import {body,json,failure,session,kg,AppError} from '@/lib/server';
import {briefSchema} from '@/lib/lesson';
import {graphNodes} from '@/lib/graph';
import {idiomContext,idiomSearchQuery} from '@/lib/idioms';
export async function POST(request:Request){try{
 const input=await body(request),parsed=briefSchema.safeParse(input.brief);
 if(!parsed.success)throw new AppError('请先填写教学需求。');
 const user=(await session())!,brief=parsed.data,text=idiomContext(brief);
 const result=await kg('intelligent/execute-cypher',{cypher:idiomSearchQuery,parameters:{text},limit:1000},user.token);
 if(!Array.isArray(result.records))throw new AppError('成语查询返回格式异常。',502);
 if(result.records.length>=1000)throw new AppError('成语查询结果已达到上限，请缩小输入范围后重试。',502);
 const names=result.records.map((row:any)=>(row.n?.properties||row.n?.data||row.n||row).name).filter((name:unknown):name is string=>typeof name==='string').map((name:string)=>name.trim());
 const idioms=graphNodes(result.records,brief.standard,names,idiomSearchQuery).filter(item=>item.kind==='Idiom'&&text.includes(item.name));
 if(result.records.length&&!idioms.length)throw new AppError('无法识别图谱返回的成语节点。',502);
 for(const item of idioms){item.evidence!.parameters={terms:[item.name],text};item.role='核心'}
 return json({idioms});
 }catch(error){return failure(error)}}
