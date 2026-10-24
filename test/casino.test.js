import {casinoRewardScale} from '../src/casino-rewards.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {casinoCheckpoints,rollSymbols,classifyRoll,resolveReel,SYMBOLS,FATES,chooseFate,tickCasino,casinoFactor} from '../src/casino.js';
import {advanceProgress,settleOffline} from '../src/simulation.js';
import {manualPower,production,powerBreakdown,prestige,prestigeProjection} from '../src/progression.js';
const eligible=()=>Object.assign(newState(),{runSummits:3,completedClimbs:3n});
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1,a)*1e-10,`${a} != ${b}`);
test('earned checkpoints start on mountain 4 and each quarter/summit awards exactly once',()=>{
 const s=newState();assert.deepEqual(casinoCheckpoints(s,0,100,500),[]);s.runSummits=3;s.completedClimbs=3n;
 assert.equal(casinoCheckpoints(s,0,100,500).length,4);assert.equal(s.casinoRolls,4);assert.equal(s.jackpotMeter,25);
 const earned=s.earned;assert.equal(casinoCheckpoints(s,0,100,500).length,0);assert.equal(s.earned,earned);
 s.completedClimbs++;s.runSummits++;assert.equal(casinoCheckpoints(s,0,25,500).length,1);
});
test('seeded weighted symbols are valid, reproducible, and summit distribution remains bounded',()=>{
 const a=eligible(),b=eligible();let ordinary=0,summits=0;
 for(let i=0;i<12000;i++){const x=rollSymbols(a);assert.deepEqual(x,rollSymbols(b));assert.ok(x.every(v=>SYMBOLS.includes(v)));if(classifyRoll(x).count===3)ordinary++;}
 const c=eligible();for(let i=0;i<12000;i++)if(classifyRoll(rollSymbols(c,true)).count===3)summits++;
 assert.ok(ordinary>1100&&ordinary<1800);assert.ok(summits>1100&&summits<1800);
});
test('all outcomes pay positive capped bursts; real synergy steps total exactly once',()=>{
 const s=eligible();s.relics=s.activeRelics=['zeus','atlas'];s.blessing='athena';s.blessingRemaining=120;
 const event=resolveReel(s,['lightning','lightning','lightning'],100);close(event.total,100*4*1.15*1.1);close(s.obols,event.total);
 let total=event.steps[0].result;for(const step of event.steps.slice(1)){total*=step.value;close(step.result,total);}close(total,event.total);
 assert.equal(s.reelStrength,1.2);assert.equal(s.reelEffect,'click');
 for(const x of SYMBOLS)for(const y of SYMBOLS)for(const z of SYMBOLS){const n=eligible(),e=resolveReel(n,[x,y,z],10);assert.ok(e.total>=10&&e.total<=40);assert.ok(n.reelStrength<=1.2);}
});
test('jackpot is guaranteed at 100, paid once, with remainder and no click/visual contribution',()=>{
 const s=eligible();s.jackpotMeter=95;
 const [event]=casinoCheckpoints(s,0,25,1000);assert.equal(event.jackpot,Math.max(40,casinoRewardScale(s).base*10));assert.equal(s.jackpotWins,1);assert.equal(s.jackpotMeter,0);
 const before=s.obols;casinoCheckpoints(s,0,25,1000);assert.equal(s.obols,before);assert.equal(s.jackpotWins,1);
});
test('three Fates defer without loss, replace only after expiration, and persist across prestige',()=>{
 const s=eligible();s.runSummits=4;casinoCheckpoints(s,75,100,1000);assert.equal(s.fatePending,1);assert.equal(FATES.length,3);s.reelRemaining=0;
 assert.equal(chooseFate(s,'invalid'),false);assert.ok(chooseFate(s,'ares'));close(casinoFactor(s,'click'),1.12);s.fatePending=2;
 assert.equal(chooseFate(s,'hermes'),false);tickCasino(s,121);assert.ok(chooseFate(s,'hermes'));close(casinoFactor(s,'earn'),1.08);
 s.runSummits=28;const projection=prestigeProjection(s);assert.ok(prestige(s));assert.equal(s.fatePending,1);assert.equal(s.blessingRemaining,0);assert.equal(s.reelRemaining,0);assert.equal(projection.startingClick,manualPower(s));
});
test('temporary reel effects replace rather than stack; shared production and breakdown stay exact',()=>{
 const s=eligible();s.workers=[10,2,1,0];s.boost=12;s.goldenBoost=20;const baseline=production(s),baseClick=manualPower(s);
 resolveReel(s,['coin','coin','coin'],10);close(production(s),baseline*1.2);
 resolveReel(s,['lightning','lightning','lightning'],10);close(production(s),baseline);close(manualPower(s),baseClick*1.2);
 s.fatePending=1;chooseFate(s,'ares');close(manualPower(s),baseClick*1.2*1.12);
 for(const kind of ['worker','click']){const v=powerBreakdown(s,kind);let total=v.steps[0].result;for(const step of v.steps.slice(1))total=step.operation==='add'?total+step.value:total*step.value;close(total,v.total);}
 tickCasino(s,121);close(manualPower(s),baseClick);
});
test('all four equipped symbol synergies require matching rolls and retain the two-slot model',()=>{
 for(const [id,symbol]of [['zeus','lightning'],['toll','coin'],['atlas','boulder'],['chronos','hourglass']]){
  const s=eligible();s.relics=[id];const resting=resolveReel(s,[symbol,symbol,'flame'],10);assert.equal(resting.relic,'');
  s.activeRelics=[id];const active=resolveReel(s,[symbol,symbol,'flame'],10);assert.equal(active.relic,id);close(active.total,23);
 }
});
test('save reload preserves awarded money, RNG, eligibility, meter, blessings; never replays payout',()=>{
 const s=eligible();casinoCheckpoints(s,0,50,1000);s.fatePending=2;chooseFate(s,'athena');let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(storage,s,1000);const a=loadState(storage);
 for(const key of ['obols','earned','casinoSeed','casinoRolls','casinoMask','jackpotMeter','fatePending','blessingRemaining'])assert.equal(a[key],s[key]);assert.equal(a.casinoEvent,null);
 assert.deepEqual(casinoCheckpoints(a,0,50,1000),[]);assert.deepEqual(rollSymbols(a),rollSymbols(s));
 const legacy=JSON.parse(raw);for(const k of Object.keys(legacy))if(k.startsWith('casino')||k.startsWith('reel')||k.startsWith('jackpot')||k.startsWith('blessing')||k==='fatePending')delete legacy[k];raw=JSON.stringify(legacy);assert.equal(loadState(storage).casinoRolls,0);
});
test('offline rewards use the same deterministic simulation, cap at eight hours and settle once',()=>{
 const s=eligible();s.workers=[100,25,1,0];s.lastSeen=1000;const online=structuredClone(s);online.casinoOffline=true;
 for(let i=0;i<1200;i++)advanceProgress(online,.05);const result=settleOffline(s,61000);assert.equal(result.seconds,60);assert.equal(s.casinoSeed,online.casinoSeed);assert.equal(s.casinoRolls,online.casinoRolls);close(s.obols,online.obols);
 const balance=s.obols;assert.equal(settleOffline(s,61000).seconds,0);assert.equal(s.obols,balance);assert.equal(settleOffline(s,86401000).seconds,28800);assert.ok(s.casinoRolls<100000);
});
