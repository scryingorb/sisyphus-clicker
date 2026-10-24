import {validBatch,cleanBatchRounds} from './casino-batch.js';
// Presentation bookkeeping only: these functions never credit money or change bonuses.
export const REVEAL_LIMIT=24;
export function queueReveal(s,event){
  s.pendingReels??=[];s.reelOverflow??={count:0,total:0};
  if(s.pendingReels.length<REVEAL_LIMIT&&!s.reelOverflow.count)s.pendingReels.push(structuredClone(event));
  else {s.reelOverflow.count=Math.min(Number.MAX_SAFE_INTEGER,s.reelOverflow.count+1);s.reelOverflow.total=Math.min(1e100,s.reelOverflow.total+event.total+event.jackpot);}
}
export function nextReveal(s){return s.pendingReels?.[0]??(s.reelOverflow?.count?{id:'summary',batch:true,count:s.reelOverflow.count,total:s.reelOverflow.total,jackpot:0,symbols:[],steps:[]}:null);}
export function completeReveal(s,event){
  if(event.batch&&!event.spinBatch){if(!s.reelOverflow?.count)return false;s.reelOverflow.count=Math.max(0,s.reelOverflow.count-event.count);s.reelOverflow.total=Math.max(0,s.reelOverflow.total-event.total);return true;}
  if(s.pendingReels?.[0]?.id!==event.id)return false;s.pendingReels.shift();return true;
}
export function loadReveals(s,data){
  const validSymbols=['lightning','laurel','coin','boulder','hourglass','flame','lyre','trident'];
  const validLabels=['No match','One pair','Two pair','Three of a kind','Full house','Four of a kind','Five of a kind','Optional bonus','Risk success','Risk miss','Banked bonus','Mountain reward base','Divine Reels','Athena blessing','Relic synergy · Gauntlet of Atlas','Relic synergy · Charon’s Toll','Relic synergy · Spark of Zeus','Relic synergy · Hourglass of Chronos'];
  const num=v=>Number.isFinite(v)&&v>=0&&v<=1e100;
  s.pendingReels=[];
  for(const e of (Array.isArray(data.pendingReels)?data.pendingReels:[]).slice(0,REVEAL_LIMIT)){
    if(e?.spinBatch&&Number.isSafeInteger(e.id)&&e.id>0&&validBatch(e)&&e.count===e.requested){
      s.pendingReels.push({id:e.id,batch:true,spinBatch:true,requested:e.requested,count:e.count,total:e.total,jackpot:0,jackpotTotal:Number.isFinite(e.jackpotTotal)?Math.max(0,e.jackpotTotal):0,percent:e.percent,distance:e.distance,combinations:{...e.combinations},rounds:cleanBatchRounds(e.rounds),push:null,symbols:Array.isArray(e.symbols)&&e.symbols.length===5&&e.symbols.every(x=>validSymbols.includes(x))?[...e.symbols]:[],steps:[],unit:'Obols',kind:'reward'});continue;
    }
    if(!Number.isSafeInteger(e?.id)||e.id<1||s.pendingReels.some(x=>x.id===e.id)||!num(e.total)||!num(e.jackpot)||!Array.isArray(e.symbols)||![3,5].includes(e.symbols.length)||!e.symbols.every(x=>validSymbols.includes(x)))continue;
    const steps=Array.isArray(e.steps)?e.steps.slice(0,4).filter(x=>validLabels.includes(x.label)&&['base','multiply'].includes(x.operation)&&num(x.value)&&num(x.result)):[];
    const scale=e.rewardScale;const rewardScale=scale&&['base','referenceIncome','windowSeconds','fullValue','mountain','pace','cap','seconds','heightPercent'].every(k=>num(scale[k]))?Object.fromEntries(['base','referenceIncome','windowSeconds','fullValue','mountain','pace','cap','seconds','heightPercent'].map(k=>[k,scale[k]])):undefined;
    const p=e.push;const push=p&&['mountain','from','to','percent','distance','requestedPercent'].every(k=>num(p[k]))&&p.from<=p.to&&p.to<=100&&p.percent<=18?Object.fromEntries(['mountain','from','to','percent','distance','requestedPercent'].map(k=>[k,p[k]])):undefined;
    s.pendingReels.push({push,combination:['unmatched','pair','twoPair','triple','fullHouse','four','five'].includes(e.combination)?e.combination:undefined,label:['No match','One pair','Two pair','Three of a kind','Full house','Four of a kind','Five of a kind'].includes(e.label)?e.label:undefined,matched:validSymbols.filter(x=>Array.isArray(e.matched)&&e.matched.includes(x)),rewardScale,held:Array.from({length:e.symbols.length},(_,i)=>i).map(i=>e.held?.[i]===true),mega:e.mega===true,id:e.id,total:e.total,jackpot:e.jackpot,symbols:[...e.symbols],steps,summit:e.summit===true,count:[1,2,3,4,5].includes(e.count)?e.count:1,symbol:validSymbols.includes(e.symbol)?e.symbol:'',special:e.special===true,effect:['click','worker','earn'].includes(e.effect)?e.effect:'',strength:num(e.strength)?Math.min(1.2,e.strength):1,duration:num(e.duration)?Math.min(30,e.duration):0,unit:'Obols',kind:'reward'});
  }
  s.reelOverflow={count:Number.isSafeInteger(data.reelOverflow?.count)?Math.max(0,data.reelOverflow.count):0,total:num(data.reelOverflow?.total)?data.reelOverflow.total:0};
}
export function reelMotion(age,index,summit=false,reduced=false){
  const stop=(summit?1.35:1.15)+index*.25;
  const t=reduced?1:Math.max(0,Math.min(1,(age-.18)/(stop-.18)));
  // A finite strip travels continuously, then decelerates to the exact center cell.
  return {position:(18+index*2)*(1-(1-t)**3),stopped:t===1,stop};
}
