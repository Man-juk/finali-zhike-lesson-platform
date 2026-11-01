import { body,json,failure,session,AppError } from '@/lib/server';
import { z } from 'zod';
import { searchGraph } from '@/lib/graph';
export async function POST(req:Request){try{const b=await body(req),s=await session();if(!z.array(z.string().min(1).max(80)).min(1).max(20).safeParse(b.terms).success)throw new AppError('请先输入待核验的知识点。');return json({knowledge:await searchGraph(s!.token,b.terms,b.standard)})}catch(e){return failure(e)}}
