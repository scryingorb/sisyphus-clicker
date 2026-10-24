import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {spinEarned,earnSpinEnergy,clickSpinEnergy,workerSpinEnergy} from '../src/casino.js';
import {startSpinBatch,advanceSpinBatch} from '../src/casino-batch.js';
import {spinMilestones} from '../src/casino-milestones.js';
import {advanceProgress,settleAndSave} from '../src/simulation.js';
import {GameSession} from '../src/session.js';
import {prestige} from '../src/progression.js';
import {completeReveal} from '../src/reel-presentation.js';
const fresh=()=>Object.assign(newState(),{runSummits:3,completedClimbs:3n,spinClaims:spinMilestones().map(x=>x.id)});
const storage=()=>{let raw;return {getItem:()=>raw,setItem:(_,v)=>raw=v};};
const reload=s=>{const store=storage();saveState(store,s,1000);return loadState(store);};
const economic=s=>Object.fromEntries(['obols','earned','spins','spinEnergy','casinoSeed','casinoRolls','activeSpins','jackpotMeter','jackpotWins','climbPushes','highWater','runSummits','completedClimbs','spinClaims','reelEffect','reelStrength','reelRemaining','returnRemaining','lifetimeDistance'].map(k=>[k,s[k]]));
test('old stored energy and milestone reserve migrate once; hundreds and safe integer balances survive',()=>{
 const s=fresh();s.spins=5;s.spinEnergy=100;s.freeSpinReserve=17;
 const a=reload(s);assert.equal(a.spins,23);assert.equal(a.spinEnergy,0);assert.equal(a.freeSpinReserve,0);assert.equal(reload(a).spins,23);
 a.spins=1234567;a.spinEnergy=99.25;assert.equal(reload(a).spins,1234567);assert.equal(reload(a).spinEnergy,99.25);
 earnSpinEnergy(a,Number.MAX_VALUE);assert.ok(Number.isSafeInteger(a.spins));assert.ok(a.spinEnergy<100);
 a.spins=Number.MAX_SAFE_INTEGER;earnSpinEnergy(a,1000);assert.equal(a.spins,Number.MAX_SAFE_INTEGER);
});
test('every accepted click earns energy even at velocity limit; rejected clicks earn nothing; upgrades and Defiance improve it',()=>{
 const s=fresh(),game=new GameSession(s);game.resume();s.boulderVelocity=12;
 assert.equal(game.push(),true);assert.equal(s.spinEnergy,4);assert.equal(game.push(),false);assert.equal(s.spinEnergy,4);
 game.pause();s.clickCooldown=0;assert.equal(game.push(),false);assert.equal(s.spinEnergy,4);
 s.upgrades[0]=5;assert.ok(clickSpinEnergy(s)>4);const base=clickSpinEnergy(s);s.boost=1;assert.equal(clickSpinEnergy(s),base*1.5);
});
test('active rate scales with accepted input and exceeds same workforce idle rate',()=>{
 const run=interval=>{const s=fresh(),g=new GameSession(s);s.workers=[10,0,0,0];g.resume();let next=0;for(let t=0;t<60;t+=.05){if(t>=next){g.push();next=t+interval;}g.tick(.05);}return s.spins+s.spinEnergy/100;};
 const idle=run(Infinity),slow=run(1),fast=run(.15);assert.ok(slow>idle*3);assert.ok(fast>slow*2);
});
test('workers produce without uphill movement, training improves rate; capped offline earnings persist exactly once',()=>{
 const s=fresh();s.workers=[10,0,0,0];const base=workerSpinEnergy(s);s.tierUpgrades[0]=1;assert.ok(workerSpinEnergy(s)>base);
 s.lastSeen=1000;const store=storage(),summary=settleAndSave(s,store,1000+12*3600000);
 assert.equal(summary.seconds,28800);assert.ok(summary.spins>50);assert.equal(summary.availableSpins,s.spins);
 const expected=workerSpinEnergy(s)*28800/100*.25;assert.ok(Math.abs(s.spins+s.spinEnergy/100-expected)<1e-6);
 const again=loadState(store),before=again.spins;assert.equal(settleAndSave(again,store,1000+12*3600000).spins,0);assert.equal(again.spins,before);
 assert.equal(settleAndSave(again,store,500).seconds,0);assert.equal(settleAndSave(again,store,1000+12*3600000).spins,0);
});
test('ten outcomes equal ordered single settlement across checkpoints, jackpot and mountain return',()=>{
 for(const height of [0,24.9,99.9])for(const seed of [1,311617,8675309]){
  const a=fresh();Object.assign(a,{spins:500,climbPushes:height,highWater:height,casinoSeed:seed,jackpotMeter:99});const b=structuredClone(a);
  startSpinBatch(a);let count=0;const rounds=[];
  while(count<10){while(b.isResetting)advanceProgress(b,1/240);const single=spinEarned(b);assert.ok(single);rounds.push({symbols:single.symbols,combination:single.combination,total:single.total+single.jackpot});count++;}
  for(let steps=0;a.spinBatch&&steps<2000;steps++){advanceProgress(a,1/240);advanceSpinBatch(a);}
  assert.equal(a.spinBatch,null);assert.deepEqual(economic(a),economic(b));
  const event=a.pendingReels.find(x=>x.spinBatch);assert.equal(event.count,10);assert.deepEqual(event.rounds,rounds);assert.equal(Object.values(event.combinations).reduce((n,x)=>n+x,0),10);
  const loaded=reload(a);assert.deepEqual(loaded.pendingReels.find(x=>x.spinBatch).rounds,rounds);const money=loaded.obols;while(loaded.pendingReels.length)completeReveal(loaded,loaded.pendingReels[0]);assert.equal(loaded.obols,money);
 }
});
test('batch reload resumes only unpaid remainder; limited stock uses actual count and prestige preserves stock',()=>{
 const s=fresh();Object.assign(s,{spins:10,climbPushes:99.9,highWater:99.9});startSpinBatch(s);assert.ok(s.spinBatch);assert.ok(s.spinBatch.count>0);const count=s.activeSpins;
 const a=reload(s);assert.equal(a.activeSpins,count);for(let n=0;a.spinBatch&&n<2000;n++){advanceProgress(a,1/240);advanceSpinBatch(a);}assert.equal(a.activeSpins,10);assert.equal(a.spinBatch,null);
 const b=fresh();b.spins=3;startSpinBatch(b);assert.equal(b.casinoEvent.count,3);assert.equal(b.spins,0);assert.equal(startSpinBatch(b),null);
 b.spins=777;b.runSummits=28;assert.ok(prestige(b));assert.equal(reload(b).spins,777);
});
