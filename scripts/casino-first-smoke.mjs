import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {newState} from '../src/state.js';
import {rollSymbols,classifyRoll,COMBINATIONS} from '../src/casino.js';
import {spinMilestones} from '../src/casino-milestones.js';
const server=createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+(req.url==='/'?'/index.html':req.url));if(!file.startsWith(path.resolve('dist')+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir('test-results',{recursive:true});
function fixture(reduced=false,height=10){return {...newState(),spinClaims:spinMilestones().map(m=>m.id),runSummits:3,completedClimbs:'3',totalPushes:'0',spins:213,climbPushes:height,highWater:height,goldenCooldown:240,jackpotMeter:99,settings:{muted:true,volume:0,reducedMotion:reduced}};}
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const width of [1440,1280,800,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(window.name.startsWith('impact:')){localStorage.setItem('sysyphus-clicker-v1',window.name.slice(7));window.name='';}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  await page.evaluate(s=>{window.name='impact:'+JSON.stringify(s);},fixture(width===800));await page.reload();await page.locator('#resume').click();
  assert.match(await page.locator('#spin-energy').textContent(),/213 SPINS/);
  await page.locator('#spin-batch').click();await page.waitForFunction(()=>document.querySelector('#divine-reels').dataset.complete==='true');
  const after=await saved();assert.equal(after.activeSpins,10);assert.equal(after.spins,203);
  assert.match(await page.locator('#reel-calculation').textContent(),/10 SPINS SETTLED/);
  assert.match(await page.locator('#casino-push-impact').textContent(),/ASCENT REWARD/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok(await page.evaluate(()=>document.querySelector('#arcade-top').getBoundingClientRect().bottom<=document.querySelector('.live-power').getBoundingClientRect().top),'HUD must not overlap live power');
  await page.screenshot({path:`test-results/casino-first-${width}.png`,fullPage:true});await page.locator('#casino-cabinet').screenshot({path:`test-results/casino-first-cabinet-${width}.png`});
  const money=after.obols;await page.reload();await page.locator('#resume').click();assert.equal((await saved()).activeSpins,10);assert.equal((await saved()).obols,money);
  await page.evaluate(s=>{window.name='impact:'+JSON.stringify(s);},fixture(true,99.9));await page.reload();await page.locator('#resume').click();await page.locator('#spin-batch').click();await page.waitForTimeout(100);
  const mid=await saved();assert.ok(mid.spinBatch);assert.ok(mid.activeSpins<10);
  await page.reload();await page.locator('#resume').click();await page.waitForTimeout(3400);
  assert.equal((await saved()).activeSpins,10);assert.equal((await saved()).spinBatch,null);
  await page.screenshot({path:`test-results/casino-first-crossing-${width}.png`,fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Casino-first browser PASS: batch summary at four widths, 213 stored spins, exact spending, reload during mountain return, reduced motion, no overflow or runtime errors.');
}finally{await browser?.close();server.close();}
