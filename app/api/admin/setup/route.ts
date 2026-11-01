import {body,json,failure,config,AppError} from '@/lib/server';import {createAccount,newAccount} from '@/lib/accounts';
export async function POST(req:Request){try{const b=await body(req,10000),secret=config().ADMIN_SETUP_SECRET;if(!secret||secret.length<32)throw new AppError('管理员初始化未开启。',403);
 const supplied=req.headers.get('x-setup-secret')||'';const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [a,c]=await Promise.all([digest(secret),digest(supplied)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^c[i];if(diff)throw new AppError('初始化凭据无效。',403);
 if(await config().DB.prepare('SELECT key FROM admin_setup_lock WHERE key=?').bind('first-admin').first())throw new AppError('管理员已初始化，请直接登录。',409);
 const d=newAccount.safeParse(b);if(!d.success)throw new AppError('账号需3–32位小写字母、数字、下划线或短横线，字母开头；密码至少12位。',422);return json(await createAccount(d.data,'admin',true));}catch(e){return failure(e)}}
