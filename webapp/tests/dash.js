const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(''+(process.env.BASE||'http://localhost:8140')+'/index.html');await p.waitForTimeout(800);
await p.evaluate(()=>App.login('u-bjorn'));await p.waitForTimeout(800);await p.evaluate(()=>App.go('dashboard'));await p.waitForTimeout(900);
await p.screenshot({path:'d1.png',fullPage:true});
await p.evaluate(()=>App.setFilter('periode','Q2'));await p.waitForTimeout(500);await p.screenshot({path:'d2.png'});
await p.evaluate(()=>App.drill('acties'));await p.waitForTimeout(300);await p.screenshot({path:'d3.png'});
console.log(errs);await b.close()})();
