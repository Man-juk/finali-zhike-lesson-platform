import {config} from './server';
export type UsageKind='lesson'|'image'|'speech';
export async function tracked<T>(userId:string,kind:UsageKind,model:string,fn:()=>Promise<T>){const db=config().DB,day=new Date(Date.now()+8*3600000).toISOString().slice(0,10),key=day+':'+userId+':'+kind;
 await db.prepare('INSERT INTO site_daily_usage(key,day,user_id,kind,count) VALUES(?,?,?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key,day,userId,kind).run();
 const id=crypto.randomUUID();await db.prepare('INSERT INTO usage_events(id,user_id,kind,status,model,created_at) VALUES(?,?,?,?,?,?)').bind(id,userId,kind,'running',model,Date.now()).run();try{const result=await fn();await db.prepare('UPDATE usage_events SET status=?,finished_at=? WHERE id=?').bind('success',Date.now(),id).run();return result}catch(e){await db.prepare('UPDATE usage_events SET status=?,finished_at=? WHERE id=?').bind('failed',Date.now(),id).run();throw e}}
