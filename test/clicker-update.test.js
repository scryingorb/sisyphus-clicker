import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,loadState,saveState} from '../src/state.js';
import {GameSession} from '../src/session.js';
import {GOLDEN,advanceGolden,claimGolden} from '../src/golden.js';
import {advanceProgress,settleOffline} from '../src/simulation.js';
import {purchaseForecasts,benefitText} from '../src/shop-insights.js';
import {BALANCE,buy,quote,purchasePreview,manualPower,production,prestige,prestigeProjection,discover,milestone} from '../src/progression.js';
import {clickIntensity} from '../src/satisfaction.js';
import {mountainGoal} from '../src/mountain-goals.js';
import {FeedbackQueue} from '../src/feedback.js';

test('golden events use deterministic bounded cooldowns and cannot be claimed twice or stacked',()=>{
  const a=newState(),b=newState();
  for(const s of [a,b]){advanceGolden(s,74);assert.equal(s.goldenWindow,0);advanceGolden(s,1);assert.equal(s.goldenWindow,0);assert.equal(claimGolden(s),false);assert.equal(s.goldenBoost,20);assert.equal(s.goldenClaims,1);}
  assert.equal(a.goldenCooldown,b.goldenCooldown);assert.ok(a.goldenCooldown>=150&&a.goldenCooldown<=240);
  const missed=newState();advanceGolden(missed,75);advanceGolden(missed,30);assert.equal(missed.goldenWindow,0);assert.equal(missed.goldenClaims,1);assert.ok(missed.goldenCooldown>=120);
  const game=new GameSession(a),before=structuredClone(a);game.tick(.05);assert.deepEqual(a,before);
  const queue=new FeedbackQueue();queue.emit({kind:'golden-ready'});queue.emit({kind:'golden'});assert.equal(queue.current.kind,'golden');
});
test('Golden and Defiance share a maximum workforce multiplier, expire, and preserve base output',()=>{
  const s=newState();s.workers[0]=3;const base=production(s),click=manualPower(s);
  s.goldenWindow=30;claimGolden(s);assert.equal(production(s),base*1.25);assert.equal(manualPower(s),click*1.5);
  s.boost=12;s.defianceCooldown=60;assert.equal(production(s),base*BALANCE.defianceMultiplier);
  for(let i=0;i<241;i++)advanceProgress(s,.05);
  assert.equal(s.boost,0);assert.ok(s.goldenBoost>0);assert.equal(production(s),base*1.25);
  for(let i=0;i<160;i++)advanceProgress(s,.05);
  assert.equal(s.goldenBoost,0);assert.equal(production(s),base);assert.equal(manualPower(s),click);
});
test('offline never spawns Golden events and credits only an already-active finite bonus',()=>{
  const s=newState();s.workers[0]=1;s.lastSeen=1000;s.goldenWindow=30;claimGolden(s);
  const expected=structuredClone(s);for(let i=0;i<60*20;i++)advanceProgress(expected,.05);
  const report=settleOffline(s,61000);assert.equal(report.seconds,60);assert.equal(s.goldenBoost,0);assert.equal(s.goldenClaims,1);assert.equal(s.goldenWindow,0);assert.equal(s.obols,expected.obols);
  const empty=newState();empty.lastSeen=1000;empty.goldenBoost=20;empty.goldenWindow=0;
  assert.equal(settleOffline(empty,1000+86400000).seconds,28800);assert.equal(empty.goldenBoost,0);assert.equal(empty.goldenWindow,0);
  const visible=newState();visible.lastSeen=1000;visible.goldenWindow=30;
  settleOffline(visible,11000);assert.equal(visible.goldenWindow,20);settleOffline(visible,61000);assert.equal(visible.goldenWindow,0);assert.ok(visible.goldenCooldown>=150);
});
test('event state, existing achievements, progress and balances survive reload without refreshing bonuses',()=>{
  const s=newState();s.goldenWindow=30;claimGolden(s);advanceProgress(s,5);s.climbPushes=42;s.highWater=52;s.obols=123;s.favor=8;s.workers=[2,1,0,0];s.defiance=7;s.achievements=['Many Hands'];
  let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(storage,s,1000);const loaded=loadState(storage);
  assert.equal(loaded.goldenBoost,15);assert.equal(loaded.goldenCooldown,s.goldenCooldown);assert.equal(loaded.goldenClaims,1);assert.equal(claimGolden(loaded),false);assert.ok(loaded.achievements.includes('Many Hands'));assert.equal(loaded.defiance,7);assert.equal(loaded.obols,123);assert.equal(loaded.highWater,52);assert.equal(loaded.climbPushes,42);assert.equal(loaded.favor,8);
  const old=JSON.parse(raw);for(const key of Object.keys(old))if(key.startsWith('golden'))delete old[key];raw=JSON.stringify(old);assert.equal(loadState(storage).goldenCooldown,75);
});
test('bulk repeatable upgrades and training match single purchases, previews, affordability and limits',()=>{
  for(const kind of ['upgrade','tier'])for(const index of kind==='upgrade'?[0,1,2]:[0,1,2,3]){
    const a=newState();a.obols=1e30;a.workers=[1,1,1,1];const b=structuredClone(a);
    const preview=purchasePreview(a,kind,index,10);assert.ok(buy(a,kind,index,10));for(let n=0;n<10;n++)assert.ok(buy(b,kind,index,1));
    assert.deepEqual({...a,freeSpinNotice:''},{...b,freeSpinNotice:''});assert.equal(production(a),preview.afterPower);assert.equal(manualPower(a),preview.afterClick);
    if(kind==='tier')assert.equal(quote(a,kind,index,1).count,0);
  }
  const poor=newState();poor.obols=14;assert.equal(buy(poor,'upgrade',0,10),false);assert.equal(buy(poor,'upgrade',0,'max'),false);assert.equal(poor.obols,14);
  poor.obols=1000;assert.ok(buy(poor,'upgrade',0,'max'));assert.ok(poor.obols>=0);assert.ok(quote(poor,'upgrade',0).reason);
  assert.deepEqual([9,10,24,25,49,50,99,100].map(milestone),[1,2,2,4,4,8,8,16]);
});
test('purchase countdowns handle expiry, rollback, paused state, caps, max and unavailable tiers',()=>{
  const s=newState();let f=purchaseForecasts(s);assert.match(f.get('worker:0').text,/no idle income/);assert.equal(f.get('worker:1').text,'Unavailable');
  s.obols=55;assert.equal(purchaseForecasts(s).get('worker:0').text,'Ready');
  s.workers[0]=1;s.obols=0;s.goldenBoost=.5;s.boost=.2;s.climbPushes=10;s.highWater=12;
  const before=structuredClone(s);f=purchaseForecasts(s);assert.deepEqual(s,before);
  const eta=f.get('worker:0').seconds;assert.ok(eta>0);const live=structuredClone(s);let elapsed=0;const cost=quote(s,'worker',0).cost;
  while(live.obols<cost&&elapsed<300){advanceProgress(live,.05);elapsed+=.05;}
  assert.ok(Math.abs(eta-elapsed)<.5);
  assert.equal(purchaseForecasts(s,1,true).get('worker:0').text,'Paused');
  assert.match(purchaseForecasts(s,'max').get('worker:0').text,/Next single:/);
  s.workers[0]=1000;assert.equal(purchaseForecasts(s).get('worker:0').text,'Unavailable');
});
test('purchase benefits, completed-goal fallback, achievements and prestige previews use actual state',()=>{
  const s=newState();s.obols=1000;
  assert.match(benefitText(purchasePreview(s,'upgrade',0,10)).join(' '),/Click impulse: 4.8/);
  s.workers[0]=1;assert.match(mountainGoal(s).title,/checkpoint/);s.highWater=50;assert.equal(mountainGoal(s).target,75);
  s.earned=1e6;s.totalPushes=1000n;s.workers[0]=100;s.lifetimeFavor=8;discover(s);const earned=[...s.achievements];s.earned=0;s.workers[0]=0;discover(s);assert.deepEqual(s.achievements,earned);
  s.divine=[2,2,1,0];s.workers[0]=5;s.upgrades=[4,0,2];s.runSummits=28;s.goldenBoost=20;
  const projection=prestigeProjection(s),copy=structuredClone(s);prestige(copy);
  assert.equal(manualPower(copy),projection.startingClick);assert.equal(copy.favor,projection.favorAfter);assert.equal(copy.goldenBoost,0);assert.equal(production(copy),0);
});
test('Defiance retains its comfortable 12-push charge and stronger effects do not change impulse',()=>{
  const s=newState(),game=new GameSession(s);game.resume();
  for(let n=0;n<12;n++){assert.ok(game.push());if(n<11)for(let i=0;i<20;i++)game.tick(.05);}
  assert.equal(s.boost,12);assert.equal(s.defianceCooldown,60);
  assert.ok(clickIntensity(s,48)>clickIntensity(s,4.8));assert.ok(clickIntensity(s,1e100)<=2.2);
});
