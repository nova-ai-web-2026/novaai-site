import {STRINGS,MISSION,SHOP,WORLD} from './data.js';
import {TimeSystem,EconomySystem,MissionSystem,TrafficSystem,WitnessSystem,PoliceSystem,SaveSystem,makeSnapshot,restoreSnapshot,uiTextForMission} from './systems.js';
import {createWorld,updatePedestrians,updateTraffic,updatePolice} from './world.js';

const B=window.BABYLON;
const $=id=>document.getElementById(id);
const canvas=$('game');
const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true});
const scene=new B.Scene(engine);
scene.gravity=new B.Vector3(0,-.35,0);

const hemi=new B.HemisphericLight('hemi',new B.Vector3(0,1,0),scene);hemi.intensity=.88;
const sun=new B.DirectionalLight('sun',new B.Vector3(-.5,-1,.35),scene);sun.position=new B.Vector3(30,45,-25);sun.intensity=1.1;
const shadow=new B.ShadowGenerator(1024,sun);shadow.useBlurExponentialShadowMap=true;shadow.blurKernel=24;

const world=createWorld(scene);
[world.player,...world.pedestrians,...world.traffic,world.driveCar].forEach(m=>shadow.addShadowCaster(m));
world.ground.receiveShadows=true;

const camera=new B.FollowCamera('camera',new B.Vector3(0,5,-8),scene);camera.radius=7;camera.heightOffset=3;camera.rotationOffset=180;camera.cameraAcceleration=.08;camera.maxCameraSpeed=12;camera.lockedTarget=world.player;scene.activeCamera=camera;

const timeSystem=new TimeSystem(WORLD.startTime);
const economy=new EconomySystem();
const mission=new MissionSystem();
const trafficSystem=new TrafficSystem();
const witnessSystem=new WitnessSystem();
const policeSystem=new PoliceSystem();
const saveSystem=new SaveSystem();

const keys=new Set();
let started=false,inVehicle=false,lastInteraction=0,lastNpcIncident=0,dialogTimer=0,toastTimer=0,breakfastBought=false;
let stamina=100,health=100;

window.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE'&&started)interact();if(e.code==='KeyR'&&started)resetMission();if(e.code==='F5'&&started){e.preventDefault();saveGame();}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('resize',()=>engine.resize());

function dist2D(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function arabicDigits(v){return String(v).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);}
function showToast(text,secs=2.4){$('toast').textContent=text;$('toast').classList.add('show');toastTimer=secs;}
function showDialogue(speaker,text,secs=3.2){$('speaker').textContent=speaker;$('dialogueText').textContent=text;$('dialogue').hidden=false;dialogTimer=secs;}
function showNpcLine(name,text){showDialogue(name,text,2.2);}
function hidePrompt(){$('prompt').classList.remove('show');$('prompt').textContent='';}
function showPrompt(text){$('prompt').textContent=text;$('prompt').classList.add('show');}

function updateHud(){
  $('money').textContent=`${arabicDigits(economy.cash)} ج`;$('health').textContent=`${arabicDigits(Math.round(health))}٪`;$('stamina').textContent=`${arabicDigits(Math.round(stamina))}٪`;$('heat').textContent=policeSystem.label();
  const [h,m]=timeSystem.label.split(':');$('time').textContent=`${arabicDigits(h)}:${arabicDigits(m)}`;$('day').textContent=`اليوم ${arabicDigits(timeSystem.day)}`;
  $('missionTitle').textContent=mission.completed?STRINGS.complete:MISSION.title;$('objective').textContent=uiTextForMission(mission);$('objectiveProgress').style.setProperty('--p',`${mission.progress()}%`);
}

function applyDayNight(){
  const h=timeSystem.hour;const daylight=Math.max(.12,Math.sin(((h-6)/12)*Math.PI));sun.intensity=.25+daylight*.95;hemi.intensity=.28+daylight*.62;
  scene.clearColor=new B.Color4(.08+.45*daylight,.12+.56*daylight,.18+.62*daylight,1);
  const night=h>=18.5||h<6;for(const lamp of world.lightPoles){if(!lamp.material)continue;lamp.material.emissiveColor=night?new B.Color3(1,.72,.35):new B.Color3(0,0,0);}
}

