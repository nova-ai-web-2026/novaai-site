/* NOVA Local Math v2.7 — safe deterministic parsing. No eval, no network. */
(function(root,factory){
 const exported=factory();
 if(typeof module==='object'&&module.exports)module.exports=exported;
 else root.NovaLocalMath=exported;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const FUNCTIONS=Object.freeze({
  sqrt:Math.sqrt,sin:Math.sin,cos:Math.cos,tan:x=>{
   if(Math.abs(Math.cos(x))<1e-12)throw Error('tan undefined at this angle');
   return Math.tan(x);
  },
  abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp
 });
 function toAsciiDigits(text){
  return String(text).replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x0660))
   .replace(/[\u06f0-\u06f9]/g,c=>String(c.charCodeAt(0)-0x06f0))
   .replace(/[×·]/g,'*').replace(/÷/g,'/')
   .replace(/[−–]/g,'-').replace(/π/g,'pi');
 }
 function calculate(expression){
  const s=toAsciiDigits(expression).replace(/\s+/g,'').toLowerCase();
  if(!s||s.length>160||!/^[a-z0-9.+\-*/^()]+$/.test(s))throw Error('Invalid expression');
  let i=0;
  const eat=c=>s[i]===c?(i++,true):false;
  function atom(){
   if(eat('(')){
    const x=sum();
    if(!eat(')'))throw Error('Missing closing parenthesis');
    return x;
   }
   const n=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/);
   if(n){i+=n[0].length;return Number(n[0]);}
   const name=s.slice(i).match(/^[a-z]+/);
   if(name){
    const id=name[0];i+=id.length;
    if(id==='pi')return Math.PI;
    if(id==='e')return Math.E;
    if(!Object.hasOwn(FUNCTIONS,id)||!eat('('))throw Error('Unsupported function');
    const x=sum();
    if(!eat(')'))throw Error('Missing function parenthesis');
    return FUNCTIONS[id](x);
   }
   throw Error('Expected number');
  }
  function power(){let n=atom();if(eat('^'))n=Math.pow(n,unary());return n;}
  function unary(){if(eat('-'))return -unary();if(eat('+'))return unary();return power();}
  function product(){
   let n=unary();
   while(i<s.length){if(eat('*'))n*=unary();else if(eat('/'))n/=unary();else break;}
   return n;
  }
  function sum(){
   let n=product();
   while(i<s.length){if(eat('+'))n+=product();else if(eat('-'))n-=product();else break;}
   return n;
  }
  const result=sum();
  if(i!==s.length||!Number.isFinite(result))throw Error('Invalid or non-finite arithmetic');
  const precise=Math.abs(result)<1e10?Number(result.toFixed(12)):Number(result.toPrecision(12));
  if(!Number.isFinite(precise))throw Error('Arithmetic overflow');
  return precise;
 }
 function tryArithmetic(question){
  const input=toAsciiDigits(String(question||'').trim());
  if(input.length<3||input.length>300)return null;
  const query=input.match(/^\s*(?:what\s+is|what's|calculate|compute|solve|احسب|كام|ما\s+ناتج|ما\s+نتيجة|ناتج|نتيجة)\s*:?\s*([\d.a-z()+\-*/^\s]+?)(?:\s*[?؟=]\s*.*)?\s*$/i);
  let expr=query?query[1]:input;
  expr=expr.trim();
  if(!/^[\s\d.a-z+\-*/^()]+$/i.test(expr))return null;
  if(!/[0-9]|pi|sqrt|sin|cos|tan|abs|log|ln|exp/i.test(expr))return null;
  if(!/[+\-*/^]|(?:sqrt|sin|cos|tan|abs|ln|log|exp)\s*\(/i.test(expr))return null;
  try{return {expression:expr,value:calculate(expr)};}
  catch(e){return null;}
 }

 return Object.freeze({calculate,tryArithmetic,toAsciiDigits});
});
