(() => {
 'use strict';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function slide(from,delta,people,radius=.72){
  let end={x:from.x+delta.x,z:from.z+delta.z},hit=null;
  for(const p of people){
   const dx=end.x-from.x,dz=end.z-from.z,len=dx*dx+dz*dz;
   const t=len?Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.z-from.z)*dz)/len)):0;
   if(Math.hypot(from.x+dx*t-p.x,from.z+dz*t-p.z)>=radius)continue;
   if(distance(end,p)>distance(from,p)&&distance(from,p)<radius)continue;
   hit=p;const nx=from.x-p.x,nz=from.z-p.z,n=Math.hypot(nx,nz)||1,into=Math.min(0,(dx*nx+dz*nz)/n);
   end={x:from.x+dx-into*nx/n,z:from.z+dz-into*nz/n};
   if(distance(end,p)<radius){const ex=end.x-p.x,ez=end.z-p.z,e=Math.hypot(ex,ez)||1;end={x:p.x+ex/e*radius,z:p.z+ez/e*radius};}
   // A swept hit also blocks a complete one-frame traversal through the person.
   if(distance(from,p)>=radius&&t>0&&t<1&&distance(end,from)>Math.sqrt(len)*.95)end={x:from.x,z:from.z};
  }
  return {delta:{x:end.x-from.x,z:end.z-from.z},hit};
 }
 const duration={drive:10,amber:3,clear:2,walk:12,finish:2};
 function signalStep(s,dt,peopleInside=false,carsInside=false){
  s.elapsed+=dt;
  if(s.elapsed<duration[s.phase])return s;
  if(s.phase==='clear'&&carsInside)return s;
  if(s.phase==='walk'&&peopleInside)return s;
  s.phase={drive:'amber',amber:'clear',clear:'walk',walk:'finish',finish:'drive'}[s.phase];s.elapsed=0;return s;
 }
 function vehicleStep(v,others,stopLines,people,dt){
  const axis=v.vertical?'z':'x',side=v.vertical?'x':'z',along=v[axis];let gap=Infinity;
  for(const line of stopLines){const d=(line-along)*v.dir-v.length/2;if(d>=-.03)gap=Math.min(gap,Math.max(0,d));}
  for(const o of others){if(o===v||o.vertical!==v.vertical||o.dir!==v.dir||Math.abs(o[side]-v[side])>.4)continue;const d=(o[axis]-along)*v.dir-(v.length+o.length)/2-1.1;if(d>-.1)gap=Math.min(gap,Math.max(0,d));}
  for(const p of people){if(Math.abs(p[side]-v[side])>v.width/2+.55)continue;const d=(p[axis]-along)*v.dir-v.length/2-.85;if(d>=-.1)gap=Math.min(gap,Math.max(0,d));}
  const desired=Math.min(v.cruise,Math.sqrt(Math.max(0,2*4.5*gap))),change=(desired>v.velocity?2.4:5.5)*dt;
  v.velocity+=Math.max(-change,Math.min(change,desired-v.velocity));
  const travel=Math.min(v.velocity*dt,gap);if(travel>=gap-.01)v.velocity=0;
  const previous=along;v[axis]+=travel*v.dir;return {previous,current:v[axis],travel,gap};
 }
 function vehicleHit(v,previous,player){const axis=v.vertical?'z':'x',side=v.vertical?'x':'z';return Math.abs(player[side]-v[side])<v.width/2+.3&&player[axis]>Math.min(previous,v[axis])-v.length/2-.3&&player[axis]<Math.max(previous,v[axis])+v.length/2+.3;}
 globalThis.EgyptStreetRules={distance,slide,signalStep,vehicleStep,vehicleHit};
})();
