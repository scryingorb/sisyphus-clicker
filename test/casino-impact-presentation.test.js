import test from 'node:test';
import assert from 'node:assert/strict';
import {CasinoImpactPresentation} from '../src/casino-impact-presentation.js';

test('secured ascent stays hidden until reveal without changing settlement or normal movement',()=>{
 const state={runSummits:3,climbPushes:22,isResetting:false,obols:100};
 const award={mountain:4,from:20,to:22,percent:2};
 const view=new CasinoImpactPresentation();view.begin(award,state);
 assert.equal(view.project(state,0).climbPushes,20);
 state.climbPushes+=1;assert.equal(view.project(state,1).climbPushes,21);
 assert.equal(state.climbPushes,23);assert.equal(state.obols,100);
 assert.deepEqual(view.reveal(2.5),award);assert.equal(view.reveal(2.6),null);
 assert.equal(view.project(state,2.6).climbPushes,23);
 assert.equal(view.project(state,3.4),state);
});
test('summit settlement can continue while the old mountain waits for its visible reward',()=>{
 const state={runSummits:3,climbPushes:100,isResetting:true};
 const view=new CasinoImpactPresentation();view.begin({mountain:4,from:99,to:100,percent:1},state);
 assert.equal(view.project(state,0).isResetting,false);
 state.runSummits=4;state.climbPushes=0;state.isResetting=false;
 assert.equal(view.project(state,3).runSummits,3);assert.equal(view.project(state,3).climbPushes,99);
 view.reveal(3);assert.equal(view.project(state,3.1).climbPushes,100);
 assert.equal(view.project(state,4),state);
});
test('clearing or reloading visual state cannot reapply an award',()=>{
 const view=new CasinoImpactPresentation(),state={runSummits:3,climbPushes:10};
 assert.equal(view.reveal(0),null);
 view.begin({mountain:4,from:8,to:10,percent:2},state);view.clear();
 assert.equal(view.reveal(1),null);assert.equal(view.project(state,1),state);
});
