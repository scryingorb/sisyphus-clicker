import {readFileSync,writeFileSync} from 'node:fs';
import {COMBINATIONS,reelOdds} from '../src/casino.js';
import {casinoRewardScale} from '../src/casino-rewards.js';
import {newState} from '../src/state.js';
import {purchasePreview} from '../src/progression.js';
const before=JSON.parse(readFileSync('test-results/casino3-baseline.json','utf8'));
const after=JSON.parse(readFileSync('test-results/casino3-final.json','utf8'));
const odds=reelOdds();
const examples=before.casino2Runs.frequent.spinSamples.filter(x=>[4,16,28].includes(x.mountain)).map(x=>{
 const s={...newState(),...x.snapshot},scale=casinoRewardScale(s);
 const costs=[0,1,2,3].flatMap(i=>['worker','tier'].map(kind=>purchasePreview(s,kind,i))).filter(x=>x.count&&x.gain>0&&Number.isFinite(x.cost));
 const cheapest=Math.min(...costs.map(x=>x.cost));
 return {mountain:x.mountain,before:x.base,base:scale.base,seconds:scale.seconds,heightPercent:scale.heightPercent,cheapestProductionPurchase:cheapest,purchasePercent:100*scale.base/cheapest,pair:scale.base*1.5,five:scale.base*16};
});
const comparison=Object.entries(after.casino2Runs).map(([name,v])=>({name,before:before.casino2Runs[name].seconds,after:v.seconds,changePercent:100*(v.seconds/before.casino2Runs[name].seconds-1),energySpinsPerHour:v.spinsPerHour,totalSpinsPerHour:v.totalSpinsPerHour,freeSpins:v.freeSpinsEarned,averagePayout:v.averageSpinReward,jackpots:v.jackpots,longestPurchaseGap:v.longestPurchaseGap}));
const expectedFactor=Object.entries(COMBINATIONS).reduce((n,[k,c])=>n+odds[k]*c.factor,0);
const report={odds,expectedFactor,examples,comparison,strategies:after.casino3Runs};
writeFileSync('test-results/casino3-comparison.json',JSON.stringify(report,null,2));
console.log('Historical simulation comparison written; current spin odds exclude removed HOLD and BANK/PRESS mechanics.');
