'use strict';
const {calculate}=require('../lib/math');
const crypto=require('node:crypto');
const modes={general:'openai/gpt-5.4',coding:'anthropic/claude-opus-4.6',maths:'openai/gpt-5.4',research:'openai/gpt-5.4',writing:'anthropic/claude-opus-4.6'};
const rate=new Map();
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
 const value=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||req.headers['x-vercel-oidc-token'];
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
function system(mode){
 return ['You are NOVA OMNI, a capable, careful and precise AI assistant. Respond in the same language as the user.',
 'Be accurate, admit uncertainty, and never invent source links, tool executions, benchmark scores or capabilities.',
 'You have no live web search in this chat endpoint. Do not present current information as checked.',
 'Always provide age-appropriate safe assistance.',
 mode==='coding'?'Provide secure, working code; explicitly state when code has not been executed.':null,
 mode==='maths'?'Show calculations step by step and check the result.':null,
 mode==='research'?'Distinguish evidence from hypotheses and explicitly note the lack of live web browsing.':null].filter(Boolean).join('\n');
}
async function modelCall(model,messages,timeout,token){
 token=token||process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
 if(!token)throw Error('AI Gateway not configured');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout||33000);
 try{
  const r=await fetch('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({model,messages,max_tokens:2500}),signal:controller.signal});
  if(!r.ok)throw Error('AI Gateway HTTP '+r.status+(r.status===402?' - add credits':''));
  const d=await r.json(),m=d?.choices?.[0]?.message?.content;
  const answer=typeof m==='string'?m:Array.isArray(m)?m.map(x=>x.text||'').join(''):'';
  if(!answer.trim())throw Error('Model returned no answer');return {answer,model:d.model||model};
 }finally{clearTimeout(timer);}
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
  if(action==='health')return reply(res,200,{ok:true,app:'NOVA OMNI',version:'1.3.0',ai:!!gatewayToken(req),secured:vercelAuth()||!!process.env.NOVA_ACCESS_KEY,authMode:vercelAuth()?'vercel-sso':process.env.NOVA_ACCESS_KEY?'access-key':'none',github:!!process.env.GITHUB_TOKEN,slack:!!process.env.SLACK_BOT_TOKEN,modes:Object.keys(modes)});
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
   const messages=cleanMessages(b.messages),mode=Object.hasOwn(modes,b.mode)?b.mode:'general',primary=modes[mode],context=[{role:'system',content:system(mode)},...messages];
   let first;try{first=await modelCall(primary,context,34000,gatewayToken(req));}catch(e){if(primary==='openai/gpt-5.4-mini')throw e;first=await modelCall('openai/gpt-5.4-mini',context,20000,gatewayToken(req));}
   let reviewed=false;
   if(b.deep===true){
    try{
     const judge=primary==='anthropic/claude-opus-4.6'?'openai/gpt-5.4':'anthropic/claude-opus-4.6';
     const result=await modelCall(judge,[{role:'system',content:system(mode)+'\nCritically review the following draft, correct errors, and return only your improved final answer. Never claim external verification.'},{role:'user',content:'Original request:\n'+messages.at(-1).content+'\n\nDraft answer:\n'+first.answer}],24000,gatewayToken(req));
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
 }catch(e){return reply(res,502,{ok:false,error:(e.name==='AbortError'?'Provider timeout':String(e.message||e)).slice(0,220)});}
};