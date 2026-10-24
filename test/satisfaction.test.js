import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {GameSession} from '../src/session.js';
import {advanceProgress} from '../src/simulation.js';
import {format,production,buy,prestige,BALANCE} from '../src/progression.js';
import {approachNumber,ascentMilestones,numberMilestone,GainEffects,FLOAT_BUDGET,manualPower,liveStats} from '../src/satisfaction.js';
import {crewRepresentatives,drawPushCrew} from '../src/workforce-scene.js';
import {purchaseFeedback} from '../src/feedback.js';

test('display smoothing never overshoots, snaps on spending and reduced motion, handles enormous values',()=>{
  for(const target of [0,1,1234,1e100]){let value=0;for(let i=0;i<100;i++){const next=approachNumber(value,target,.08);assert.ok(next>=value&&next<=target);value=next;}}
  assert.equal(approachNumber(100,20,.08),20);assert.equal(approachNumber(0,100,.08,true),100);
  assert.equal(format(1250),'1.25K');assert.equal(format(1e6),'1M');assert.equal(format(1e9),'1B');assert.equal(format(1e12),'1T');assert.equal(format(1e100),'1.00e+100');assert.equal(format(999999),'999.99K');
});
test('gain effects preserve actual summed contributions, aggregate rapid clicks, and have a fixed budget',()=>{
  const effects=new GainEffects();effects.add(1.2,'click',0);effects.add(2.4,'click',.05);
  assert.ok(Math.abs(effects.items[0].value-3.6)<1e-12);
  for(let i=0;i<100;i++)effects.add(i,'worker',i*.2);
  assert.equal(effects.items.length,FLOAT_BUDGET);assert.equal(effects.active(22).length,0);
  effects.add(0,'click',23);assert.equal(effects.items[0].value,0);
});
test('milestones use saved high-water and cumulative earnings, so rollback or spending cannot retrigger',()=>{
  assert.deepEqual(ascentMilestones(24,26),[25]);assert.deepEqual(ascentMilestones(50,40),[]);
  assert.deepEqual(ascentMilestones(50,51),[]);assert.deepEqual(ascentMilestones(74,100),[75,100]);
  assert.equal(numberMilestone(999,1001),1000);assert.equal(numberMilestone(1001,999),null);
  const s=newState();s.earned=1001;s.obols=100;s.workers[0]=1;
  const before=s.earned;buy(s,'worker',0);assert.equal(numberMilestone(before,s.earned),null);
});
test('HUD and floating inputs use the exact manual impulse and integrated worker production',()=>{
  const s=newState(),game=new GameSession(s);s.workers=[1,2,0,0];s.upgrades[0]=2;game.resume();
  const stats=liveStats(s);assert.equal(stats.power,production(s));assert.equal(stats.tiers.reduce((a,b)=>a+b,0),stats.power);
  const old=s.boulderVelocity;game.push();assert.ok(Math.abs(s.boulderVelocity-old-manualPower(s)*100/330)<1e-10);
  for(let i=0;i<20;i++)game.tick(.05);assert.ok(Math.abs(game.metrics.work-production(s))<1e-9);
  s.boost=.01;const metrics={work:0};advanceProgress(s,.05,metrics);assert.equal(metrics.work,production(s)*.05);
});
test('first recruitment has entrance feedback; later training and actual upgrades have measured deltas',()=>{
  const before=newState(),after=structuredClone(before);after.workers[0]=1;
  const first=purchaseFeedback(before,after,'worker',0,1);assert.ok(first.arrival&&first.major);assert.equal(first.gain,production(after));
  const upgraded=structuredClone(after);upgraded.upgrades[0]=1;
  assert.match(purchaseFeedback(after,upgraded,'upgrade',0,1).detail,/1.2 m\/s/);
  assert.equal(purchaseFeedback(after,upgraded,'upgrade',0,1).arrival,false);
});
test('crew ownership restores from state, stays bounded, and reduced motion freezes entrances and exertion',()=>{
  const s=newState();assert.equal(crewRepresentatives(s).length,0);s.workers[0]=1;assert.equal(crewRepresentatives(s).length,1);
  s.workers=[1000,1000,1000,1000];assert.equal(crewRepresentatives(s).length,8);
  let calls=[];const ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args])});
  const scene={state:s,ctx,scale:1,reduced:true,arrivals:new Map([[0,1]]),rect:(...args)=>calls.push(args)};
  drawPushCrew(scene,1,{x:200,y:200},true);const first=calls;calls=[];drawPushCrew(scene,10,{x:200,y:200},true);assert.deepEqual(calls,first);
});
test('distance is real uphill travel and new optional records preserve old saves, Favor and settings',()=>{
  const s=newState();s.workers=[2,1,0,0];s.divine=[1,2,3,4];s.favor=12;s.lifetimeFavor=30;s.settings={muted:true,volume:.4,reducedMotion:true};
  advanceProgress(s,.05);assert.ok(s.lifetimeDistance>0);const distance=s.lifetimeDistance;
  let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(storage,s,1000);
  const loaded=loadState(storage);assert.equal(loaded.lifetimeDistance,distance);assert.deepEqual(loaded.settings,s.settings);assert.deepEqual(loaded.workers,s.workers);assert.deepEqual(loaded.divine,s.divine);assert.equal(loaded.favor,12);
  loaded.runSummits=BALANCE.prestigeAt;prestige(loaded);assert.equal(loaded.lifetimeDistance,distance);
  const old=JSON.parse(raw);delete old.lifetimeDistance;raw=JSON.stringify(old);assert.equal(loadState(storage).lifetimeDistance,0);
});
