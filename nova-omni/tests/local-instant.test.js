'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const instant=require('../local-instant.js');

const wiki={query:{search:[
 {pageid:120,title:'Solar energy',snippet:'Solar energy is <span class="searchmatch">renewable</span> and can generate electricity.'},
 {pageid:121,title:'Photovoltaic system',snippet:'Electricity generated from sunlight.'}
]}};
const crossref={message:{items:[
 {DOI:'10.1234/example.2026',title:['Renewable energy study'],published:{'date-parts':[[2026,6,1]]},'container-title':['Journal of Energy']},
 {DOI:'javascript:alert(1)',title:['Unsafe source']},
]}};
function fetchMock(url){
 const link=String(url);
 if(link.includes('wikipedia.org/w/api.php'))return Promise.resolve({ok:true,json:async()=>wiki});
 if(link.includes('api.crossref.org/works'))return Promise.resolve({ok:true,json:async()=>crossref});
 throw Error('Unexpected network request: '+link);
}

test('instant task selection never requires a model',()=>{
 assert.equal(instant.isInstant('Solar power','research'),true);
 assert.equal(instant.isInstant('Write an email','write_fast'),true);
 assert.equal(instant.isInstant('Python calculator','code_fast'),true);
 assert.equal(instant.isInstant('Explain quantum energy','auto'),false);
 assert.equal(instant.isInstant('','research'),false);
});
test('research query strips obvious search instructions without erasing topic',()=>{
 assert.equal(instant.makeQuery('ابحث عن الطاقة الشمسية'),'الطاقة الشمسية');
 assert.equal(instant.makeQuery('research about Solar energy'),'Solar energy');
 assert.ok(instant.makeQuery('a'.repeat(1000)).length<=150);
});
test('Wikimedia results have fixed safe URLs and search snippets are plain text',()=>{
 const data=instant.parseWikiResults(wiki,'en');
 assert.equal(data.length,2);
 assert.equal(data[0].url,'https://en.wikipedia.org/?curid=120');
 assert.ok(data[0].snippet.includes('renewable'));
 assert.equal(data[0].snippet.includes('<span'),false);
 const bad=instant.parseWikiResults({query:{search:[{pageid:'javascript:alert(1)',title:'Bad',snippet:'xx'}]}},'en');
 assert.equal(bad.length,0);
});
test('Crossref metadata requires valid DOI and returns safe fixed-domain citations',()=>{
 const data=instant.parseCrossrefResults(crossref);
 assert.equal(data.length,1);
 assert.equal(data[0].url,'https://doi.org/10.1234/example.2026');
 assert.ok(data[0].snippet.includes('2026'));
});
test('public research searches real sources, no model, no hidden third-party inference',async()=>{
 const urls=[];
 const output=await instant.research('Research about Solar energy',{
   language:'en',fetchImpl:async(url,options)=>{
    urls.push(String(url));
    assert.equal(options.credentials,'omit');
    return fetchMock(url);
   }
 });
 assert.equal(urls.length,2);
 assert.ok(urls.some(url=>url.includes('origin=*')||url.includes('origin=%2A')));
 assert.ok(urls.every(url=>/wikipedia\.org|crossref\.org/.test(url)));
 assert.equal(output.kind,'source-search');
 assert.ok(output.text.includes('https://doi.org/10.1234/example.2026'));
 assert.ok(output.text.includes('These are source titles/excerpts'));
 assert.equal(output.network,true);
});
test('research never invents sources if upstream providers fail',async()=>{
 await assert.rejects(instant.research('Solar energy',{
  fetchImpl:async()=>{throw Error('No connection');}
 }),/غير متاحة/);
});
test('instant writing preserves supplied content and labels itself as a template',async()=>{
 const result=await instant.perform('Write email about my application status','write_fast',{language:'en'});
 assert.equal(result.network,false);
 assert.ok(result.text.includes('my application status'));
 assert.ok(result.text.includes('no AI model'));
 const arabic=instant.writingTemplate('اكتب إيميل عن حالة الطلب',{language:'ar'});
 assert.ok(arabic.text.includes('حالة الطلب'));
 assert.ok(arabic.text.includes('بدون نموذج AI'));
});
test('instant code presets are useful but never claim general coding abilities',()=>{
 const python=instant.codeTemplate('اعمل آلة حاسبة Python');
 assert.ok(python.text.includes('def calculate'));
 assert.ok(python.text.includes("if b == 0"));
 const html=instant.codeTemplate('Make a HTML page');
 assert.ok(html.text.includes('<!doctype html>'));
 const unknown=instant.codeTemplate('Build an orbital simulator');
 assert.ok(unknown.text.includes('not a general code generator'));
});
