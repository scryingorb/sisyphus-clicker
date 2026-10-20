import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeFileSync,mkdirSync } from 'node:fs';
const root=process.argv[2]||'src',output=process.argv[3]||'test-results/mountains-after.json';
const load=file=>import(pathToFileURL(path.resolve(root,file)));
const {newState}=await load('state.js'),{GameSession}=await load('session.js'),{advanceProgress,settleOffline}=await load('simulation.js');
const P=await load('progression.js');
function run(mode='relaxed',state=newState(),imperfect=false){
  const game=new GameSession(state);game.resume();
  const mountains=[],events=[],purchases=[],snapshots=[];let nextClick=0,lastSummit=state.runSummits,lastTime=0,lastPurchase=0,lastProgress=0,bestHeight=0;
  const unlocked=new Set([0]);let firstUpgrade=false,firstWorker=false;
  const interval=imperfect?20:15;
  for(let frame=0;frame<43200*20;frame++){
    const t=frame/20;
    const clicking=!firstWorker||mode==='relaxed'||mode==='burst'&&t%45<5;
    if(clicking&&t>=nextClick-1e-8){game.push();nextClick=t+(firstWorker&&mode==='burst'?.5:1);}
    advanceProgress(state,.05);
    if(state.climbPushes>bestHeight+.001){bestHeight=state.climbPushes;lastProgress=t;}
    if(frame%(interval*20)===0){
      let choice;
      if(!firstUpgrade)choice={kind:'upgrade',i:0,q:1};
      else if(!firstWorker)choice={kind:'worker',i:0,q:1};
      else {
        const income=P.autoSpeed(state)*P.mountain(state).length/100*P.earningMultiplier(state)*(P.heightRate?P.heightRate(state):P.BALANCE.heightObols);
        const offers=[];
        for(let i=0;i<4;i++)for(const [kind,q] of [['worker',1],['worker',10],['tier',1]]){
          const p=P.purchasePreview(state,kind,i,q);
          if(p.count&&p.gain>=P.production(state)*.01&&Number.isFinite(p.cost)&&p.cost<=state.obols+income*(imperfect?0:30))offers.push({kind,i,q,...p});
        }
        const p=P.purchasePreview(state,'upgrade',2);
        if(p.count&&p.gain>=P.production(state)*.01&&p.cost<=state.obols+income*(imperfect?0:30))offers.push({kind:'upgrade',i:2,q:1,...p});
        // Imperfect: affordable-only, single purchases, take the second-best value
        // when possible. No milestone foresight or saving for a hidden future tier.
        offers.sort((a,b)=>b.gain/b.cost-a.gain/a.cost);
        choice=imperfect?(offers.filter(x=>x.q===1)[1]||offers[0]):offers[0];
      }
      if(choice){const before=P.production(state),owned=[...state.workers];if(P.buy(state,choice.kind,choice.i,choice.q)){
        if(choice.kind==='worker'){if(!owned[choice.i]&&choice.i>0)events.push({event:`first ${P.WORKERS[choice.i].name}`,seconds:t});for(const n of [10,25,50,100])if(owned[choice.i]<n&&state.workers[choice.i]>=n)events.push({event:`${P.WORKERS[choice.i].name} x${n}`,seconds:t});}
        purchases.push({seconds:t,gap:t-lastPurchase,kind:choice.kind,tier:choice.i,quantity:choice.q,gain:P.production(state)-before});lastPurchase=t;
        if(!firstUpgrade){firstUpgrade=true;events.push({event:'first upgrade',seconds:t});}
        else if(!firstWorker){firstWorker=true;events.push({event:'first worker',seconds:t});}
      }}
    }
    for(let i=1;i<4;i++)if(P.workerUnlocked(state,i)&&!unlocked.has(i)){unlocked.add(i);events.push({event:`unlock ${P.WORKERS[i].name}`,seconds:t});}
    if(state.runSummits!==lastSummit){mountains.push({mountain:lastSummit+1,seconds:t-lastTime,cumulative:t});lastTime=t;lastSummit=state.runSummits;bestHeight=0;lastProgress=t;}
    if([2,12,24].includes(state.runSummits)&&!snapshots.some(x=>x.summits===state.runSummits))snapshots.push({summits:state.runSummits,seconds:t,state:structuredClone(state)});
    if(P.favorGain(state)||t-lastProgress>1800){return {mode,imperfect,seconds:t,finished:!!P.favorGain(state),stalled:t-lastProgress>1800,favor:P.favorGain(state),firstFive:mountains.slice(0,5),mountains,events,longestPurchaseGap:Math.max(0,...purchases.map(x=>x.gap),t-lastPurchase),purchases:purchases.length,purchaseLog:purchases,snapshots,state};}
  }
  return {mode,imperfect,finished:false,seconds:43200,firstFive:mountains.slice(0,5),events,state};
}
function unaided(count){const rows=[];for(let n=0;n<5;n++){const s=newState();s.workers[0]=count;s.runSummits=n;let time=0;while(s.runSummits===n&&time<86400){advanceProgress(s,.05);time+=.05;}rows.push({mountain:n+1,seconds:Math.round(time*100)/100,finished:s.runSummits>n});}return rows;}
function singleClick(){const s=newState(),g=new GameSession(s);g.resume();g.push();for(let i=0;i<240;i++)advanceProgress(s,1/240);return {heightAfter1s:s.climbPushes*P.mountain(s).length/100,percentAfter1s:s.climbPushes};}
const relaxed=run(),burst=run('burst'),automation=run('automation'),imperfect=run('relaxed',newState(),true);
const next=structuredClone(burst.finished?burst.state:relaxed.state);let second=null;if(P.prestige(next)){P.buyDivine(next,1);P.buyDivine(next,1);P.buyDivine(next,2);second=run('burst',next);}
const clean=x=>x&&(({state,snapshots,...rest})=>rest)(x);
const offline=(burst.snapshots||[]).map(({summits,seconds,state})=>{const before=structuredClone(state);state.lastSeen=1000;const result=settleOffline(state,1000+86400000);return {absenceSeconds:86400,startSummits:summits,atActiveSeconds:seconds,workers:before.workers,tierUpgrades:before.tierUpgrades,boostAtDeparture:before.boost,...result,endRunSummits:state.runSummits,endHeight:state.climbPushes,prestigeAvailable:!!P.favorGain(state),favor:P.favorGain(state),purchasesWhileAway:0};});
const report={offline,assumptions:'50ms shared integrator. Opening: 1 click/s; relaxed continues 1/s, burst uses 2/s for 5s every 45s after recruitment, automation stops clicking after recruitment. Shop every 15s: manual upgrade then Shade, then displayed >=1% output gain per Obol, saving at most 30s income. Imperfect variant shops every 20s, buys affordable singles, takes second-best value where possible. Second run spends 6 Favor on workforce and 2 on earnings. Durations include automatic 2.9s return; unaided tests start each mountain from rest with no upgrades or Defiance.',click:singleClick(),oneShade:unaided(1),twoShades:unaided(2),relaxed:clean(relaxed),burst:clean(burst),automation:clean(automation),imperfect:clean(imperfect),second:clean(second)};
mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,relaxed:{...clean(relaxed),mountains:undefined,purchaseLog:undefined},burst:{...clean(burst),mountains:undefined,purchaseLog:undefined},automation:{...clean(automation),mountains:undefined,purchaseLog:undefined},imperfect:{...clean(imperfect),mountains:undefined,purchaseLog:undefined},second:second?{...clean(second),mountains:undefined,purchaseLog:undefined}:null},null,2));
