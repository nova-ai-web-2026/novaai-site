/* NOVA OMNI Local arithmetic: deterministic, no eval, no network calls. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NovaLocalMath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function calculate(input){
  const str=String(input||'').replace(/\s+/g,'');
  if(str.length<3||str.length>150||!/^[0-9.\-+*\/^()]+$/.test(str))throw Error('Not a supported arithmetic expression');
  let i=0;
  const eat=c=>str[i]===c?(i++,true):false;
  function number(){
   if(eat('(')){const x=sum();if(!eat(')'))throw Error('Missing )');return x;}
   const n=str.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
   if(!n)throw Error('Invalid number');
   i+=n[0].length;return Number(n[0]);
  }
  function power(){let n=number();if(eat('^'))n=Math.pow(n,unary());return n;}
  function unary(){if(eat('+'))return unary();if(eat('-'))return -unary();return power();}
  function product(){let n=unary();while(i<str.length){if(eat('*'))n*=unary();else if(eat('/'))n/=unary();else break;}return n;}
  function sum(){let n=product();while(i<str.length){if(eat('+'))n+=product();else if(eat('-'))n-=product();else break;}return n;}
  const n=sum();
  if(i!==str.length||!Number.isFinite(n))throw Error('Invalid or non-finite arithmetic');
  return Math.round(n*1e12)/1e12;
 }
 function toAsciiDigits(source){
  return source.replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x0660))
   .replace(/[\u06F0-\u06F9]/g,c=>String(c.charCodeAt(0)-0x06F0));
 }
 function tryArithmetic(question){
  const source=toAsciiDigits(String(question||'').trim());
  if(source.length<3||source.length>250)return null;
  let expression=source;
  if(!/^[\s\d().+\-*\/^]+$/.test(expression)){
   const match=source.match(/^\s*(?:what\s+is|what's|calculate|compute|احسب|كام|ما\s+ناتج|ناتج|نتيجة)\s*:?\s*([\d().+\-*\/^\s]+)(?:[?؟=]\s*.*)?\s*$/i);
   if(!match)return null;
   expression=match[1].trim();
  }
  if(!/[+\-*\/^]/.test(expression)||!/\d/.test(expression))return null;
  try{return {expression:expression.trim(),value:calculate(expression)};}
  catch(e){return null;}
 }
 return Object.freeze({calculate,tryArithmetic});
});
