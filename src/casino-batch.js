import {spinEarned,COMBINATIONS} from './casino.js';
import {queueReveal} from './reel-presentation.js';

// A bounded, persisted command. Each completed spin is paid exactly once; only
// the unspent remainder resumes after a summit return or a reload.
export function startSpinBatch(s){
 if(s.spinBatch||s.casinoDisabled||s.runSummits<3||s.isResetting||s.spins<1)return null;
 s.spinBatch={requested:Math.min(10,s.spins),count:0,total:0,jackpot:0,percent:0,distance:0,combinations:{},rounds:[],push:null};
 advanceSpinBatch(s);return s.spinBatch||s.casinoEvent;
}
export function advanceSpinBatch(s){
 const job=s.spinBatch;if(!job||s.casinoOffline||s.runSummits<3)return;
 while(job.count<job.requested&&!s.isResetting&&s.spins>0){
  const before=s.obols;
  s.casinoBatchCollect=true;
  let event;try{event=spinEarned(s,true);}finally{delete s.casinoBatchCollect;}
  if(!event)break;
  job.count++;job.total+=s.obols-before;job.rounds??=[];job.rounds.push({symbols:[...event.symbols],combination:event.combination,total:event.total+event.jackpot});
  job.combinations[event.combination]=(job.combinations[event.combination]||0)+1;
  job.percent+=event.push.percent;job.distance+=event.push.distance;
  if(event.push.percent>0){
   const previous=job.push;
   job.push=previous?.mountain===event.push.mountain?{...event.push,from:previous.from,percent:previous.percent+event.push.percent,distance:previous.distance+event.push.distance,requestedPercent:previous.requestedPercent+event.push.requestedPercent}:event.push;
  }
 }
 if(job.count===job.requested||!s.spins){
  const event={...job,id:s.casinoRolls,batch:true,spinBatch:true,symbols:[...s.lastSymbols],steps:[],
   total:job.total,jackpot:0,jackpotTotal:job.jackpot,unit:'Obols',kind:'reward'};
  s.spinBatch=null;s.casinoEvent=event;queueReveal(s,event);
 }
}
export function validBatch(v){
 return v&&Number.isInteger(v.requested)&&v.requested>=1&&v.requested<=10&&Number.isInteger(v.count)&&v.count>=0&&v.count<=v.requested&&
 ['total','jackpot','percent','distance'].every(k=>Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1e100)&&v.percent<=180&&
 v.combinations&&Object.entries(v.combinations).every(([k,n])=>k in COMBINATIONS&&Number.isInteger(n)&&n>=0&&n<=10)&&
 Object.values(v.combinations).reduce((n,x)=>n+x,0)===v.count;
}
export function loadSpinBatch(s,data){
 const v=data.spinBatch;
 s.spinBatch=validBatch(v)&&v.count<v.requested?{requested:v.requested,count:v.count,total:v.total,jackpot:v.jackpot,percent:v.percent,distance:v.distance,combinations:{...v.combinations},rounds:cleanBatchRounds(v.rounds),push:null}:null;
}

export function cleanBatchRounds(rounds){return Array.isArray(rounds)?rounds.slice(0,10).filter(r=>r&&Array.isArray(r.symbols)&&r.symbols.length===5&&r.symbols.every(x=>['lightning','laurel','coin','boulder','hourglass','flame','lyre','trident'].includes(x))&&r.combination in COMBINATIONS&&Number.isFinite(r.total)&&r.total>=0&&r.total<=1e100).map(r=>({symbols:[...r.symbols],combination:r.combination,total:r.total})):[];}
