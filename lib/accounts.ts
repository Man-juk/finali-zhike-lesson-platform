import {hashPassword} from 'better-auth/crypto';
import {config,AppError} from './server';
import {z} from 'zod';
export const newAccount=z.object({username:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{2,31}$/),name:z.string().trim().min(1).max(60),password:z.string().min(12).max(128)});
export async function createAccount(data:z.infer<typeof newAccount>,role:'admin'|'user',setup=false){
 const db=config().DB,id=crypto.randomUUID(),now=Date.now(),password=await hashPassword(data.password);
 const existing=await db.prepare('SELECT user_id FROM site_accounts WHERE username=?').bind(data.username).first();if(existing)throw new AppError('账号名称已存在。',409);
 const statements=[db.prepare('INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,data.name,id+'@accounts.invalid',0,now,now),db.prepare('INSERT INTO auth_account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,id,'credential',id,password,now,now),db.prepare('INSERT INTO site_accounts(user_id,username,role,enabled,created_at) VALUES(?,?,?,?,?)').bind(id,data.username,role,1,now)];
 if(setup)statements.unshift(db.prepare('INSERT INTO admin_setup_lock(key,created_at) VALUES(?,?)').bind('first-admin',now));
 await db.batch(statements);return {id,username:data.username};
}
