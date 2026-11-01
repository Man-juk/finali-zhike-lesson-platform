// Accept only explicitly configured website origins, including approved aliases.
export function allowedRequestOrigin(req:Request,baseURL?:string,extraOrigins=''){
 const allowed=new Set<string>();
 for(const value of [baseURL||new URL(req.url).origin,...extraOrigins.split(',')]){
  try{const u=new URL(value.trim());if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash)allowed.add(u.origin)}catch{}
 }
 const origin=req.headers.get('origin');return !!origin&&allowed.has(origin);
}
