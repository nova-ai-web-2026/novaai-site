'use strict';
function calculate(expression) {
 const s=String(expression||"").replace(/\s+/g,"").toLowerCase();let i=0;
 if(!s||s.length>160)throw Error("Invalid expression");
 const fn={sqrt:Math.sqrt,sin:Math.sin,cos:Math.cos,tan:Math.tan,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp};
 const eat=c=>{if(s[i]===c){i++;return true;}return false;};
 function atom(){if(eat("(")){const n=sum();if(!eat(")"))throw Error("Missing )");return n;}
 const n=s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/);if(n){i+=n[0].length;return Number(n[0]);}
 const word=s.slice(i).match(/^[a-z]+/);if(word){i+=word[0].length;const k=word[0];if(k==="pi")return Math.PI;if(k==="e")return Math.E;if(!Object.prototype.hasOwnProperty.call(fn,k)||!eat("("))throw Error("Invalid function");const a=sum();if(!eat(")"))throw Error("Missing )");return fn[k](a);}
 throw Error("Invalid number");}
 function pow(){let a=atom();if(eat("^"))a=Math.pow(a,unary());return a;}
 function unary(){if(eat("-"))return -unary();if(eat("+"))return unary();return pow();}
 function product(){let a=unary();for(;;){if(eat("*"))a*=unary();else if(eat("/"))a/=unary();else break;}return a;}
 function sum(){let a=product();for(;;){if(eat("+"))a+=product();else if(eat("-"))a-=product();else break;}return a;}
 const val=sum();if(i!==s.length||!Number.isFinite(val))throw Error("Invalid or non-finite result");
 return Math.round(val*1e12)/1e12;
}
module.exports={calculate};
