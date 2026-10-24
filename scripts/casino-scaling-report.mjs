import {readFile,writeFile} from 'node:fs/promises';
import {newState} from '../src/state.js';
import {casinoRewardScale} from '../src/casino-rewards.js';
const baseline=JSON.parse(await readFile('test-results/scaled-baseline-samples.json','utf8'));
const after=JSON.parse(await readFile(process.argv[2]||'test-results/scaled-tuned.json','utf8'));
const examples=baseline.casino2Runs.frequent.spinSamples.map(row=>{
 const s=Object.assign(newState(),row.snapshot),scale=casinoRewardScale(s);
 return {mountain:row.mountain,classification:row.classification,oldBase:row.base,newBase:scale.base,pair:scale.base*2,triple:scale.base*4,oldSeconds:row.base/scale.referenceIncome,newSeconds:scale.seconds,window:scale.windowSeconds,heightEarningsPercent:scale.heightPercent,referenceIncome:scale.referenceIncome,directProgressPercent:0};
});
const strategies=Object.fromEntries(Object.entries(after.casino2Runs).map(([name,run])=>{const old=baseline.casino2Runs[name];return [name,{beforeSeconds:old.seconds,afterSeconds:run.seconds,changePercent:100*(run.seconds/old.seconds-1),oldAverageReward:old.averageSpinReward,newAverageReward:run.averageSpinReward,oldSpinsPerHour:old.spinsPerHour,newSpinsPerHour:run.spinsPerHour,oldPurchaseGap:old.longestPurchaseGap,newPurchaseGap:run.longestPurchaseGap,oldJackpots:old.jackpots,newJackpots:run.jackpots}];}));
await writeFile('test-results/casino-scaling-comparison.json',JSON.stringify({examples,strategies},null,2));
console.log(JSON.stringify({examples:examples.filter(x=>[4,5,8,9,10,16,22,28].includes(x.mountain)),strategies},null,2));
