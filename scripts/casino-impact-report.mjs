import {readFileSync,writeFileSync} from 'node:fs';
import {newState} from '../src/state.js';
import {COMBINATIONS,reelOdds,rollSymbols,classifyRoll} from '../src/casino.js';
import {casinoRewardScale} from '../src/casino-rewards.js';
import {CASINO_PUSH_PERCENT} from '../src/simulation.js';
import {mountain,purchasePreview} from '../src/progression.js';
const baseline=JSON.parse(readFileSync('test-results/impact-baseline.json','utf8'));
const after=JSON.parse(readFileSync('test-results/overhaul-economy.json','utf8'));
const odds=reelOdds(),counts=Object.fromEntries(Object.keys(COMBINATIONS).map(k=>[k,0])),rng=newState(),samples=100000;
for(let i=0;i<samples;i++)counts[classifyRoll(rollSymbols(rng,false,true)).kind]++;
const oldOdds=JSON.parse(readFileSync('test-results/impact-baseline-odds.json','utf8').replace(/^\uFEFF/,''));
const expected=Object.entries(COMBINATIONS).reduce((n,[k,c])=>n+odds[k]*c.factor,0);
const examples=baseline.casino2Runs.frequent.spinSamples.filter(x=>[4,16,28].includes(x.mountain)).map(row=>{
 const s={...newState(),...row.snapshot},scale=casinoRewardScale(s),m=mountain(s),kind='triple',percent=Math.min(6,CASINO_PUSH_PERCENT[kind]*Math.sqrt(m.pace));
 const offers=[0,1,2,3].flatMap(i=>['worker','tier'].map(k=>purchasePreview(s,k,i))).filter(x=>x.count&&x.gain>0&&Number.isFinite(x.cost));
 const cheapest=Math.min(...offers.map(x=>x.cost));
 return {mountain:row.mountain,base:scale.base,oldTriple:scale.base*4,consolation:scale.base*.65,pair:scale.base*3,triple:scale.base*10,mega:scale.base*48,triplePercent:percent,tripleDistance:m.length*percent/100,cheapestProductionPurchase:cheapest,triplePurchasePercent:scale.base*10/cheapest*100};
});
const labels={casual:'Casual spins',frequent:'Frequent active',holds:'Atlas/Zeus + Ares',risk:'Atlas/Zeus + Athena',workers:'Automation focused',poor:'Forced no matches',good:'Forced every-spin Mega',returning:'Post-prestige',long:'40 mountains'};
const runs=Object.entries(after.casino2Runs).map(([id,r])=>({id,label:labels[id],before:baseline.casino2Runs[id].seconds,after:r.seconds,changePercent:(r.seconds/baseline.casino2Runs[id].seconds-1)*100,averageObolsBefore:baseline.casino2Runs[id].averageSpinReward,averageObolsAfter:r.averageSpinReward,pushPercent:r.casinoPushPercent,pushContribution:r.casinoMountainContribution,averagePushPercent:r.averagePushPercent,spins:r.spun,milestoneSpins:r.freeSpinsEarned,jackpots:r.jackpots,longestPurchaseGap:r.longestPurchaseGap}));
const output={oldOdds,odds,counts,samples,expected,examples,runs};writeFileSync('test-results/casino-impact-comparison.json',JSON.stringify(output,null,2));
const f=n=>n.toLocaleString('en-US',{maximumFractionDigits:3});
writeFileSync('docs/casino-impact.md',`# Casino hit frequency and climbing impact

Current rules supersede the historical Casino 3.0 report. HOLD and BANK/PRESS remain removed; Golden Boulder remains automatic. No dependencies added.

## Probability and payout

Old exact earned-spin match rate: ${f((1-oldOdds.odds.unmatched)*100)}%. New exact rate: ${f((1-odds.unmatched)*100)}%; measured over ${samples} seeded spins: ${f((1-counts.unmatched/samples)*100)}%.

Six symbols could not reach the requested no-match frequency with independent reels: even uniform weights give only 9.259% all-distinct rolls. Apollo Lyre and Poseidon Trident expand the set to eight original vector symbols, each with 12.5% weight. The 40% Echo assist is removed. A disclosed 0.3% earned-spin alignment retains attainable Mega jackpots. Checkpoint rolls use the same raw eight-symbol distribution without alignment. Evaluation remains order-independent with one primary result.

| Combination | Multiplier | Exact earned-spin odds | Seeded measurement | Standard-mountain push |
| --- | ---: | ---: | ---: | ---: |
${Object.entries(COMBINATIONS).map(([k,c])=>`| ${c.label} | ${c.factor}x | ${f(odds[k]*100)}% | ${f(counts[k]/samples*100)}% | ${CASINO_PUSH_PERCENT[k]}% |`).join('\n')}

Expected primary Obol factor changes from ${f(oldOdds.expected)}x to ${f(expected)}x before synergies and guaranteed jackpots. Base pricing remains the permanent-production formula with its mountain-aware floor/cap. No temporary-buff repricing. Successful tiers pay 2-3 times their old multipliers; consolation falls from 1x to 0.65x. Existing bounded relic/Athena bonuses, temporary effects and guaranteed meter payouts remain.

## Real Casino Push

Only player-spent earned/milestone spins produce pushes. Multiply the tier percentage above by square-root mountain pace (relief 0.78, standard 1, challenge 1.15), then cap at 6% and the distance remaining to the summit. No permanent click-power change. Ordinary rollback and workforce physics continue afterward.

Pushes use the same high-water, relic-checkpoint, casino-checkpoint and summit-return path as normal movement. Their distance does not also earn height Obols: the explicit spin payout already pays the reward. Checkpoint rewards/energy can occur once, but checkpoint rolls never produce further Casino Pushes. A new spin is unavailable during the existing return transition. Five stored maximum-tier spins advance at most 30% before clipping, far short of an infinite reward cycle.

Settlement applies Obols and distance immediately, independently of animation FPS. The cabinet immediately says WIN SECURED and shows actual awarded progress. An energy trail, push pose and 0.65-second scene interpolation visualize that real state change while the seeded reels resolve. Final results retain actual percent, distance and pricing mountain; later reveals never move the boulder again. This deliberately avoids delaying gameplay until a long reel animation ends. Reduced motion skips travel/interpolation but retains the numeric award. Consecutive effects replace the previous scene surge.

Same baseline build snapshots; no relic multiplier in these examples, and enough climb remaining:

| Mountain | Consolation | Pair | Triple (old -> new) | Mega | Triple progress | Triple distance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${examples.map(x=>`| ${x.mountain} | ${f(x.consolation)} | ${f(x.pair)} | ${f(x.oldTriple)} -> ${f(x.triple)} | ${f(x.mega)} | ${f(x.triplePercent)}% | ${f(x.tripleDistance)} m |`).join('\n')}

Cheapest positive-production purchase ratios are included in the JSON report; purchase prices, worker power and mountain scaling were not rewritten.

## Before and after simulations

Times are seconds to first prestige, except the 40-mountain run. Historical harness keys named holds/risk now identify relic loadouts, not removed mechanics.

| Strategy | Before | After | Change | Casino share of total ascent |
| --- | ---: | ---: | ---: | ---: |
${runs.map(r=>`| ${r.label} | ${f(r.before)} | ${f(r.after)} | ${f(r.changePercent)}% | ${f(r.pushContribution*100)}% |`).join('\n')}

Frequent active average Obols per spin: ${f(runs[1].averageObolsBefore)} -> ${f(runs[1].averageObolsAfter)}. Its ${runs[1].spins} spins contribute ${f(runs[1].pushPercent)} percentage points across 28 mountains, averaging ${f(runs[1].averagePushPercent)} points per spin. It earns ${runs[1].milestoneSpins} milestone spins; longest purchase gap ${f(runs[1].longestPurchaseGap)} seconds. Contributions measure awarded uphill distance and can include later rollback; they are not permanent protected height.

First-three-mountain control pacing remains 62.1 / 63.3 / 120.7 seconds, with first worker at 45 seconds. The automatic Golden variant is unchanged by this update. No-casino progression remains viable at 8,164 seconds to prestige. Forced no-match/every-spin-Mega runs are extreme bounds, not realistic luck percentiles. The latter accelerates greatly because it replaces a 0.324% result with 100%; normal seeded runs remain controlled.

## Validation

Focused coverage includes exact and seeded probabilities, tier rewards, mountain pace, actual distance, checkpoint/summit crossing, no duplicate height payment, no recursive spin loop, reload/dismiss/offline/prestige safety and old pending rewards. Existing save schema remains compatible; old pending payouts get no retroactive push.

Browser validation covers all seven tiers at 1440/1280/800/390 widths, five STOP controls, real saved progress, summit clipping, reduced motion and reload. Rendered screenshots include the energy trail and readable result panels. Sound uses the existing bounded synthesized cues, with a modest consolation note and stronger winning impacts. No perceptual sound-quality review or sustained FPS benchmark was performed.

Reproduce with node scripts/progression-sim.mjs src test-results/overhaul-economy.json, node scripts/casino-impact-report.mjs, and node scripts/casino-impact-smoke.mjs. Full test/build status is reported at delivery. No commit or release.
`);
console.log('Impact odds, examples and economy comparison written.');
