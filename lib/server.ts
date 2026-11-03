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
/**
 * 图谱底层错误码 → 人话。
 *
 * 这些错误码来自 Node 的 DNS / TLS / 连接层，是排查「连接图谱一直超时」时
 * 唯一有用的信息。之前 catch 里直接丢弃了原始异常，
 * 所有网络问题都被折叠成同一句「连接超时或不可达」，无从判断是证书还是断网。
 */
function kgNetworkHint(e:unknown):string{
 const err=e as {cause?:{code?:string;message?:string};code?:string;message?:string};
 const code=err?.cause?.code??err?.code??'';
 const detail=err?.cause?.message??err?.message??'';
 const table:Record<string,string>={
  ENOTFOUND:'域名解析失败（DNS）。本机无法把 kg.chineseplus.net 解析成 IP，请检查 DNS、hosts 或代理软件。',
  EAI_AGAIN:'DNS 临时解析失败，通常是 DNS 服务器不可达。',
  ECONNREFUSED:'连接被拒绝：目标端口没有服务在监听，或被本机防火墙/代理拦截。',
  ECONNRESET:'连接被重置：对方主动断开，或中间代理切断连接。',
  ETIMEDOUT:'连接超时：数据包发出后没有收到回应，常见于防火墙静默丢包或链路不通。',
  EHOSTUNREACH:'主机不可达：路由层面无法到达该 IP。',
  ENETUNREACH:'网络不可达：没有到目标网络的路由。',
  EPROTO:'TLS 协议协商失败：双方支持的 TLS 版本没有交集。',
  DEPTH_ZERO_SELF_SIGNED_CERT:'证书自签名：目标站使用了自签名证书，未被系统信任。',
  SELF_SIGNED_CERT_IN_CHAIN:'证书链中的自签名证书无法验证到受信任根证书。',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:'无法验证叶子证书签名：证书链不完整或根证书不受信任。',
  CERT_HAS_EXPIRED:'证书已过期。',
  CERT_NOT_YET_VALID:'证书尚未生效（系统时间早于证书起始时间）。',
  ERR_TLS_CERT_ALTNAME_INVALID:'证书域名不匹配：证书上的域名与请求的域名不符。',
 };
 if(table[code])return table[code];
 if(code)return code+(detail?'（'+detail+'）':'');
 return detail||'未知网络错误。';
}

/**
 * 原生 https POST，不经过 fetch / undici。
 * 只在 fetch 失败时作为兜底。
 *
 * 为什么要留这一手：Node 的 fetch(undici) 与 node:https 的连接栈不同。
 * 前者受 HTTP_PROXY / NODE_USE_ENV_PROXY / 全局 Dispatcher 影响，
 * 后者只由 Node 的 TLS 与系统配置决定。
 * 「curl 通但网页端一直超时」这类问题里，原生 https 往往正是能通的那条路。
 */
async function kgNativePost(url:string,payload:string,headers:Record<string,string>,timeoutMs:number):Promise<Response>{
 const https=await import('node:https');
 return await new Promise<Response>((resolve,reject)=>{
  const target=new URL(url);
  const req=https.request({
   hostname:target.hostname,
   port:target.port||443,
   path:target.pathname+target.search,
   method:'POST',
   headers:{...headers,'Content-Length':Buffer.byteLength(payload)},
   timeout:timeoutMs,
  },res=>{
   const chunks:Buffer[]=[];
   res.on('data',c=>chunks.push(c as Buffer));
   res.on('end',()=>{
    const body=Buffer.concat(chunks);
    resolve(new Response(body as unknown as BodyInit,{status:res.statusCode??502,statusText:res.statusMessage,headers:{'Content-Type':String(res.headers['content-type']||'application/json')}}));
   });
  });
  req.on('timeout',()=>{req.destroy(Object.assign(new Error('request timed out'),{code:'ETIMEDOUT'}))});
  req.on('error',reject);
  req.write(payload);
  req.end();
 });
}
export async function kg(path:string,data:unknown,token?:string){
 const url='https://kg.chineseplus.net/out/api/'+path;
 const payload=JSON.stringify(data);
 const headers:Record<string,string>={'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})};
 let r:Response;
 try{
  const res=await fetch(url,{method:'POST',headers,body:payload,signal:AbortSignal.timeout(25000)});
  r=new Response(res.body,{status:res.status,statusText:res.statusText,headers:res.headers});
 }catch(e){
  const hint=kgNetworkHint(e);
  console.error('知识图谱 fetch 请求失败，改用原生 https 重试',{path,code:(e as {cause?:{code?:string}})?.cause?.code??(e as {code?:string})?.code,message:(e as Error)?.message,cause:(e as {cause?:{message?:string}})?.cause?.message});
  try{
   r=await kgNativePost(url,payload,headers,25000);
  }catch(e2){
   console.error('知识图谱原生 https 请求也失败',{path,code:(e2 as {code?:string})?.code,message:(e2 as Error)?.message});
   throw new AppError('知识图谱服务连接失败：'+hint,502);
  }
 }
 let d;try{d=await r.json() as Record<string,any>}catch{throw new AppError('知识图谱返回了无法解析的响应。',502)}if(!r.ok||d.success===false)throw new AppError(r.status===401?'图谱账号或会话无效，请重新登录。':String(d.detail||d.message||'知识图谱查询失败。').slice(0,300),r.status===401?401:r.status===403?403:502);return d}
