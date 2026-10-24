// Session-only visual projection. Authoritative rewards remain settled and saved.
export class CasinoImpactPresentation {
 constructor(){this.pending=null;}
 begin(award,state){
  if(!(award?.percent>0))return;
  const previous=this.pending;
  this.pending={award:{...award},snapshot:{...state},released:null};
  if(previous?.released===null&&previous.award.mountain===award.mountain)this.pending.snapshot=previous.snapshot;
 }
 reveal(time){
  if(!this.pending||this.pending.released!==null)return null;
  this.pending.released=time;return this.pending.award;
 }
 project(state,time){
  const p=this.pending;if(!p)return state;
  if(p.released!==null&&time-p.released>=.85){this.pending=null;return state;}
  const same=p.award.mountain===state.runSummits+1;
  const height=p.released===null?(same?state.climbPushes-p.award.percent:p.award.from):(same?state.climbPushes:p.award.to);
  return {...(same?state:p.snapshot),climbPushes:Math.max(0,height),isResetting:false};
 }
 clear(){this.pending=null;}
}
