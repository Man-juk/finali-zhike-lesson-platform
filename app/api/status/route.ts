import {modelInfo} from '@/lib/model';
import {mailReady} from '@/lib/auth';
import { json,session,config } from '@/lib/server';
export async function GET(){const s=await session(false);return json({connected:!!s,username:s?.name||'',authConfigured:!!config().BETTER_AUTH_SECRET,mailConfigured:mailReady(),modelConfigured:modelInfo().configured,provider:modelInfo().provider,sessionConfigured:!!config().SESSION_SECRET,model:modelInfo().name})}
