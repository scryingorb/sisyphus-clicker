import {spinMilestones} from '../src/casino-milestones.js';
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
  const context=await browser.newContext({viewport,hasTouch:viewport.width===390});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const seed={...newState(),spinClaims:spinMilestones().map(m=>m.id),totalPushes:'0',completedClimbs:'4',runSummits:4,climbPushes:24,highWater:24,workers:[10,2,1,0],obols:1000,jackpotMeter:95,fatePending:1,goldenWindow:30,relics:['zeus','toll'],activeRelics:['zeus','toll'],settings:{muted:false,volume:.1,sfxVolume:.2,reducedMotion:false}};
  await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#resume').click();await page.locator('#spin-ready:not(:disabled)').waitFor();await page.locator('#spin-ready').click();await page.locator('#casino-cabinet').scrollIntoViewIfNeeded();await page.locator('#divine-reels').waitFor({state:'visible'});
  const credited=await saved();assert.equal(credited.casinoRolls,1);assert.equal(credited.jackpotWins,1);assert.equal(credited.jackpotMeter,0);assert.ok(credited.obols>1000);
  if(viewport.width===390){await page.locator('#reel-skip').click();await page.waitForTimeout(80);assert.equal(await page.locator('#divine-reels').isVisible(),true);}else await page.waitForTimeout(3600);assert.match(await page.locator('#reel-title').textContent(),/OLYMPUS JACKPOT/);assert.equal(await page.locator('.reel-slot[data-stopped="true"]').count(),5);
  await page.screenshot({path:'test-results/casino-jackpot-'+viewport.width+'.png'});
  assert.equal(await page.locator('#divine-reels').evaluate(el=>{const a=el.getBoundingClientRect();return ['.hud','.live-power','#push'].every(sel=>{const b=document.querySelector(sel).getBoundingClientRect();return a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right;});}),true);
  await page.locator('#reel-skip').click();assert.equal(await page.locator('#divine-reels').getAttribute('data-phase'),'idle');assert.equal((await saved()).jackpotWins,1);
  await page.locator('#casino-status summary').click();assert.equal(await page.locator('[data-fate]').count(),3);
  await page.locator('#fates-choice').screenshot({path:'test-results/casino-choices-'+viewport.width+'.png'});
  if(viewport.width===390)await page.locator('[data-fate="ares"]').tap();else if(viewport.width===800)await page.locator('[data-fate="ares"]').click();else {await page.locator('[data-fate="ares"]').focus();await page.keyboard.press('Enter');}assert.equal((await saved()).blessing,'ares');assert.equal((await saved()).fatePending,0);
  await page.screenshot({path:'test-results/casino-fates-'+viewport.width+'.png'});
  await page.reload();await page.locator('#resume').click();await page.waitForTimeout(150);assert.equal(await page.locator('#divine-reels').getAttribute('data-phase'),'idle');assert.equal((await saved()).jackpotWins,1);assert.equal((await saved()).casinoRolls,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await context.close();
  const reduced=await browser.newContext({viewport});const rp=await reduced.newPage();rp.on('pageerror',e=>errors.push(e.message));
  await rp.addInitScript(s=>{s.settings.reducedMotion=true;s.settings.muted=true;s.climbPushes=s.highWater=99;s.goldenWindow=0;s.jackpotMeter=90;s.fatePending=0;localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
  await rp.goto('http://127.0.0.1:'+server.address().port);await rp.locator('#resume').click();await rp.locator('#spin-ready:not(:disabled)').waitFor();await rp.locator('#spin-ready').click();await rp.locator('#casino-cabinet').scrollIntoViewIfNeeded();await rp.locator('#divine-reels').waitFor({state:'visible'});assert.equal(await rp.locator('.reel-slot[data-stopped="true"]').count(),5);
  const outcome=await rp.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));assert.equal(outcome.fatePending,1);assert.equal(outcome.casinoRolls,1);assert.equal(outcome.jackpotWins,1);
  await rp.screenshot({path:'test-results/casino-summit-'+viewport.width+'.png'});await reduced.close();
 }
 assert.deepEqual(errors,[]);console.log('Casino browser PASS: earned roll, jackpot once, five stops, dismiss, keyboard Fate, save/reload no replay, reduced-motion summit reward, three sizes and no page errors.');
}finally{await browser?.close();server.close();}
