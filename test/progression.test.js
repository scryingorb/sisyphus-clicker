import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, loadState, saveState, finishClimb } from '../src/state.js';
import { BALANCE, WORKERS, buy, quote, milestone, workerPower, prestige, favorGain, buyDivine } from '../src/progression.js';
import { advanceProgress, settleOffline, settleAndSave } from '../src/simulation.js';
import { GameSession } from '../src/session.js';
const memory=()=>{let raw;return {getItem:()=>raw,setItem:(_,value)=>raw=value};};
test('individual, bulk and max purchases use identical rounded prices and enforce affordability',()=>{
  const a=newState(),b=newState();a.obols=b.obols=10000;
  const q=quote(a,'worker',0,10);assert.equal(buy(a,'worker',0,10),true);
  for(let i=0;i<10;i++) assert.equal(buy(b,'worker',0),true);
  assert.equal(a.obols,b.obols);assert.equal(a.workers[0],10);assert.equal(10000-a.obols,q.cost);
  buy(a,'worker',0,'max'); assert.ok(quote(a,'worker',0).reason);
  const poor=newState();assert.equal(buy(poor,'worker',0),false);assert.equal(buy(poor,'worker',1),false);
  poor.obols=WORKERS[0].cost-.001;assert.equal(buy(poor,'worker',0),false);poor.obols=WORKERS[0].cost;assert.equal(buy(poor,'worker',0),true);
});
test('milestones are derived once and survive saving',()=>{
  const s=newState(),store=memory();
  for(const [n,m] of [[9,1],[10,2],[25,4],[50,8],[100,16]]) {s.workers[0]=n;assert.equal(milestone(n),m);assert.equal(workerPower(s,0),WORKERS[0].power*n*m);saveState(store,s);assert.equal(workerPower(loadState(store),0),workerPower(s,0));}
});
test('falls and recrossed height cannot farm Obols or erase purchases',()=>{
  const s=newState();s.climbPushes=s.highWater=50;s.obols=80;s.upgrades[0]=3;
  for(let i=0;i<200;i++)advanceProgress(s,.05);
  assert.ok(s.climbPushes<50);assert.equal(s.obols,80);assert.equal(s.upgrades[0],3);
  s.boulderVelocity=12;for(let i=0;i<5;i++)advanceProgress(s,.05);assert.equal(s.obols,80);
});
test('summits grant exactly one reward, including save during return',()=>{
  const s=newState(),store=memory();s.climbPushes=100;s.highWater=100;s.isResetting=true;s.returnRemaining=1;
  saveState(store,s);const loaded=loadState(store);
  for(let i=0;i<25;i++)advanceProgress(loaded,.05);
  assert.equal(loaded.completedClimbs,1n);assert.equal(loaded.runSummits,1);assert.equal(loaded.obols,BALANCE.summitObols);
  finishClimb(loaded);assert.equal(loaded.obols,BALANCE.summitObols);
});
test('offline cap, repeated loads, clock rollback and failed commits',()=>{
  const s=newState(),store=memory();s.workers[0]=1;saveState(store,s,1000);
  const result=settleAndSave(s,store,1000+86400*3000);
  assert.equal(result.seconds,28800);assert.ok(result.obols>0);assert.ok(result.mountains>0);
  const again=loadState(store);assert.equal(settleAndSave(again,store,1000+86400*3000).obols,0);
  assert.equal(settleOffline(again,500).seconds,0);assert.equal(settleOffline(again,NaN).seconds,0);
  const timestamp=again.lastSeen;saveState(store,again,500);assert.equal(loadState(store).lastSeen,timestamp);
  const copy=structuredClone(again);assert.equal(settleAndSave(again,undefined,again.lastSeen+10000).failed,true);assert.deepEqual(again,copy);
});
test('coarse offline and live workers agree across environments within 1% earnings',()=>{
  const a=newState();a.workers=[10,2,1,0];a.lastSeen=1000;const b=structuredClone(a);
  const game=new GameSession(a);game.resume();for(let i=0;i<600*20;i++)game.tick(.05);
  settleOffline(b,601000);assert.ok(Math.abs(a.obols-b.obols)/a.obols<.01);assert.equal(a.runSummits,b.runSummits);
  assert.ok(a.runSummits>5);assert.ok(Number.isFinite(a.boulderVelocity));
});
test('prestige gates, deeper rewards, exact resets and preserved records',()=>{
  const s=newState();assert.equal(prestige(s),false);s.runSummits=BALANCE.prestigeAt;s.completedClimbs=10n;s.totalPushes=500n;s.obols=999;s.workers=[10,2,1,0];s.upgrades=[2,3,4];s.cosmetics=['gold','royal'];s.discoveries=['Hades'];s.achievements=['First Summit'];s.divine=[1,0,0,0];
  assert.equal(favorGain(s),BALANCE.prestigeFavor);assert.equal(prestige(s),true);assert.equal(s.favor,BALANCE.prestigeFavor);assert.equal(s.runSummits,0);assert.deepEqual(s.workers,[0,0,0,0]);assert.deepEqual(s.upgrades,[0,0,0]);assert.equal(s.obols,0);assert.equal(s.completedClimbs,10n);assert.equal(s.totalPushes,500n);assert.deepEqual(s.cosmetics,['gold','royal']);assert.deepEqual(s.discoveries,['Hades']);assert.deepEqual(s.achievements,['First Summit']);assert.equal(s.divine[0],1);assert.equal(prestige(s),false);assert.equal(buyDivine(s,1),true);assert.equal(s.favor,BALANCE.prestigeFavor-2);
  s.runSummits=BALANCE.prestigeAt*2;assert.ok(favorGain(s)>10);
});
test('legacy migration, malformed fields and nonfinite values are safe',()=>{
  const legacy=loadState({getItem:()=>JSON.stringify({totalPushes:'999',completedClimbs:'7',climbPushes:42})});assert.equal(legacy.totalPushes,999n);assert.equal(legacy.completedClimbs,7n);assert.equal(legacy.climbPushes,42);assert.equal(legacy.highWater,42);assert.ok(legacy.discoveries.includes('Hades'));
  const s=loadState({getItem:()=>'{"schema":2,"totalPushes":"1","completedClimbs":"0","climbPushes":12,"obols":1e309,"workers":[-1,1e309,"3",3.9],"divine":null,"cosmetics":["gold","royal"]}'});
  assert.equal(s.obols,0);assert.deepEqual(s.workers,[0,0,0,3]);assert.deepEqual(s.cosmetics,['stone','linen']);assert.equal(s.highWater,12);
});
test('duplicate inputs are rate limited; Defiance expires without stopping automation',()=>{
  const s=newState(),g=new GameSession(s);s.workers[0]=1;g.resume();assert.equal(g.push(),true);for(let i=0;i<100;i++)assert.equal(g.push(),false);
  for(let n=0;n<BALANCE.defianceClicks-1;n++){for(let i=0;i<3;i++)g.tick(.05);assert.equal(g.push(),true);}assert.equal(s.boost,BALANCE.defianceDuration);
  for(let i=0;i<(BALANCE.defianceDuration+1)*20;i++)g.tick(.05);assert.equal(s.boost,0);assert.ok(s.obols>0);assert.ok(s.boulderVelocity>0);
});
