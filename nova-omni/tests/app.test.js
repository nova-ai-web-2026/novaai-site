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
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(obj){this.body=obj;return this;}};
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