// Static imports let Vite bundle these original portraits for file:// Electron use.
import shade from './assets/workers/restless-shades.png';
import laborer from './assets/workers/condemned-laborers.png';
import automaton from './assets/workers/bronze-automatons.png';
import engine from './assets/workers/engines-of-hephaestus.png';

export const WORKER_PORTRAITS = [shade, laborer, automaton, engine];

export function workerHeading(worker, index, owned, unlocked) {
  return `<div class="worker-heading"><div class="worker-portrait${unlocked ? '' : ' is-locked'}"${unlocked ? '' : ' title="Portrait revealed when this worker unlocks"'}><img src="${WORKER_PORTRAITS[index]}" width="64" height="64" alt="" draggable="false"></div><h3>${worker.name}<span class="worker-owned" aria-label="${owned} owned">×${owned} <small>OWNED</small></span></h3></div>`;
}
