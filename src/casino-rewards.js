import {mountain,heightRate,autoSpeed,manualBase} from './progression.js';
const bounded=value=>Number.isFinite(value)?Math.max(0,Math.min(1e100,value)):value===Infinity?1e100:0;
// Permanent production reference. Temporary buffs and current momentum never price a spin.
// Resolve once when SPIN consumes an earned opportunity; save the resulting snapshot.
export function casinoRewardScale(s){
 const stable={...s,boost:0,goldenBoost:0,tollRemaining:0,passiveSeconds:0,reelRemaining:0,blessingRemaining:0};
 const m=mountain(stable),favor=1+.2*stable.divine[2],rate=heightRate(stable)*favor;
 const fullValue=bounded(m.length*rate),workerSpeed=autoSpeed(stable)*m.length/100;
 // One sustainable push/second at the existing 0.35 drag; use the stronger reference,
 // not a product of correlated height, resistance, workers and click strength.
 const speed=Math.min(m.length*.12,Math.max(workerSpeed,manualBase(stable)/.35));
 const referenceIncome=bounded(speed*rate),windowSeconds=40*Math.sqrt(m.pace);
 const cap=fullValue*.012*m.pace,floor=fullValue*.002;
 const base=bounded(Math.min(cap,Math.max(floor,referenceIncome*windowSeconds)));
 return {base,referenceIncome,windowSeconds,fullValue,mountain:s.runSummits+1,pace:m.pace,cap,seconds:referenceIncome>0?base/referenceIncome:0,heightPercent:fullValue>0?100*base/fullValue:0};
}
