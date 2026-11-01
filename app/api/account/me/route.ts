import {requireUser} from '@/lib/auth';import {json,failure,config} from '@/lib/server';
export async function GET(req:Request){try{const u=await requireUser(req);return json({user:{id:u.id,name:u.name,username:u.username,role:u.role}})}catch(e){return failure(e)}}
