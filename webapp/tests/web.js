const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(''+(process.env.BASE||'http://localhost:8140')+'/index.html');await p.waitForTimeout(900);await p.screenshot({path:'w0.png'});
await p.evaluate(()=>App.login('u-bjorn'));await p.waitForTimeout(1300);await p.screenshot({path:'w1.png'});
await p.evaluate(()=>App.go('dashboard'));await p.waitForTimeout(900);await p.screenshot({path:'w2.png',fullPage:true});
await p.evaluate(()=>{App.actFilter='alle';App.go('acties')});await p.waitForTimeout(700);await p.screenshot({path:'w3.png'});
await p.evaluate(()=>App.startInspectie('DAM','P26-168','Damwand · RWZI Voorbeeldstad',true));await p.waitForTimeout(500);await p.screenshot({path:'w4.png'});
await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{App.state.inspectie=null;App.go('vandaag')});await p.waitForTimeout(700);await p.screenshot({path:'w5.png'});
console.log(errs);await b.close()})();
