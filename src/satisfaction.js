import { BALANCE, mountain, production, workerPower, earningMultiplier, manualPower, workforceMultiplier } from './progression.js';
export { manualPower } from './progression.js';

export function clickIntensity(s,impulse) {
  return Math.min(2.2,.6+Math.log2(1+Math.max(0,impulse)/4.8)*.6+(s.boost>0?1:s.defiance/BALANCE.defianceClicks)*.4);
}
// Display values never write back to the simulation. Spending snaps immediately.
export function approachNumber(current,target,dt,reduced=false) {
  if(reduced||!Number.isFinite(current)||target<current) return target;
  const next=current+(target-current)*(-Math.expm1(-Math.max(0,dt)*14));
  return Math.min(target,Math.abs(target-next)<=Math.max(.001,Math.abs(target)*1e-9)?target:next);
}
export function ascentMilestones(before,after) {
  return [25,50,75,100].filter(n=>before<n&&after>=n);
}
export function numberMilestone(before,after) {
  if(after<1000||after<=before)return null;
  const exponent=Math.floor(Math.log10(after));
  return exponent>Math.floor(Math.log10(Math.max(999,before)))?10**exponent:null;
}
export function liveStats(s) {
  const m=mountain(s),boost=workforceMultiplier(s);
  return {click:manualPower(s),power:production(s),speed:s.boulderVelocity*m.length/100,
    distance:s.climbPushes*m.length/100,workers:s.workers.reduce((a,b)=>a+b,0),
    tiers:s.workers.map((_,i)=>workerPower(s,i)*boost),earningsMultiplier:earningMultiplier(s),boost};
}
export const FLOAT_BUDGET=16;
export class GainEffects {
  constructor(){this.items=[];this.sequence=0;}
  add(value,kind,time) {
    if(!Number.isFinite(value)||value<0||(value===0&&kind!=='click'))return;
    const recent=this.items.at(-1);
    if(recent&&recent.kind===kind&&time-recent.time<.12){recent.value+=value;return;}
    this.items.push({value,kind,time,lane:this.sequence++%5});
    if(this.items.length>FLOAT_BUDGET)this.items.shift();
  }
  active(time){this.items=this.items.filter(x=>time-x.time<1.4);return this.items;}
  clear(){this.items=[];}
}
