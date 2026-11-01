import {allowedRequestOrigin} from './request-origin';
import { cookies } from 'next/headers';
import { database, databaseReady } from '@/db';
export const config=()=>({...process.env,get DB(){if(!databaseReady())throw new AppError('网站数据库尚未配置。',503);return database()}}) as unknown as {ADMIN_SETUP_SECRET?:string;IMAGE_PROVIDER?:string;IMAGE_SIZE?:string;IMAGE_BASE_URL?:string;IMAGE_API_KEY?:string;IMAGE_MODEL?:string;IMAGE_FORMAT?:string;SPEECH_PROVIDER?:string;SPEECH_BASE_URL?:string;SPEECH_API_KEY?:string;SPEECH_MODEL?:string;SPEECH_VOICE?:string;DEEPSEEK_API_KEY?:string;BETTER_AUTH_SECRET?:string;AUTH_BASE_URL?:string;RESEND_API_KEY?:string;MAIL_FROM?:string;MODEL_PROVIDER?:string;MODEL_BASE_URL?:string;MODEL_API_KEY?:string;MODEL_NAME?:string;DEEPSEEK_MODEL?:string;SESSION_SECRET?:string;GRAPH_NODE_COUNT?:string;DB:ReturnType<typeof database>};
export class AppError extends Error{constructor(message:string,public status=400){super(message)}}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export function failure(e:unknown){console.error('Request failed',e instanceof Error?{name:e.name,message:e.message}:typeof e);return json({error:e instanceof AppError?e.message:'服务暂时无法完成请求，请稍后重试。'},e instanceof AppError?e.status:500)}
export async function body(req:Request,maxLength=60000){if(!allowedRequestOrigin(req,config().AUTH_BASE_URL,process.env.APP_ALLOWED_ORIGINS))throw new AppError('请求来源不受支持。',403);if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('需要 JSON 请求。',415);const s=await req.text();if(s.length>maxLength)throw new AppError('输入过长。',413);try{return JSON.parse(s)}catch{throw new AppError('请求格式错误。')}}
const bytes=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const base64=(a:Uint8Array)=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
async function key(){const s=config().SESSION_SECRET;if(!s)throw new AppError('服务端会话配置尚未完成。',503);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export type Session={token:string;id:string;name:string;exp:number};
export async function setSession(s:Session,secure:boolean){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(JSON.stringify(s)));(await cookies()).set('kg_session',base64(iv)+'.'+base64(new Uint8Array(cipher)),{httpOnly:true,secure,sameSite:'strict',path:'/',maxAge:Math.max(0,Math.floor((s.exp-Date.now())/1000))})}
export async function session(required=true){try{const raw=(await cookies()).get('kg_session')?.value;if(!raw)throw Error();const [iv,cipher]=raw.split('.');const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await key(),bytes(cipher));const s=JSON.parse(new TextDecoder().decode(data)) as Session;if(s.exp<Date.now()||!s.id||!s.token)throw Error();return s}catch{if(required)throw new AppError('请先连接你自己的知识图谱账号，或重新登录。',401);return null}}
export async function kg(path:string,data:unknown,token?:string){let r:Response;try{r=await fetch('https://kg.chineseplus.net/out/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)})}catch{throw new AppError('知识图谱服务连接超时或不可达，请稍后重试。',502)}let d;try{d=await r.json() as Record<string,any>}catch{throw new AppError('知识图谱返回了无法解析的响应。',502)}if(!r.ok||d.success===false)throw new AppError(r.status===401?'图谱账号或会话无效，请重新登录。':String(d.detail||d.message||'知识图谱查询失败。').slice(0,300),r.status===401?401:r.status===403?403:502);return d}
// Browser-scoped encrypted quota, backed by a best-effort per-instance counter.
// No database is required. This is not a durable global billing limit.
const generationCounts=new Map<string,number>();
export async function quota(id:string){
 const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10),subject=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)))),local=day+subject;
 const jar=await cookies();let count=0;const raw=jar.get('kg_generation_budget')?.value;
 if(raw){try{const [iv,cipher]=raw.split('.');const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await key(),bytes(cipher));const value=JSON.parse(new TextDecoder().decode(plain));if(value.day===day&&value.subject===subject&&Number.isInteger(value.count))count=Math.max(0,value.count)}catch{}}
 count=Math.max(count,generationCounts.get(local)||0);if(count>=10)throw new AppError('当前图谱账号在本浏览器的今日生成次数已达10次，请明日再试。',429);
 const next=count+1;generationCounts.set(local,next);if(generationCounts.size>10000){for(const k of generationCounts.keys())if(!k.startsWith(day))generationCounts.delete(k)}
 const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(JSON.stringify({day,subject,count:next})));
 jar.set('kg_generation_budget',base64(iv)+'.'+base64(new Uint8Array(cipher)),{httpOnly:true,secure:(config().AUTH_BASE_URL||'').startsWith('https:'),sameSite:'strict',path:'/',maxAge:86400});
}
