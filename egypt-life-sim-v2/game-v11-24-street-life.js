(() => {
 'use strict';
 const VERSION='11.24.0',B=BABYLON,R=EgyptStreetRules;
 const api=window.EgyptStreetLife={ready:false};
 const signals=[{id:'station',x:-24,z:-24,phase:'drive',elapsed:0},{id:'market',x:24,z:24,phase:'drive',elapsed:0}];
 const crossings=[],roots=[],bulbs=[],history=new Map();let ctx,clock=0,active=false,failed=false,encounter=null,cooldown=0,lastTask=-1,notice,loss;
 const quotes=['خلي بالك يا ابني! العيش مش هيطير.','حاسب يا بطل! إحنا مش في سباق طعمية.','وسع سنة يا نجم، الرصيف يشيلنا إحنا الاتنين.'];
 const people=()=>roots.filter(root=>root.isEnabled()).map(root=>({root,id:root.uniqueId,name:root.metadata?.identity?.name||'واحد من أهل الحارة',x:root.position.x,z:root.position.z}));
 function box(name,w,h,d,x,y,z,color){const m=B.MeshBuilder.CreateBox('street24_'+name,{width:w,height:h,depth:d},ctx.scene);m.position.set(x,y,z);m.material=EgyptQuality.material('street24_'+color,-1,color);m.isPickable=false;return m;}
 function label(name,text,x,y,z,parent,turn=0){
  const t=new B.DynamicTexture('street24_label_'+name,{width:256,height:96},ctx.scene,false),c=t.getContext();c.fillStyle='#253c32';c.fillRect(0,0,256,96);c.fillStyle='#fff4d2';c.font='bold 46px Tahoma';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,128,48,240);t.update();
  const mat=new B.StandardMaterial('street24_label_'+name,ctx.scene);mat.diffuseTexture=t;mat.specularColor=B.Color3.Black();mat.backFaceCulling=true;
  for(const side of [-1,1]){const m=B.MeshBuilder.CreatePlane('street24_label_'+name+(side<0?'':'_readableBack'),{width:.65,height:.24},ctx.scene);m.position.set(x+Math.sin(turn)*side*.035,y,z+Math.cos(turn)*side*.035);m.rotation.y=(side<0?0:Math.PI)+turn;m.material=mat;m.isPickable=false;m.metadata={readableArabic:true,mount:'signal-post',supports:[parent.name]};}
 }
 function crossing(c){crossings.push(c);if(c.extra)for(let i=-4;i<=4;i++)box('crossing_'+c.id+i,c.vertical?.60:2.9,.012,c.vertical?2.9:.60,c.x+(c.vertical?i:0),.093,c.z+(c.vertical?0:i),'#e7e2ce');}
 function buildSignals(){
  for(const x of ctx.world.roads)for(const z of ctx.world.roads){
   const s=signals.find(s=>s.x===x&&s.z===z);
   crossing({id:'v'+x+':'+z,x,z:z-7.3,vertical:true,signal:s});crossing({id:'h'+x+':'+z,x:x+7.3,z,vertical:false,signal:s});
   if(s){crossing({id:'vs'+x,x,z:z+7.3,vertical:true,signal:s,extra:true});crossing({id:'hw'+x,x:x-7.3,z,vertical:false,signal:s,extra:true});}
  }
  for(const c of crossings.filter(c=>c.signal))for(const side of [-1,1]){
   const x=c.x+(c.vertical?side*6.1:2.05),z=c.z+(c.vertical?2.05:side*6.1),post=box('pole_'+c.id+side,.10,2.65,.10,x,1.325,z,'#465047');post.checkCollisions=true;
   const turn=c.vertical?Math.PI/2:0;box('pedestrianHousing_'+c.id+side,.37,.72,.19,x,2.16,z,'#202824').rotation.y=turn;label(c.id+side,'للمشاة',x,1.64,z,post,turn);
   for(const [color,y] of [['red',2.35],['green',2.04]]){const m=B.MeshBuilder.CreateSphere('street24_'+color,{diameter:.23,segments:12},ctx.scene);m.position.set(x-Math.sin(turn)*.09,y,z-Math.cos(turn)*.09);m.scaling.z=.65;m.rotation.y=turn;const mat=new B.StandardMaterial('street24_bulb_'+m.uniqueId,ctx.scene);mat.diffuseColor=B.Color3.FromHexString(color==='red'?'#df483c':'#42c883');m.material=mat;m.isPickable=false;bulbs.push({m,mat,color,signal:c.signal});}
  }
  for(const s of signals)for(const direction of [-1,1]){
   const x=s.x+direction*5.6,z=s.z-direction*10.1,post=box('trafficPole_'+s.id+direction,.12,3.25,.12,x,1.625,z,'#465047');
   box('trafficHousing_'+s.id+direction,.45,1.05,.28,x,2.95,z,'#202824');
   for(const [color,y] of [['red',3.26],['amber',2.96],['green',2.66]]){const m=B.MeshBuilder.CreateSphere('street24_car_'+color,{diameter:.25,segments:12},ctx.scene);m.position.set(x,y,z-direction*.14);m.scaling.z=.6;const mat=new B.StandardMaterial(m.name+m.uniqueId,ctx.scene);mat.diffuseColor=B.Color3.FromHexString({red:'#df483c',amber:'#e6b449',green:'#42c883'}[color]);m.material=mat;m.isPickable=false;bulbs.push({m,mat,color,signal:s,cars:true});}
   label('cars'+s.id+direction,'للسيارات',x,2.18,z,post);
  }
 }
 function insideCross(p,c,margin=0){return c.vertical?Math.abs(p.x-c.x)<5+margin&&Math.abs(p.z-c.z)<1.8:Math.abs(p.z-c.z)<5+margin&&Math.abs(p.x-c.x)<1.8;}
 function nearbyCross(p){return crossings.map(c=>({c,d:Math.hypot(c.x-p.x,c.z-p.z)})).filter(o=>o.d<8).sort((a,b)=>a.d-b.d)[0]?.c;}
 function fail(reason){if(failed)return;failed=true;encounter=null;notice.hidden=true;ctx.clearInput();ctx.releaseMouse();EgyptLife.setJourneyFailure(reason);ctx.emitSfx('deny');showLoss(reason);}
 function showLoss(reason){loss.querySelector('p').textContent=reason+'\nارجع لأول المشوار وجرّب تاني. الفلوس والشنطة هيرجعوا لحالتهم في بداية المرحلة.';loss.hidden=false;loss.querySelector('button').focus();}
 function begin(newGame){for(const s of signals){s.phase='drive';s.elapsed=0;}clock=0;encounter=null;cooldown=clock+2;failed=false;lastTask=EgyptLife.snapshot().state.task;EgyptLife.journeyCheckpoint(newGame);const reason=EgyptLife.snapshot().state.streetFailed;loss.hidden=true;if(reason){failed=true;showLoss(reason);}}
 function tick(dt,playing){
  active=playing&&!document.hidden;if(!active){notice.hidden=true;return;}clock+=dt;
  const state=EgyptLife.snapshot().state;if(state.task!==lastTask){lastTask=state.task;EgyptLife.journeyCheckpoint(true);}
  const ps=people(),player=ctx.camera.position;
  for(const s of signals){const occupied=crossings.filter(c=>c.signal===s).some(c=>insideCross(player,c)||ps.some(p=>insideCross(p,c)));
   const cars=ctx.world.vehicles.some(v=>Math.abs((v.vertical?v.root.position.x:v.root.position.z)-(v.vertical?s.x:s.z))<4&&Math.abs((v.vertical?v.root.position.z:v.root.position.x)-(v.vertical?s.z:s.x))<9.4+v.length/2);
   R.signalStep(s,dt,occupied,cars);
  }
  for(const bulb of bulbs){const on=bulb.cars?(bulb.color==='green'?bulb.signal.phase==='drive':bulb.color==='amber'?bulb.signal.phase==='amber':!['drive','amber'].includes(bulb.signal.phase)):(bulb.color==='green')===(bulb.signal.phase==='walk');bulb.mat.emissiveColor=on?bulb.mat.diffuseColor.scale(.9):B.Color3.Black();bulb.mat.alpha=1;bulb.m.visibility=on?1:.32;}
  if(encounter){const p=ps.find(p=>p.id===encounter.id);if(!p||EgyptLife.insideShop()||R.distance(player,p)>1.5){encounter=null;cooldown=clock+3;notice.hidden=true;return;}if(clock>=encounter.until){fail('فضلت تزق في الناس، والمشوار وقف. خلي بالك من اللي حواليك المرة الجاية.');return;}notice.hidden=false;notice.dataset.kind='bump';notice.textContent=encounter.quote+'\nارجع خطوة أو عدي من الجنب — '+Math.ceil(encounter.until-clock)+' ث';return;}
  const c=nearbyCross(player);notice.hidden=!c||!!EgyptLife.insideShop();if(c){notice.dataset.kind=c.signal?.phase==='walk'?'go':'wait';notice.textContent=c.signal?(c.signal.phase==='walk'?'المشاة أخضر — عدي من المعبر.':'المشاة أحمر — استنى الإشارة والعربيات تقف.'):'معبر من غير إشارة — استنى طريق فاضي أو العربية تقف لك.';}
 }
 function filterMove(camera,delta){
  if(!api.ready||camera!==ctx.camera)return delta;if(failed)return B.Vector3.Zero();if(!active)return delta;
  const from=camera.position,ps=people(),result=R.slide(from,delta,ps);
  if(result.hit&&!encounter&&clock>=cooldown){encounter={id:result.hit.id,quote:quotes[result.hit.id%quotes.length],until:clock+8};ctx.emitSfx('interact');}
  const end={x:from.x+result.delta.x,z:from.z+result.delta.z};
  for(const c of crossings)if(c.signal&&c.signal.phase!=='walk'&&!insideCross(from,c)&&insideCross(end,c)){fail('دخلت المعبر وإشارة المشاة حمرا. استنى الأخضر في المحاولة الجاية.');return new B.Vector3(0,0,0);}
  return new B.Vector3(result.delta.x,delta.y||0,result.delta.z);
 }
 function vehicles(dt){
  if(!api.ready)return false;if(failed)return true;
  const list=ctx.world.vehicles;for(const v of list){v.x=v.root.position.x;v.z=v.root.position.z;}
  const ps=people(),player=ctx.camera.position,all=[...ps,player];
  for(const v of list){const axis=v.vertical?'z':'x',side=v.vertical?'x':'z',stops=[];
   for(const s of signals)if(s.phase!=='drive'&&Math.abs(v[side]-(v.vertical?s.x:s.z))<4)stops.push((v.vertical?s.z:s.x)-v.dir*10.2);
   for(const c of crossings)if(!c.signal&&c.vertical===v.vertical&&Math.abs(c[side]-v[side])<4&&all.some(p=>insideCross(p,c,1.8)))stops.push(c[axis]-v.dir*2.45);
   const move=R.vehicleStep(v,list,stops,all,dt);
   if(active&&move.travel>.002&&R.vehicleHit(v,move.previous,player)){v.velocity=0;v[axis]=move.previous;fail('دخلت قدام عربية وهي لسه ماشية. استنى فراغ آمن أو استخدم المعبر.');}
   if(v[axis]>112)v[axis]=-112;if(v[axis]<-112)v[axis]=112;v.root.position.x=v.x;v.root.position.z=v.z;
  }
  return true;
 }
 function holdPerson(root){
  if(!active||failed||encounter?.id===root.uniqueId||R.distance(root.position,ctx.camera.position)<1.08)return true;
  const p=root.position,old=history.get(root.uniqueId),dx=old?p.x-old.x:0,dz=old?p.z-old.z:0,length=Math.hypot(dx,dz);
  const heading=length>.001?{x:dx/length,z:dz/length}:old?.heading;
  history.set(root.uniqueId,{x:p.x,z:p.z,heading});
  if(!heading)return false;
  const next={x:p.x+heading.x*.60,z:p.z+heading.z*.60};
  return crossings.some(c=>c.signal&&c.signal.phase!=='walk'&&!insideCross(p,c)&&insideCross(next,c));
 }
 async function install(){
  while(!window.__EGYPT_QUALITY?.ready)await new Promise(r=>setTimeout(r,100));ctx=EgyptLife.streetContext();
  roots.push(...ctx.scene.transformNodes.filter(n=>n.name==='personRoot'||/^v12_ped_\d+$/.test(n.name)||/^storyActor_(mother|vendor)$/.test(n.name)));
  notice=document.createElement('div');notice.id='streetNotice';notice.hidden=true;notice.setAttribute('role','status');document.body.appendChild(notice);
  loss=document.createElement('div');loss.id='streetLoss';loss.hidden=true;loss.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="streetLossTitle"><h2 id="streetLossTitle">المشوار وقف!</h2><p></p><button type="button" id="retryJourney">جرّب المشوار من الأول</button></section>';document.body.appendChild(loss);
  loss.querySelector('button').onclick=()=>{EgyptLife.retryJourney();begin(false);cooldown=clock+3;};
  const style=document.createElement('style');style.textContent='#streetNotice[hidden],#streetLoss[hidden]{display:none!important}#streetNotice{position:fixed;z-index:29;bottom:30%;left:50%;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;background:#342e20f5;border:1px solid #bd9956;color:#fff1d6;border-radius:12px;padding:12px;font:700 14px/1.7 Tahoma;text-align:center;white-space:pre-line;pointer-events:none}#streetNotice[data-kind=go]{border-color:#57b788;background:#193d30f5}#streetNotice[data-kind=bump]{border-color:#e3a360}#streetLoss{position:fixed;inset:0;z-index:100;background:#18150de8;display:grid;place-items:center;padding:20px}#streetLoss section{max-width:430px;background:#302b20;color:#ffedcc;border:1px solid #a99160;border-radius:18px;padding:24px;text-align:center;font:16px/1.8 Tahoma;white-space:pre-line}#streetLoss button{border:0;border-radius:10px;background:#edbd50;color:#251c0d;padding:14px;font:700 16px Tahoma;cursor:pointer}@media(max-width:760px){#streetNotice{bottom:34%;font-size:12px;padding:10px}}';document.head.appendChild(style);
  buildSignals();Object.assign(api,{ready:true,begin,tick,filterMove,vehicles,isFailed:()=>failed,holdPerson,inspect:()=>({version:VERSION,failed,encounter:encounter?{...encounter,remaining:Math.max(0,encounter.until-clock)}:null,signals:signals.map(s=>({...s})),crossings:crossings.map(c=>({...c,signal:c.signal?.id})),people:people().map(({root,...p})=>p),vehicles:ctx.world.vehicles.map(v=>({id:v.root.uniqueId,x:v.root.position.x,z:v.root.position.z,vertical:v.vertical,dir:v.dir,velocity:v.velocity,road:v.road}))})});
  window.__egyptDebug.streetFixture=()=>({signals,crossings,roots,vehicles:ctx.world.vehicles});
  window.addEventListener('egypt-story-finished',()=>{ctx.camera.position.set(-30.5,1.72,-34.5);begin(true);});
  window.__EGYPT_STREET_LIFE={ready:true,version:VERSION};
 }
 install().catch(e=>{console.error(e);const box=document.getElementById('errorBox');box.textContent='تعذّر تجهيز الشارع: '+e.message;box.style.display='block';});
})();
