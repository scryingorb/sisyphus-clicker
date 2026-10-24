import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { BALANCE } from '../src/progression.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});


let browser;const errors=[];
try {
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:800},{width:800,height:620},{width:390,height:844}]){
    const context=await browser.newContext({viewport,hasTouch:viewport.width===390});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const seed={...newState(),totalPushes:'0',completedClimbs:'5',runSummits:5,workers:[1,0,0,0],obols:1e8,goldenCooldown:.1,settings:{muted:true,volume:0,reducedMotion:false}};
    await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
    await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#resume').click();
    await page.locator('#golden-boulder').waitFor({state:'visible'});
    assert.equal(await page.locator('#golden-boulder').evaluate(el=>{const a=el.getBoundingClientRect();return ['.hud','#push','.live-power'].every(sel=>{const b=document.querySelector(sel).getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;});}),true);
    await page.locator('#game').screenshot({path:'test-results/golden-visible-'+viewport.width+'.png'});
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
    if(viewport.width===390)await page.locator('#golden-boulder').tap();else await page.locator('#golden-boulder').click();
    assert.match(await page.locator('#notification-title').textContent(),/glimmer from Olympus/);
    const activated=await saved();assert.equal(activated.goldenClaims,1);assert.equal(activated.totalPushes,'0');assert.ok(activated.goldenBoost>0&&activated.goldenBoost<=20);
    await page.locator('#golden-status').waitFor({state:'visible'});assert.equal(await page.locator('#golden-boulder').isVisible(),false);
    await page.waitForTimeout(200);assert.match(await page.locator('#passive-power').textContent(),/1.75 power/);
    await page.locator('[data-tab="upgrades"]').click();await page.locator('[data-quantity="10"]').click();
    const hands=page.locator('[data-card-key="upgrade:0"]');assert.match(await hands.textContent(),/Click impulse:/);assert.match(await hands.locator('.purchase-eta').textContent(),/Ready/);
    await hands.locator('[data-buy]').click();assert.equal((await saved()).upgrades[0],10);
    await page.locator('[data-quantity="max"]').click();await hands.locator('[data-buy]').click();assert.ok((await saved()).upgrades[0]>10);assert.ok((await saved()).obols>=0);
    await page.locator('[data-tab="workers"]').click();await page.locator('[data-quantity="10"]').click();await page.locator('[data-buy="tier"][data-index="0"]').click();assert.equal((await saved()).tierUpgrades[0],10);
    assert.match(await page.locator('[data-card-key="worker:0"] .purchase-eta').last().textContent(),/Unavailable/);
    await page.screenshot({path:'test-results/clicker-shop-'+viewport.width+'.png'});
    await page.reload();await page.locator('#resume').click();assert.equal((await saved()).goldenClaims,1);assert.equal(await page.locator('#golden-boulder').isVisible(),false);
    await page.locator('#settings').click();await page.locator('#reduced-motion').check();await page.locator('#settings-close').click();await page.locator('#resume').click();await page.waitForTimeout(150);
    assert.equal(await page.locator('#golden-boulder').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Clicker smoke PASS: Golden mouse/touch claim, timer, no accidental push or replay, bulk upgrade/training purchases, benefit previews, Ready/Unavailable, reduced motion and 3 viewports.');
} finally {await browser?.close();server.close();}
