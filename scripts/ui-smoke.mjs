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
  async function open(overrides={},viewport={width:1280,height:800}){
    const context=await browser.newContext({viewport}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    const seed={...newState(),totalPushes:'0',completedClimbs:'0',settings:{muted:true,volume:.35,reducedMotion:true},...overrides};
    await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
    await page.goto(`http://127.0.0.1:${server.address().port}`);return {context,page};
  }
  const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  for(const [width,height] of [[1280,800],[800,620],[390,844]]){
    const {page,context}=await open({workers:[9,10,25,1],runSummits:BALANCE.prestigeAt,completedClimbs:'15',obols:1e30,favor:100},{width,height});
    await page.locator('#resume').click();
    assert.equal(await page.locator('#notification').isVisible(),false);
    await page.screenshot({path:`test-results/ui-workers-${width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(width>720)assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
    await page.locator('[data-quantity="10"]').click();await page.locator('[data-buy="worker"][data-index="0"]').click();
    assert.equal((await saved(page)).workers[0],19);
    assert.match(await page.locator('#notification-detail').textContent(),/Ownership bonus/);
    await page.locator('#game').screenshot({path:`test-results/ui-milestone-${width}.png`});
    for(const tab of ['upgrades','divine','collection']){
      await page.locator(`[data-tab="${tab}"]`).click();
      await page.locator('#ledger-content img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
      assert.equal(await page.locator('#ledger-content img').evaluateAll(imgs=>imgs.every(img=>img.naturalWidth>0&&img.alt===''&&getComputedStyle(img).imageRendering==='pixelated')),true);
      assert.equal(await page.locator('#ledger-content img').evaluateAll(imgs=>imgs.every(img=>{const c=document.createElement('canvas');c.width=c.height=80;const x=c.getContext('2d');x.drawImage(img,0,0,80,80);const d=x.getImageData(0,0,80,80).data;let clear=false,solid=false;for(let i=3;i<d.length;i+=4){clear||=d[i]===0;solid||=d[i]>128;}return clear&&solid;})),true);
      if(tab==='collection'&&width<=720)await page.locator('#ledger-content').screenshot({path:`test-results/ui-${tab}-${width}.png`});
      for(let i=0;i<await page.locator('.purchase-card').count();i++){const card=page.locator('.purchase-card').nth(i);await card.screenshot({path:`test-results/ui-${tab}-${width}-${i}.png`});assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),true);}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(tab==='collection')assert.equal(await page.locator('.collection-preview img').evaluateAll(imgs=>new Set(imgs.map(i=>i.src)).size),6);
    }
    await page.locator('[data-tab="divine"]').click();await page.locator('#prestige-open').click();
    await page.screenshot({path:`test-results/ui-prestige-confirm-${width}.png`});
    await page.locator('#prestige-confirm').click();assert.equal((await saved(page)).favor,108);
    assert.match(await page.locator('#notification-title').textContent(),/gods remember/);
    await page.reload();await page.locator('#resume').click();assert.equal(await page.locator('#notification').isVisible(),false);
    await context.close();
  }
  {
    const {page,context}=await open();await page.locator('#resume').click();
    assert.equal(await page.locator('.worker-portrait.is-locked').count(),3);
    await page.screenshot({path:'test-results/ui-opening-1280.png'});
    await page.locator('[data-quantity="10"]').click();assert.equal(await page.locator('[data-buy="worker"][data-index="0"]').isDisabled(),true);
    await page.locator('[data-tab="upgrades"]').click();assert.equal(await page.locator('.item-portrait.is-locked').count(),0);
    await page.screenshot({path:'test-results/ui-unaffordable.png'});
    await page.locator('[data-tab="collection"]').click();assert.equal(await page.locator('.collection-preview.is-locked').count(),4);
    await page.screenshot({path:'test-results/ui-collection-locked.png'});await context.close();
  }
  {
    const {page,context}=await open({defiance:11,workers:[1,0,0,0]});await page.locator('#resume').click();await page.locator('#push').click();
    assert.match(await page.locator('#notification-title').textContent(),/Defiance awakened/);assert.ok((await saved(page)).boost>0);
    await page.screenshot({path:'test-results/ui-defiance.png'});await context.close();
  }
  {
    const {page,context}=await open({boost:.2,defianceCooldown:48,workers:[1,0,0,0]});await page.locator('#resume').click();
    await page.waitForTimeout(400);assert.match(await page.locator('#notification-title').textContent(),/Defiance rests/);await context.close();
  }
  {
    const {page,context}=await open({isResetting:true,returnRemaining:.3,climbPushes:100,highWater:100});await page.locator('#resume').click();
    await page.waitForTimeout(500);assert.match(await page.locator('#notification-detail').textContent(),/\+24 Obols/);
    assert.equal((await saved(page)).completedClimbs,'1');await page.screenshot({path:'test-results/ui-summit.png'});
    await page.reload();await page.locator('#resume').click();assert.equal(await page.locator('#notification').isVisible(),false);assert.equal((await saved(page)).completedClimbs,'1');await context.close();
  }
  {
    const {page,context}=await open({workers:[10,1,0,0],lastSeen:Date.now()-60000});
    assert.equal(await page.locator('#offline-summary').isVisible(),true);await page.screenshot({path:'test-results/ui-offline.png'});
    await page.locator('#resume').click();assert.equal(await page.locator('#notification').isVisible(),false);await context.close();
  }
  assert.deepEqual(errors,[]);console.log('UI smoke PASS: all purchase artwork and alpha, six actual cosmetic previews, three responsive layouts, milestones, locked/unaffordable states, Defiance, summit persistence, prestige and no replay on reload, offline summary.');
}finally{await browser?.close();server.close();}
