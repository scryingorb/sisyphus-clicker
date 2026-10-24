import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {spinEarned,reelOdds} from '../src/casino.js';
import {GameSession} from '../src/session.js';
import {prestige} from '../src/progression.js';
const reload=s=>{let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};saveState(storage,s,1000);return loadState(storage);};
test('legacy pending bonus is banked once, old holds cleared, and prestige needs no decision',()=>{
 const s=Object.assign(newState(),{runSummits:28,obols:100,earned:100,riskDecision:{bonus:25},holdTokens:2,held:[true,true,false,false,false],lastSymbols:Array(5).fill('coin')});
 const loaded=reload(s);assert.equal(loaded.obols,125);assert.equal(loaded.earned,125);assert.equal(loaded.riskDecision,null);assert.equal(loaded.holdTokens,0);assert.ok(loaded.held.every(x=>!x));
 const again=reload(loaded);assert.equal(again.obols,125);assert.equal(again.earned,125);assert.ok(prestige(again));assert.equal(again.obols,0);
});
test('continuous spins never offer choices or issue tokens; old selected holds cannot influence RNG',()=>{
 const a=Object.assign(newState(),{runSummits:3}),b=structuredClone(a);a.holdTokens=2;a.held=[true,true,false,false,false];a.lastSymbols=Array(5).fill('flame');
 for(let i=0;i<30;i++){a.spins=b.spins=1;assert.deepEqual(spinEarned(a).symbols,spinEarned(b).symbols);assert.equal(a.riskDecision,null);assert.equal(a.holdTokens,0);}
 assert.ok(Math.abs(reelOdds().five-.003243408203125)<1e-10);
});
test('Golden Boulder automatically activates in active session, pauses correctly and does not refresh on reload',()=>{
 const s=newState();s.goldenCooldown=.01;const session=new GameSession(s);session.tick(.2);assert.equal(s.goldenClaims,0);session.resume();session.tick(.2);
 assert.equal(s.goldenClaims,1);assert.equal(s.goldenWindow,0);assert.ok(s.goldenBoost>19&&s.goldenBoost<=20);
 const loaded=reload(s);assert.equal(loaded.goldenClaims,1);assert.equal(loaded.goldenBoost,s.goldenBoost);
 session.pause();const duration=s.goldenBoost;session.tick(1);assert.equal(s.goldenBoost,duration);
});
