import { casinoCheckpoints, tickCasino, spinProduction } from './casino.js';
import { BALANCE, heightRate, mountain, production, credit, discover, cosmeticUnlocked, COLLECTION, WORKERS, workerUnlocked } from './progression.js';
import { finishClimb, saveState } from './state.js';
import { dismissGolden } from './golden.js';
import { checkpointRelic, hasRelic } from './relics.js';

// A workforce is a rope-and-winch system: it supports the weight and sets a
// bounded uphill target velocity. Clicks still add momentum above that target.
// Both live and offline settlement use this same integrator and resistance.
export function advanceProgress(s,dt,metrics) {
  tickCasino(s,dt);
  s.clickCooldown=Math.max(0,s.clickCooldown-dt);
  s.boost=Math.max(0,s.boost-dt);
  s.goldenBoost=Math.max(0,(s.goldenBoost||0)-dt);
  s.tollRemaining=Math.max(0,(s.tollRemaining||0)-dt);
  s.defianceCooldown=Math.max(0,s.defianceCooldown-dt);
  spinProduction(s,dt);
  if(s.isResetting) {
    s.passiveSeconds=0;
    s.returnRemaining=(s.returnRemaining||2.9)-dt;
    if(s.returnRemaining<=1e-9) { finishClimb(s); return true; }
    return false;
  }
  const m=mountain(s), scale=100/m.length, power=production(s);
  if(metrics)metrics.work+=power*dt;
  s.timeSincePush=Math.min(.35,s.timeSincePush+dt);
  const gravity=4*m.gravity/(1+.2*s.upgrades[1])*(.25+.75*s.timeSincePush/.35)*scale;
  const target=power>0?Math.min(12,power/m.resistance*scale):-gravity/.35;
  const old=s.boulderVelocity, decay=Math.exp(-.35*dt);
  s.boulderVelocity=Math.max(-8*scale,Math.min(12,target+(old-target)*decay));

  const previousHeight=s.climbPushes;
  s.climbPushes=Math.max(0,Math.min(100,s.climbPushes+(old+s.boulderVelocity)*.5*dt));
  settleClimbingHeight(s,previousHeight,m,true);
  s.passiveSeconds=hasRelic(s,'chronos')&&s.climbPushes>previousHeight?Math.min(30,(s.passiveSeconds||0)+dt):0;
  return false;
}
// Shared checkpoint, high-water and transition path for physics and explicit casino distance.
function settleClimbingHeight(s,previousHeight,m,payHeight){
 const scale=100/m.length;
 s.lifetimeDistance=Math.min(BALANCE.maxValue,(s.lifetimeDistance||0)+Math.max(0,s.climbPushes-previousHeight)/scale);
 if(s.climbPushes===0)s.boulderVelocity=Math.max(0,s.boulderVelocity);
 if(s.climbPushes>s.highWater){
  checkpointRelic(s,s.highWater,s.climbPushes);
  casinoCheckpoints(s,s.highWater,s.climbPushes,m.length*heightRate(s)*(1+.2*s.divine[2]));
  if(payHeight)credit(s,(s.climbPushes-s.highWater)/scale*heightRate(s));
  s.highWater=s.climbPushes;
 }
 if(s.climbPushes>=100){s.isResetting=true;s.boulderVelocity=0;s.returnRemaining=2.9;}
}
export const CASINO_PUSH_REWARD_FACTOR=.5;
export function applyCasinoPush(s,payout,fullMountainValue){
 const m=mountain(s),from=s.climbPushes;
 // A reward proportional to the settled spin (including jackpot/relic bonuses),
 // expressed against that spin's stable mountain value. Never triggered by input.
 const valid=Number.isFinite(payout)&&payout>0&&Number.isFinite(fullMountainValue)&&fullMountainValue>0;
 const requestedPercent=valid?Math.min(18,Math.max(.25,payout/fullMountainValue*100*CASINO_PUSH_REWARD_FACTOR)):0;
 const percent=s.isResetting||s.runSummits<3||s.casinoOffline?0:Math.min(100-from,requestedPercent);
 const push={mountain:s.runSummits+1,from,to:from+percent,percent,distance:m.length*percent/100,requestedPercent};
 if(percent>0){s.climbPushes=push.to;settleClimbingHeight(s,from,m,false);}
 // Obol payout is already settled. Casino distance never earns height Obols a second time.
 return push;
}
export function settleOffline(s,now=Date.now()) {
  const wasOffline=s.casinoOffline;s.casinoOffline=true;
  const seconds=Number.isFinite(now)&&s.lastSeen>0?Math.max(0,Math.min(BALANCE.offlineCap,(now-s.lastSeen)/1000)):0;
  const spinsBefore=s.spins;
  const before=s.obols, climbs=s.completedClimbs, discoveries=[...s.discoveries], cosmetics=COLLECTION.map(c=>cosmeticUnlocked(s,c.id)), unlocked=WORKERS.map((_,i)=>workerUnlocked(s,i));
  if(seconds>0&&s.goldenWindow>0){
    if(seconds>=s.goldenWindow)dismissGolden(s);
    else s.goldenWindow-=seconds;
  }
  // At most 576,000 coarse steps, independent of frame rate and elapsed days.
  // No workers means no offline manual pushes, but existing momentum may coast.
  for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=.05) {
    if(!s.workers.some(Boolean)&&s.climbPushes===0&&!s.isResetting&&s.boulderVelocity===0) { tickCasino(s,seconds-elapsed);s.tollRemaining=Math.max(0,(s.tollRemaining||0)-(seconds-elapsed));s.passiveSeconds=0;s.boost=Math.max(0,s.boost-(seconds-elapsed));s.goldenBoost=Math.max(0,s.goldenBoost-(seconds-elapsed));s.defianceCooldown=Math.max(0,s.defianceCooldown-(seconds-elapsed));s.clickCooldown=Math.max(0,s.clickCooldown-(seconds-elapsed));break; }
    advanceProgress(s,Math.min(.05,seconds-elapsed));
  }
  s.lastSeen=Number.isFinite(now)?Math.max(now,s.lastSeen):s.lastSeen;
  if(wasOffline===undefined)delete s.casinoOffline;else s.casinoOffline=wasOffline;
  discover(s);
  return { seconds, spins:s.spins-spinsBefore,availableSpins:s.spins, obols:s.obols-before, mountains:Number(s.completedClimbs-climbs), unlocks:[...s.discoveries.filter(x=>!discoveries.includes(x)),...COLLECTION.filter((x,i)=>!cosmetics[i]&&cosmeticUnlocked(s,x.id)).map(x=>x.name),...WORKERS.filter((x,i)=>!unlocked[i]&&workerUnlocked(s,i)).map(x=>x.name)] };
}
// Commit settlement before exposing it. Failed writes leave the original intact.
export function settleAndSave(s,storage,now=Date.now()) {
  const next=structuredClone(s), summary=settleOffline(next,now);
  if(!saveState(storage,next,Math.max(now,next.lastSeen))) return {seconds:0,obols:0,mountains:0,unlocks:[],failed:true};
  Object.assign(s,next); return summary;
}
