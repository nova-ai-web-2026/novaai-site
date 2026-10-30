'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate}=require('../lib/math');
const handler=require('../api/omni');
for(const [name,input,expected] of [
 ['precedence','2+3*4',14],['grouping','(2+3)*4',20],
 ['power associativity','2^3^2',512],['sqrt','sqrt(144)+5',17],
 ['trigonometry','sin(pi/2)',1],['negative exponent','-3^2',-9],
 ['floating point','0.1+0.2',0.3],['constants','pi-pi',0]
])test('calculator '+name,()=>assert.ok(Math.abs(calculate(input)-expected)<1e-9));
test('unsafe input rejected',()=>assert.throws(()=>calculate('constructor(123)')));
test('non-finite input rejected',()=>assert.throws(()=>calculate('2/0')));
function mockRequest(method,query,body,headers){
 const req={method,query,body:body||{},headers:headers||{},socket:{remoteAddress:'127.0.0.1'}};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(obj){this.body=obj;return this;},end(){this.ended=true;return this;}};
 return handler(req,res).then(()=>res);
}
test('live API health route',async()=>{
 const r=await mockRequest('GET',{action:'health'});
 assert.equal(r.statusCode,200);assert.equal(r.body.ok,true);assert.equal(r.body.app,'NOVA OMNI');
});
test('live API deterministic checks',async()=>{
 const r=await mockRequest('GET',{action:'checks'});
 assert.equal(r.statusCode,200);assert.equal(r.body.passed,10);assert.equal(r.body.total,10);
});
test('live API arithmetic result',async()=>{
 const r=await mockRequest('GET',{action:'calc',expression:'sqrt(144)+2^3'});
 assert.equal(r.body.value,20);
});
test('invalid GitHub repository blocked',async()=>{
 const r=await mockRequest('GET',{action:'repo',repo:'https://evil.example/path'});
 assert.equal(r.statusCode,400);
});
test('chat never bypasses site access',async()=>{
 const r=await mockRequest('POST',{action:'chat'},{messages:[{role:'user',content:'Hello'}]});
 assert.equal(r.statusCode,401);
});
test('Slack never bypasses site access',async()=>{
 const r=await mockRequest('GET',{action:'channels'});
 assert.equal(r.statusCode,401);
});
test('API unknown route returns 404',async()=>{
 const r=await mockRequest('GET',{action:'not-found'});
 assert.equal(r.statusCode,404);
});
test('API disallowed method returns 405',async()=>{
 const r=await mockRequest('DELETE',{action:'health'});
 assert.equal(r.statusCode,405);
});
test('CORS allows only trusted GitHub Pages origin',async()=>{
 const r=await mockRequest('OPTIONS',{action:'chat'},null,{origin:'https://nova-ai-web-2026.github.io'});
 assert.equal(r.statusCode,204);
 assert.equal(r.headers['Access-Control-Allow-Origin'],'https://nova-ai-web-2026.github.io');
 assert.ok(r.headers['Access-Control-Allow-Headers'].includes('X-Nova-Key'));
});
test('CORS rejects untrusted origins',async()=>{
 const r=await mockRequest('OPTIONS',{action:'chat'},null,{origin:'https://attacker.example'});
 assert.equal(r.statusCode,204);
 assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);
});
test('CORS protects API response',async()=>{
 const r=await mockRequest('GET',{action:'health'},null,{origin:'https://nova-ai-web-2026.github.io'});
 assert.equal(r.statusCode,200);
 assert.equal(r.headers['Access-Control-Allow-Origin'],'https://nova-ai-web-2026.github.io');
});

test('Vercel SSO trusted platform auth is reported correctly',async()=>{
 const previous={vercel:process.env.VERCEL,flag:process.env.NOVA_TRUST_VERCEL_AUTH};
 try{
  process.env.VERCEL='1';process.env.NOVA_TRUST_VERCEL_AUTH='true';
  const r=await mockRequest('GET',{action:'health'});
  assert.equal(r.body.secured,true);
  assert.equal(r.body.authMode,'vercel-sso');
 }finally{
  if(previous.vercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous.vercel;
  if(previous.flag===undefined)delete process.env.NOVA_TRUST_VERCEL_AUTH;else process.env.NOVA_TRUST_VERCEL_AUTH=previous.flag;
 }
});
test('Injected Vercel OIDC token is recognized without disclosure',async()=>{
 const r=await mockRequest('GET',{action:'health'},null,{'x-vercel-oidc-token':'fake-oidc-test-secret'});
 assert.equal(r.body.ai,true);
 assert.equal(JSON.stringify(r.body).includes('fake-oidc-test-secret'),false);
});
