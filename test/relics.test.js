import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,loadState,saveState} from '../src/state.js';
import {GameSession} from '../src/session.js';
import {advanceProgress,settleOffline} from '../src/simulation.js';
import {RELICS,acquireRelic,selectRelic,checkpointRelic,chronosMultiplier,shadeMultiplier} from '../src/relics.js';
import {production,manualPower,manualBase,atlasImpulse,powerBreakdown,prestige,workerPower,autoSpeed,mountain,prestigeProjection} from '../src/progression.js';
import {ChainFeedback} from '../src/feedback.js';
const equip=(s,ids)=>{s.relics=[...ids];s.activeRelics=[...ids];};
test('four relics enforce unlocks, one-time Obol costs, two choices and charge clearing',()=>{
  const s=newState();s.obols=1e6;assert.equal(acquireRelic(s,'atlas'),false);s.completedClimbs=18n;
  for(const r of RELICS){const before=s.obols;assert.ok(acquireRelic(s,r.id));assert.equal(s.obols,before-r.cost);assert.equal(acquireRelic(s,r.id),false);}
  assert.deepEqual(s.activeRelics,['atlas','toll']);assert.equal(selectRelic(s,'zeus'),false);
  s.tollRemaining=10;assert.ok(selectRelic(s,'atlas'));assert.equal(s.tollRemaining,0);assert.ok(selectRelic(s,'zeus'));assert.equal(s.activeRelics.length,2);
});
test('Atlas has a bounded workforce contribution only during Defiance; actual pushes use it once',()=>{
  const s=newState();s.workers[0]=10;equip(s,['atlas']);const base=manualPower(s);s.boost=12;
  assert.equal(atlasImpulse(s),autoSpeed(s)*mountain(s).length/100*.04);
  assert.ok(Math.abs(manualPower(s)-(base+atlasImpulse(s))*1.15)<1e-10);
  const game=new GameSession(s);game.resume();const expected=manualPower(s)*100/mountain(s).length;game.push();assert.equal(s.boulderVelocity,Math.min(12,expected));
  s.boost=0;assert.equal(manualPower(s),base);
});
test('Toll checkpoints refresh a finite Shade-only benefit and recrossing does not renew it',()=>{
  const s=newState();s.workers=[2,2,0,0];equip(s,['toll']);const shade=workerPower(s,0),labor=workerPower(s,1);
  checkpointRelic(s,24,25);assert.equal(s.tollRemaining,10);assert.equal(workerPower(s,0),shade*1.2);assert.equal(workerPower(s,1),labor);
  s.tollRemaining=3;checkpointRelic(s,25,25);assert.equal(s.tollRemaining,3);checkpointRelic(s,49,50);assert.equal(s.tollRemaining,10);
  s.highWater=50;s.climbPushes=24;s.boulderVelocity=2;s.tollRemaining=.05;advanceProgress(s,.1);assert.equal(s.tollRemaining,0);assert.equal(shadeMultiplier(s),1);
});
test('Chronos requires continuous passive climbing; clicks, stopped climbing, return and swapping reset it',()=>{
  const s=newState();s.workers[0]=1;equip(s,['chronos']);for(let i=0;i<601;i++)advanceProgress(s,.05);
  assert.equal(s.passiveSeconds,30);assert.equal(chronosMultiplier(s),1.1);
  const game=new GameSession(s);game.resume();game.push();assert.equal(s.passiveSeconds,0);
  s.passiveSeconds=30;s.isResetting=true;s.returnRemaining=1;advanceProgress(s,.05);assert.equal(s.passiveSeconds,0);
  s.passiveSeconds=30;selectRelic(s,'chronos');assert.equal(s.passiveSeconds,0);
});
test('Spark only enhances Golden bonuses, never multiplies the stronger Defiance bonus',()=>{
  const s=newState();s.workers[0]=1;equip(s,['zeus']);const base=production(s),click=manualPower(s);
  s.goldenBoost=20;assert.ok(Math.abs(production(s)-base*1.35)<1e-10);assert.ok(Math.abs(manualPower(s)-click*1.65)<1e-10);
  s.boost=12;assert.equal(production(s),base*2.5);s.goldenBoost=0;assert.equal(manualPower(s),click);
});
test('every legal relic pair has bounded production and chains reproduce authoritative results without mutation',()=>{
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)for(const boosted of [0,12]){
    const s=newState();s.workers=[100,50,25,10];s.runSummits=20;s.boost=boosted;s.goldenBoost=20;s.tollRemaining=10;s.passiveSeconds=30;
    const baseline=production(s);equip(s,[RELICS[a].id,RELICS[b].id]);const before=structuredClone(s);
    assert.ok(production(s)<=baseline*1.32+1e-6);
    assert.ok(manualPower(s)<=(manualBase(s)+autoSpeed(s)*mountain(s).length/100*.04)*1.15*1.65+1e-6);
    for(const kind of ['worker','click']){const chain=powerBreakdown(s,kind);let total=chain.steps[0].result;for(const step of chain.steps.slice(1))total=step.operation==='add'?total+step.value:total*step.value;assert.ok(Math.abs(total-chain.total)<=Math.max(1,chain.total)*1e-12);assert.equal(chain.total,kind==='click'?manualPower(s):production(s));}
    assert.deepEqual(s,before);
  }
});
test('chains are bounded snapshots, retain reading time on input, freeze by session time, and reduce motion',()=>{
  const s=newState();s.workers[0]=1;s.boost=12;equip(s,['toll','chronos']);s.tollRemaining=10;s.passiveSeconds=30;
  const snapshot=powerBreakdown(s),chain=new ChainFeedback();assert.ok(chain.start(snapshot,0));snapshot.total=0;assert.ok(chain.view(0).total>0);
  assert.equal(chain.view(0).index,0);assert.deepEqual(chain.view(.1),chain.view(.1));assert.ok(chain.view(.1,true).final);
  chain.finish(.2);assert.equal(chain.view(.2).final,false);assert.equal(chain.view(8),null);
});
test('relic saves preserve ownership, selection, bounded timers and SFX; prestige clears only charges',()=>{
  const s=newState();s.obols=500;s.favor=8;s.workers=[2,1,0,0];s.climbPushes=s.highWater=42;equip(s,['toll','chronos']);s.tollRemaining=9;s.passiveSeconds=29;s.settings={muted:false,volume:.4,sfxVolume:.7,reducedMotion:true};
  let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(storage,s,1000);const loaded=loadState(storage);
  assert.deepEqual(loaded.relics,s.relics);assert.deepEqual(loaded.activeRelics,s.activeRelics);assert.equal(loaded.tollRemaining,9);assert.equal(loaded.settings.sfxVolume,.7);assert.equal(loaded.climbPushes,42);assert.equal(loaded.obols,500);
  loaded.runSummits=28;const projection=prestigeProjection(loaded);prestige(loaded);assert.deepEqual(loaded.activeRelics,s.activeRelics);assert.equal(loaded.tollRemaining,0);assert.equal(loaded.passiveSeconds,0);assert.equal(projection.startingClick,manualPower(loaded));assert.equal(projection.workerBonus,1);
  const old=JSON.parse(raw);for(const key of ['relics','activeRelics','tollRemaining','passiveSeconds'])delete old[key];raw=JSON.stringify(old);assert.deepEqual(loadState(storage).relics,[]);
});
test('offline uses the same relic integrator, capped at eight hours, without repeat settlement',()=>{
  const a=newState();a.workers=[10,2,0,0];equip(a,['toll','chronos']);a.lastSeen=1000;const b=structuredClone(a);
  for(let i=0;i<60*20;i++)advanceProgress(a,.05);settleOffline(b,61000);assert.equal(a.obols,b.obols);assert.equal(a.passiveSeconds,b.passiveSeconds);
  assert.equal(settleOffline(b,1000+86400000).seconds,28800);const balance=b.obols;assert.equal(settleOffline(b,1000+86400000).seconds,0);assert.equal(b.obols,balance);
});
