import {MISSION,STRINGS} from './data.js';

export class TimeSystem{
  constructor(startHour=7.75){this.hour=startHour;this.day=1;}
  update(dt){this.hour+=dt*0.012;if(this.hour>=24){this.hour-=24;this.day++;}}
  get label(){const h=Math.floor(this.hour);const m=Math.floor((this.hour-h)*60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
}

export class EconomySystem{
  constructor(){this.cash=300;this.digital=1200;}
  canAfford(v){return this.cash>=v;} pay(v){if(!this.canAfford(v))return false;this.cash-=v;return true;} earn(v){this.cash+=v;}
}

export class MissionSystem{
  constructor(){this.reset();}
  reset(){this.index=0;this.completed=false;this.failed=false;this.reason='';}
  current(){return MISSION.steps[Math.min(this.index,MISSION.steps.length-1)];}
  advance(id){if(this.completed||this.failed)return false;const s=this.current();if(s&&s.id===id){this.index++;if(this.index>=MISSION.steps.length)this.completed=true;return true;}return false;}
  fail(reason){this.failed=true;this.reason=reason;}
  progress(){return Math.round((Math.min(this.index,MISSION.steps.length)/MISSION.steps.length)*100);}
}

export class TrafficSystem{
  constructor(){this.t=0;this.carGreen=true;}
  update(dt){this.t=(this.t+dt)%20;this.carGreen=this.t<12;}
  get pedestrianGreen(){return !this.carGreen;}
}

export class WitnessSystem{
  constructor(){this.pending=[];}
  report(kind,pos,severity=1){this.pending.push({kind,pos:{x:pos.x,z:pos.z},severity,delay:2+Math.random()*3});}
  update(dt,police){for(const r of this.pending)r.delay-=dt;const ready=this.pending.filter(r=>r.delay<=0);this.pending=this.pending.filter(r=>r.delay>0);for(const r of ready)police.receiveReport(r);}
}

export class PoliceSystem{
  constructor(){this.heat=0;this.lastKnown=null;this.cooldown=0;this.active=false;}
  receiveReport(r){this.heat=Math.min(3,this.heat+r.severity);this.lastKnown=r.pos;this.cooldown=20+this.heat*12;this.active=true;}
  update(dt,playerPos){if(!this.active)return;this.cooldown-=dt;const dx=playerPos.x-(this.lastKnown?.x||0),dz=playerPos.z-(this.lastKnown?.z||0);const dist=Math.hypot(dx,dz);if(dist>28)this.cooldown-=dt*1.5;if(this.cooldown<=0){this.heat=Math.max(0,this.heat-1);this.cooldown=this.heat?18:0;if(!this.heat)this.active=false;}}
  label(){return ['هادية','تنبيه','دوريات','بحث مكثف'][this.heat]||'هادية';}
}

export class SaveSystem{
  constructor(key='shaware3-alnoor-vslice'){this.key=key;}
  save(state){localStorage.setItem(this.key,JSON.stringify(state));}
  load(){try{return JSON.parse(localStorage.getItem(this.key)||'null');}catch{return null;}}
  exists(){return !!localStorage.getItem(this.key);}
}

export function makeSnapshot({player,mission,economy,time,police,inVehicle}){
  return {version:1,player:{x:player.position.x,y:player.position.y,z:player.position.z},missionIndex:mission.index,missionCompleted:mission.completed,cash:economy.cash,time:time.hour,day:time.day,heat:police.heat,inVehicle:!!inVehicle};
}

export function restoreSnapshot(snapshot,{player,mission,economy,time,police}){
  if(!snapshot)return false;
  player.position.set(snapshot.player.x,snapshot.player.y,snapshot.player.z);
  mission.index=snapshot.missionIndex||0;mission.completed=!!snapshot.missionCompleted;mission.failed=false;
  economy.cash=Number.isFinite(snapshot.cash)?snapshot.cash:300;
  time.hour=Number.isFinite(snapshot.time)?snapshot.time:7.75;time.day=snapshot.day||1;
  police.heat=snapshot.heat||0;police.active=police.heat>0;return true;
}

export function uiTextForMission(mission){
  if(mission.failed)return `${STRINGS.failed}: ${mission.reason}`;
  if(mission.completed)return STRINGS.complete;
  return mission.current()?.label||MISSION.title;
}
