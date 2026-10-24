import {ACHIEVEMENTS,WORKERS} from './progression.js';
// A finite lifetime ledger, shared by purchase/discovery/load paths. No repeatable quests.
export function spinMilestones(){return [
 ...WORKERS.flatMap((w,i)=>[10,25,50,100].map(n=>({id:`worker:${i}:${n}`,label:`${n} ${w.name} owned`,test:s=>s.workers[i]>=n}))),
 ...WORKERS.slice(1).map((w,j)=>({id:`unlock:${j+1}`,label:`${w.name} unlocked`,test:s=>s.workerUnlocks[j+1]})),
 ...WORKERS.map((w,i)=>({id:`training:${i}`,label:`${w.name} training complete`,test:s=>s.tierUpgrades[i]>=10})),
 ...ACHIEVEMENTS.map((a,i)=>({id:`achievement:${i}`,label:a.name,test:s=>s.achievements.includes(a.name)||a.test(s)}))
 ];}
export function drainFreeSpins(s){
 if(s.casinoDisabled)return;
 const count=Math.min(Number.MAX_SAFE_INTEGER-s.spins,s.freeSpinReserve||0);s.spins+=count;s.freeSpinReserve-=count;
}
export function claimSpinMilestones(s,migrate=false){
 s.spinClaims??=[];let count=0;const labels=[];
 for(const m of spinMilestones())if(!s.spinClaims.includes(m.id)&&m.test(s)){
  s.spinClaims.push(m.id);if(!migrate){count++;labels.push(m.label);}
 }
 if(count){s.freeSpinReserve=(s.freeSpinReserve||0)+count;s.freeSpinsEarned=(s.freeSpinsEarned||0)+count;s.freeSpinNotice=labels.join(' / ');}
 drainFreeSpins(s);return count;
}
export function loadSpinMilestones(s,data){
 const ids=spinMilestones().map(m=>m.id);
 s.spinClaims=ids.filter(id=>Array.isArray(data.spinClaims)&&data.spinClaims.includes(id));
 s.freeSpinReserve=Number.isSafeInteger(data.freeSpinReserve)?Math.max(0,Math.min(ids.length,data.freeSpinReserve)):0;
 s.freeSpinsEarned=Number.isSafeInteger(data.freeSpinsEarned)?Math.max(0,Math.min(ids.length,data.freeSpinsEarned)):0;
 // Old saves keep their accomplishments; already met goals are claimed without retroactive grants.
 claimSpinMilestones(s,data.schema<6);
}
