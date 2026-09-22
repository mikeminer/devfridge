export const STEP = 1 / 60;
export const PICKUPS = [[-5,-5],[0,-6],[5,-5],[-5,0],[5,0],[0,3]];
export const VENTS = [[-2.5,-2],[2.5,1],[2,-4]];
export const HOME = {x:0,z:6};
export function newRun() { return {x:0,z:6,vx:0,vz:0,time:75,elapsed:0,cargo:0,collected:Array(6).fill(false),status:'playing',cooldown:0,hits:0,score:0,event:''}; }
export function step(s,input,dt=STEP) {
  if(s.status!=='playing')return;
  s.event='';s.elapsed+=dt;s.time=Math.max(0,s.time-dt);s.cooldown=Math.max(0,s.cooldown-dt);
  const norm=Math.hypot(input.x,input.z)||1, accel=input.brake?4:16, damping=Math.exp(-(input.brake?12:4)*dt);
  s.vx=(s.vx+input.x/norm*accel*dt)*damping;s.vz=(s.vz+input.z/norm*accel*dt)*damping;
  s.x=Math.max(-6.4,Math.min(6.4,s.x+s.vx*dt));s.z=Math.max(-6.7,Math.min(6.7,s.z+s.vz*dt));
  for(let i=0;i<PICKUPS.length;i++)if(!s.collected[i]&&Math.hypot(s.x-PICKUPS[i][0],s.z-PICKUPS[i][1])<.72){s.collected[i]=true;s.cargo++;s.event=s.cargo===6?'All six! Return to the striped loading bay.':'Cold crate collected. Keep moving.';}
  if(!s.cooldown&&VENTS.some(([x,z])=>Math.hypot(s.x-x,s.z-z)<.8)){s.time=Math.max(0,s.time-5);s.cooldown=2;s.hits++;s.event='Heat vent! Five seconds of ice lost.';}
  if(s.time<=0){s.status='lost';s.event='The ice ran out.';}
  else if(s.cargo===6&&Math.hypot(s.x-HOME.x,s.z-HOME.z)<.9){s.status='won';s.score=Math.round(s.time*100)+600;s.event='Delivery complete.';}
}
