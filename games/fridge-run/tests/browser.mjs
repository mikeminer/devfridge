import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
const record=(name)=>{results.push({name,result:'PASS'});console.log('PASS',name);};
const errors=[];
if(!process.argv.includes('--wallet-only')){
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5189');await page.locator('canvas').waitFor();await page.screenshot({path:'docs/desktop.png',fullPage:true});
assert.equal(await page.locator('#challenge').isDisabled(),true);record('Desktop WebGL scene; challenge denies without wallet');
await page.locator('#access-open').click();await page.locator('#connect').click();assert.match(await page.locator('#wallet-message').textContent(),/Phantom not detected/);record('No-wallet fallback');
await page.locator('[data-fixture="pass"]').click();assert.match(await page.locator('#fixture-result').textContent(),/SIMULATION · Qualifies/);
await page.locator('[data-fixture="stale"]').click();assert.match(await page.locator('#fixture-result').textContent(),/Unavailable/);assert.equal(await page.locator('#challenge').isDisabled(),true);record('Fixture demo is labelled and cannot grant live access');
await page.keyboard.press('Escape');await page.locator('#start').click();await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>document.querySelector('#cargo').textContent==='1 / 6');await page.keyboard.up('ArrowUp');assert.match(await page.locator('#cargo').textContent(),/1 \/ 6/);record('Desktop keyboard collects a crate');
await page.locator('#pause').click();const paused=await page.locator('#timer').textContent();await page.waitForTimeout(300);assert.equal(await page.locator('#timer').textContent(),paused);await page.locator('#resume').click();await page.waitForFunction(previous=>document.querySelector('#timer').textContent!==previous,paused);record('Pause freezes simulation and resumes');
await page.screenshot({path:'docs/desktop-game.png'});
await page.locator('#pause').click();await page.locator('#home').click();
await page.locator('#start').click();assert.match(await page.locator('#cargo').textContent(),/0 \/ 6/);record('Return home and restart resets cargo');await page.close();
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto('http://127.0.0.1:5189');await mobile.locator('canvas').waitFor();await mobile.screenshot({path:'docs/mobile-home.png',fullPage:true});await mobile.locator('#start').tap();
const up=await mobile.locator('[data-move="up"]').boundingBox();const cdp=await mobile.context().newCDPSession(mobile);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:up.x+up.width/2,y:up.y+up.height/2}]});await mobile.waitForFunction(()=>document.querySelector('#cargo').textContent==='1 / 6');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.match(await mobile.locator('#cargo').textContent(),/1 \/ 6/);record('390×844 touch input collects a crate');
assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:'docs/mobile-game.png',fullPage:true});
await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(200);await mobile.screenshot({path:'docs/mobile-landscape.png'});const brake=await mobile.locator('#brake').boundingBox();assert.ok(brake.x>=0&&brake.y>=0&&brake.x+brake.width<=844&&brake.y+brake.height<=390);record('Phone landscape controls stay inside viewport');await mobile.close();
// Read-only test provider: no wallet signing capability or transactions.
}
const walletPage=await browser.newPage({viewport:{width:1100,height:900}});walletPage.on('pageerror',e=>errors.push(e.message));
await walletPage.addInitScript(()=>{const handlers={};window.testWalletHandlers=handlers;window.phantom={solana:{isPhantom:true,on:(e,fn)=>handlers[e]=fn,removeListener:()=>{},connect:async()=>({publicKey:{toString:()=> 'FixtureWallet'}}),disconnect:async()=>handlers.disconnect?.()}};});
await walletPage.route('https://scan.devfridge.cool/api/sdk/check?**',async route=>{const now=Math.floor(Date.now()/1000);await route.fulfill({json:{wallet:'FixtureWallet',mint:'39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump',ts:now,activeLocks:[{address:'FixtureVault',depositor:'FixtureWallet',mint:'39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump',amount:'100000000',createdAt:now-90000,unlockAt:now+3600}]}});});
await walletPage.goto('http://127.0.0.1:5189');await walletPage.locator('#access-open').click();await walletPage.locator('#connect').click();try{await walletPage.waitForFunction(()=>document.querySelector('#gate-status').textContent==='Eligible · client check');}catch(e){console.log(await walletPage.locator('#access-dialog').innerText());console.log(errors);await walletPage.close();await browser.close();throw e;}assert.equal(await walletPage.locator('#challenge').isDisabled(),false);record('Mock provider + exact qualifying evidence enables challenge UI');
await walletPage.evaluate(()=>window.testWalletHandlers.accountChanged({toString:()=> 'AnotherWallet'}));await walletPage.waitForFunction(()=>document.querySelector('#gate-status').textContent==='Unavailable · retry');assert.equal(await walletPage.locator('#challenge').isDisabled(),true);record('Account switch clears eligibility and rejects foreign evidence');
await walletPage.locator('#disconnect').click();assert.match(await walletPage.locator('#wallet-status').textContent(),/Not connected/);record('Disconnect clears wallet');await walletPage.close();
const reject=await browser.newPage();await reject.addInitScript(()=>{window.phantom={solana:{isPhantom:true,on:()=>{},connect:async()=>{throw Error('User rejected connection');}}};});await reject.goto('http://127.0.0.1:5189');await reject.locator('#access-open').click();await reject.locator('#connect').click();assert.match(await reject.locator('#wallet-message').textContent(),/rejected/);assert.equal(await reject.locator('#challenge').isDisabled(),true);record('Wallet rejection fails closed without retry loop');
assert.deepEqual(errors,[]);record('No browser runtime errors');
await writeFile('docs/browser-test-results.json',JSON.stringify({date:new Date().toISOString(),browser:'Chrome headless / SwiftShader',physicalPhone:false,results},null,2));
await browser.close();
