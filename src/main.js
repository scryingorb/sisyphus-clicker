import {unifyArcade} from './arcade-layout.js';
import { createCasinoUI } from './casino-ui.js';
import { comboRows, comboSource, liveComboHTML } from './combo-ui.js';
import { summitPreview,rewardText } from './mountain-goals.js';
import { WORKER_PORTRAITS } from './worker-art.js';
import './style.css';
import './mythic-arcade.css';
import './unified-arcade.css';
import './reference-arcade.css';
import { loadState, saveState, PUSHES_PER_CLIMB } from './state.js';
import { GameScene } from './scene.js';
import { GameSession } from './session.js';
import { BoulderAudio } from './audio.js';
import { settleAndSave } from './simulation.js';
import { progressionUI } from './progression-ui.js';
import { format, BALANCE, discover, powerBreakdown, atlasImpulse } from './progression.js';
import { hasRelic, sparkClickMultiplier, sparkWorkerMultiplier } from './relics.js';
import { GOLDEN } from './golden.js';
import { FeedbackQueue, ChainFeedback, ComboHistory } from './feedback.js';
import { approachNumber, ascentMilestones, numberMilestone, liveStats, clickIntensity } from './satisfaction.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Play is available without storage. */ }
const state = loadState(storage);
let offlineSummary = settleAndSave(state, storage);
const session = new GameSession(state);
const settings = { muted: false, volume: .35, sfxVolume: .8, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
try {
  const saved = state.settings || JSON.parse(storage.getItem('sisyphus-settings-v1'));
  if (saved) {
    if (typeof saved.muted === 'boolean') settings.muted = saved.muted;
    if (Number.isFinite(saved.volume)) settings.volume = Math.max(0, Math.min(1, saved.volume));
    if(Number.isFinite(saved.sfxVolume))settings.sfxVolume=Math.max(0,Math.min(1,saved.sfxVolume));
    if (typeof saved.reducedMotion === 'boolean') settings.reducedMotion = saved.reducedMotion;
  }
} catch { /* Use defaults. */ }
const audio = new BoulderAudio(settings);
const workerImages=WORKER_PORTRAITS.map(url=>{const image=new Image();image.src=url;return image;});
const scene = new GameScene($('#scene'), state, workerImages);
scene.reduced = settings.reducedMotion;
let started = false, lastFrame = null, lastSave = 0, lastHUD = 0, lastShop=0, pressTimer;
let displayedObols=state.obols, income=0, earnedInterval=0, incomeTime=0, workInterval=0, workTime=0;

const feedback = new FeedbackQueue();
const comboHistory=new ComboHistory();const chain=new ChainFeedback(comboHistory);let chainIndex=-1,lastProminent=-Infinity;
let shownMessage=null,purchaseStarted=0;
const purchasePanel=document.createElement('div');purchasePanel.id='purchase-impact';purchasePanel.hidden=true;$('#notification-detail').after(purchasePanel);
function emitFeedback(event) {
  if(!feedback.emit(event))return;
  if(event.major||['defiance','golden','ascent','relic'].includes(event.kind)){
    const kind=event.chainKind||(event.kind==='defiance'&&hasRelic(state,'atlas')||event.kind==='golden'&&powerBreakdown(state,'click').steps.length>=powerBreakdown(state).steps.length?'click':'worker');
    if(chain.start(powerBreakdown(state,kind),session.time,{major:!!event.major,eventType:event.kind})){chainIndex=-1;lastProminent=session.time;}
  }
  if(!session.paused&&!document.hidden){audio.cue(event.kind==='ascent'&&state.tollRemaining>0?'relic':event.comparison?(event.major?'major':event.strength==='meaningful'?'power':event.tier!==null?'recruit':'purchase'):event.kind);}
  if(event.major||event.stageChanged||['defiance','summit','prestige','ascent','number','golden','achievement'].includes(event.kind))scene.celebrate(event.kind,event.tier,session.time);
  if(event.comparison){$('#passive-power').dataset.pulseUntil=String(session.time+1);$('#click-power').dataset.pulseUntil=String(session.time+1);if(event.major){scene.push(session.time*1000,1.5);scene.comboUntil=session.time+.6;}}
  if(event.arrival)scene.arrive(event.tier,session.time);
  if(event.key)document.querySelector('.live-power').dataset.pulseUntil=String(session.time+1);
  if(event.gain>0)$('#income').dataset.pulseUntil=String(session.time+1);
  if(['number','summit'].includes(event.kind)||event.major)$('#obols').dataset.pulseUntil=String(session.time+1);
  const key=event.key?.replace('tier:','worker:');
  const card=key&&document.querySelector(`[data-card-key="${key}"]`);
  if(card&&event.comparison){const pop=document.createElement('span');pop.className='purchase-pop';pop.textContent=(event.comparison.percent===null?'NEW POWER':`${event.comparison.percent>=0?'+':''}${format(event.comparison.percent)}%`);card.querySelector('.purchase-pop')?.remove();card.append(pop);}
  if(card){card.dataset.feedbackPulse=String(session.time+1.4);if(event.major||event.kind==='milestone')card.dataset.feedbackMajor='true';}
  renderFeedback();
}
function renderFeedback(){
  document.body.classList.toggle('paused',session.paused);
  document.body.classList.toggle('reduced-motion',settings.reducedMotion);
  const message=feedback.current;
  $('#notification').hidden=!message;
  if(message&&shownMessage!==message.id){
    shownMessage=message.id;purchaseStarted=session.time;$('#notification').dataset.kind=message.kind;$('#notification').dataset.strength=message.strength||'';
    $('#notification-title').textContent=message.title;$('#notification-detail').textContent=message.detail;
  }
  purchasePanel.hidden=!message?.comparison;
  if(message?.comparison){const c=message.comparison,t=settings.reducedMotion?1:Math.min(1,(session.time-purchaseStarted)/.3),current=c.before+(c.after-c.before)*(1-(1-t)**3);purchasePanel.innerHTML=`<small>${c.label.toUpperCase()} | BEFORE ${format(c.before)} ${c.unit}</small><strong>${format(current)} <small>${c.unit}</small></strong><b>${c.percent===null?'NEW POWER':`${c.percent>=0?'+':''}${format(c.percent)}% ${c.lower?'LESS GRAVITY':'IMPROVEMENT'}`}</b>`;}
  for(const card of document.querySelectorAll('[data-feedback-pulse]'))if(Number(card.dataset.feedbackPulse)<=session.time){delete card.dataset.feedbackPulse;delete card.dataset.feedbackMajor;}
}
$('#notification-close').onclick=()=>{feedback.dismiss();renderFeedback();};
const renderProgression = progressionUI(state, session, persist, () => {feedback.clear();chain.clear();casinoView?.sync();scene.clearFeedback();scene.finishReset();},emitFeedback);
const chainPanel=document.createElement('section');chainPanel.id='bonus-chain';chainPanel.hidden=true;chainPanel.setAttribute('aria-label','Bonus calculation at activation');
chainPanel.innerHTML='<div class="chain-heading"><span class="eyebrow">DIVINE COMBO</span><button id="chain-close" aria-label="Dismiss bonus calculation">&times;</button></div><div id="chain-sources"></div><strong id="chain-value" role="status" aria-live="polite"></strong><small class="combo-caption">Power at activation</small>';
$('#game').append(chainPanel);$('#chain-close').onclick=()=>{chain.clear();chainPanel.hidden=true;};
const relicStatus=document.createElement('small');relicStatus.id='relic-status';$('.scene-context').append(relicStatus);
const comboDetails=document.createElement('details');comboDetails.id='combo-details';comboDetails.innerHTML='<summary>Relics &amp; live bonus calculation</summary><div id="combo-live"></div>';
$('#mountain-goal').after(comboDetails);comboDetails.addEventListener('toggle',()=>{if(comboDetails.open)$('#combo-live').innerHTML=liveComboHTML(state);});
function renderChain(){
  const view=chain.view(session.time,settings.reducedMotion);chainPanel.hidden=!view;
  if(!view)return;
  chainPanel.style.opacity=String(view.opacity);
  const value=$('#chain-value');
  value.textContent=`${view.final?'DIVINE COMBO':'Building'}: ${format(view.displayed)} ${view.unit}${view.final?'!':''}`;
  if(chainIndex===view.index)return;chainIndex=view.index;
  value.setAttribute('aria-live',view.final?'polite':'off');
  value.dataset.beat=String(view.index%2);chainPanel.dataset.operation=view.final?'final':view.step.operation;
  $('#chain-sources').innerHTML=comboRows(view,view.index);
  const strength=Math.min(3,Math.max(1,view.total/Math.max(.001,view.steps[0].result)));
  if(!session.paused&&!document.hidden)audio.chain(view.index,view.final,strength);
  const source=view.step&&comboSource(view.step);
  const card=source?.id&&document.querySelector(`[data-card-key="relic:${source.id}"]`);
  if(card)card.dataset.feedbackPulse=String(session.time+.7);
  if(view.final&&strength>=1.5){scene.push(session.time*1000,Math.min(2,strength));scene.celebrate('combo',undefined,session.time);scene.comboUntil=session.time+.55;}
}
const historyPanel=document.createElement('details');historyPanel.id='recent-combos';historyPanel.innerHTML='<summary>Recent Combos</summary><div></div>';document.querySelector('.shop-scroll').append(historyPanel);let historyVersion=-1;
function renderHistory(){if(historyVersion===comboHistory.version)return;historyVersion=comboHistory.version;historyPanel.querySelector('div').innerHTML=comboHistory.items.length?comboHistory.items.map(item=>`<article><h3>${item.eventType}${item.repeats>1?' ? '+item.repeats+' similar events':''}</h3><strong>${format(item.total)} ${item.unit}</strong>${comboRows(item)}</article>`).join(''):'<p>Significant combos appear here during this session.</p>';}
const casinoView=createCasinoUI(state,settings,audio,persist,(event,settled=false)=>{if(settled){scene.deferCasinoPush(event.push);return;}if(scene.revealCasinoPush(session.time)){$('#obols').dataset.pulseUntil=String(session.time+1);audio.cue(event.count>=4?'major':'power');}const snapshot=structuredClone(event);if(event.jackpot){snapshot.steps.push({label:'Olympus Jackpot',operation:'add',value:event.jackpot,result:event.total+event.jackpot});snapshot.total+=event.jackpot;}comboHistory.record(snapshot,event.mega?'Olympus Mega Jackpot':event.jackpot?'Olympus Jackpot':'Divine Reels');if(event.count>=2||event.jackpot){scene.celebrate(event.jackpot||event.mega?'jackpot':'combo',undefined,session.time);scene.comboUntil=session.time+.55;}if(event.jackpot||event.mega)audio.cue(event.mega?'mega':'jackpot');});
const renderArcade=unifyArcade(state,scene,settings);
$('#game').append($('#notification'));
function persist() {
  state.settings={...settings};
  if (!saveState(storage, state, session.paused ? state.lastSeen || Date.now() : Date.now())) $('#save-status').textContent = 'SAVING UNAVAILABLE — EXPORT A BACKUP';
  try { storage.setItem('sisyphus-settings-v1', JSON.stringify(settings)); } catch { /* In-memory settings still work. */ }
}
function updateHUD(shop=true) {
  if(shop){
    const previous=[...state.achievements];discover(state);
    const unlocked=state.achievements.filter(x=>!previous.includes(x));
    if(unlocked.length){emitFeedback({kind:'achievement',key:'achievement',title:'Achievement unlocked',detail:unlocked.join(' · ')});persist();}
  }
  if(shop)renderProgression();
  $('#golden-status').hidden=state.goldenBoost<=0;
  $('#golden-status').textContent=`GOLDEN ${Math.ceil(state.goldenBoost)}s · ×${format(GOLDEN.clickMultiplier*sparkClickMultiplier(state))} clicks · ${state.boost>0?'Defiance crew bonus takes priority':`×${format(GOLDEN.workerMultiplier*sparkWorkerMultiplier(state))} crew`}`;
  $('#relic-status').textContent=[hasRelic(state,'atlas')?(state.boost>0?`Atlas +${format(atlasImpulse(state))} m/s, then ×1.15`:'Atlas: awaiting Defiance'):null,hasRelic(state,'toll')?(state.tollRemaining>0?`Toll ${Math.ceil(state.tollRemaining)}s · ×1.2 Shades`:'Toll: awaiting checkpoint'):null,hasRelic(state,'zeus')?'Zeus: Golden bonuses enhanced':null,hasRelic(state,'chronos')?(state.passiveSeconds>=30?'Chronos ×1.1 crew':`Chronos ${Math.floor(state.passiveSeconds)}/30s passive`):null].filter(Boolean).join(' · ');
  if(comboDetails.open)$('#combo-live').innerHTML=liveComboHTML(state);
  const stats=liveStats(state);
  $('#obols').textContent=format(displayedObols);
  $('#obols').title=`${state.obols.toLocaleString('en-US',{maximumFractionDigits:2})} Obols available`;
  $('#income').textContent=`${format(session.paused?0:income)} Obols/s earned`;
  $('#click-power').textContent=`+${format(stats.click)} m/s`;
  $('#passive-power').textContent=`${format(stats.power)} power`;
  $('#climb-speed').textContent=`${format(stats.speed)} m/s`;
  if($('#lifetime-stats').open)$('#production-stats').innerHTML=`<p>${format(state.earned)} lifetime Obols earned · ${stats.workers} workers</p><p>${format(state.lifetimeDistance)} m climbed since distance tracking began</p><p>Crew work is workforce power accumulated over time. It is not spendable Obols.</p>${stats.tiers.map((power,i)=>`<p>${['Shades','Laborers','Automatons','Engines'][i]}: ${format(power)} power</p>`).join('')}<p>Earnings ×${format(stats.earningsMultiplier)} · Workforce bonus ×${format(stats.boost)}</p><p>${state.runSummits} summits this run · Best ${state.bestRun} · ${format(state.favor)} Favor held / ${format(state.lifetimeFavor)} earned</p>`;
  $('#total').textContent = state.totalPushes.toLocaleString('en-US');
  const visibleHeight=scene.presentationState(session.time).climbPushes;
  $('#progress').textContent = Math.floor(visibleHeight / PUSHES_PER_CLIMB * 100);
  $('#progress-bar').style.width = `${visibleHeight / PUSHES_PER_CLIMB * 100}%`;
  $('.progress-track').setAttribute('aria-valuenow',visibleHeight.toFixed(1));
  $('#climbs').textContent = state.completedClimbs.toLocaleString('en-US');
  $('#push').disabled = session.paused || state.isResetting;
  const speed = stats.speed;
  $('#motion').textContent = state.isResetting ? 'SUMMIT REACHED' : Math.abs(speed) < .12 ? 'HOLDING GROUND' : speed < 0 ? 'ROLLING DOWN — CLICK TO BRAKE' : 'CLIMBING UPHILL';
  $('#speed-bar').style.width = `${Math.min(100, Math.abs(speed) / 12 * 100)}%`;
  $('#speed-bar').classList.toggle('downhill', speed < 0);
  if (session.resetElapsed !== null) $('#status').textContent = session.resetElapsed > .5 ? 'The stone returns. The story continues.' : 'For a moment, the world is still.';
  else if (speed < -.15) $('#status').textContent = 'Brake the roll. Then push again.';
  else if (state.climbPushes > 74) $('#status').textContent = 'So close to the sky.';
  else $('#status').textContent = state.completedClimbs > 0n ? 'And still, we begin again.' : 'A little higher. Again.';
}
function pause(reason = 'Take a breath. The mountain can wait.') {
  if (!session.paused) persist();
  session.pause(); audio.update(0, true); lastFrame = null; persist(); updateHUD();
  $('#pause-title').textContent = started ? 'The ascent is paused.' : 'The eternal ascent';
  $('#pause-reason').textContent = started ? reason : 'Reach the summit. Begin again. Every push counts.';
  if (offlineSummary.seconds >= 1) {
    const summary=$('#offline-summary');summary.hidden=false;
    summary.innerHTML=`<h3>WELCOME BACK!</h3><dl><dt>Time credited</dt><dd>${format(offlineSummary.seconds/60)} min</dd><dt>Spins earned</dt><dd>+${format(offlineSummary.spins||0)}</dd><dt>Available spins</dt><dd>${format(state.spins)}</dd><dt>Obols earned</dt><dd>+${format(offlineSummary.obols)}</dd><dt>Summits</dt><dd>${offlineSummary.mountains}</dd></dl>`;
    if(offlineSummary.unlocks.length){const p=document.createElement('p');p.textContent='Discoveries: '+offlineSummary.unlocks.join(', ');summary.append(p);}
    offlineSummary = { seconds: 0 };
  }
  $('#resume').textContent = started ? 'RESUME ASCENT' : 'BEGIN ASCENT';
  if (!document.querySelector('dialog[open]')) $('#pause-dialog').showModal();
}
function resume() {
  if (document.hidden || !document.hasFocus()) return;
  for (const dialog of document.querySelectorAll('dialog')) if (dialog.open) dialog.close();
  const away = settleAndSave(state, storage);
  if (away.mountains) scene.finishReset();
  session.resetElapsed = state.isResetting ? 2.9-state.returnRemaining : null;
  if (away.seconds > 10) $('#away-notice').textContent = `Away ${format(away.seconds/60)} min | +${format(away.obols)} Obols | ${away.mountains} mountains${away.unlocks.length ? ' | '+away.unlocks.join(', ') : ''}`;
  $('#offline-summary').hidden=true;
  if(away.seconds>10)feedback.emit({kind:'away',title:'Welcome back',detail:`+${format(away.obols)} Obols and ${away.mountains} summits while away.`});
  displayedObols=state.obols;income=earnedInterval=incomeTime=workInterval=workTime=0;
  casinoView.sync();started = true; session.resume(); lastFrame = null; audio.unlock(); updateHUD();
}
function push() {
  const boosted=state.boost>0;
  const before=state.boulderVelocity;
  const exceptional=session.time-lastProminent>=8?powerBreakdown(state,'click'):null;
  if (!session.push()) return;

  if(exceptional&&exceptional.steps.length>=3&&exceptional.total>=exceptional.steps[0].result*1.5){if(chain.start(exceptional,session.time)){chainIndex=-1;lastProminent=session.time;}}
  const impulse=(state.boulderVelocity-before)*scene.mountainLength()/100;
  scene.gains.add(impulse,'click',session.time);
  audio.unlock(); audio.push({charge:state.defiance,boost:state.boost>0,intensity:clickIntensity(state,impulse)}); scene.push(session.time * 1000,clickIntensity(state,impulse));
  $('.defiance-block').dataset.pulseUntil=String(session.time+.35);
  $('#push').classList.add('pressed'); clearTimeout(pressTimer);
  pressTimer = setTimeout(() => $('#push').classList.remove('pressed'), 110);
  updateHUD(); persist();
  if(!boosted&&state.boost>0)emitFeedback({kind:'defiance',title:'Defiance awakened',detail:`x${BALANCE.defianceMultiplier+.25*state.divine[3]} workforce power for ${BALANCE.defianceDuration} seconds.`});
}
$('#game').addEventListener('pointerdown', event => {
  if (event.button === 0 && !event.target.closest('button, a, input, dialog, label')) push();
});
$('#push').addEventListener('click', push);
$('#resume').addEventListener('click', resume);
$('#pause').addEventListener('click', () => pause());
$('.wordmark').addEventListener('click', event => { event.preventDefault(); pause(); });
function showSettings() {
  pause(); $('#pause-dialog').close(); $('#settings-dialog').showModal();
}
$('#settings').addEventListener('click', showSettings);
$('#pause-settings').addEventListener('click', showSettings);
$('#settings-close').addEventListener('click', () => { $('#settings-dialog').close(); pause(); });
$('#mute').checked = settings.muted; $('#volume').value = settings.volume * 100; $('#sfx-volume').value=settings.sfxVolume*100; $('#reduced-motion').checked = settings.reducedMotion;
for (const id of ['mute', 'volume', 'sfx-volume', 'reduced-motion']) $(`#${id}`).addEventListener('input', () => {
  settings.muted = $('#mute').checked; settings.volume = Number($('#volume').value) / 100;settings.sfxVolume=Number($('#sfx-volume').value)/100;
  settings.reducedMotion = $('#reduced-motion').checked; scene.reduced = settings.reducedMotion;
  audio.unlock(); audio.update(0, true); persist();
});
async function fullscreen() {
  try {
    if (window.desktop) await window.desktop.toggleFullscreen();
    else if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { $('#status').textContent = 'Fullscreen is unavailable in this window.'; }
}
$('#fullscreen').addEventListener('click', fullscreen);
$('#restart').addEventListener('click', () => { $('#settings-dialog').close(); $('#restart-dialog').showModal(); });
$('#restart-cancel').addEventListener('click', () => { $('#restart-dialog').close(); $('#settings-dialog').showModal(); });
$('#restart-confirm').addEventListener('click', () => {
  feedback.clear();chain.clear();casinoView?.sync();scene.clearFeedback();session.restart(); scene.finishReset(); started = false; $('#restart-dialog').close(); persist(); updateHUD(); pause();
});
$('#export').addEventListener('click', async () => {
  try {
    const json = JSON.stringify({...state,totalPushes:String(state.totalPushes),completedClimbs:String(state.completedClimbs)},null,2);
    if (window.desktop) {
      const exported = await window.desktop.exportSave(json);
      $('#backup-status').textContent = exported ? 'Save exported.' : 'Export canceled.';
    } else {
      const blob = new Blob([json], {type:'application/json'});
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'sisyphus-save.json'; $('#settings-dialog').append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); $('#backup-status').textContent = 'Save exported.';
    }
  } catch { $('#backup-status').textContent = 'Export failed. Choose a writable location and try again.'; }
});
$('#import').addEventListener('click', () => $('#import-file').click());
let pendingImport = null;
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 100000) throw new Error('File too large');
    const raw = await file.text(), parsed = JSON.parse(raw);
    if (!/^\d+$/.test(String(parsed.totalPushes)) || !/^\d+$/.test(String(parsed.completedClimbs)) || !Number.isFinite(parsed.climbPushes) || parsed.climbPushes < 0 || parsed.climbPushes > PUSHES_PER_CLIMB) throw new Error('Invalid save');
    pendingImport = loadState({getItem: () => raw});
    $('#settings-dialog').close(); $('#import-dialog').showModal();
  } catch { $('#backup-status').textContent = 'That file is not a valid Sisyphus save.'; }
});
$('#import-cancel').addEventListener('click', () => { pendingImport = null; $('#import-dialog').close(); $('#settings-dialog').showModal(); });
$('#import-confirm').addEventListener('click', () => {
  feedback.clear();chain.clear();casinoView?.sync();scene.clearFeedback();
  Object.assign(state,pendingImport); state.lastSeen=Date.now(); pendingImport = null;
  if(state.settings) Object.assign(settings,state.settings);
  $('#mute').checked=settings.muted; $('#volume').value=settings.volume*100;$('#sfx-volume').value=settings.sfxVolume*100; $('#reduced-motion').checked=settings.reducedMotion; scene.reduced=settings.reducedMotion;
  session.resetElapsed = state.isResetting ? 0 : null; scene.finishReset(); started = true;
  $('#import-dialog').close(); persist(); updateHUD(); pause('Save imported. Resume when you are ready.');
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (dialog.id !== 'pause-dialog') { dialog.close(); pause(); }
});
window.addEventListener('keydown', event => {
  const formControl = event.target.closest('input, button, select, a');
  if (event.code === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); pause(); }
  if (event.code === 'KeyP' && !event.target.closest('input, select') && !event.repeat && !$('#settings-dialog').open && !$('#restart-dialog').open && !$('#import-dialog').open && !$('#prestige-dialog').open) {
    event.preventDefault(); session.paused ? resume() : pause();
  }
  if (event.code === 'F11') { event.preventDefault(); if (!event.repeat) fullscreen(); }
  if (event.code === 'Space' && !formControl && !document.querySelector('dialog[open]')) { event.preventDefault(); if (!event.repeat) push(); }
});
window.addEventListener('blur', () => pause('Window inactive. Resume when you are ready.'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('The window was hidden. Your progress is safe.'); });
window.desktop?.onPause(() => pause('Window inactive. Resume when you are ready.'));
window.addEventListener('pagehide', persist);
window.addEventListener('beforeunload', persist);
function frame(time) {
  const delta = lastFrame === null ? 0 : Math.max(0,(time-lastFrame)/1000); lastFrame = time;
  const boosted=state.boost>0;
  const reward=summitPreview(state);
  const goldenActive=state.goldenBoost>0;
  const chronosActive=state.passiveSeconds>=30;
  const oldHigh=state.highWater,oldEarned=state.earned,oldWork=session.metrics.work,oldTime=session.time;
  if (session.tick(delta)) { scene.finishReset(); persist();emitFeedback({kind:'summit',title:'Summit conquered',detail:`${rewardText(reward)}. Next: ${reward.next.name}.`}); }
  if(!goldenActive&&state.goldenBoost>0){emitFeedback({kind:'golden',key:'golden',major:true,title:'Golden Boulder activated',detail:'Automatic divine boost: stronger pushes and workforce for 20 seconds.'});persist();}
  if(goldenActive&&state.goldenBoost===0)emitFeedback({kind:'expired',key:'golden',title:'The golden glow fades',detail:'Your permanent upgrades and workforce keep going.'});
  if(!chronosActive&&state.passiveSeconds>=30)emitFeedback({kind:'relic',key:'chronos-charge',title:'Chronos rewards patience',detail:'×1.1 workforce while passive climbing continues. A push or stopping resets the charge.'});
  const elapsed=session.time-oldTime;
  if(elapsed>0) {
    earnedInterval+=Math.max(0,state.earned-oldEarned);incomeTime+=elapsed;
    workInterval+=Math.max(0,session.metrics.work-oldWork);workTime+=elapsed;
    if(incomeTime>=1){audio.coin(earnedInterval);income=earnedInterval/incomeTime;earnedInterval=incomeTime=0;}
    if(workTime>=1.25){scene.gains.add(workInterval,'worker',session.time);workInterval=workTime=0;}
    const marks=ascentMilestones(oldHigh,state.highWater);
    if(marks.length){const mark=marks.at(-1);emitFeedback({kind:'ascent',key:'ascent',title:({25:'Keep pushing!',50:'Halfway there!',75:'Summit in sight!',100:'Mountain conquered!'})[mark],detail:`${mark}% of this mountain climbed.`});}
    const threshold=numberMilestone(oldEarned,state.earned);
    if(threshold)emitFeedback({kind:'number',key:'earned',title:`${format(threshold)} Obols earned`,detail:'A lifetime milestone. Every ascent adds up.'});
  }
  displayedObols=approachNumber(displayedObols,state.obols,delta,settings.reducedMotion||session.paused);
  for(const node of document.querySelectorAll('[data-pulse-until]'))if(Number(node.dataset.pulseUntil)<=session.time)delete node.dataset.pulseUntil;
  if(boosted&&state.boost===0){persist();emitFeedback({kind:'expired',title:'Defiance rests',detail:'Your workforce returns to its steady pace. Recovery continues.'});}
  feedback.tick(delta,session.paused);renderFeedback();renderHistory();renderChain();if(casinoView.render(session.time,session.paused)){chainPanel.hidden=true;}
  if(!document.hidden){scene.draw(session.time * 1000, session.resetElapsed);renderArcade(session.time);}
  audio.update(state.isResetting?0:state.boulderVelocity, session.paused);
  if (time-lastHUD>=80) { const shop=time-lastShop>=250;updateHUD(shop);if(shop)lastShop=time;lastHUD=time; }
  if (!session.paused && time-lastSave>=1000) { persist(); lastSave=time; }
  requestAnimationFrame(frame);
}
updateHUD(); pause(); requestAnimationFrame(frame);
