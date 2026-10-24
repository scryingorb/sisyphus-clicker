import { RELICS, RELIC_LIMIT, relicAvailable } from './relics.js';
import { format } from './progression.js';
import { relicCondition } from './combo-ui.js';
import { relicIcon } from './relic-art.js';
export function relicCards(s){
  return `<section class="relic-collection"><h2>Divine Relics</h2><p>${s.activeRelics.length} / ${RELIC_LIMIT} active. Awaken once with Obols; keep across prestige. Rest a relic to try another. Switching clears charged relic bonuses.</p>${RELICS.map(r=>{
    const owned=s.relics.includes(r.id),active=s.activeRelics.includes(r.id),unlocked=relicAvailable(s,r.id);
    return `<article class="purchase-card relic-card" data-equipped="${active}" data-relic="${r.id}" data-card-key="relic:${r.id}"><div class="relic-heading">${relicIcon(r.id)}<h3>${r.name}</h3></div><span class="relic-badge">${active?'EQUIPPED':owned?'IN COLLECTION':'DIVINE ARTIFACT'}</span><p>${r.description}</p><p class="relic-condition">${relicCondition(s,r.id)}</p><small>Reels: ${({atlas:"Boulder",toll:"Ghost Coin",zeus:"Lightning",chronos:"Hourglass"})[r.id]} pairs or triples pay an extra 15% burst while equipped.</small><small>Synergy: ${r.id==='atlas'?'Defiance + crew power; Zeus also amplifies Golden pushes.':r.id==='toll'?'Shade ownership bonuses; Chronos multiplies the boosted crew.':r.id==='zeus'?'Atlas during Golden + Defiance; crew uses the stronger temporary bonus.':'Toll checkpoints during uninterrupted passive climbing.'}</small><small>${owned?'Permanently awakened':`${r.at} lifetime summits to unlock`}</small>${owned?`<button data-relic-toggle="${r.id}" aria-pressed="${active}" ${!active&&s.activeRelics.length>=RELIC_LIMIT?'disabled':''}>${active?'Active — rest relic':s.activeRelics.length>=RELIC_LIMIT?'Rest another relic first':'Activate relic'}</button>`:`<button data-relic-buy="${r.id}" ${!unlocked||s.obols<r.cost?'disabled':''}>${unlocked?`Awaken · ${format(r.cost)} Obols`:'Locked'}</button>`}</article>`;
  }).join('')}</section>`;
}