function playerMove(dt){
  const p=world.player;
  if(inVehicle){
    const car=world.driveCar;const accel=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);const steer=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
    car.metadata.speed+=(accel*8-car.metadata.speed*1.8)*dt;car.metadata.speed=Math.max(-4,Math.min(9,car.metadata.speed));if(Math.abs(car.metadata.speed)>.2)car.metadata.heading+=steer*dt*1.6*Math.sign(car.metadata.speed);
    const dir=new B.Vector3(Math.sin(car.metadata.heading),0,Math.cos(car.metadata.heading));car.moveWithCollisions(dir.scale(car.metadata.speed*dt));car.rotation.y=car.metadata.heading;p.position.copyFrom(car.position);camera.lockedTarget=car;return;
  }
  const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);const z=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);const running=keys.has('ShiftLeft')||keys.has('ShiftRight');let speed=running&&stamina>1?5.2:3.1;
  if(x||z){const v=new B.Vector3(x,0,z).normalize().scale(speed*dt);p.moveWithCollisions(v);p.rotation.y=Math.atan2(v.x,v.z);if(running)stamina=Math.max(0,stamina-dt*12);}else stamina=Math.min(100,stamina+dt*9);camera.lockedTarget=p;
}

function updateMission(){
  const p=inVehicle?world.driveCar.position:world.player.position;const step=mission.current()?.id;if(!step||mission.failed||mission.completed)return;
  if(step==='leave_apartment'&&p.z>-10.7){mission.advance(step);showToast('تمام. دلوقتي روح للمحل.');}
  else if(step==='reach_shop_side'&&dist2D(p,{x:WORLD.crossingX,z:-5})<3.4){mission.advance(step);showToast('استنى إشارة المشاة تبقى خضرا.');}
  else if(step==='cross_safely'){
    if(p.z>4.2&&Math.abs(p.x-WORLD.crossingX)<5){if(trafficSystem.pedestrianGreen){mission.advance(step);showToast('عدّيت بأمان. كمل للمحل.');}else{mission.fail('عدّيت والإشارة مش سامحة');showToast('المهمة فشلت — عدّيت والإشارة مش سامحة',4);}}
  }
  else if(step==='return_home'&&dist2D(p,WORLD.homeReturn)<4){mission.advance(step);economy.earn(MISSION.reward);showToast(`المهمة خلصت — كسبت ${MISSION.reward} جنيه`,4);saveGame(false);}
}

function nearestInteraction(){
  const p=inVehicle?world.driveCar.position:world.player.position;
  if(inVehicle)return {type:'car_exit',distance:0};
  const carD=dist2D(p,world.driveCar.position);if(carD<2.3)return {type:'car',distance:carD};
  const doorD=dist2D(p,world.shopDoor.position);if(doorD<2.2)return {type:'shop',distance:doorD};
  return null;
}

function interact(){
  const now=performance.now();if(now-lastInteraction<250)return;lastInteraction=now;const i=nearestInteraction();if(!i)return;
  if(i.type==='car'){inVehicle=true;world.player.setEnabled(false);world.driveCar.metadata.speed=0;showToast('ركبت العربية');}
  else if(i.type==='car_exit'){inVehicle=false;world.player.setEnabled(true);world.player.position.copyFrom(world.driveCar.position.add(new B.Vector3(2,0,0)));camera.lockedTarget=world.player;showToast('نزلت من العربية');}
  else if(i.type==='shop')openShop();
}

