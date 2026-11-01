import {allowedRequestOrigin} from '@/lib/request-origin';
import {auth} from '@/lib/auth';import {json,failure,AppError,config} from '@/lib/server';
export async function GET(req:Request){try{if(!new URL(req.url).pathname.endsWith('/get-session'))throw new AppError('此登录方式未开放。',403);return await auth().handler(req)}catch(e){return failure(e)}}
export async function POST(req:Request){try{const url=new URL(req.url);if(!allowedRequestOrigin(req,config().AUTH_BASE_URL,process.env.APP_ALLOWED_ORIGINS))throw new AppError('请求来源不受支持。',403);if(!url.pathname.endsWith('/sign-out'))return json({message:'账号由管理员分配，密码遗失请联系管理员。'},403);return await auth().handler(req)}catch(e){return failure(e)}}
