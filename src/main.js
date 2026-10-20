import { summitPreview,rewardText } from './mountain-goals.js';
import { WORKER_PORTRAITS } from './worker-art.js';
import './style.css';
import { loadState, saveState, PUSHES_PER_CLIMB } from './state.js';
import { GameScene } from './scene.js';
import { GameSession } from './session.js';
import { BoulderAudio } from './audio.js';
import { settleAndSave } from './simulation.js';
import { progressionUI } from './progression-ui.js';
import { format, BALANCE } from './progression.js';
import { FeedbackQueue } from './feedback.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Play is available without storage. */ }
const state = loadState(storage);
let offlineSummary = settleAndSave(state, storage);
const session = new GameSession(state);
const settings = { muted: false, volume: .35, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
try {
  const saved = state.settings || JSON.parse(storage.getItem('sisyphus-settings-v1'));
  if (saved) {
    if (typeof saved.muted === 'boolean') settings.muted = saved.muted;
    if (Number.isFinite(saved.volume)) settings.volume = Math.max(0, Math.min(1, saved.volume));
    if (typeof saved.reducedMotion === 'boolean') settings.reducedMotion = saved.reducedMotion;
  }
} catch { /* Use defaults. */ }
const audio = new BoulderAudio(settings);
const workerImages=WORKER_PORTRAITS.map(url=>{const image=new Image();image.src=url;return image;});
const scene = new GameScene($('#scene'), state, workerImages);
scene.reduced = settings.reducedMotion;
let started = false, lastFrame = null, lastSave = 0, lastHUD = 0, pressTimer;

const feedback = new FeedbackQueue();
let shownMessage=null;
function emitFeedback(event) {
  if(!feedback.emit(event))return;
  if(!session.paused&&!document.hidden){audio.unlock();audio.cue(event.kind);}
  if(event.stageChanged||['defiance','summit','prestige'].includes(event.kind))scene.celebrate(event.kind,event.tier,session.time);
  const key=event.key?.replace('tier:','worker:');
  const card=key&&document.querySelector(`[data-card-key="${key}"]`);
  if(card){card.dataset.feedbackPulse=String(session.time+1.4);if(event.kind==='milestone')card.dataset.feedbackMajor='true';}
  renderFeedback();
}
function renderFeedback(){
  document.body.classList.toggle('paused',session.paused);
  document.body.classList.toggle('reduced-motion',settings.reducedMotion);
  const message=feedback.current;
  $('#notification').hidden=!message;
  if(message&&shownMessage!==message.id){
    shownMessage=message.id;$('#notification').dataset.kind=message.kind;
    $('#notification-title').textContent=message.title;$('#notification-detail').textContent=message.detail;
  }
  for(const card of document.querySelectorAll('[data-feedback-pulse]'))if(Number(card.dataset.feedbackPulse)<=session.time){delete card.dataset.feedbackPulse;delete card.dataset.feedbackMajor;}
}
$('#notification-close').onclick=()=>{feedback.dismiss();renderFeedback();};
const renderProgression = progressionUI(state, session, persist, () => {feedback.clear();scene.clearFeedback();scene.finishReset();},emitFeedback);
document.querySelector('.ledger-tabs').after($('#notification'));
function persist() {
  state.settings={...settings};
  if (!saveState(storage, state, session.paused ? state.lastSeen || Date.now() : Date.now())) $('#save-status').textContent = 'SAVING UNAVAILABLE — EXPORT A BACKUP';
  try { storage.setItem('sisyphus-settings-v1', JSON.stringify(settings)); } catch { /* In-memory settings still work. */ }
}
function updateHUD() {
  renderProgression();
  $('#total').textContent = state.totalPushes.toLocaleString('en-US');
  $('#progress').textContent = Math.floor(state.climbPushes / PUSHES_PER_CLIMB * 100);
  $('#progress-bar').style.width = `${state.climbPushes / PUSHES_PER_CLIMB * 100}%`;
  $('#climbs').textContent = state.completedClimbs.toLocaleString('en-US');
  $('#push').disabled = session.paused || state.isResetting;
  const speed = state.boulderVelocity;
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
    summary.innerHTML=`<h3>While away</h3><dl><dt>Time credited</dt><dd>${format(offlineSummary.seconds/60)} min</dd><dt>Obols earned</dt><dd>+${format(offlineSummary.obols)}</dd><dt>Summits</dt><dd>${offlineSummary.mountains}</dd></dl>`;
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
  started = true; session.resume(); lastFrame = null; audio.unlock(); updateHUD();
}
function push() {
  const boosted=state.boost>0;
  if (!session.push()) return;
  audio.unlock(); audio.push(); scene.push(session.time * 1000);
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
$('#mute').checked = settings.muted; $('#volume').value = settings.volume * 100; $('#reduced-motion').checked = settings.reducedMotion;
for (const id of ['mute', 'volume', 'reduced-motion']) $(`#${id}`).addEventListener('input', () => {
  settings.muted = $('#mute').checked; settings.volume = Number($('#volume').value) / 100;
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
  feedback.clear();scene.clearFeedback();session.restart(); scene.finishReset(); started = false; $('#restart-dialog').close(); persist(); updateHUD(); pause();
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
  feedback.clear();scene.clearFeedback();
  Object.assign(state,pendingImport); state.lastSeen=Date.now(); pendingImport = null;
  if(state.settings) Object.assign(settings,state.settings);
  $('#mute').checked=settings.muted; $('#volume').value=settings.volume*100; $('#reduced-motion').checked=settings.reducedMotion; scene.reduced=settings.reducedMotion;
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
  if (session.tick(delta)) { scene.finishReset(); persist();emitFeedback({kind:'summit',title:'Summit conquered',detail:`${rewardText(reward)}. Next: ${reward.next.name}.`}); }
  if(boosted&&state.boost===0){persist();emitFeedback({kind:'expired',title:'Defiance rests',detail:'Your workforce returns to its steady pace. Recovery continues.'});}
  feedback.tick(delta,session.paused);renderFeedback();
  scene.draw(session.time * 1000, session.resetElapsed);
  audio.update(state.isResetting?0:state.boulderVelocity, session.paused);
  if (time-lastHUD>=80) { updateHUD(); lastHUD=time; }
  if (!session.paused && time-lastSave>=1000) { persist(); lastSave=time; }
  requestAnimationFrame(frame);
}
updateHUD(); pause(); requestAnimationFrame(frame);
