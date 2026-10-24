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
 for(const viewport of [{width:1280,height:800},{width:800,height:620},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const seed={...newState(),totalPushes:'0',completedClimbs:'4',runSummits:4,obols:1e6,jackpotMeter:95,settings:{muted:true,volume:0,reducedMotion:false}};
  resolveReel(seed,['coin','coin','coin'],100);resolveReel(seed,['lightning','laurel','boulder'],100);const money=seed.obols;
  await page.addInitScript(s=>{if(!localStorage.getItem('sysyphus-clicker-v1'))localStorage.setItem('sysyphus-clicker-v1',JSON.stringify(s));},seed);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#resume').click();
  assert.match(await page.locator('#spin-ready').textContent(),/2 SECURED/);
  await page.locator('#spin-ready').click();await page.waitForTimeout(250);
  await page.reload();await page.locator('#resume').click();assert.equal((await saved()).pendingReels.length,2);assert.equal((await saved()).obols,money);
  await page.locator('#spin-ready').focus();await page.keyboard.press('Enter');if(viewport.width===390)assert.ok(await page.locator('#casino-cabinet').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<2));
  const positions=()=>page.locator('.reel-strip').evaluateAll(els=>els.map(el=>new DOMMatrix(getComputedStyle(el).transform).m42));
  await page.waitForTimeout(230);const a=await positions();await page.screenshot({path:'test-results/big-win-motion-a-'+viewport.width+'.png'});
  await page.waitForTimeout(180);const b=await positions();assert.ok(b.every((v,i)=>v<a[i]));await page.screenshot({path:'test-results/big-win-motion-b-'+viewport.width+'.png'});
  await page.waitForFunction(()=>document.querySelectorAll('.reel-slot[data-stopped="true"]').length===1);
  await page.waitForFunction(()=>document.querySelectorAll('.reel-slot[data-stopped="true"]').length===2);
  await page.waitForFunction(()=>document.querySelectorAll('.reel-slot[data-stopped="true"]').length===3);
  await page.locator('#reel-skip').filter({hasText:'Close'}).waitFor();await page.waitForTimeout(350);
  assert.deepEqual(await page.locator('.reel-slot').evaluateAll(els=>els.map(el=>el.dataset.symbol)),['coin','coin','coin']);
  assert.ok(await page.locator('.reel-slot').evaluateAll(els=>els.every((el,i)=>{const win=el.querySelector('.reel-window').getBoundingClientRect(),cell=el.querySelectorAll('.reel-cell')[19+i*2].getBoundingClientRect();return Math.abs((win.top+win.bottom-cell.top-cell.bottom)/2)<1;})));
  assert.equal((await saved()).obols,money);assert.equal((await saved()).pendingReels.length,1);
  await page.locator('#reel-skip').click();await page.locator('#spin-ready').click();await page.locator('#reel-skip').click();await page.waitForTimeout(100);assert.equal((await saved()).pendingReels.length,0);assert.equal((await saved()).obols,money);
  await page.locator('#reel-skip').click();await page.locator('[data-quantity="10"]').click();await page.locator('[data-buy="worker"][data-index="0"]').click();
  await page.locator('#purchase-impact').waitFor({state:'visible'});await page.waitForTimeout(400);assert.match(await page.locator('#purchase-impact').textContent(),/BEFORE 0/);assert.equal((await saved()).workers[0],10);
  await page.locator('#notification').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/big-win-purchase-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Big Win browser PASS: pending reload, exact unchanged credits, physical motion, sequential stops, aligned authoritative symbols, skip, keyboard spin, bulk purchase, three sizes.');
}finally{await browser?.close();server.close();}
