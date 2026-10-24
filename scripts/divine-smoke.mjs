import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});
let browser;const errors=[];
try {
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:1280,height:800},{width:800,height:620},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const seed={...newState(),totalPushes:'0',completedClimbs:'18',runSummits:18,workers:[10,2,1,0],obols:1e6,goldenCooldown:.1,defiance:11,settings:{muted:false,volume:.15,sfxVolume:.25,reducedMotion:false}};
  await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));window.audioContexts=[];window.oscillators=0;const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...a){super(...a);window.audioContexts.push(this);}createOscillator(){window.oscillators++;return super.createOscillator();}};},seed);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  await page.goto('http://127.0.0.1:'+server.address().port);assert.equal(await page.evaluate(()=>audioContexts.length),0);
  await page.locator('#resume').click();await page.locator('[data-tab="divine"]').click();assert.equal(await page.locator('.relic-card').count(),4);
  await page.locator('[data-relic-buy="atlas"]').click();await page.locator('[data-relic-buy="zeus"]').click();
  assert.deepEqual((await saved()).activeRelics,['atlas','zeus']);
  await page.locator('#push').click();await page.waitForTimeout(100);assert.match(await page.locator('#chain-sources').textContent(),/Atlas.*1\.15/);
  await page.waitForFunction(()=>document.querySelector('#bonus-chain').dataset.operation==='final');
  assert.match(await page.locator('#chain-value').textContent(),/DIVINE COMBO:/);
  await page.screenshot({path:'test-results/combo-clearance-'+viewport.width+'.png'});
  assert.equal(await page.locator('#bonus-chain').evaluate(el=>{const a=el.getBoundingClientRect();return ['.hud','#push','.live-power','.defiance-block','#golden-boulder'].every(sel=>{const b=document.querySelector(sel).getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;});}),true);
  assert.equal(await page.locator('#bonus-chain').evaluate(el=>el.closest('#game')!==null),true);
  await page.screenshot({path:'test-results/divine-chain-'+viewport.width+'.png'});await page.waitForTimeout(2000);assert.equal(await page.locator('#bonus-chain').isVisible(),true);
  await page.locator('#golden-boulder').click();await page.waitForFunction(()=>document.querySelector('#bonus-chain').dataset.operation==='final'&&document.querySelector('#chain-sources').textContent.includes('Spark of Zeus'));assert.match(await page.locator('#chain-sources').textContent(),/Spark of Zeus/);assert.match(await page.locator('#chain-value').textContent(),/DIVINE COMBO:/);
  assert.equal(await page.evaluate(()=>audioContexts[0].state),'running');assert.ok(await page.evaluate(()=>oscillators)>0);
  await page.locator('[data-relic-buy="toll"]').click();assert.equal(await page.locator('[data-relic-toggle="toll"]').isDisabled(),true);
  await page.locator('[data-relic-toggle="atlas"]').click();await page.locator('[data-relic-toggle="toll"]').click();assert.deepEqual((await saved()).activeRelics.sort(),['toll','zeus']);
  await page.locator('#combo-details summary').click();await page.waitForFunction(()=>document.querySelector('#combo-live').textContent.length>0);assert.match(await page.locator('#combo-live').textContent(),/Spark of Zeus/);assert.match(await page.locator('#combo-live').textContent(),/Workforce/);
  await page.locator('#recent-combos summary').click();assert.ok(await page.locator('#recent-combos article').count()<=5);assert.match(await page.locator('#recent-combos').textContent(),/Atlas/);assert.match(await page.locator('#recent-combos').textContent(),/Zeus/);await page.locator('#recent-combos').screenshot({path:'test-results/combo-history-'+viewport.width+'.png'});await page.locator('#settings').click();await page.locator('#sfx-volume').fill('0');await page.locator('#reduced-motion').check();
  assert.equal((await saved()).settings.sfxVolume,0);await page.locator('#settings-close').click();await page.locator('#resume').click();
  await page.locator('[data-relic-toggle="toll"]').click();await page.waitForTimeout(70);
  assert.equal(await page.locator('#bonus-chain').getAttribute('data-operation'),'final');
  assert.equal(await page.locator('#bonus-chain').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('[data-relic-toggle="toll"]').click();
  const before=await page.evaluate(()=>oscillators);await page.locator('#push').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>oscillators),before);
  await page.reload();await page.locator('#resume').click();assert.deepEqual((await saved()).activeRelics.sort(),['toll','zeus']);assert.equal((await saved()).settings.sfxVolume,0);
  await page.locator('[data-tab="divine"]').click();await page.screenshot({path:'test-results/divine-relics-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Divine smoke PASS: 3 viewports, four relics, two slots, switching and save persistence, Atlas chain, gesture-only AudioContext, running synthesis, SFX silence, reduced motion, no horizontal overflow or page errors.');
}finally{await browser?.close();server.close();}


