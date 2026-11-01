import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import {config,AppError} from './server';
export function mailReady(){return !!(config().RESEND_API_KEY&&config().MAIL_FROM)}
async function sendMail(email:string,url:string,subject:string){
 if(!mailReady())throw new AppError('邮件服务尚未配置，暂不能注册或找回密码。',503);
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config().RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:config().MAIL_FROM,to:[email],subject,text:`智课账号服务\n\n${subject}\n请在链接有效期内打开：\n${url}\n\n如果不是你本人发起，请忽略。不要转发此链接。`}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new AppError('邮件发送失败，请稍后重试或联系管理员。',502);
}
export function auth(){const c=config();if(!c.BETTER_AUTH_SECRET||!c.DB)throw new AppError('网站账号服务尚未配置。',503);return betterAuth({appName:'智课',secret:c.BETTER_AUTH_SECRET,baseURL:c.AUTH_BASE_URL||'http://127.0.0.1:5173',database:drizzleAdapter(getDb(),{provider:'sqlite',schema:{user:schema.user,session:schema.session,account:schema.account,verification:schema.verification,rateLimit:schema.rateLimit}}),emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,disableSignUp:true,requireEmailVerification:false,revokeSessionsOnPasswordReset:true,sendResetPassword:async({user,url})=>sendMail(user.email,url,'重置智课账号密码')},emailVerification:{sendOnSignUp:false,sendOnSignIn:false,autoSignInAfterVerification:false,sendVerificationEmail:async({user,url})=>sendMail(user.email,url,'验证智课账号邮箱')},session:{expiresIn:60*60*24*7,updateAge:60*60*24},rateLimit:{enabled:true,storage:'database',window:60,max:30,customRules:{'/sign-in/email':{window:60,max:5},'/sign-up/email':{window:60,max:3},'/request-password-reset':{window:60,max:3},'/send-verification-email':{window:60,max:3}}},advanced:{ipAddress:{ipAddressHeaders:['x-forwarded-for']},cookiePrefix:'zhike',defaultCookieAttributes:{httpOnly:true,sameSite:'lax',secure:(c.AUTH_BASE_URL||'').startsWith('https:')}}})}
export async function requireUser(req:Request){
 const s=await auth().api.getSession({headers:req.headers});if(!s?.user)throw new AppError('请先使用管理员分配的账号登录智课。',401);
 const profile=await config().DB.prepare('SELECT username,role,enabled FROM site_accounts WHERE user_id=?').bind(s.user.id).first<{username:string;role:string;enabled:number}>();
 if(!profile?.enabled)throw new AppError('账号尚未开通或已停用，请联系管理员。',403);
 return {...s.user,username:profile.username,role:profile.role};
}
export async function requireAdmin(req:Request){const u=await requireUser(req);if(u.role!=='admin')throw new AppError('仅管理员可访问。',403);return u}
