import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {spinEarned,rollSymbols,classifyRoll,reelOdds,COMBINATIONS} from '../src/casino.js';
import {applyCasinoPush,advanceProgress,settleOffline,CASINO_PUSH_REWARD_FACTOR} from '../src/simulation.js';
import {mountain,prestige} from '../src/progression.js';
import {completeReveal} from '../src/reel-presentation.js';
import {spinMilestones} from '../src/casino-milestones.js';
const state=(n=3)=>Object.assign(newState(),{runSummits:n,completedClimbs:BigInt(n),spins:1,spinClaims:spinMilestones().map(m=>m.id)});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a)),`${a} != ${b}`);
const reload=s=>{let raw;const store={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(store,s,1000);return loadState(store);};
function select(s,kind){for(let seed=0;seed<100000;seed++){const probe={...s,casinoSeed:seed};if(classifyRoll(rollSymbols(probe,false,true)).kind===kind){s.casinoSeed=seed;return;}}throw Error('Missing tier');}
test('real eight-symbol odds meet target and successful payouts shift expected value rather than inflate every spin',()=>{
 const odds=reelOdds();assert.ok(1-odds.unmatched>=.75&&1-odds.unmatched<=.8);
 close(odds.unmatched,(8*7*6*5*4/8**5)*.997);close(odds.five,.003+.997/8**4);
 close(Object.keys(COMBINATIONS).reduce((sum,k)=>sum+odds[k],0),1);
 const expected=Object.entries(COMBINATIONS).reduce((sum,[k,v])=>sum+odds[k]*v.factor,0);assert.ok(expected>4.2&&expected<4.4);
 assert.ok(odds.pair+odds.twoPair>odds.triple+odds.fullHouse+odds.four+odds.five);
 const s=state(),counts=Object.fromEntries(Object.keys(COMBINATIONS).map(k=>[k,0]));
 for(let i=0;i<50000;i++)counts[classifyRoll(rollSymbols(s,false,true)).kind]++;
 for(const k of Object.keys(COMBINATIONS))assert.ok(Math.abs(counts[k]/50000-odds[k])<.006,k);
});
test('ascent rewards scale with payout and mountain value, with an 18 percent cap',()=>{
 for(const n of [3,7,9,15,27])for(const share of [0,.001,.006,.012,.04,.1]){
  const s=state(n),m=mountain(s),fullValue=10000;
  const push=applyCasinoPush(s,fullValue*share,fullValue),expected=share>0?Math.min(18,Math.max(.25,share*100*CASINO_PUSH_REWARD_FACTOR)):0;
  close(push.percent,expected);close(s.climbPushes,expected);close(push.distance,m.length*expected/100);close(s.lifetimeDistance,push.distance);assert.equal(s.obols,0);assert.equal(s.highWater,s.climbPushes);
 }
 for(const [payout,value] of [[0,100],[-1,100],[NaN,100],[Infinity,100],[100,0],[100,NaN],[100,Infinity]])assert.equal(applyCasinoPush(state(),payout,value).percent,0);
});
test('same roll awards more ascent for larger winnings including jackpots and relic synergy',()=>{
 const plain=state();select(plain,'pair');const enhanced=structuredClone(plain),jackpot=structuredClone(plain);
 enhanced.relics=['atlas','toll','zeus','chronos'];enhanced.activeRelics=[...enhanced.relics];enhanced.blessing='athena';enhanced.blessingRemaining=120;
 jackpot.jackpotMeter=99;
 const a=spinEarned(plain),b=spinEarned(enhanced),c=spinEarned(jackpot);
 assert.deepEqual(a.symbols,b.symbols);assert.deepEqual(a.symbols,c.symbols);
 assert.ok(b.total>a.total);assert.ok(b.push.percent>a.push.percent);assert.ok(c.jackpot>0);assert.ok(c.push.percent>a.push.percent);
 for(const e of [a,b,c])close(e.push.percent,Math.min(18,Math.max(.25,(e.total+e.jackpot)/e.rewardScale.fullValue*50)));
 const consolation=state();consolation.casinoTestLuck='poor';const e=spinEarned(consolation);assert.equal(e.combination,'unmatched');assert.ok(e.push.percent>0&&e.push.percent<a.push.percent);
});
test('earned spin crossing a checkpoint pays its burst and checkpoint once, without duplicate height Obols or recursive pushes',()=>{
 const s=state();s.climbPushes=s.highWater=24.8;select(s,'pair');const e=spinEarned(s);
 close(e.push.percent,1.8);close(s.climbPushes,26.6);assert.equal(s.pendingReels.length,2);assert.equal(s.casinoRolls,2);assert.equal(s.spinEnergy,15);assert.equal(s.spins,0);
 close(s.obols,s.pendingReels.reduce((n,r)=>n+r.total+r.jackpot,0));assert.equal(s.pendingReels[1].push,undefined);assert.ok(s.casinoMask&1);
 const mask=s.casinoMask,rolls=s.casinoRolls;s.climbPushes=24.9;applyCasinoPush(s,6,1000);assert.equal(s.casinoMask,mask);assert.equal(s.casinoRolls,rolls);
});
test('surges clip at summit and use the existing return transition; no new spin during reset',()=>{
 const s=state();s.climbPushes=s.highWater=99.8;select(s,'five');const e=spinEarned(s);close(e.push.percent,.2);assert.equal(s.climbPushes,100);assert.equal(s.isResetting,true);assert.equal(s.completedClimbs,3n);assert.equal(s.spinEnergy,30);
 s.spins=1;assert.equal(spinEarned(s),null);assert.equal(s.spins,1);
 for(let i=0;i<58;i++)advanceProgress(s,.05);assert.equal(s.completedClimbs,4n);assert.equal(s.runSummits,4);assert.equal(s.climbPushes,0);assert.equal(s.isResetting,false);
});
test('reload, dismiss, offline and prestige never reapply saved Casino Push snapshots',()=>{
 const s=state();select(s,'triple');const event=spinEarned(s),loaded=reload(s);close(loaded.climbPushes,event.push.to);assert.deepEqual(loaded.pendingReels[0].push,event.push);
 const height=loaded.climbPushes,balance=loaded.obols;assert.ok(completeReveal(loaded,event));assert.equal(completeReveal(loaded,event),false);close(loaded.climbPushes,height);close(loaded.obols,balance);
 const offline=reload(s);offline.lastSeen=1000;const snapshot=structuredClone(offline.pendingReels[0].push);assert.equal(settleOffline(offline,86401000).seconds,28800);assert.deepEqual(offline.pendingReels[0].push,snapshot);
 loaded.runSummits=28;assert.ok(prestige(loaded));assert.equal(loaded.climbPushes,0);assert.equal(reload(loaded).climbPushes,0);
 delete s.pendingReels[0].push;const old=reload(s);assert.equal(old.pendingReels[0].push,undefined);close(old.climbPushes,s.climbPushes);
});
test('five stored Mega spins cannot create a self-sustaining spin or mountain loop',()=>{
 const s=state();s.spins=5;s.casinoTestLuck='good';let spent=0;
 while(s.spins&&!s.isResetting&&spent<10){spinEarned(s);spent++;}
 assert.equal(spent,5);assert.equal(s.spins,0);assert.ok(s.spinEnergy<=45);assert.ok(s.climbPushes<=90);assert.equal(s.runSummits,3);
});

test('every earned spin receives at least a quarter percent ascent unless clipped by the summit',()=>{
 for(const kind of Object.keys(COMBINATIONS)){
  const s=state();select(s,kind);const e=spinEarned(s);assert.ok(e.push.percent>=.25,kind);
 }
 const s=state();s.climbPushes=s.highWater=99.9;s.casinoTestLuck='poor';const e=spinEarned(s);close(e.push.percent,.1);assert.equal(s.isResetting,true);
});
