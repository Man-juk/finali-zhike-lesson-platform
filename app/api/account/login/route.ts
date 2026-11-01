import {auth} from '@/lib/auth';
import {body,config,failure,AppError} from '@/lib/server';
export async function POST(req:Request){try{const b=await body(req,10000),username=typeof b.username==='string'?b.username.trim().toLowerCase():'';if(!/^[a-z][a-z0-9_-]{2,31}$/.test(username)||typeof b.password!=='string'||b.password.length>128)throw new AppError('账号或密码错误。',401);
 const row=await config().DB.prepare('SELECT u.email,p.enabled FROM site_accounts p JOIN auth_user u ON u.id=p.user_id WHERE p.username=?').bind(username).first<{email:string;enabled:number}>();
 const response=await auth().handler(new Request(new URL('/api/auth/sign-in/email',req.url),{method:'POST',headers:req.headers,body:JSON.stringify({email:row?.email||'unknown@accounts.invalid',password:b.password})}));
 if(!row?.enabled||!response.ok){if(response.status===429)return response;throw new AppError('账号或密码错误，或账号已停用。',401)}return response;
 }catch(e){return failure(e)}}
