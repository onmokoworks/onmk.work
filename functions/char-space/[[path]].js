const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const guard = {
 async fetch(request,env){
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  if(!env.BODY_SPACE_PASSWORD)return new Response('Site is not configured',{status:503,headers});
  let credentials='';try{const authorization=request.headers.get('Authorization')??'';if(authorization.startsWith('Basic '))credentials=atob(authorization.slice(6));}catch{}
  const [actual,expected]=await Promise.all([digest(credentials),digest('viewer:'+env.BODY_SPACE_PASSWORD)]);let different=0;for(let i=0;i<expected.length;i++)different|=actual[i]^expected[i];
  if(different)return new Response('Authentication required',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="Parameter space", charset="UTF-8"'}});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
  const asset=await env.ASSETS.fetch(request),response=new Response(asset.body,asset);for(const [key,value] of Object.entries(headers))response.headers.set(key,value);return response;
 }
};

export async function onRequest(context){return guard.fetch(context.request,{...context.env,ASSETS:{fetch:()=>context.next()}});}
