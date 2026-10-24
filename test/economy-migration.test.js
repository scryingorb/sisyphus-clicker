import test from 'node:test';
import assert from 'node:assert/strict';
import { newState,loadState,saveState } from '../src/state.js';
import { BALANCE,mountain,workerUnlocked,quote,favorGain,prestige,prestigeRequirement } from '../src/progression.js';
import { settleOffline } from '../src/simulation.js';
function legacy(run,overrides={}){return {...newState(),schema:3,totalPushes:'999',completedClimbs:String(run),runSummits:run,climbPushes:45,highWater:60,obols:12345,workers:[7,0,0,0],tierUpgrades:[2,0,0,0],favor:13,divine:[1,2,1,0],cosmetics:run>=8?['gold','royal']:['stone','linen'],...overrides};}
test('old unbought worker unlocks and all balances survive migration and repeated loads',()=>{
  for(const [run,expected] of [[0,[true,false,false,false]],[1,[true,true,false,false]],[3,[true,true,true,false]],[5,[true,true,true,true]]]){
    const data=legacy(run),s=loadState({getItem:()=>JSON.stringify(data)});
    assert.deepEqual(s.workerUnlocks,expected);assert.equal(mountain(s).environment,run%5);
    for(const key of ['obols','favor','workers','tierUpgrades','divine','cosmetics','climbPushes','highWater'])assert.deepEqual(s[key],data[key]);
    let raw;const store={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(store,s,1000);
    const again=loadState(store);assert.equal(again.schema,7);assert.deepEqual(again.workerUnlocks,expected);
    for(let i=0;i<4;i++)if(expected[i])assert.notEqual(quote(again,'worker',i).cost,Infinity);
  }
});
test('earned old prestige eligibility survives; a new run uses the longer threshold',()=>{
  const s=loadState({getItem:()=>JSON.stringify(legacy(15))});
  assert.equal(prestigeRequirement(s),15);assert.equal(favorGain(s),8);
  const favor=s.favor;assert.ok(prestige(s));assert.equal(s.favor,favor+8);
  assert.equal(prestigeRequirement(s),BALANCE.prestigeAt);assert.equal(s.legacyEnvironmentCycle,false);assert.deepEqual(s.workerUnlocks,[true,false,false,false]);
  s.runSummits=15;assert.equal(favorGain(s),0);s.runSummits=BALANCE.prestigeAt;assert.equal(favorGain(s),8);
});
test('owned out-of-threshold tiers remain usable and offline does not reannounce preserved unlocks',()=>{
  const s=loadState({getItem:()=>JSON.stringify(legacy(3,{workers:[25,10,3,1]}))});
  assert.ok(workerUnlocked(s,3));s.lastSeen=1000;const owned=[...s.workers],levels=[...s.tierUpgrades];
  const result=settleOffline(s,86401000);assert.equal(result.seconds,28800);
  assert.deepEqual(s.workers,owned);assert.deepEqual(s.tierUpgrades,levels);assert.equal(s.boost,0);
  assert.ok(!result.unlocks.some(x=>/^(Condemned Laborers|Bronze Automatons|Engines of Hephaestus)$/.test(x)));
});
