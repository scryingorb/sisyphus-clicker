import { mountainGoal,summitPreview,rewardText } from './mountain-goals.js';
import { itemHeading, collectionPreview } from './item-art.js';
import { purchaseFeedback } from './feedback.js';
import { workerHeading } from './worker-art.js';
import { cosmeticUnlocked, heightRate, workerUnlocked, prestigeRequirement, WORKERS, UPGRADES, TIER_UPGRADES, EQUIPMENT, equipmentStage, crossBonus, crossDescription, purchasePreview, production, DIVINE, COLLECTION, STORIES, BALANCE, mountain, autoSpeed, earningMultiplier, workerPower, milestone, quote, buy, buyDivine, prestige, favorGain, format } from './progression.js';

export function progressionUI(s,session,persist,onPrestige,onEvent=()=>{}) {
  const panel=document.createElement('aside'); panel.id='progression'; panel.setAttribute('aria-label','Underworld progression');
  panel.innerHTML=`<div class="panel-heading"><span class="eyebrow">THE UNDERWORLD</span><h2>Build your defiance</h2><p>Gather hands. Improve their tools. Climb again.</p></div><nav aria-label="Progression sections" class="ledger-tabs"><button data-tab="workers">Workers</button><button data-tab="upgrades">Upgrades</button><button data-tab="collection">Collection</button><button data-tab="divine">Gods</button></nav><div class="shop-scroll"><details class="environment-details"><summary>Mountain &amp; earnings</summary><p id="mountain-info"></p><p>Earn Obols only above your previous highest point. Falls cost height, never purchases.</p></details><div id="ledger-content"></div><p id="purchase-feedback" class="sr-only" role="status"></p><div class="lifetime-records"><span><b id="total">0</b> pushes</span><span><b id="climbs">0</b> lifetime summits</span></div></div>`;
  document.body.append(panel);
  const goals=document.createElement('section');goals.id='mountain-goal';goals.className='mountain-goal';goals.setAttribute('aria-label','Mountain goal and rewards');
  goals.innerHTML='<span class="eyebrow">THIS MOUNTAIN</span><strong id="goal-title"></strong><small id="goal-progress"></small><details><summary>Summit rewards &amp; next mountain</summary><p id="goal-benefit"></p><p id="summit-rewards"></p><p id="next-mountain"></p></details>';
  panel.querySelector('.ledger-tabs').after(goals);
  const dialog=document.createElement('dialog'); dialog.id='prestige-dialog'; dialog.setAttribute('aria-labelledby','prestige-title'); dialog.innerHTML='<div class="dialog-kicker">A NEW ETERNITY</div><h2 id="prestige-title">Defy the Gods</h2><p id="prestige-preview"></p><p>Resets: mountain and run summits, run unlocks, Obols, workers, tier upgrades, ordinary upgrades, Defiance and momentum.</p><p>Keeps: Divine Favor, permanent upgrades, cosmetics, story discoveries, achievements, settings and lifetime records.</p><button id="prestige-cancel">KEEP CLIMBING</button><button id="prestige-confirm">DEFY THE GODS</button>'; document.body.append(dialog);
  let tab='workers', quantity=1, signature='';
  const content=panel.querySelector('#ledger-content');
  // Patch existing nodes so income updates cannot detach a hovered/focused buy
  // button between pointerdown and click, or close an open explanation.
  function setContent(html) {
    const template=document.createElement('template');template.innerHTML=html;
    const sync=(target,source)=>{
      for(let i=0;i<source.childNodes.length;i++) {
        const next=source.childNodes[i],old=target.childNodes[i];
        if(!old){target.append(next.cloneNode(true));continue;}
        if(old.nodeType!==next.nodeType||old.nodeName!==next.nodeName){old.replaceWith(next.cloneNode(true));continue;}
        if(old.nodeType===Node.TEXT_NODE){if(old.nodeValue!==next.nodeValue)old.nodeValue=next.nodeValue;continue;}
        for(const a of [...old.attributes])if(!next.hasAttribute(a.name)&&!(old.tagName==='DETAILS'&&a.name==='open')&&!a.name.startsWith('data-feedback'))old.removeAttribute(a.name);
        for(const a of next.attributes)if(old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);
        sync(old,next);
      }
      while(target.childNodes.length>source.childNodes.length)target.lastChild.remove();
    };
    sync(content,template.content);
  }
  const card=(title,body,heading=false,key="",locked=false)=>`<article class="purchase-card${locked?' locked-card':''}" data-card-key="${key}">${heading ? title : `<h3>${title}</h3>`}${body}</article>`;
  function purchase(kind,i) {
    const q=purchasePreview(s,kind,i,kind==='worker'?quantity:1);
    return `<button class="buy-button" data-buy="${kind}" data-index="${i}" title="Price: ${q.cost.toLocaleString('en-US',{maximumFractionDigits:0})} Obols" ${q.reason?'disabled':''}><span>Buy ${q.count|| (kind==='worker'?(quantity==='max'?'Max':quantity):1)}</span><strong>${Number.isFinite(q.cost)?format(q.cost):'Locked'} <small>${Number.isFinite(q.cost)?'OBOLS':''}</small></strong></button><small class="availability">${q.reason||'Available to purchase'}</small>${q.count&&q.gain>0?`<div class="purchase-gain">+${format(q.gain)} workforce power<small>${q.speedGain>1e-9?`+${format(q.speedGain*mountain(s).length/100)} m/s here`:'Speed capped here; power helps on harder mountains.'} Includes milestones &amp; shared bonuses.</small></div>`:''}`;
  }
  function workerCard(w,i) {
    const unlocked=workerUnlocked(s,i),stage=equipmentStage(s.workers[i]),next=[10,25,50,100].find(n=>n>s.workers[i]);
    return card(workerHeading(w,i,s.workers[i],unlocked),`<div class="card-status">${unlocked?'RECRUITMENT OPEN':`LOCKED - ${w.unlock} RUN SUMMITS`}</div><div class="contribution"><strong>${format(workerPower(s,i))}</strong><span>power before Defiance</span></div><div class="milestone-line">${next?`Next: ${next} owned / double this tier's output`:'All ownership milestones earned'}</div><div class="equipment-stage" aria-label="Equipment stage ${s.workers[i]?stage+1:0} of 3">${[0,1,2].map(n=>`<i class="${s.workers[i]&&n<=stage?'earned':''}"></i>`).join('')}<span>${EQUIPMENT[i][stage]}</span></div>${purchase('worker',i)}<details class="worker-details"><summary>Equipment &amp; shared bonuses</summary><p>${w.description}</p><p>Rigs improve at 10 and 25 owned, alongside output doublings. Current ownership bonus: x${milestone(s.workers[i])}. Shared bonus: x${format(crossBonus(s,i))}.</p><p>${crossDescription(i)}</p></details><div class="tier-upgrade">${itemHeading('tier',i,TIER_UPGRADES[i].name,s.tierUpgrades[i],!s.workers[i])}<p>+50% this tier's power per level. Levels add; other bonuses multiply.</p>${purchase('tier',i)}</div>`,true,`worker:${i}`,!unlocked);
  }
  function render(force=false) {
    document.querySelector('#obols').textContent=format(s.obols);
    document.querySelector('#income').textContent=`${format(autoSpeed(s)*mountain(s).length/100*earningMultiplier(s)*heightRate(s))} Obols/s on new height`;
    const m=mountain(s),goal=mountainGoal(s),preview=summitPreview(s);
    goals.querySelector('#goal-title').textContent=goal.title;
    goals.querySelector('#goal-progress').textContent=`${goal.value>=goal.target?'Complete':`${goal.value} / ${goal.target}`} - suggested goal, not required to summit`;
    goals.querySelector('#goal-benefit').textContent=goal.benefit;
    goals.querySelector('#summit-rewards').textContent='On this summit: '+rewardText(preview)+'.';
    goals.querySelector('#next-mountain').textContent=`Next: ${preview.next.name}, ${format(preview.next.length)} m. ${preview.next.effect} Resistance x${format(preview.next.resistance)}; workers and training overcome it. Next summit: +${format(preview.nextReward)} Obols. No entry fee or required purchase.`;
    document.querySelector('#mountain-name').textContent=m.name;
    document.querySelector('#mountain-meta').textContent=`MOUNTAIN ${s.runSummits+1} / CYCLE ${m.cycle}`;
    document.querySelector('#height').textContent=`${format(s.climbPushes*m.length/100)} / ${format(m.length)} m`;
    document.querySelector('#defiance-short').textContent=s.boost>0?`${s.boost.toFixed(1)}s`:s.defianceCooldown>0?`${Math.ceil(s.defianceCooldown)}s recovery`:`${s.defiance} / ${BALANCE.defianceClicks}`;
    panel.querySelector('#mountain-info').textContent=`${m.name} · Mountain ${s.runSummits+1} · Cycle ${m.cycle} · ${format(s.climbPushes*m.length/100)} / ${format(m.length)} m. ${m.effect} Defy the Gods at ${prestigeRequirement(s)} run summits. Total resistance: ${format(m.resistance)}x. Workforce: ${format(production(s))} power.`;
    document.querySelector('#defiance-info').textContent=s.boost>0?`x${BALANCE.defianceMultiplier+.25*s.divine[3]} workforce. Ready again in ${Math.ceil(s.defianceCooldown)}s.`:s.defianceCooldown>0?'Recovering. Your workers keep climbing.':`${BALANCE.defianceClicks} pushes: ${BALANCE.defianceDuration}s of boosted work. Charge stays.`;
    document.querySelector('#defiance-meter').value=s.boost?BALANCE.defianceClicks:s.defiance;
    document.querySelector('.defiance-block').classList.toggle('defiant',s.boost>0);
    for(const b of panel.querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed',String(b.dataset.tab===tab));
    // Retain focused controls between price/affordability changes.
    const key=JSON.stringify([tab,quantity,tab==='collection'?0:Math.floor(s.obols),s.workers,s.upgrades,s.tierUpgrades,s.divine,s.favor,s.runSummits,s.cosmetics,s.boost>0]);
    if(!force&&signature===key) return; signature=key;
    const focus=document.activeElement; const focusKey=focus?.dataset.buy?`[data-buy="${focus.dataset.buy}"][data-index="${focus.dataset.index}"]`:null;
    const expanded=[...content.querySelectorAll('details')].map(d=>d.open);
    if(tab==='workers') setContent(`<div class="quantity" aria-label="Purchase quantity">${[1,10,'max'].map(q=>`<button data-quantity="${q}" aria-pressed="${q===quantity}">Buy ${q==='max'?'Max':q}</button>`).join('')}</div>`+WORKERS.map(workerCard).join(''));
    if(tab==='upgrades') setContent('<div class="section-intro"><h2>Tools for the ascent</h2><p>Train your hands, steady the stone, strengthen the crew.</p></div>'+UPGRADES.map((u,i)=>card(itemHeading('upgrade',i,u.name,s.upgrades[i]),`<p>${u.effect}</p>${purchase('upgrade',i)}`,true,`upgrade:${i}`)).join(''));
    if(tab==='collection') setContent('<div class="section-intro"><h2>Echoes of the ascent</h2><p>Cosmetics change appearance only.</p></div><div class="collection-grid">'+COLLECTION.map(c=>{const unlocked=cosmeticUnlocked(s,c.id),equipped=s.cosmetics.includes(c.id);return card(`<div class="collection-preview${unlocked?'':' is-locked'}"><img src="${collectionPreview(c)}" width="80" height="80" alt=""></div><h3>${c.name}</h3>`,`<small>${c.kind==='boulder'?'BOULDER':'OUTFIT'}</small><button data-cosmetic="${c.id}" ${!unlocked||equipped?'disabled':''}>${equipped?'Equipped':!unlocked?`Unlock: ${c.at} summits`:'Equip'}</button>`,true,`cosmetic:${c.id}`,!unlocked);}).join('')+'</div><h2 class="section-label">Voices of the Underworld</h2>'+STORIES.map(x=>`<details class="story"><summary>${s.discoveries.includes(x.title)?x.title:`Locked: ${x.at} lifetime summits`}</summary><p>${s.discoveries.includes(x.title)?x.text:'Keep climbing to discover this voice.'}</p></details>`).join('')+`<h2 class="section-label">Lifetime achievements</h2><ul class="achievement-list">${[[1,'First Summit'],[5,'Gods Take Notice'],[10,'Eternal Ascent']].map(([n,name])=>`<li><strong>${name}</strong><span>${s.achievements.includes(name)?'Earned':`Locked: ${n} summits`}</span></li>`).join('')}</ul>`);
    if(tab==='divine') setContent(`<div class="prestige-overview"><span class="eyebrow">OPTIONAL PRESTIGE</span><h2>${format(s.favor)} Divine Favor</h2><p><strong>${s.runSummits} / ${prestigeRequirement(s)} climbs completed this run</strong></p><progress aria-label="Climbs toward prestige" value="${Math.min(s.runSummits,prestigeRequirement(s))}" max="${prestigeRequirement(s)}"></progress><p>Summiting advances to the next mountain. It does not prestige or reset your purchases.</p><strong class="favor-gain">${favorGain(s)?`+${favorGain(s)} Favor on prestige`:`${Math.max(0,prestigeRequirement(s)-s.runSummits)} more ${prestigeRequirement(s)-s.runSummits===1?'climb':'climbs'} to unlock prestige (+${BALANCE.prestigeFavor} Favor)`}</strong><button id="prestige-open" ${favorGain(s)?'':'disabled'}>${favorGain(s)?'Review prestige':'Prestige locked'}</button><small>${favorGain(s)?'Keep climbing for more Favor, or choose to prestige. Nothing resets until you confirm.':`Complete ${prestigeRequirement(s)} climbs in this run. Lifetime climbs do not count toward a new run.`}</small><details><summary>How Favor is earned</summary><p>floor(${BALANCE.prestigeFavor} x (run summits / ${prestigeRequirement(s)})<sup>1.5</sup>), after ${prestigeRequirement(s)} summits. Best run: ${s.bestRun}. ${format(s.lifetimeFavor)} Favor earned in all runs.</p></details></div>`+DIVINE.map((name,i)=>card(itemHeading('divine',i,name,s.divine[i]),`<p>${['+20% manual power','+20% worker output','+20% Obol earnings','+0.25x Defiance workforce multiplier'][i]} per level</p><button class="buy-button" data-divine="${i}" ${s.favor<2**(s.divine[i]+1)||s.divine[i]>=100?'disabled':''}><span>${s.divine[i]>=100?'Maximum level':'Improve'}</span><strong>${format(2**(s.divine[i]+1))} FAVOR</strong></button><small class="availability">${s.divine[i]>=100?'Fully improved':s.favor<2**(s.divine[i]+1)?'Not enough Divine Favor':'Available to purchase'}</small>`,true,`divine:${i}`)).join(''));
    content.querySelectorAll('details').forEach((d,i)=>{d.open=!!expanded[i];});
    if(focusKey) content.querySelector(focusKey)?.focus({preventScroll:true});
  }
  panel.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b||b.disabled) return;
    let event=null;
    if(b.dataset.tab) {tab=b.dataset.tab;content.innerHTML='';panel.querySelector('.shop-scroll').scrollTop=0;}
    if(b.dataset.quantity) quantity=b.dataset.quantity==='max'?'max':Number(b.dataset.quantity);
    if(b.dataset.buy) {
      const kind=b.dataset.buy,i=Number(b.dataset.index),q=kind==='worker'?quantity:1,before=structuredClone(s),offer=purchasePreview(s,kind,i,q);
      if(buy(s,kind,i,q))event=purchaseFeedback(before,s,kind,i,offer.count);
    }
    if(b.dataset.divine) {const i=Number(b.dataset.divine),before=structuredClone(s);if(buyDivine(s,i))event=purchaseFeedback(before,s,'divine',i,1);}
    if(b.dataset.cosmetic) { const c=COLLECTION.find(x=>x.id===b.dataset.cosmetic); if(c&&cosmeticUnlocked(s,c.id)) s.cosmetics[c.kind==='boulder'?0:1]=c.id; }
    if(b.id==='prestige-open') {dialog.querySelector('#prestige-preview').textContent=`Qualified: ${s.runSummits} run summits. Gain exactly ${favorGain(s)} Divine Favor.`;session.pause();persist();dialog.showModal();}
    persist();render(true);
    if(event)onEvent(event);
  });
  dialog.querySelector('#prestige-cancel').onclick=()=>{dialog.close();session.resume();};
  dialog.addEventListener('cancel',()=>session.resume());
  dialog.querySelector('#prestige-confirm').onclick=()=>{
    const gained=favorGain(s);
    if(prestige(s)){session.resetElapsed=null;persist();onPrestige();dialog.close();session.resume();render(true);onEvent({kind:'prestige',title:'The gods remember',detail:`+${gained} Divine Favor. Your permanent power remains. A new ascent begins.`});}
  };
  render();return render;
}
