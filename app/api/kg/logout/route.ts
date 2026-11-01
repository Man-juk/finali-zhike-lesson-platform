import { cookies } from 'next/headers';
import { body,json,failure } from '@/lib/server';
export async function POST(req:Request){try{await body(req);(await cookies()).delete('kg_session');return json({ok:true})}catch(e){return failure(e)}}
