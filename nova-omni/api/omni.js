'use strict';
const {calculate}=require('../lib/math');
const crypto=require('node:crypto');
const FREE_MODELS=Object.freeze({
 general:'nvidia/nemotron-3.5-lightning-free',
 coding:'poolside/laguna-s-2.1-free',
 maths:'nvidia/nemotron-3.5-lightning-free',
 research:'nvidia/nemotron-3.5-lightning-free',
 writing:'reflection/beam-free'
});
const paidModes=Object.freeze({
 general:'openai/gpt-5.4',coding:'anthropic/claude-opus-4.6',maths:'openai/gpt-5.4',research:'openai/gpt-5.4',writing:'anthropic/claude-opus-4.6'
});
const FREE_ONLY=process.env.NOVA_FREE_ONLY!=='false';
const modes=FREE_ONLY?FREE_MODELS:paidModes;
const FREE_FALLBACKS=Object.freeze(['nvidia/nemotron-3.5-lightning-free','reflection/beam-free','poolside/laguna-s-2.1-free']);
function freeModelAllowed(model){return typeof model==='string'&&FREE_FALLBACKS.includes(model);}

const rate=new Map();
const LANGUAGES=Object.freeze({
 auto:'Match the user language automatically',
 ar:'Arabic (adapt to regional dialect, including Egyptian Arabic)',
 'ar-eg':'Egyptian Arabic (المصرية) with natural Egyptian dialect expressions',
 en:'English',fr:'French',es:'Spanish',de:'German',pt:'Portuguese',
 it:'Italian',ru:'Russian',tr:'Turkish',hi:'Hindi',ur:'Urdu',
 zh:'Chinese',ja:'Japanese',ko:'Korean',id:'Indonesian',
 bn:'Bengali',fa:'Persian',sw:'Swahili',vi:'Vietnamese',
 th:'Thai',nl:'Dutch',pl:'Polish'
});
function aiError(code,message,status,retryable=false){
 const e=new Error(message);e.code=code;e.status=status;e.retryable=retryable;return e;
}
function relevantErrorResponse(body){
 const err=body&&body.error;
 return {code:typeof err?.code==='string'?err.code:typeof err?.type==='string'?err.type:'unknown'};
}

function applyCors(req,res){
 const origin=req.headers.origin,allowed=process.env.NOVA_ALLOWED_ORIGIN||'https://nova-ai-web-2026.github.io';
 if(typeof origin==='string'&&origin===allowed){
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Nova-Key');
  res.setHeader('Vary','Origin');
 }
}

