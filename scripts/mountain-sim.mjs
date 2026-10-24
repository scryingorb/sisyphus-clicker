import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeFileSync,mkdirSync } from 'node:fs';
const root=process.argv[2]||'src',output=process.argv[3]||'test-results/mountains-after.json';
const load=file=>import(pathToFileURL(path.resolve(root,file)));
const {newState}=await load('state.js'),{GameSession}=await load('session.js'),{advanceProgress,settleOffline}=await load('simulation.js');
const P=await load('progression.js');
const G=await load('golden.js').catch(()=>null);
const R=await load('relics.js').catch(()=>null);
const C=await load('casino.js').catch(()=>null);
function run(mode='relaxed',state=newState(),imperfect=false,target=28,catchGolden=false,relicIds=[],casino=null){
  state.casinoDisabled=!casino;state.casinoTestLuck=casino?.luck;
  const game=new GameSession(state);game.resume();
  const mountains=[],events=[],purchases=[],snapshots=[],spinSamples=[];let nextClick=0,lastSummit=state.runSummits,lastTime=0,lastPurchase=0,lastProgress=0,bestHeight=0;
  const unlocked=new Set([0]);let firstUpgrade=false,firstWorker=false;
  const interval=imperfect?20:15;
  const combinationCounts={};let noMatchTotal=0,noMatchCount=0,casinoPushPercent=0,casinoPushDistance=0;let nextSpin=0,spun=0,spinRewards=0,holdsUsed=0,heldRewards=0,riskChoices=0,riskPaid=0;
  let workerOutput=0,clickImpulse=0,autoDistance=0,climbDistance=0,bonusTime=0;
  for(let frame=0;frame<43200*20;frame++){
    const t=frame/20;
    const clicking=!firstWorker||mode==='relaxed'||mode==='burst'&&t%45<5;
    if(clicking&&t>=nextClick-1e-8){const before=state.boulderVelocity;if(game.push())clickImpulse+=(state.boulderVelocity-before)*P.mountain(state).length/100;nextClick=t+(firstWorker&&mode==='burst'?.5:1);}
    if(state.reelRemaining>0)bonusTime+=.05;
    workerOutput+=P.production(state)*.05;
    autoDistance+=P.autoSpeed(state)*P.mountain(state).length/100*.05;
    const previousHeight=state.climbPushes,previousLength=P.mountain(state).length;
    advanceProgress(state,.05);
    if(casino?.fate&&state.fatePending&&state.blessingRemaining<=0)C.chooseFate(state,casino.fate);
    if(casino?.interactive){
      if(state.spins&&t>=nextSpin){
        const m=P.mountain(state),event=C.spinEarned(state);
        if(event){
          const stable={...state,boost:0,goldenBoost:0,tollRemaining:0,passiveSeconds:0,reelRemaining:0,blessingRemaining:0};
          const workerIncome=P.idleIncome(stable),referenceIncome=Math.max(P.autoSpeed(stable)*m.length/100,P.manualBase(stable)/.35)*P.heightRate(stable)*(1+.2*stable.divine[2]);
          if(!spinSamples.some(x=>x.mountain===state.runSummits+1))spinSamples.push({mountain:state.runSummits+1,classification:m.challenge,pace:m.pace,workerIncome,referenceIncome,base:event.steps[0].result,total:event.total,secondsEquivalent:event.total/referenceIncome,heightEarningsPercent:100*event.total/(m.length*P.heightRate(stable)*(1+.2*stable.divine[2])),push:event.push,snapshot:{runSummits:stable.runSummits,workers:[...stable.workers],upgrades:[...stable.upgrades],tierUpgrades:[...stable.tierUpgrades],divine:[...stable.divine],relics:[...stable.relics],activeRelics:[...stable.activeRelics]}});
          casinoPushPercent+=event.push?.percent||0;casinoPushDistance+=event.push?.distance||0;combinationCounts[event.combination||'legacy']=(combinationCounts[event.combination||'legacy']||0)+1;if(event.combination==='unmatched'){noMatchCount++;noMatchTotal+=event.total;}spun++;spinRewards+=event.total+event.jackpot;if(event.held.some(Boolean)){holdsUsed++;heldRewards+=event.total+event.jackpot;}nextSpin=t+(casino.interactive==='casual'?180:10);}
      }
    }
    if(catchGolden)G?.advanceGolden(state,.05);
    climbDistance+=Math.max(0,state.climbPushes-previousHeight)*previousLength/100;
    if(state.climbPushes>bestHeight+.001){bestHeight=state.climbPushes;lastProgress=t;}
    if(frame%(interval*20)===0){
      let boughtRelic=false;
      const relic=R&&relicIds.map(id=>R.RELICS.find(r=>r.id===id)).find(r=>!state.relics.includes(r.id)&&R.relicAvailable(state,r.id)&&state.obols>=r.cost);
      if(relic){const before=P.production(state);boughtRelic=R.acquireRelic(state,relic.id);if(boughtRelic){events.push({event:'relic '+relic.id,seconds:t});purchases.push({seconds:t,gap:t-lastPurchase,kind:'relic',relic:relic.id,gain:P.production(state)-before});lastPurchase=t;}}
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
        choice=casino?.milestones?(offers.find(x=>x.kind==='worker'&&x.q===10&&[10,25,50,100].some(n=>state.workers[x.i]<n&&state.workers[x.i]+10>=n))||offers[0]):imperfect?(offers.filter(x=>x.q===1)[1]||offers[0]):offers[0];
      }
      if(choice&&!boughtRelic){const before=P.production(state),owned=[...state.workers];if(P.buy(state,choice.kind,choice.i,choice.q)){
        if(choice.kind==='worker'){if(!owned[choice.i]&&choice.i>0)events.push({event:`first ${P.WORKERS[choice.i].name}`,seconds:t});for(const n of [10,25,50,100])if(owned[choice.i]<n&&state.workers[choice.i]>=n)events.push({event:`${P.WORKERS[choice.i].name} x${n}`,seconds:t});}
        purchases.push({seconds:t,gap:t-lastPurchase,kind:choice.kind,tier:choice.i,quantity:choice.q,gain:P.production(state)-before});lastPurchase=t;
        if(!firstUpgrade){firstUpgrade=true;events.push({event:'first upgrade',seconds:t});}
        else if(!firstWorker){firstWorker=true;events.push({event:'first worker',seconds:t});}
      }}
    }
    for(let i=1;i<4;i++)if(P.workerUnlocked(state,i)&&!unlocked.has(i)){unlocked.add(i);events.push({event:`unlock ${P.WORKERS[i].name}`,seconds:t});}
    if(state.runSummits!==lastSummit){const seconds=t-lastTime;mountains.push({mountain:lastSummit+1,seconds,cumulative:t,averageWorkerPower:workerOutput/seconds,clickImpulse,averageAutoSpeed:autoDistance/seconds,effectiveClimbingSpeed:climbDistance/seconds});workerOutput=clickImpulse=autoDistance=climbDistance=0;lastTime=t;lastSummit=state.runSummits;bestHeight=0;lastProgress=t;}
    if([2,12,24].includes(state.runSummits)&&!snapshots.some(x=>x.summits===state.runSummits))snapshots.push({summits:state.runSummits,seconds:t,state:structuredClone(state)});
    if(state.runSummits>=target||t-lastProgress>1800){return {casinoPushPercent,casinoPushDistance,casinoMountainContribution:casinoPushPercent/Math.max(1,state.runSummits)*.01,averagePushPercent:spun?casinoPushPercent/spun:0,combinationCounts,noMatchCount,averageNoMatchReward:noMatchCount?noMatchTotal/noMatchCount:0,totalSpinsPerHour:(state.spinsEarned+(state.freeSpinsEarned||0))/Math.max(1,t)*3600,freeSpinsEarned:state.freeSpinsEarned||0,spinSamples,energySpinsEarned:state.spinsEarned,spinsPerHour:state.spinsEarned/Math.max(1,t)*3600,spinsStored:state.spins,energyReserve:state.spinEnergy,spun,averageSpinReward:spun?spinRewards/spun:0,holdsUsed,averageHeldReward:holdsUsed?heldRewards/holdsUsed:0,riskChoices,riskPaid,casinoRolls:state.casinoRolls,jackpots:state.jackpotWins,reelUptime:bonusTime/Math.max(1,t),earned:state.earned,averagePurchaseGap:purchases.length?t/purchases.length:0,mode,imperfect,seconds:t,finished:state.runSummits>=target,stalled:t-lastProgress>1800,favor:P.favorGain(state),goldenClaims:state.goldenClaims||0,relics:state.relics||[],firstFive:mountains.slice(0,5),mountains,events,longestPurchaseGap:Math.max(0,...purchases.map(x=>x.gap),t-lastPurchase),purchases:purchases.length,purchaseLog:purchases,snapshots,state};}
  }
  return {mode,imperfect,finished:false,seconds:43200,firstFive:mountains.slice(0,5),events,state};
}
function unaided(count){const rows=[];for(let n=0;n<5;n++){const s=newState();s.workers[0]=count;s.runSummits=n;let time=0;while(s.runSummits===n&&time<86400){advanceProgress(s,.05);time+=.05;}rows.push({mountain:n+1,seconds:Math.round(time*100)/100,finished:s.runSummits>n});}return rows;}
function singleClick(){const s=newState(),g=new GameSession(s);g.resume();g.push();for(let i=0;i<240;i++)advanceProgress(s,1/240);return {heightAfter1s:s.climbPushes*P.mountain(s).length/100,percentAfter1s:s.climbPushes};}
const relaxed=run(),burst=run('burst'),automation=run('automation'),imperfect=run('relaxed',newState(),true),late=run('burst',newState(),false,40),golden=run('relaxed',newState(),false,28,true);
const next=structuredClone(burst.finished?burst.state:relaxed.state);let second=null;if(P.prestige(next)){P.buyDivine(next,1);P.buyDivine(next,1);P.buyDivine(next,2);second=run('burst',next);}
const atlas=run('relaxed',newState(),false,28,false,['atlas']);
const passiveRelics=run('automation',newState(),false,28,false,['toll','chronos']);
const combined=run('relaxed',newState(),false,28,true,['atlas','zeus']);
const lateRelics=run('burst',newState(),false,40,true,['toll','chronos']);
let relicReturn=null;const inherited=structuredClone(combined.state);if(P.prestige(inherited)){P.buyDivine(inherited,1);P.buyDivine(inherited,1);P.buyDivine(inherited,2);relicReturn=run('burst',inherited,false,28,true);}
const clean=x=>x&&(({state,snapshots,...rest})=>rest)(x);
const offline=(burst.snapshots||[]).map(({summits,seconds,state})=>{const before=structuredClone(state);state.lastSeen=1000;const result=settleOffline(state,1000+86400000);return {absenceSeconds:86400,startSummits:summits,atActiveSeconds:seconds,workers:before.workers,tierUpgrades:before.tierUpgrades,boostAtDeparture:before.boost,...result,endRunSummits:state.runSummits,endHeight:state.climbPushes,prestigeAvailable:!!P.favorGain(state),favor:P.favorGain(state),purchasesWhileAway:0};});
const casinoNext=structuredClone(combined.state);P.prestige(casinoNext);P.buyDivine(casinoNext,1);P.buyDivine(casinoNext,1);P.buyDivine(casinoNext,2);
const casinoRuns=C?{average:clean(run('relaxed',newState(),false,28,false,[],{})),poor:clean(run('relaxed',newState(),false,28,false,[],{luck:'poor'})),good:clean(run('relaxed',newState(),false,28,false,[],{luck:'good'})),strength:clean(run('relaxed',newState(),false,28,false,['atlas','zeus'],{fate:'ares'})),workers:clean(run('automation',newState(),false,28,false,['toll','chronos'],{fate:'hermes'})),synergy:clean(run('relaxed',newState(),false,28,true,['atlas','zeus'],{fate:'athena'})),returning:clean(run('burst',casinoNext,false,28,true,[],{fate:'ares'})),late:clean(run('burst',newState(),false,40,true,['toll','chronos'],{fate:'hermes'}))}:{};
const casino2Runs=C?.spinEarned?Object.fromEntries([['casual','relaxed',[],{interactive:'casual'}],['frequent','relaxed',[],{interactive:'bank'}],['holds','relaxed',['atlas','zeus'],{interactive:'hold',fate:'ares'}],['risk','relaxed',['atlas','zeus'],{interactive:'risk',fate:'athena'}],['workers','automation',['toll','chronos'],{interactive:'hold',fate:'hermes'}],['poor','relaxed',[],{interactive:'bank',luck:'poor'}],['good','relaxed',[],{interactive:'bank',luck:'good'}]].map(([name,mode,relics,options])=>[name,clean(run(mode,newState(),false,28,false,relics,options))])):{};
if(C?.spinEarned){const return2=structuredClone(combined.state);P.prestige(return2);P.buyDivine(return2,1);P.buyDivine(return2,1);P.buyDivine(return2,2);casino2Runs.returning=clean(run('burst',return2,false,28,true,[],{interactive:'hold',fate:'ares'}));casino2Runs.long=clean(run('burst',newState(),false,40,true,['toll','chronos'],{interactive:'risk',fate:'hermes'}));}
const casino3Runs=C?.COMBINATIONS?{bank:casino2Runs.frequent,press:clean(run('relaxed',newState(),false,28,false,[],{interactive:'bank',press:true})),milestones:clean(run('relaxed',newState(),false,28,false,[],{interactive:'hold',milestones:true})),hold:clean(run('relaxed',newState(),false,28,false,[],{interactive:'hold'}))}:{};
const report={casino3Runs,casino2Runs,casinoRuns,relicRuns:{atlas:clean(atlas),passive:clean(passiveRelics),combined:clean(combined),late:clean(lateRelics),returning:clean(relicReturn)},golden:clean(golden),goldenAssumptions:'Seed 74193; Golden boosts activate automatically; other strategies unchanged. No-event control runs disable the Golden clock.',late:clean(late),midgame:relaxed.mountains.slice(7,17),offline,assumptions:'50ms shared integrator. Opening: 1 click/s; relaxed continues 1/s, burst uses 2/s for 5s every 45s after recruitment, automation stops clicking after recruitment. Shop every 15s: manual upgrade then Shade, then displayed >=1% output gain per Obol, saving at most 30s income. Imperfect variant shops every 20s, buys affordable singles, takes second-best value where possible. Second run spends 6 Favor on workforce and 2 on earnings. Durations include automatic 2.9s return; unaided tests start each mountain from rest with no upgrades or Defiance.',click:singleClick(),oneShade:unaided(1),twoShades:unaided(2),relaxed:clean(relaxed),burst:clean(burst),automation:clean(automation),imperfect:clean(imperfect),second:clean(second)};
mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log('Economy report written to '+output);
