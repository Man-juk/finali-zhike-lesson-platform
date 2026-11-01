import {createClient,type Client,type InValue} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import * as schema from './schema';
let cached:Client|undefined;
export function databaseReady(){return !!process.env.DATABASE_URL}
export function client(){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL 未配置。');return cached??=createClient({url:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN})}
export function getDb(){return drizzle(client(),{schema})}
// Shared SQL interface used by account, quota and lesson-history services.
class Statement{
 constructor(readonly sql:string,readonly args:InValue[]=[]){ }
 bind(...args:InValue[]){return new Statement(this.sql,args)}
 async first<T=Record<string,unknown>>(){const r=await client().execute(this);return (r.rows[0] as unknown as T)||null}
 async all(){const r=await client().execute(this);return {results:r.rows}}
 async run(){const r=await client().execute(this);return {changes:r.rowsAffected}}
}
export function database(){return {prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>client().batch(statements,'write')}}
