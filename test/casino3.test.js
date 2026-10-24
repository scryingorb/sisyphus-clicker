import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {COMBINATIONS,SYMBOLS,classifyRoll,rollSymbols,resolveReel,spinEarned,reelOdds} from '../src/casino.js';
import {claimSpinMilestones,spinMilestones,drainFreeSpins} from '../src/casino-milestones.js';
import {buy,discover,prestige} from '../src/progression.js';
import {casinoRewardScale} from '../src/casino-rewards.js';
import {comboTiming} from '../src/feedback.js';
import {completeReveal} from '../src/reel-presentation.js';
const state=()=>Object.assign(newState(),{runSummits:3,completedClimbs:3n});
const reload=(s,version=6)=>{let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(storage,s,1000);const data=JSON.parse(raw);data.schema=version;raw=JSON.stringify(data);return loadState(storage);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,a),`${a} != ${b}`);
test('all five-reel groups have one priority, permutation-independent factor and matched illumination',()=>{
 const cases={unmatched:['coin','laurel','flame','boulder','hourglass'],pair:['coin','coin','laurel','flame','boulder'],twoPair:['coin','coin','laurel','laurel','boulder'],triple:['coin','coin','coin','flame','boulder'],fullHouse:['coin','coin','coin','flame','flame'],four:['coin','coin','coin','coin','flame'],five:Array(5).fill('coin')};
 for(const [kind,symbols] of Object.entries(cases)){
  const e=classifyRoll(symbols);assert.equal(e.kind,kind);assert.equal(e.factor,COMBINATIONS[kind].factor);assert.deepEqual(classifyRoll([...symbols].reverse()),e);
  const s=state(),r=resolveReel(s,symbols,100,false,true);close(r.total,100*e.factor);close(s.obols,r.total);assert.equal(r.jackpot,0);assert.equal(r.mega,kind==='five');
 }
 assert.deepEqual(classifyRoll(cases.twoPair).matched,['laurel','coin']);
});
test('exact five-reel distribution and seeded symbol weights and assisted outcomes',()=>{
 const odds=reelOdds();close(Object.keys(COMBINATIONS).reduce((n,k)=>n+odds[k],0),1);close(odds.five,.003243408203125);assert.ok(odds.unmatched>.20&&odds.unmatched<.25);
 const a=state(),b=state(),counts=Object.fromEntries(SYMBOLS.map(x=>[x,0]));
 for(let i=0;i<10000;i++){const out=rollSymbols(a);assert.equal(out.length,5);assert.deepEqual(out,rollSymbols(b));out.forEach(x=>counts[x]++);}
 SYMBOLS.forEach((x,i)=>assert.ok(Math.abs(counts[x]/50000-.125)<.01));
 const assisted=state(),seen=Object.fromEntries(Object.keys(COMBINATIONS).map(k=>[k,0]));
 for(let i=0;i<20000;i++)seen[classifyRoll(rollSymbols(assisted,false,true)).kind]++;
 for(const kind of Object.keys(COMBINATIONS))assert.ok(Math.abs(seen[kind]/20000-odds[kind])<.01,kind);
});
test('bulk worker purchases cross each lifetime milestone once, reserve is lossless and prestige cannot farm it',()=>{
 const s=state();discover(s);const initial=s.freeSpinsEarned;s.obols=1e30;s.spins=5;
 assert.ok(buy(s,'worker',0,10));assert.ok(s.spinClaims.includes('worker:0:10'));assert.equal(s.freeSpinsEarned,initial+1);assert.equal(s.freeSpinReserve,0);assert.equal(s.spins,6);
 const earned=s.freeSpinsEarned;discover(s);assert.equal(s.freeSpinsEarned,earned);
 assert.ok(buy(s,'worker',0,'max'));for(const n of [10,25,50,100])assert.ok(s.spinClaims.includes(`worker:0:${n}`));
 const loaded=reload(s);assert.equal(loaded.freeSpinsEarned,s.freeSpinsEarned);assert.equal(loaded.freeSpinReserve,s.freeSpinReserve);
 loaded.runSummits=28;assert.ok(prestige(loaded));discover(loaded);const before=loaded.freeSpinsEarned;loaded.obols=1e30;buy(loaded,'worker',0,10);assert.equal(loaded.freeSpinsEarned,before);
 loaded.runSummits=3;loaded.spins=4;const reserve=loaded.freeSpinReserve;drainFreeSpins(loaded);assert.equal(loaded.spins,4+reserve);assert.equal(loaded.freeSpinReserve,0);
 assert.ok(loaded.freeSpinsEarned<=spinMilestones().length);
});
test('first-three mountains store achievement spins without spending them; legacy goals migrate without backpay',()=>{
 const s=newState();s.obols=1e8;buy(s,'worker',0,10);assert.equal(s.spins,1);assert.equal(s.freeSpinReserve,0);assert.equal(spinEarned(s),null);
 const old=state();old.workers=[100,25,1,0];discover(old);old.spinClaims=[];old.freeSpinReserve=0;old.freeSpinsEarned=0;
 const migrated=reload(old,5);assert.equal(migrated.freeSpinsEarned,0);assert.equal(migrated.freeSpinReserve,0);const claims=[...migrated.spinClaims];discover(migrated);assert.deepEqual(migrated.spinClaims,claims);assert.equal(reload(migrated).freeSpinsEarned,0);
});
test('unfinished legacy triple keeps original symbols, settled rewards and RNG until a new five-reel roll',()=>{
 const s=state();s.spinClaims=spinMilestones().map(m=>m.id);s.lastSymbols=['coin','coin','boulder'];s.held=[true,true,false];s.holdTokens=1;s.spins=1;
 const old=resolveReel(s,['coin','coin','coin'],10,false,true);old.mega=true;old.jackpot=80;s.pendingReels[0]=structuredClone(old);s.obols+=80;
 const loaded=reload(s,5);assert.equal(loaded.obols,s.obols);assert.equal(loaded.casinoSeed,s.casinoSeed);assert.deepEqual(loaded.pendingReels[0].symbols,old.symbols);assert.equal(loaded.pendingReels[0].jackpot,80);
 assert.ok(completeReveal(loaded,old));assert.equal(completeReveal(loaded,old),false);assert.equal(loaded.obols,s.obols);assert.equal(loaded.holdTokens,0);
 const fresh=spinEarned(loaded);assert.equal(fresh.symbols.length,5);assert.ok(fresh.held.every(x=>!x));assert.equal(loaded.holdTokens,0);
});
test('five-reel synergies are bounded to one, Mega has readable timing',()=>{
 const s=state();s.relics=s.activeRelics=['zeus','toll'];s.blessing='athena';s.blessingRemaining=120;
 const r=resolveReel(s,['coin','coin','lightning','lightning','flame'],100,false,true);close(r.total,100*6*1.15*1.1);assert.equal(r.steps.length,4);
 const mega=resolveReel(s,Array(5).fill('coin'),100,false,true);assert.ok(comboTiming(mega).duration>=6.5);assert.equal(mega.jackpot,0);
 for(const n of [3,15,27]){const p=state();p.runSummits=n;const scale=casinoRewardScale(p);assert.ok(scale.base>=scale.fullValue*.002&&scale.base<=scale.cap);}
});
