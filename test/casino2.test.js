import {spinMilestones} from '../src/casino-milestones.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../src/state.js';
import {earnSpinEnergy,spinPush,spinProduction,spinEarned,casinoCheckpoints,resolveReel} from '../src/casino.js';
import {settleOffline} from '../src/simulation.js';
import {prestige,BALANCE} from '../src/progression.js';
const unlocked=()=>Object.assign(newState(),{runSummits:3,boulderVelocity:1,spinClaims:spinMilestones().map(m=>m.id)});
const roundtrip=s=>{let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(storage,s,1000);return loadState(storage);};
test('energy unlock, unrestricted storage and checkpoint energy preserve payouts',()=>{
 const locked=newState();earnSpinEnergy(locked,100);assert.equal(locked.spins,0);
 const s=unlocked();earnSpinEnergy(s,10000);assert.equal(s.spins,100);assert.equal(s.spinEnergy,0);
 casinoCheckpoints(s,0,25,1000);assert.equal(s.spinEnergy,15);const money=s.obols;casinoCheckpoints(s,0,25,1000);assert.equal(s.obols,money);
 casinoCheckpoints(s,25,100,1000);assert.equal(s.spinEnergy,75);
 s.spinEnergy=100;const before=s.obols;earnSpinEnergy(s,30);assert.equal(s.obols,before);assert.equal(s.spinEnergy,30);assert.equal(s.spins,101);
});
test('no tokens or choices are generated; interactive spins add one guaranteed meter point each',()=>{
 const s=unlocked();s.jackpotMeter=95;
 for(let i=0;i<30;i++){s.spins=1;s.climbPushes=0;s.highWater=100;spinEarned(s,1000);}
 assert.equal(s.holdTokens,0);assert.equal(s.jackpotMeter,25);assert.equal(s.activeSpins,30);assert.equal(s.jackpotWins,1);
});

test('rare five Flame pays one bounded Mega multiplier with one guaranteed meter point or double-applying synergy',()=>{
 const s=unlocked();s.jackpotMeter=95;const event=resolveReel(s,Array(5).fill('flame'),100,false,true);
 assert.equal(event.total,4800);assert.equal(event.jackpot,0);assert.equal(s.obols,4800);assert.equal(s.jackpotMeter,96);assert.equal(s.reelStrength,1.2);assert.equal(s.reelRemaining,20);assert.equal(event.duration,20);assert.equal(roundtrip(s).pendingReels[0].mega,true);
});
