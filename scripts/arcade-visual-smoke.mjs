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
  const seed={...newState(),totalPushes:'0',completedClimbs:'18',runSummits:18,workers:[10,10,1,0],obols:1e6,relics:['atlas','toll','zeus','chronos'],activeRelics:['atlas','zeus'],goldenCooldown:.1,settings:{muted:true,volume:.35,sfxVolume:.8,reducedMotion:false}};
  await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url);await page.locator('#resume').click();await page.locator('#golden-boulder').waitFor({state:'visible'});
  await page.screenshot({path:'test-results/arcade-gameplay-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>{const a=document.querySelector('.hud').getBoundingClientRect(),b=document.querySelector('.live-power').getBoundingClientRect();return a.bottom<=b.top;}),true);
  await page.locator('[data-tab="divine"]').click();assert.equal(await page.locator('.relic-card[data-equipped="true"]').count(),2);assert.equal(await page.locator('.relic-card svg').count(),4);
  await page.locator('#notification-close').click();await page.locator('.relic-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/arcade-relics-'+viewport.width+'.png'});
  await page.locator('.relic-card').last().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/arcade-chronos-'+viewport.width+'.png'});
  await page.locator('[data-tab="upgrades"]').click();await page.locator('[data-card-key="upgrade:0"]').screenshot({path:'test-results/arcade-shop-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const summitContext=await browser.newContext({viewport}),summit=await summitContext.newPage();summit.on('pageerror',e=>errors.push(e.message));
  await summit.addInitScript(s=>{s.isResetting=true;s.returnRemaining=2.8;s.climbPushes=100;s.highWater=100;s.goldenCooldown=100;s.goldenWindow=0;localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
  await summit.goto(url);await summit.locator('#resume').click();await summit.locator('#game').screenshot({path:'test-results/arcade-summit-'+viewport.width+'.png'});await summitContext.close();
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Arcade visual smoke PASS: gameplay, Golden, four vector relics/two equipped, upgrade shop, summit banner, HUD clearance and overflow at three sizes.');
}finally{await browser?.close();server.close();}
