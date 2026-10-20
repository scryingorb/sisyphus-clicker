import { BALANCE, heightRate, mountain, production, credit, discover, cosmeticUnlocked, COLLECTION, WORKERS, workerUnlocked } from './progression.js';
import { finishClimb, saveState } from './state.js';

// A workforce is a rope-and-winch system: it supports the weight and sets a
// bounded uphill target velocity. Clicks still add momentum above that target.
// Both live and offline settlement use this same integrator and resistance.
export function advanceProgress(s,dt) {
  s.clickCooldown=Math.max(0,s.clickCooldown-dt);
  s.boost=Math.max(0,s.boost-dt);
  s.defianceCooldown=Math.max(0,s.defianceCooldown-dt);
  if(s.isResetting) {
    s.returnRemaining=(s.returnRemaining||2.9)-dt;
    if(s.returnRemaining<=1e-9) { finishClimb(s); return true; }
    return false;
  }
  const m=mountain(s), scale=100/m.length, power=production(s);
  s.timeSincePush=Math.min(.35,s.timeSincePush+dt);
  const gravity=4*m.gravity/(1+.2*s.upgrades[1])*(.25+.75*s.timeSincePush/.35)*scale;
  const target=power>0?Math.min(12,power/m.resistance*scale):-gravity/.35;
  const old=s.boulderVelocity, decay=Math.exp(-.35*dt);
  s.boulderVelocity=Math.max(-8*scale,Math.min(12,target+(old-target)*decay));
  s.climbPushes=Math.max(0,Math.min(100,s.climbPushes+(old+s.boulderVelocity)*.5*dt));
  if(s.climbPushes===0) s.boulderVelocity=Math.max(0,s.boulderVelocity);
  if(s.climbPushes>s.highWater) {
    credit(s,(s.climbPushes-s.highWater)/scale*heightRate(s)); s.highWater=s.climbPushes;
  }
  if(s.climbPushes>=100) { s.isResetting=true; s.boulderVelocity=0; s.returnRemaining=2.9; }
  return false;
}
export function settleOffline(s,now=Date.now()) {
  const seconds=Number.isFinite(now)&&s.lastSeen>0?Math.max(0,Math.min(BALANCE.offlineCap,(now-s.lastSeen)/1000)):0;
  const before=s.obols, climbs=s.completedClimbs, discoveries=[...s.discoveries], cosmetics=COLLECTION.map(c=>cosmeticUnlocked(s,c.id)), unlocked=WORKERS.map((_,i)=>workerUnlocked(s,i));
  // At most 576,000 coarse steps, independent of frame rate and elapsed days.
  // No workers means no offline manual pushes, but existing momentum may coast.
  for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=.05) {
    if(!s.workers.some(Boolean)&&s.climbPushes===0&&!s.isResetting&&s.boulderVelocity===0) { s.boost=Math.max(0,s.boost-(seconds-elapsed));s.defianceCooldown=Math.max(0,s.defianceCooldown-(seconds-elapsed));s.clickCooldown=Math.max(0,s.clickCooldown-(seconds-elapsed));break; }
    advanceProgress(s,Math.min(.05,seconds-elapsed));
  }
  s.lastSeen=Number.isFinite(now)?Math.max(now,s.lastSeen):s.lastSeen;
  discover(s);
  return { seconds, obols:s.obols-before, mountains:Number(s.completedClimbs-climbs), unlocks:[...s.discoveries.filter(x=>!discoveries.includes(x)),...COLLECTION.filter((x,i)=>!cosmetics[i]&&cosmeticUnlocked(s,x.id)).map(x=>x.name),...WORKERS.filter((x,i)=>!unlocked[i]&&workerUnlocked(s,i)).map(x=>x.name)] };
}
// Commit settlement before exposing it. Failed writes leave the original intact.
export function settleAndSave(s,storage,now=Date.now()) {
  const next=structuredClone(s), summary=settleOffline(next,now);
  if(!saveState(storage,next,Math.max(now,next.lastSeen))) return {seconds:0,obols:0,mountains:0,unlocks:[],failed:true};
  Object.assign(s,next); return summary;
}
