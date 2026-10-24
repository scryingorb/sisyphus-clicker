import {spinMilestones} from '../src/casino-milestones.js';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { resolveReel } from '../src/casino.js';
import { newState } from '../src/state.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const viewport of [{width:1440,height:900},{width:1280,height:800},{width:800,height:620},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const seed={...newState(),spinClaims:spinMilestones().map(m=>m.id),totalPushes:'0',completedClimbs:'4',runSummits:4,spins:3,activeSpins:2,holdTokens:2,held:[true,true,false,false,false],lastSymbols:Array(5).fill('coin'),riskDecision:{bonus:25},obols:1000,goldenCooldown:.2,settings:{muted:true,volume:0,reducedMotion:false}};
  await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));if(window.name.startsWith('casino-fixture:')){localStorage.setItem('sysyphus-clicker-v1',window.name.slice(15));window.name='';}},seed);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#resume').click();await page.waitForTimeout(400);
  assert.equal((await saved()).obols,1025);assert.equal((await saved()).riskDecision,null);assert.equal((await saved()).holdTokens,0);assert.equal((await saved()).goldenClaims,1);
  assert.equal(await page.locator('[data-hold],[data-risk],#golden-boulder').count(),0);assert.equal(await page.locator('#golden-status').isVisible(),true);
  await page.locator('#spin-ready').click();await page.waitForTimeout(240);const position=()=>page.locator('.reel-strip').nth(4).evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m42);const first=await position();await page.waitForTimeout(100);assert.notEqual(await position(),first);
  await page.locator('.reel-stop').nth(4).click();await page.waitForTimeout(150);assert.equal(await page.locator('.reel-slot').nth(4).getAttribute('data-stopped'),'true');
  const money=(await saved()).obols;await page.reload();await page.locator('#resume').click();assert.equal((await saved()).obols,money);await page.locator('#spin-ready').click();await page.locator('#reel-skip').click();await page.waitForTimeout(100);assert.equal((await saved()).obols,money);assert.equal(await page.locator('.reel-slot:visible').count(),5);
  await page.locator('#casino-cabinet').screenshot({path:'test-results/casino-simplified-'+viewport.width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#reel-skip').click();await page.locator('#spin-ready').click();await page.locator('#reel-skip').click();await page.waitForTimeout(100);assert.equal((await saved()).riskDecision,null);assert.equal((await saved()).holdTokens,0);
  const milestone={...seed,workers:[9,0,0,0],spins:0,riskDecision:null,goldenCooldown:.1,spinClaims:spinMilestones().map(m=>m.id).filter(id=>id!=='worker:0:10'),obols:5000,settings:{muted:true,volume:0,reducedMotion:true}};
  await page.evaluate(s=>{window.name='casino-fixture:'+JSON.stringify(s);},milestone);await page.reload();await page.locator('#resume').click();await page.locator('[data-tab="workers"]').click();await page.locator('[data-buy="worker"][data-index="0"]').click();await page.waitForTimeout(150);assert.equal((await saved()).freeSpinsEarned,1);assert.match(await page.locator('#free-spin-notice').textContent(),/1 FREE SPIN/);
  await page.locator('#spin-ready').click();await page.waitForTimeout(150);assert.equal(await page.locator('.reel-slot[data-stopped="true"]').count(),5);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Casino simplification browser PASS: no hold/risk/claim controls, automatic Golden boost, migrated bonus once, five STOP controls, reload, milestones, reduced motion and four sizes.');
}finally{await browser?.close();server.close();}
