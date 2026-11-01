import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('请配置 DATABASE_URL');
const db=createClient({url:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN});
try{await db.execute('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)');for(const name of (await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
 if((await db.execute({sql:'SELECT name FROM app_migrations WHERE name=?',args:[name]})).rows.length)continue;
 const sql=await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8');const statements=sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);await db.batch([...statements,{sql:'INSERT INTO app_migrations(name) VALUES(?)',args:[name]}],'write');console.log('Applied',name);
}}finally{db.close()}
