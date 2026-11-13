const {chromium}=require('playwright');
const OUT=process.env.OUT||require('path').join(__dirname,'shots');
const BASE='http://localhost:8700';
require('fs').mkdirSync(OUT,{recursive:true});
const NEUTRAAL=()=>{
  const W=window.WPI; if(!W||!W.USERS) return;
  const zet={ 'u-hoofd':['Carla Bos','Hoofd uitvoering'],'u-coord1':['Anna Visser','Coördinator'],'u-coord2':['Bart Smit','Coördinator'],'u-insp':['Inspecteur (demo)','Inspecteur op locatie']};
  W.USERS.forEach(u=>{ if(zet[u.id]){u.full_name=zet[u.id][0];u.functie=zet[u.id][1];} });
};
const TEKST=()=>{
  const R=[[/Noardling/g,'[Organisatie]'],[/Hoofd Service &(amp;)? Montage/g,'de beheerder'],[/Hoofd S&(amp;)?M/g,'hoofd'],[/Björn Sloos/g,'Carla Bos'],[/Winfred Loerts/g,'Anna Visser'],[/Douwe de Boer/g,'Bart Smit'],[/\bWinfred\b/g,'Anna'],[/\bDouwe\b/g,'Bart'],[/\bBjörn\b/g,'Carla']];
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){let t=n.nodeValue,o=t;R.forEach(([a,b])=>t=t.replace(a,b));if(t!==o)n.nodeValue=t;}
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e=>['placeholder','aria-label','title'].forEach(at=>{const v=e.getAttribute(at);if(v){let t=v;R.forEach(([a,b])=>t=t.replace(a,b));if(t!==v)e.setAttribute(at,t);}}));
  document.querySelectorAll('option').forEach(o=>{let t=o.textContent;R.forEach(([a,b])=>t=t.replace(a,b));o.textContent=t;});
  document.querySelectorAll('.logo').forEach(l=>l.textContent='W');
};
(async()=>{
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
await ctx.addInitScript(()=>{ const d=new Date('2026-11-13T09:40:00+01:00').getTime(), O=Date; /* vaste ochtend: groet "Goedemorgen" */ class D extends O{constructor(...a){super(...(a.length?a:[d+(O.now()-window.__t0)]));} static now(){return d+(O.now()-window.__t0);} } window.__t0=O.now(); window.Date=D; try{Object.defineProperty(Notification,'permission',{get:()=>'default'});}catch(e){} });
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
const ev=(f,a)=>p.evaluate(f,a);
const W=(ms)=>p.waitForTimeout(ms);
const S=async(n,opt={})=>{if(!opt.houdScroll){await ev(()=>{const m=document.getElementById('mod');if(m)m.scrollTop=0;});}delete opt.houdScroll;await ev(TEKST);await W(150);await p.screenshot({path:`${OUT}/${n}.png`,...opt});console.log('shot',n);};
const herstel=async()=>{await ev(NEUTRAAL);};
await p.goto(BASE+'/index.html');await W(900);await herstel();await ev(()=>App.route());await W(300);
await S('00-demo-login');
await ev(()=>App.login('u-insp'));await W(800);await herstel();await ev(()=>App.route());await W(800);
await S('02-vandaag');
// menu
await ev(()=>App.openAccount());await W(300);await S('02b-menu');await ev(()=>App.closeModal());
// start via UI: hero kaart
await p.click('button.hero.heroknop');await W(500);
await p.fill('#f-taak','ze halen de damwand eruit met de kraan');await W(400);
await S('03-taak');
await p.locator('#taakvs .pick').first().click();await W(400);
// direct gevaar modal
await p.fill('#f-zie','Monteur staat onder de hangende last in het hijsgebied. Hijsgebied is niet afgezet.');await W(300);
for(const f of ['foto-overzicht.jpg','foto-detail.jpg']){const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('.fotogroot')]);await fc.setFiles(require('path').join(__dirname,f));await W(900);}
await S('04-wat-zie-je');
await p.click('.gevaarknop');await W(300);await S('04b-direct-gevaar');await p.click('text=Werk is stilgelegd');await W(400);
await S('04c-gevaarbalk');
await p.click('text=Volgende: koppel aan de TRA');await W(1200);
await S('05-koppelen');
await p.screenshot({path:`${OUT}/05-koppelen-vol.png`,fullPage:true});
// oordeel-blok in beeld
await p.locator('.odock').scrollIntoViewIfNeeded();await W(200);await S('06-oordeel');
await p.click('.seg button.t-A');await W(900);
await p.click('text=Maatregel genomen');await W(400);await ev(()=>window.scrollTo(0,0));
await S('07-actie');
await p.screenshot({path:`${OUT}/07-actie-vol.png`,fullPage:true});
await p.click('text=Actievoorstel vastleggen');await W(400);
await S('08-nog-iets');
// tweede waarneming: positief (Conform)
await p.click('text=Ja, volgende waarneming');await W(300);
await p.fill('#f-zie','De damwand wordt met een stuurlijn op veilige afstand begeleid.');await W(200);
await p.click('text=Volgende: koppel aan de TRA');await W(1200);
await S('08b-koppelen-2');
const heeft=await p.locator('.vskaart .pick.een').count();
if(heeft){await p.click('.seg button.t-C');} else {await p.click('text=Staat niet in de TRA');await W(300);await p.click('.seg button.t-C');}
await W(500);
await p.click('text=Nee, naar het gesprek met de monteurs');await W(300);
// monteurs
const chips=p.locator('.chipb');await chips.nth(0).click();await W(200);await p.locator('.chipb').nth(1).click();await W(200);
await p.fill('#f-gesprek','Samen naar het hijsgebied gekeken. De monteurs stelden zelf voor het hijsgebied met lint af te zetten; dat doen ze nu. Afgesproken: niemand onder de last.');
await p.fill('#f-positief','Werkplek netjes afgezet en de LMRA was vooraf samen besproken.');await W(300);
await ev(()=>window.scrollTo(0,0));await W(200);await S('09-monteurs');
await p.screenshot({path:`${OUT}/09-monteurs-vol.png`,fullPage:true});
await p.click('text=Naar afronden');await W(500);
await S('10-controle-compleet');
await ev(()=>{App._m=App.state.inspectie.monteurs;App.state.inspectie.monteurs=[];App.route();});await W(400);
await S('10-controle');
await ev(()=>{App.state.inspectie.monteurs=App._m;App.route();});await W(400);
// handtekening
const cv=p.locator('#sig');await cv.scrollIntoViewIfNeeded();const bb=await cv.boundingBox();
await p.mouse.move(bb.x+30,bb.y+100);await p.mouse.down();
for(let i=0;i<=90;i++){const t=i/90*Math.PI*7;await p.mouse.move(bb.x+40+i*2.8+14*Math.cos(t),bb.y+90-28*Math.sin(t)*(i<45?1:0.6)+(i>60?10:0));} await p.mouse.up();await p.mouse.move(bb.x+60,bb.y+125);await p.mouse.down();await p.mouse.move(bb.x+200,bb.y+118,{steps:8});await p.mouse.move(bb.x+300,bb.y+122,{steps:8});await p.mouse.up();await W(300);
await S('11-ondertekenen');
await p.screenshot({path:`${OUT}/10-controle-vol.png`,fullPage:true});
await p.click('text=Inspectie vastleggen');await W(600);
const txt=await p.locator('#mod').innerText();
if(/Toch vastleggen/.test(txt)){await S('11b-herinnering');await p.click('button:has-text("Toch vastleggen")');await W(800);}
await S('12-vastgelegd');
await ev(()=>App.closeModal());await W(500);
await S('13-rapport');
await ev(()=>{document.getElementById('tabbar').style.display='none';document.getElementById('alert').style.display='none';});await ev(TEKST);await p.screenshot({path:`${OUT}/13-rapport-vol.png`,fullPage:true});await ev(()=>{document.getElementById('tabbar').style.display='';document.getElementById('alert').style.display='';});
// weergave
await ev(()=>App.go('vandaag'));await W(500);
await ev(()=>App.startInspectie('DAM','P26-168','Damwand · RWZI Voorbeeldstad',true));await W(400);
await ev(()=>App.kiesTaak('Verwijderen damwand'));await W(400);
await p.click('button[aria-label^="Weergave"]');await W(300);
await p.locator('.prefrow').nth(0).click();await W(200);await p.locator('.prefrow').nth(1).click();await W(300);
await S('14-weergave');await ev(()=>App.closeModal());await W(300);
await S('15-veld-zon');
await ev(()=>{App.state.inspectie=null;App.bewaarConcept(true);App.pref={veld:false,zon:false};App.pasPrefToe();});
// oefenen
await ev(()=>App.go('oefen'));await W(500);await S('20-oefenen');
await p.click('text=Begin met oefenen').catch(()=>{});await W(500);await S('21-oefenen-scene');
await ev(()=>App.oefStop && App.oefStop());await W(300);await ev(()=>App.closeModal());
// coordinator: instellen
await ev(()=>App.login('u-coord1'));await W(800);await herstel();await ev(()=>App.route());await W(800);
await S('30-vandaag-coordinator');
await ev(()=>{App.actFilter='instellen';App.go('acties')});await W(600);
await ev(()=>{const t=document.querySelector('.tabs .tabp.on');if(t)t.scrollIntoView({inline:'center',block:'nearest'});window.scrollTo(0,0);});await W(200);await S('31-acties-instellen');
const ids=await ev(()=>App.acties.filter(a=>a.status==='Voorstel'&&!a.demo).map(a=>a.id));
const nid=ids[0];console.log('nid',nid);
await ev((id)=>App.openActie(id),nid);await W(400);
await p.selectOption('#ai-houder','u-coord2');await p.selectOption('#ai-toetser','u-coord1');await W(200);
await S('32-actie-instellen');
await p.screenshot({path:`${OUT}/32-actie-instellen-vol.png`,fullPage:true});
await ev(()=>{const m=document.getElementById('mod');return m.scrollHeight});
await p.selectOption('#ai-toetser','u-coord2');await p.click('text=Actie instellen');await W(300);
await S('33-toetser-fout');
await p.selectOption('#ai-toetser','u-coord1');await p.click('text=Actie instellen');await W(500);
// actiehouder
await ev(()=>App.login('u-coord2'));await W(800);await herstel();await ev(()=>App.route());await W(500);
await ev(()=>{App.actFilter='gepland';App.go('acties')});await W(500);
await ev(()=>{const t=document.querySelector('.tabs .tabp.on');if(t)t.scrollIntoView({inline:'center',block:'nearest'});window.scrollTo(0,0);});await W(200);await S('34-acties-houder');
await ev((id)=>App.openActie(id),nid);await W(400);
await S('35-actiehouder');
await p.click('text=Klaar voor toetsing, zonder foto');await W(500);
// toetser
await ev(()=>App.login('u-coord1'));await W(800);await herstel();await ev(()=>App.route());await W(500);
await ev(()=>{App.actFilter='toetsen';App.go('acties')});await W(500);
await ev((id)=>App.openActie(id),nid);await W(400);
await S('36-toetsen');
await p.click('text=Akkoord na toetsing · afronden');await W(500);
await ev((id)=>App.openActie(id),nid);await W(400);
await S('37-afgerond');
await ev(()=>App.closeModal());
await ev(()=>App.openMeldingen());await W(500);
await S('38-meldingen');
const c2=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'nl-NL'});
await c2.route('**/js/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.WPI_CONFIG=Object.freeze({supabaseUrl:"https://voorbeeld.supabase.co",supabaseAnonKey:"voorbeeld",debug:false});'}));
await c2.route('https://voorbeeld.supabase.co/**',r=>r.abort());
const p2=await c2.newPage();await p2.goto(BASE+'/index.html');await p2.waitForTimeout(1200);
await p2.fill('#l-mail','inspecteur@organisatie.nl').catch(e=>console.log('geen loginveld',e.message));await p2.fill('#l-ww','wachtwoord-voorbeeld').catch(()=>{});
await p2.evaluate(TEKST);await p2.waitForTimeout(200);await p2.screenshot({path:`${OUT}/01-inloggen.png`});console.log('shot 01-inloggen');
console.log('ERRS',errs);
await b.close();})();
