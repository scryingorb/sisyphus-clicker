import {format} from './progression.js';
import {workerSpinEnergy,clickSpinEnergy} from './casino.js';
// Reparent existing controls; IDs, listeners, rendering and simulation stay intact.
export function unifyArcade(state,scene,settings){
 document.body.classList.add('unified-arcade');
 const top=document.createElement('div');top.id='arcade-top';top.setAttribute('aria-label','Game dashboard');
 document.body.prepend(top);top.append(document.querySelector('#game header'),document.querySelector('.hud'));
 const spin=document.createElement('div');spin.id='hud-spins';top.append(spin);
 const cabinet=document.querySelector('#casino-cabinet'),panel=document.querySelector('#divine-reels');
 const actions=document.createElement('div');actions.className='spin-actions';actions.append(document.querySelector('#spin-ready'),document.querySelector('#spin-batch'));
 const reward=document.createElement('section');reward.id='casino-reward';reward.setAttribute('aria-label','Latest casino reward');for(const node of [panel.querySelector('.chain-heading'),panel.querySelector('#reel-result'),panel.querySelector('#reel-calculation'),panel.querySelector('#casino-push-impact')])reward.append(node);panel.append(actions,reward);document.querySelector('#casino-rules').append(document.querySelector('#casino-decisions'));
 cabinet.querySelector('.casino-tagline').textContent='DIVINE REELS / FIVE CHANCES AT GLORY';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='arcade-link';svg.setAttribute('aria-hidden','true');svg.innerHTML='<path class="energy-path"/><circle r="5" class="energy-head"/>';document.body.append(svg);
 const goals=document.querySelector('#mountain-goal'),objectives=document.createElement('details');objectives.className='shop-objectives';objectives.innerHTML='<summary>Mountain objectives & rewards</summary>';goals.before(objectives);objectives.append(goals);
 const shop=document.querySelector('#progression'),toggle=document.createElement('button');toggle.id='shop-toggle';toggle.textContent='SHOP';toggle.setAttribute('aria-expanded','true');toggle.onclick=()=>{const collapsed=shop.classList.toggle('shop-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));document.body.classList.toggle('shop-folded',collapsed);scene.resize();};shop.prepend(toggle);
 const scroll=shop.querySelector('.shop-scroll');for(const node of [objectives,document.querySelector('#combo-details'),shop.querySelector('.environment-details')])if(node)scroll.append(node);
 let key='';
 scene.compactNotifications=true;scene.arcadeFraming=true;const pushNote=document.createElement('div');pushNote.id='mountain-push-note';pushNote.hidden=true;document.querySelector('#game').append(pushNote);
 new ResizeObserver(()=>scene.resize()).observe(scene.canvas);scene.resize();
 return function render(time){
  const next=[state.spins,Math.floor(state.spinEnergy),workerSpinEnergy(state).toFixed(2),clickSpinEnergy(state).toFixed(2),state.runSummits<3].join('|');
  if(next!==key){key=next;spin.innerHTML=`<span class="eyebrow">AVAILABLE SPINS</span><strong>${format(state.spins)}</strong><small>${state.runSummits<3?'Energy unlocks on mountain 4':`+${format(clickSpinEnergy(state))} / push · +${format(workerSpinEnergy(state))} / sec`}</small>`;spin.title=state.spins.toLocaleString('en-US')+' spins';}
  const surge=scene.casinoSurge,age=surge?time-surge.time:10,visibleMountain=scene.presentationState(time).runSummits+1;
  pushNote.hidden=!(surge&&age>=0&&age<3&&surge.mountain===visibleMountain);if(!pushNote.hidden)pushNote.textContent=`DIVINE REWARD +${format(surge.percent)}% / ${format(surge.distance)} m`;
  if(!pushNote.hidden&&scene.canvas.clientWidth>=1100){const p=scene.point(scene.position);pushNote.style.left=Math.max(10,Math.min(scene.canvas.clientWidth-360,p.x/scene.w*scene.canvas.clientWidth-110))+'px';pushNote.style.top=Math.max(175,(p.y-95*scene.scale)/scene.h*scene.canvas.clientHeight)+'px';}else{pushNote.style.left='';pushNote.style.top='';}
  const visible=!settings.reducedMotion&&age>=0&&age<.85&&surge.mountain===visibleMountain;
  svg.style.display=visible?'block':'none';if(!visible)return;
  const r=panel.querySelector('#reel-symbols').getBoundingClientRect(),c=scene.canvas.getBoundingClientRect(),p=scene.point(scene.position);
  const x=r.left+r.width*.45,y=r.top+r.height*.35,tx=c.left+p.x/scene.w*c.width,ty=c.top+(p.y-15*scene.scale)/scene.h*c.height;
  const path=svg.querySelector('path');path.setAttribute('d',`M${x},${y} Q${(x+tx)/2},${Math.min(y,ty)-70} ${tx},${ty}`);
  const length=path.getTotalLength(),t=Math.min(1,age/.65),point=path.getPointAtLength(length*t);
  path.style.strokeDasharray=String(length);path.style.strokeDashoffset=String(length*(1-t));svg.style.opacity=String(Math.min(1,(.85-age)/.2));
  const head=svg.querySelector('circle');head.setAttribute('cx',point.x);head.setAttribute('cy',point.y);
 };
}