function reply(res,status,data){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(data);}
function vercelAuth(){return process.env.VERCEL==='1'&&process.env.NOVA_TRUST_VERCEL_AUTH==='true';}
function gatewayToken(req){
 const value=process.env.AI_GATEWAY_API_KEY||req.headers['x-vercel-oidc-token']||process.env.VERCEL_OIDC_TOKEN;
 return typeof value==='string'?value:'';
}
function access(req){
 if(vercelAuth())return true;
 const secret=process.env.NOVA_ACCESS_KEY,provided=req.headers['x-nova-key'];
 if(!secret||typeof provided!=='string')return false;
 const a=Buffer.from(secret),b=Buffer.from(provided);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function body(req){try{return typeof req.body==='object'&&req.body?req.body:JSON.parse(req.body||'{}');}catch(e){return {};}}
function validRepo(s){return typeof s==='string'&&/^[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}$/.test(s);}
function cleanMessages(m){
 if(!Array.isArray(m)||m.length<1||m.length>22)throw Error('Invalid conversation length');
 const out=m.map(x=>{if(!x||!['user','assistant'].includes(x.role)||typeof x.content!=='string'||!x.content.trim()||x.content.length>12000)throw Error('Invalid message');return {role:x.role,content:x.content};});
 if(out.at(-1).role!=='user')throw Error('Last message must be user');return out;
}
function system(mode,language){
 const preference=Object.hasOwn(LANGUAGES,language)?language:'auto';
 return [
  'You are NOVA OMNI, a capable, multilingual and precise AI assistant.',
  'Understand questions in Arabic, English, French, Spanish, Chinese, Hindi, Urdu, Portuguese, Russian, Japanese, Korean, Turkish, Persian, Bengali, Swahili and many other languages.',
  'Adapt naturally to the user language and dialect; when the user writes in Egyptian colloquial Arabic, answer in natural Egyptian Arabic unless requested otherwise.',
  preference==='auto'?'Respond naturally in the language of the last user message unless the user explicitly requests a different output language.':('Respond in '+LANGUAGES[preference]+' unless the user explicitly asks for a translation into another language.'),
  'Keep proper nouns, variable names, math expressions and programming identifiers accurate when switching language.',
  'Be precise, admit uncertainty, and never invent citations, source links, tool usage, benchmark scores, or claims about live news access.',
  'You have no live web search in this chat endpoint. Do not claim that current sources were checked.',
  'Provide age-appropriate and safe guidance.',
  mode==='coding'?'Use clear, secure and functional code; say when code has not been executed.':null,
  mode==='maths'?'Solve maths and physics carefully, with clear step-by-step notation and checks.':null,
  mode==='research'?'Distinguish confirmed evidence from hypotheses and limitations.':null,
  mode==='writing'?'Match the user-requested style, audience and tone accurately.':null
 ].filter(Boolean).join('\n');
}
async function apiModelRequest(url,secret,model,messages,timeout,direct){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeout||28000);
 try{
  let payload=direct?{model,messages,max_completion_tokens:2200}:{model,messages,max_tokens:2200};
  const r=await fetch(url,{
   method:'POST',
   headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},
   body:JSON.stringify(payload),signal:controller.signal
  });
  let body={};
  try{body=await r.json();}catch(e){throw aiError(direct?'direct_invalid_json':'gateway_invalid_json','AI provider returned an invalid response (HTTP '+r.status+').',r.status);}
  if(!r.ok){
   const prefix=direct?'Direct AI provider':'Vercel AI Gateway';
   const details=relevantErrorResponse(body);
   if(r.status===403){
    if(!direct&&details.code==='customer_verification_required'){
     throw aiError('gateway_customer_verification_required','Vercel requires account payment-method verification to unlock free AI Gateway credits. No payments were enabled. Use NOVA Local for AI without a payment method.',403);
    }
    throw aiError(direct?'direct_forbidden':'gateway_access_denied',direct?'OpenAI rejected this API key or model (403). Verify the independent API project permissions.':'Vercel AI Gateway denied access (403). Check team permissions; NOVA Local can run without Gateway or billing.',403);
   }
   if(r.status===401)throw aiError(direct?'direct_key_invalid':'gateway_authentication_failed',prefix+' rejected the credential (401). Check the server-side API key or Vercel OIDC authorization.',401);
   if(r.status===402)throw aiError(direct?'direct_insufficient_credits':'gateway_insufficient_credits',prefix+' needs available usage credits or a valid billing configuration (402).',402);
   if(r.status===429)throw aiError('ai_rate_limited','The AI provider is rate limiting requests (429).',429,true);
   if(r.status===404)throw aiError('model_unavailable','The configured AI model is not available on this provider (404).',404,true);
   if(r.status>=500)throw aiError('provider_unavailable','The AI service is currently unavailable (HTTP '+r.status+').',r.status,true);
   throw aiError('provider_error',prefix+' could not process the request (HTTP '+r.status+'; '+details.code+').',r.status);
  }
  const content=body?.choices?.[0]?.message?.content;
  const answer=typeof content==='string'?content:Array.isArray(content)?content.map(v=>v.text||'').join(''):'';
  if(!answer.trim())throw aiError('empty_response','The AI provider returned an empty answer.',502,true);
  return {answer,model:body.model||model};
 }catch(e){
  if(e.name==='AbortError')throw aiError('provider_timeout','The AI service timed out.',504,true);
  throw e;
 }finally{clearTimeout(timer);}
}
async function modelCall(model,messages,timeout,token){
 if(FREE_ONLY){
  if(!freeModelAllowed(model))throw aiError('free_only','Paid model access disabled. Choose a free AI Gateway model.',403);
  if(!token)throw aiError('ai_not_configured','No AI Gateway credential configured. Create/activate an AI Gateway API key in your Vercel account.',503);
  return apiModelRequest('https://ai-gateway.vercel.sh/v1/chat/completions',token,model,messages,timeout,false);
 }
 const directKey=process.env.OPENAI_API_KEY;
 const preferred=process.env.NOVA_AI_PROVIDER==='openai'&&!!directKey;
 if(preferred||(!token&&directKey)){
  const directModel=process.env.NOVA_DIRECT_OPENAI_MODEL||'gpt-5.4-mini';
  return apiModelRequest('https://api.openai.com/v1/chat/completions',directKey,directModel,messages,timeout,true);
 }
 if(!token)throw aiError('ai_not_configured','No AI provider credential is configured. Connect AI Gateway or add a provider API key in Vercel environment settings.',503);
 try{
  return await apiModelRequest('https://ai-gateway.vercel.sh/v1/chat/completions',token,model,messages,timeout,false);
 }catch(e){
  if(directKey&&['gateway_access_denied','gateway_authentication_failed','gateway_insufficient_credits','provider_unavailable'].includes(e.code)){
   const directModel=process.env.NOVA_DIRECT_OPENAI_MODEL||'gpt-5.4-mini';
   return apiModelRequest('https://api.openai.com/v1/chat/completions',directKey,directModel,messages,timeout,true);
  }
  throw e;
 }
}
async function github(path,method,payload){
 const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'nova-omni'};
 if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 if(payload)headers['Content-Type']='application/json';
 const r=await fetch('https://api.github.com'+path,{method:method||'GET',headers,body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(16000)});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error('GitHub HTTP '+r.status);return d;
}
async function slack(method,payload){
 if(!process.env.SLACK_BOT_TOKEN)throw Error('SLACK_BOT_TOKEN is not configured');
 const options={headers:{Authorization:'Bearer '+process.env.SLACK_BOT_TOKEN}};
 if(payload){options.method='POST';options.headers['Content-Type']='application/json';options.body=JSON.stringify(payload);}
 const r=await fetch('https://slack.com/api/'+method,{...options,signal:AbortSignal.timeout(16000)});
 const d=await r.json();if(!r.ok||!d.ok)throw Error('Slack '+String(d.error||r.status));return d;
}
function limit(req){
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',')[0].slice(0,120);
 const k=crypto.createHash('sha256').update(ip).digest('hex'),now=Date.now(),item=rate.get(k);
 if(!item||now-item.s>3600000){rate.set(k,{s:now,n:1});return false;}
 item.n++;if(rate.size>2000)rate.clear();return item.n>15;
}
module.exports=async function handler(req,res){
 applyCors(req,res);
 if(req.method==='OPTIONS')return res.status(204).end();
 const b=body(req),action=String(req.query?.action||b.action||'health');
 if(req.method==='GET'){
  if(action==='health')return reply(res,200,{ok:true,app:'NOVA OMNI',version:'1.6.0',freeOnly:FREE_ONLY,freeModels:FREE_ONLY?FREE_MODELS:null,ai:!!(gatewayToken(req)||(!FREE_ONLY&&process.env.OPENAI_API_KEY)),secured:vercelAuth()||!!process.env.NOVA_ACCESS_KEY,authMode:vercelAuth()?'vercel-sso':process.env.NOVA_ACCESS_KEY?'access-key':'none',provider:FREE_ONLY?(gatewayToken(req)?'vercel-ai-gateway-free':'not-configured'):process.env.NOVA_AI_PROVIDER==='openai'&&!!process.env.OPENAI_API_KEY?'direct-openai':gatewayToken(req)?'vercel-ai-gateway':process.env.OPENAI_API_KEY?'direct-openai':'not-configured',languages:Object.keys(LANGUAGES),github:!!process.env.GITHUB_TOKEN,slack:!!process.env.SLACK_BOT_TOKEN,modes:Object.keys(modes)});
  if(action==='calc'){try{return reply(res,200,{ok:true,value:calculate(String(req.query.expression||''))});}catch(e){return reply(res,400,{ok:false,error:e.message});}}
  if(action==='checks'){
   const tests=[['Precedence','2+3*4',14],['Parentheses','(2+3)*4',20],['Powers','2^3^2',512],['Square root','sqrt(144)+5',17],['Trigonometry','sin(pi/2)',1],['Unary minus','-3^2',-9],['Floating point','0.1+0.2',0.3],['Constants','pi-pi',0]];
   const results=tests.map(x=>({name:x[0],passed:Math.abs(calculate(x[1])-x[2])<1e-9}));
   let prevented=false;try{calculate('process.exit(1)');}catch(e){prevented=true;}
   results.push({name:'Unsafe expression rejected',passed:prevented});
   results.push({name:'Repository URL validation',passed:validRepo('octocat/Hello-World')&&!validRepo('https://example.com/a')});
   return reply(res,200,{ok:true,passed:results.filter(x=>x.passed).length,total:results.length,tests:results,note:'App unit checks, NOT a model benchmark against Grok.'});
  }
  if(action==='repo'){
   const repo=String(req.query.repo||'');if(!validRepo(repo))return reply(res,400,{ok:false,error:'Use owner/repo'});
   try{const d=await github('/repos/'+repo);return reply(res,200,{ok:true,repository:{name:d.full_name,description:d.description,stars:d.stargazers_count,issues:d.open_issues_count,url:d.html_url,updated:d.updated_at}});}catch(e){return reply(res,502,{ok:false,error:e.message});}
  }
  if(action==='diagnose'){
   if(!access(req))return reply(res,401,{ok:false,error:'Authentication required for model diagnostics'});
   if(limit(req))return reply(res,429,{ok:false,error:'Diagnostic request limit reached'});
   try{
    const sample=await modelCall(FREE_ONLY?FREE_MODELS.general:'openai/gpt-5.4-mini',[
     {role:'system',content:'You are testing AI connectivity. Reply with a very short greeting in Arabic.'},
     {role:'user',content:'أهلاً'}
    ],14000,gatewayToken(req));
    return reply(res,200,{ok:true,available:true,freeOnly:FREE_ONLY,model:sample.model,language:'ar',sample:sample.answer.slice(0,240)});
   }catch(e){
    return reply(res,200,{ok:true,available:false,freeOnly:FREE_ONLY,code:e.code||'ai_request_failed',reason:String(e.message||'AI connection failed').slice(0,330)});
   }
  }
  if(action==='channels'){
   if(!access(req))return reply(res,401,{ok:false,error:'Site access key required'});
   try{const d=await slack('conversations.list?limit=100&types=public_channel,private_channel');return reply(res,200,{ok:true,channels:(d.channels||[]).filter(x=>!x.is_archived).map(x=>({id:x.id,name:x.name}))});}catch(e){return reply(res,502,{ok:false,error:e.message});}
  }
  return reply(res,404,{ok:false,error:'Unknown action'});
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'Method not allowed'});
 if(!access(req))return reply(res,401,{ok:false,error:'Access key missing or invalid. Enter it under Settings.'});
 try{
  if(action==='chat'){
   if(limit(req))return reply(res,429,{ok:false,error:'Hourly request limit reached'});
   const messages=cleanMessages(b.messages),mode=Object.hasOwn(modes,b.mode)?b.mode:'general',lang=Object.hasOwn(LANGUAGES,b.language)?b.language:'auto',primary=modes[mode],context=[{role:'system',content:system(mode,lang)},...messages];
   let first;
   try{first=await modelCall(primary,context,31000,gatewayToken(req));}
   catch(e){
    if(!e.retryable)throw e;
    const alternate=FREE_ONLY?FREE_FALLBACKS.find(m=>m!==primary):'openai/gpt-5.4-mini';
    if(!alternate||primary===alternate)throw e;
    first=await modelCall(alternate,context,19000,gatewayToken(req));
   }
   let reviewed=false;
   if(b.deep===true){
    try{
     const judge=FREE_ONLY?(primary==='reflection/beam-free'?'nvidia/nemotron-3.5-lightning-free':'reflection/beam-free'):(primary==='anthropic/claude-opus-4.6'?'openai/gpt-5.4':'anthropic/claude-opus-4.6');
     const result=await modelCall(judge,[{role:'system',content:system(mode,lang)+'\nCritically review the following draft, correct errors, and return only your improved final answer. Never claim external verification.'},{role:'user',content:'Original request:\n'+messages.at(-1).content+'\n\nDraft answer:\n'+first.answer}],24000,gatewayToken(req));
     first={answer:result.answer,model:first.model+' + '+result.model};reviewed=true;
    }catch(e){reviewed=false;}
   }
   return reply(res,200,{ok:true,answer:first.answer,model:first.model,reviewed});
  }
  if(action==='issue'){
   const repo=String(b.repo||''),title=String(b.title||'').trim(),description=String(b.description||'').trim();
   if(!process.env.GITHUB_TOKEN)return reply(res,503,{ok:false,error:'GITHUB_TOKEN not configured'});
   if(!validRepo(repo)||!title||title.length>180||description.length>5000)return reply(res,400,{ok:false,error:'Invalid issue fields'});
   const d=await github('/repos/'+repo+'/issues','POST',{title,body:description});return reply(res,200,{ok:true,url:d.html_url,number:d.number});
  }
  if(action==='post'){
   const channel=String(b.channel||''),message=String(b.message||'').trim();
   if(!/^[CDG][A-Z0-9]{6,}$/.test(channel)||!message||message.length>3000)return reply(res,400,{ok:false,error:'Invalid Slack fields'});
   const d=await slack('chat.postMessage',{channel,text:message});return reply(res,200,{ok:true,channel:d.channel,ts:d.ts});
  }
  return reply(res,404,{ok:false,error:'Unknown action'});
 }catch(e){return reply(res,503,{ok:false,error:String(e.message||'AI provider request failed').slice(0,350),code:e.code||'request_failed'});}
};