function openShop(){
  if(mission.current()?.id==='enter_shop'){mission.advance('enter_shop');showDialogue('عم صابر','صباح الفل يا باشا، أطلبلك إيه؟',4);}
  const body=$('modalBody');body.innerHTML=`<p><strong>${SHOP.cashier}:</strong> صباح الفل يا باشا، أطلبلك إيه؟</p><p>${SHOP.items[0].name} — <strong>${SHOP.items[0].price} جنيه</strong></p><button id="buyBreakfast" class="primary">هات الفطار</button>`;
  $('modalTitle').textContent=SHOP.name;$('modal').hidden=false;
  $('buyBreakfast').onclick=()=>{if(breakfastBought){showToast('الفطار معاك خلاص');return;}if(!economy.pay(SHOP.items[0].price)){showToast('معاكش فلوس كفاية');return;}breakfastBought=true;if(mission.current()?.id==='buy_breakfast')mission.advance('buy_breakfast');$('modal').hidden=true;showDialogue('عم صابر','اتفضل يا باشا. خلي بالك من نفسك وإنت راجع.',4);showToast('خدت الفطار — ارجع ناحية البيت');};
}

function updatePrompt(){const i=nearestInteraction();if(!i){hidePrompt();return;}if(i.type==='car')showPrompt(STRINGS.enterCar);else if(i.type==='car_exit')showPrompt(STRINGS.exitCar);else if(i.type==='shop')showPrompt(STRINGS.shop);}

function detectIncidents(dt){
  if(!inVehicle)return;const now=performance.now();for(const p of world.pedestrians){if(dist2D(p.position,world.driveCar.position)<1.4&&now-lastNpcIncident>5000){lastNpcIncident=now;showNpcLine(p.metadata.name,'إيه يا عم براحة!');witnessSystem.report('reckless_driving',world.driveCar.position,1);showToast('حد بلغ عن سواقة متهورة');break;}}
}

function resetMission(){mission.reset();breakfastBought=false;inVehicle=false;world.player.setEnabled(true);world.player.position.set(WORLD.playerStart.x,WORLD.playerStart.y,WORLD.playerStart.z);world.driveCar.position.set(-7,.82,-7);world.driveCar.metadata.speed=0;policeSystem.heat=0;policeSystem.active=false;camera.lockedTarget=world.player;showToast('بدأت المهمة من الأول');}

function saveGame(notify=true){saveSystem.save(makeSnapshot({player:world.player,mission,economy,time:timeSystem,police:policeSystem,inVehicle}));if(notify)showToast(STRINGS.save);}
function loadGame(){const s=saveSystem.load();if(!s){$('bootStatus').textContent=STRINGS.noSave;return false;}restoreSnapshot(s,{player:world.player,mission,economy,time:timeSystem,police:policeSystem});breakfastBought=mission.index>=5||mission.completed;inVehicle=false;world.player.setEnabled(true);showToast(STRINGS.load);return true;}

function start(load=false){if(load&&!loadGame())return;started=true;$('boot').hidden=true;$('hud').hidden=false;canvas.focus();updateHud();}
$('newGame').onclick=()=>{resetMission();start(false);};
$('continueGame').onclick=()=>start(true);
$('saveBtn').onclick=()=>saveGame();
$('howTo').onclick=()=>{$('modalTitle').textContent='التحكم';$('modalBody').innerHTML='<p><strong>WASD / الأسهم:</strong> حركة<br><strong>Shift:</strong> جري<br><strong>E:</strong> تفاعل أو ركوب/نزول العربية<br><strong>R:</strong> إعادة المهمة<br><strong>F5:</strong> حفظ سريع</p>';$('modal').hidden=false;};
$('closeModal').onclick=()=>{$('modal').hidden=true;};

engine.runRenderLoop(()=>{
  const dt=Math.min(engine.getDeltaTime()/1000,.05);
  if(started){timeSystem.update(dt);trafficSystem.update(dt);world.trafficLight.set(trafficSystem.carGreen);playerMove(dt);updatePedestrians(world.pedestrians,dt,world.player,showNpcLine);updateTraffic(world.traffic,dt,trafficSystem);detectIncidents(dt);witnessSystem.update(dt,policeSystem);policeSystem.update(dt,inVehicle?world.driveCar.position:world.player.position);updatePolice(world,policeSystem,dt);updateMission();updatePrompt();applyDayNight();updateHud();if(dialogTimer>0&&(dialogTimer-=dt)<=0)$('dialogue').hidden=true;if(toastTimer>0&&(toastTimer-=dt)<=0)$('toast').classList.remove('show');}
  scene.render();
});

window.addEventListener('beforeunload',()=>{if(started)saveGame(false);});
