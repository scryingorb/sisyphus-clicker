import test from 'node:test';
import assert from 'node:assert/strict';
import {casinoRewardScale} from '../src/casino-rewards.js';
import {newState,saveState,loadState} from '../src/state.js';
import {spinEarned,resolveReel,casinoCheckpoints} from '../src/casino.js';
import {mountain,production,prestige,BALANCE} from '../src/progression.js';
import {advanceProgress,settleOffline} from '../src/simulation.js';
import {completeReveal} from '../src/reel-presentation.js';
const state=(n=9)=>Object.assign(newState(),{runSummits:n,completedClimbs:BigInt(n),workers:[100,20,4,0],spins:1});
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(a))*1e-10,`${a} != ${b}`);
const reload=s=>{let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(storage,s,1000);return loadState(storage);};
test('relief, standard and challenge use normalized mountain pace and bounded production windows',()=>{
 const rows=[7,8,9].map(n=>{const s=state(n);s.workers=[1000,1000,1000,1000];return casinoRewardScale(s);});
 for(const row of rows){close(row.windowSeconds,40*Math.sqrt(row.pace));close(row.base/row.fullValue,.012*row.pace);assert.ok(row.base>=row.fullValue*.002);assert.ok(row.base<=row.cap);}
 assert.ok(rows[0].heightPercent<rows[1].heightPercent&&rows[1].heightPercent<rows[2].heightPercent);
});
test('stable prices exclude all temporary boosts and momentum, include permanent workforce and Favor, and handle zero workers',()=>{
 const s=state(),before=casinoRewardScale(s);s.boost=12;s.goldenBoost=20;s.tollRemaining=8;s.passiveSeconds=30;s.reelRemaining=30;s.reelEffect='worker';s.reelStrength=1.2;s.blessing='hermes';s.blessingRemaining=120;s.boulderVelocity=12;s.relics=s.activeRelics=['toll','chronos'];
 assert.deepEqual(casinoRewardScale(s),before);s.divine[2]=2;close(casinoRewardScale(s).base,before.base*1.4);
 const empty=state(3);empty.workers=[0,0,0,0];const scale=casinoRewardScale(empty);assert.ok(scale.base>0&&Number.isFinite(scale.seconds));
 const huge=state(1000);huge.workers=[1000,1000,1000,1000];assert.ok(Number.isFinite(casinoRewardScale(huge).base));
});
test('reward tiers, relic and Athena modifiers remain exact and both jackpot scales beat regular triples',()=>{
 const base=casinoRewardScale(state()).base;
 const ordinary=resolveReel(state(),['coin','boulder','flame'],base,false,true),pair=resolveReel(state(),['coin','coin','flame'],base,false,true),triple=resolveReel(state(),['coin','coin','coin'],base,false,true);
 close(ordinary.total,base);close(pair.total,base*2);close(triple.total,base*4);
 const s=state();s.relics=s.activeRelics=['toll'];s.blessing='athena';s.blessingRemaining=120;const synergized=resolveReel(s,['coin','coin','coin'],base,false,true);close(synergized.total,base*4*1.15*1.1);
 const guaranteed=state();guaranteed.jackpotMeter=95;const event=casinoCheckpoints(guaranteed,0,25,casinoRewardScale(guaranteed).fullValue)[0];assert.ok(event.jackpot>=synergized.total);close(event.jackpot,Math.max(casinoRewardScale(guaranteed).fullValue*.04,base*10));
 const mega=resolveReel(state(),Array(5).fill('flame'),base,false,true);close(mega.total+mega.jackpot,base*48);
});
test('spin settlement never teleports progress; relative worker boosts flow through shared physics and expire',()=>{
 const s=state(),control=structuredClone(s),height=s.climbPushes;resolveReel(s,['coin','coin','boulder'],casinoRewardScale(s).base,false,true);assert.equal(s.climbPushes,height);close(production(s),production(control)*1.1);
 for(let i=0;i<250;i++){advanceProgress(s,.05);advanceProgress(control,.05);}assert.ok(s.climbPushes>control.climbPushes);close(production(s),production(control));
});
test('priced pending rewards and optional decisions survive reload, later mountains and prestige without repricing',()=>{
 const s=state(3);s.activeSpins=2;s.casinoTestLuck='good';const e=spinEarned(s),money=s.obols;assert.deepEqual(s.pendingReels[0].rewardScale,e.rewardScale);
 const restored=reload(s);restored.runSummits=28;restored.workers=[1000,1000,1000,1000];assert.equal(restored.pendingReels[0].total,e.total);assert.deepEqual(restored.pendingReels[0].rewardScale,e.rewardScale);assert.ok(completeReveal(restored,e));assert.equal(completeReveal(restored,e),false);assert.equal(restored.obols,money);
 restored.runSummits=BALANCE.prestigeAt;assert.ok(prestige(restored));assert.equal(restored.obols,0);
});
test('offline cap and old pending saves keep original settled amounts; scaling never mutates priced snapshots',()=>{
 const s=state(3);const event=spinEarned(s);const saved=reload(s),scale=structuredClone(saved.pendingReels[0].rewardScale);saved.lastSeen=1000;const result=settleOffline(saved,1000+86400000);assert.equal(result.seconds,28800);assert.deepEqual(saved.pendingReels[0].rewardScale,scale);assert.equal(saved.pendingReels[0].total,event.total);
 delete s.pendingReels[0].rewardScale;const legacy=reload(s);assert.equal(legacy.pendingReels[0].total,event.total);assert.equal(legacy.pendingReels[0].rewardScale,undefined);
});
