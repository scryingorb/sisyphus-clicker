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
function fixture(kind,reduced=false,height=10){
 const s={...newState(),spinClaims:spinMilestones().map(m=>m.id),runSummits:3,completedClimbs:'3',totalPushes:'0',spins:1,climbPushes:height,highWater:height,goldenCooldown:240,settings:{muted:true,volume:0,reducedMotion:reduced}};
 for(let seed=0;seed<100000;seed++)if(classifyRoll(rollSymbols({...s,casinoSeed:seed},false,true)).kind===kind){s.casinoSeed=seed;return s;}throw Error('Missing fixture');
}
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const width of [1440,1280,800,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(window.name.startsWith('impact:')){localStorage.setItem('sysyphus-clicker-v1',window.name.slice(7));window.name='';}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sysyphus-clicker-v1')));
  for(const kind of Object.keys(COMBINATIONS)){
   const reduced=width===800;await page.evaluate(s=>{window.name='impact:'+JSON.stringify(s);},fixture(kind,reduced));await page.reload();await page.locator('#resume').click();await page.locator('#spin-ready').click();
   const s=await saved(),e=s.pendingReels[0];assert.equal(e.combination,kind);assert.ok(Math.abs(s.climbPushes-e.push.to)<.1);assert.equal(e.push.percent>0,kind!=='unmatched');
   if(kind==='triple'&&width===1440){await page.waitForTimeout(220);await page.screenshot({path:'test-results/casino-impact-trail.png',fullPage:true});}
   if(!reduced){await page.waitForTimeout(240);await page.locator('#reel-skip').click();}await page.waitForTimeout(150);
   assert.equal(await page.locator('.reel-slot:visible').count(),5);assert.equal(await page.locator('#divine-reels').getAttribute('data-tier'),kind);
   assert.match(await page.locator('#casino-push-impact').textContent(),kind==='unmatched'?/Consolation reward/:/DIVINE PUSH.*m on mountain 4/);
   assert.ok((await page.locator('#reel-calculation').textContent()).includes(COMBINATIONS[kind].label));
   if(['unmatched','triple','five'].includes(kind))await page.locator('#divine-reels').screenshot({path:`test-results/casino-impact-${kind}-${width}.png`});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const after=await saved();assert.equal(after.spins,0);assert.equal(after.highWater,Math.max(10,e.push.to));const credited=after.obols;
   await page.reload();await page.locator('#resume').click();assert.equal((await saved()).obols,credited);assert.equal((await saved()).highWater,Math.max(10,e.push.to));
  }
  await page.evaluate(s=>{window.name='impact:'+JSON.stringify(s);},fixture('five',true,99.8));await page.reload();await page.locator('#resume').click();await page.locator('#spin-ready').click();await page.waitForTimeout(150);
  const summit=await saved();assert.equal(summit.isResetting,true);assert.equal(summit.climbPushes,100);assert.match(await page.locator('#casino-push-impact').textContent(),/DIVINE PUSH/);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Casino impact browser PASS: seven tiers at four widths, real progress, summit clipping, no replay, reduced motion and visible trail screenshot.');
}finally{await browser?.close();server.close();}
