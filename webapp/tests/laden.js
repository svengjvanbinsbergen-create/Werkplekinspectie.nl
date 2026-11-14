// Werkplekinspectie — tests/laden.js: de laadindicatoren (js/laden.js, js/laden-start.js, css/laden.css, WPI.laad).
// Controleert: de API bestaat; elke lader verschijnt pas na ±300 ms (snelle acties knipperen niet) en blijft dan
// minstens ±500 ms staan (ook de ring in een knop); ARIA (role=status die LEEG binnenkomt en daarna gevuld wordt,
// nooit onder aria-busy; role=progressbar met aria-valuenow; Nederlandse tekst; één samengevatte melding voor
// meerdere foto's met elk een eigen naam); minder beweging: alles staat stil en blijft volledig zichtbaar (balk
// met zichtbaar label, ring met volle dekking); het skelet van dashboard en rapportage alleen bij traag laden
// (> ±1 s, page.route); bij het openen (echte smoring via CDP): de app-schil meteen (met sessie het zijmenu met
// logo en menuskelet), ±300 ms na de eerste opbouw het skelet (met sessie) of het opstartscherm (zonder; dan één
// N, de kopbalk staat in de vorm van het inlogscherm), weg zodra het scherm er staat, zonder layout shift (CLS);
// de echte app: neutrale opslagstatus met tekenend vinkje op het inspectiescherm (ook zonmodus), ring in de knop
// bij een formulier (data-submit) en bij data-laad, ring over een foto bij het 'wpi-foto'-event (js/sync.js);
// één icoonkleur; de sync-pil (event 'wpi-sync') zonder layout shift; de knop houdt exact zijn maat; geen dubbele
// tik; geen console-fouten.
// Schermafbeeldingen (dsf 1) in LADEN_SHOTS (standaard TESTS_OUT of de huidige map): opstartscherm en skelet
// op 390 en 1920, dashboard-skelet op 1920, sync-pil + balk op 390, inspectiescherm (opslagstatus), en elke API
// op een tijdelijke demopagina (alleen in deze test, via page.route; niet in de app).
//   BASE=http://127.0.0.1:9050 node /home/user/Werkplekinspectie.nl/webapp/tests/laden.js
// Eindigt met "errs [...]".
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://127.0.0.1:8140";
const SHOTS = process.env.LADEN_SHOTS || process.env.TESTS_OUT || process.cwd();
fs.mkdirSync(SHOTS, { recursive: true });
const errs = [];
const ok = (c, m) => { if (!c) errs.push(m); console.log((c ? "ok   " : "FOUT ") + m); };
const shot = (p, naam) => p.screenshot({ path: path.join(SHOTS, naam) });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

async function nieuw(b, w, h, o = {}) {
  // service worker uit: anders gaan de data-verzoeken buiten page.route om (vertragen werkt dan niet)
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: "block", reducedMotion: o.rm ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  // registreer elk opstartscherm/skelet dat ooit in het DOM komt (met tijd sinds navigatie)
  await p.addInitScript(() => {
    window.__ld = []; window.__zicht = [];
    document.addEventListener("animationstart", (e) => { const t = e.target; if (t && (t.id === "ld-opstart")) window.__zicht.push([t.id, Math.round(performance.now())]); }, true);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      // (de opstartlader staat als statische HTML in index.html; die telt via window.__zicht = animationstart)
      if (n.nodeType === 1 && n.classList && n.classList.contains("ld-skelet") && n.id !== "ld-opstartskelet") window.__ld.push([n.getAttribute("data-vorm"), Math.round(performance.now())]);
    }))).observe(document, { childList: true, subtree: true });
  });
  return p;
}

(async () => {
  const b = await chromium.launch();
  try {
    // ---------- 1. API en snelle start: geen opstartscherm, geen skelet ----------
    let p = await nieuw(b, 390, 844);
    await p.goto(BASE + "/index.html"); await p.waitForTimeout(700);
    const api = await p.evaluate(() => {
      const L = window.WPI && WPI.laad; if (!L) return null;
      return { fn: ["knop", "knopTijdens", "vinkje", "voortgang", "fotoRing", "skelet", "skeletHtml", "ring", "opstartFase"].filter((k) => typeof L[k] !== "function"),
        balk: typeof L.balk.start === "function" && typeof L.balk.klaar === "function", NA: L.NA, MIN: L.MIN, bevroren: Object.isFrozen(L) };
    });
    ok(api && !api.fn.length && api.balk && api.NA >= 250 && api.NA <= 400 && api.bevroren, "API WPI.laad compleet " + JSON.stringify(api));
    { const st = await p.evaluate(() => [window.__ld.slice(), window.__zicht.slice(), !!document.getElementById("ld-opstart"), document.documentElement.getAttribute("data-ld-start")]);
      ok(st[0].length === 0 && st[1].length === 0 && !st[2] && st[3] === "gast", "snelle start: opstartlader nooit zichtbaar geworden en weg, geen skelet " + JSON.stringify(st)); }
    const sw = await p.evaluate(async () => (await (await fetch("sw.js")).text()));
    ok(/"js\/laden\.js"/.test(sw) && /"css\/laden\.css"/.test(sw) && /"js\/laden-start\.js"/.test(sw), "sw.js: laden.js, laden-start.js en laden.css in SHELL");
    { const ix = await p.evaluate(async () => (await (await fetch("index.html")).text()));
      const kop = ix.slice(0, ix.indexOf("</head>")), i = kop.indexOf('src="js/laden-start.js"');
      ok(i > kop.lastIndexOf('rel="stylesheet"') && i > kop.indexOf("Content-Security-Policy") && /id="ld-opstart"/.test(ix) && /<p class="sr-only" role="status" id="ld-opstart-status"><\/p>/.test(ix),
        "index.html: js/laden-start.js in <head> na CSP en stylesheets; statische opstartlader met LEGE live-regio"); }
    const man = await p.evaluate(async () => (await fetch("manifest.json")).json());
    ok(man.background_color.toUpperCase() === "#FAF6EF" && man.theme_color.toUpperCase() === "#FAF6EF", "manifest: achtergrond en themakleur #FAF6EF " + man.background_color + " " + man.theme_color);
    ok(await p.evaluate(() => document.querySelector('meta[name="theme-color"]').content.toUpperCase() === "#FAF6EF"), "manifest-themakleur gelijk aan meta theme-color");
    // één icoonkleur: app-icoon (manifest, ook de bron voor Android) = logo in de kopbalk = --accent
    const ico = await p.evaluate(async () => {
      const kleur = async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement("canvas"); c.width = c.height = 8;
        const x = c.getContext("2d"); x.drawImage(im, 0, 0, 8, 8); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3).join(","); };
      const rgb = (v) => { const d = document.createElement("i"); d.style.color = v; document.body.appendChild(d); const r = getComputedStyle(d).color.replace(/[^\d,]/g, ""); d.remove(); return r; };
      return { i192: await kleur("icon-192.png"), i512: await kleur("icon-512.png"), logo: getComputedStyle(document.querySelector(".brand .logo")).backgroundColor.replace(/[^\d,]/g, ""), accent: rgb("var(--accent)") };
    });
    ok(ico.i192 === ico.accent && ico.i512 === ico.accent && ico.logo === ico.accent, "één icoonkleur: icon-192/512.png = logo = --accent " + JSON.stringify(ico));

    // ---------- 2. vertraging 300 ms en ARIA per API ----------
    const r = await p.evaluate(async () => {
      const w = (ms) => new Promise((x) => setTimeout(x, ms)), L = WPI.laad, o = {}, v = document.getElementById("view");
      v.insertAdjacentHTML("beforeend", `<div id="tst"><button type="button" class="btn primary" id="k1" style="width:auto">Inspectie afronden</button>
        <button type="button" class="btn ghost" id="k2" style="width:auto">Opslaan</button><div id="vg"></div><div id="ft" style="width:96px;height:96px"><img alt="" src="icon-192.png" width="96" height="96"></div>
        <span id="ops" class="opslag ok">✓ Veilig op dit toestel · 10:00</span></div>`);
      // knop: aria-busy direct, ring pas na 300 ms; snel klaar = nooit een ring
      const k1 = document.getElementById("k1"), w0 = k1.offsetWidth; let kliks = 0;
      window.App.__tel = () => { kliks++; }; k1.setAttribute("data-action", "__tel");
      L.knop(k1, true, { tekst: "Afronden…" });
      o.knopDirect = k1.getAttribute("aria-busy") === "true" && !k1.querySelector(".ld-ring");
      k1.click(); k1.click(); o.kliksBezig = kliks;
      await w(150); o.knop150 = !!k1.querySelector(".ld-ring");
      await w(250); o.knop400 = !!k1.querySelector(".ld-ring") && /Afronden…/.test(k1.textContent) && Math.abs(k1.offsetWidth - w0) <= 1;
      o.ringMaat = (() => { const s = k1.querySelector(".ld-ring"); return s ? [getComputedStyle(s).width, getComputedStyle(s).height] : null; })();   // (rect draait mee)
      // de ring staat er sinds ±300 ms: hij blijft tot minstens 500 ms zichtbaar (geen flits), de knop blijft zolang bezig
      L.knop(k1, false); k1.click(); o.kliksHold = kliks; o.knopHold = !!k1.querySelector(".ld-ring") && k1.getAttribute("aria-busy") === "true";
      await w(450); k1.click(); o.kliksNa = kliks;
      o.knopUit = !k1.hasAttribute("aria-busy") && !k1.querySelector(".ld-ring") && k1.textContent === "Inspectie afronden";
      // knopTijdens rond een actie van 360 ms: ring na 300 ms, weg pas ≥ 500 ms later; een actie van 100 ms: nooit een ring
      { let in_ = null, uit = null; const t0 = performance.now(), k = document.getElementById("k2");
        const mo = new MutationObserver(() => { const h = !!k.querySelector(".ld-ring"); if (h && in_ == null) in_ = performance.now() - t0; if (!h && in_ != null && uit == null) uit = performance.now() - t0; });
        mo.observe(k, { childList: true, subtree: true });
        const x = await L.knopTijdens(k, w(360).then(() => 7)); const klaarNa = performance.now() - t0; mo.disconnect();
        o.knopTijdens = { x, in: Math.round(in_), uit: Math.round(uit), zicht: Math.round(uit - in_), klaarNa: Math.round(klaarNa), busy: k.hasAttribute("aria-busy") };
        let ooit = false; const mo2 = new MutationObserver(() => { if (k.querySelector(".ld-ring")) ooit = true; }); mo2.observe(k, { childList: true, subtree: true });
        const t1 = performance.now(); await L.knopTijdens(k, w(100)); o.knopTijdensSnel = { ooit, ms: Math.round(performance.now() - t1) }; mo2.disconnect(); }
      const k2 = document.getElementById("k2"); L.knop(k2, true); await w(100); L.knop(k2, false); await w(350); o.knopSnel = !k2.querySelector(".ld-ring") && !k2.hasAttribute("aria-busy");
      // maat blijft exact gelijk, ook met een ring erbij of een langere bezig-tekst: de buren verspringen niet
      v.insertAdjacentHTML("beforeend", `<div id="rij" style="display:flex;gap:8px"><button type="button" class="btn ghost" id="m1" style="width:auto">Opslaan</button><button type="button" class="btn ghost" id="m2" style="width:auto">Volgende</button><button type="button" class="btn primary" id="m3" style="width:auto">Kort</button></div>`);
      const m1 = document.getElementById("m1"), m2 = document.getElementById("m2"), m3 = document.getElementById("m3"), r = (e) => e.getBoundingClientRect();
      const voor = [r(m1).width, r(m1).height, r(m2).x, r(m3).width, r(m3).x];
      L.knop(m1, true); L.knop(m3, true, { tekst: "Bezig met afronden…" }); await w(400);
      o.maat = { voor, tijdens: [r(m1).width, r(m1).height, r(m2).x, r(m3).width, r(m3).x], ringen: [!!m1.querySelector(".ld-ring"), !!m3.querySelector(".ld-ring")], tekstM3: m3.textContent.trim(),
        binnen: [m1, m3].every((b) => { const rg = document.createRange(); rg.selectNodeContents(b); const a = rg.getBoundingClientRect(), k = r(b); return a.left >= k.left - 0.5 && a.right <= k.right + 0.5; }) };
      L.knop(m1, false); L.knop(m3, false); await w(550); o.maatNa = [r(m1).width, r(m3).width, m1.getAttribute("style"), m3.textContent];
      // balk: snel klaar = nooit zichtbaar; anders na 300 ms met role=status en tekst
      L.balk.start("Synchroniseren…"); await w(100); L.balk.klaar(); await w(350);
      const bt = document.querySelector(".ld-balk-top"); o.balkSnel = !bt || bt.hidden;
      L.balk.start("Synchroniseren…"); await w(150); o.balk150 = document.querySelector(".ld-balk-top").hidden;
      await w(250); const bt2 = document.querySelector(".ld-balk-top"); o.balk400 = !bt2.hidden && bt2.querySelector("[role=status]").textContent === "Synchroniseren…" && document.getElementById("hoofd").getAttribute("aria-busy") === "true";
      L.balk.klaar(); await w(1300); o.balkWeg = bt2.hidden && !document.getElementById("hoofd").hasAttribute("aria-busy");
      // voortgang (#4): verborgen tot 300 ms, daarna progressbar met valuenow en valuetext in het Nederlands
      const vg = L.voortgang(document.getElementById("vg"), { titel: "Rapport maken", stap: "Gegevens verzamelen", pct: 5 });
      o.vg150 = vg.el.hidden; await w(350); o.vg400 = !vg.el.hidden;
      vg.zet({ pct: 42, stap: "Foto’s verkleinen (4 van 8)" });
      const pb = vg.el.querySelector("[role=progressbar]");
      o.vgAria = [pb.getAttribute("aria-valuenow"), pb.getAttribute("aria-valuemin"), pb.getAttribute("aria-valuemax"), pb.getAttribute("aria-valuetext"), !!document.getElementById(pb.getAttribute("aria-labelledby"))];
      o.vgHoogte = pb.getBoundingClientRect().height;
      vg.klaar("Rapport klaar"); o.vgKlaar = pb.getAttribute("aria-valuenow") === "100" && /Rapport klaar/.test(vg.el.textContent);
      // fotoRing (#5): zichtbaar na 300 ms; offline wacht zonder beweging en met tekst
      const fr = L.fotoRing(document.querySelector("#ft img"));
      fr.zet(10); await w(150); o.fr150 = !fr.el.classList.contains("zichtbaar"); await w(250); o.fr400 = fr.el.classList.contains("zichtbaar");
      fr.zet(60); o.frAria = [fr.el.getAttribute("role"), fr.el.getAttribute("aria-valuenow"), fr.el.getAttribute("aria-label")];
      fr.wacht(); await w(600);
      o.frWacht = [fr.el.textContent.includes("Wacht op verbinding"), (document.getElementById("ld-foto-status") || {}).textContent, fr.el.hasAttribute("aria-valuenow"),
        fr.el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length, fr.el.querySelectorAll("[role=status],[aria-live]").length];
      fr.fout("Niet geüpload"); o.frFout = /Niet geüpload/.test(fr.el.textContent);
      fr.zet(100); await w(350); fr.klaar(); await w(500); o.frKlaar = !!document.querySelector("#ft .ld-fr-vink") && /geüpload/i.test(fr.el.textContent);
      // drie foto's tegelijk klaar: één samengevatte melding (niet drie keer "Foto geüpload"), en elk een eigen naam
      { v.insertAdjacentHTML("beforeend", `<div id="drie">${[1, 2, 3].map((i) => `<div style="width:80px;height:80px"><img alt="Foto ${i} van 3 bij de waarneming" src="icon-192.png" width="80" height="80"></div>`).join("")}</div>`);
        const meld = []; const reg = () => document.getElementById("ld-foto-status"); if (reg()) reg().textContent = "";
        const mo = new MutationObserver((ms) => { const r = reg(); if (r && ms.some((m) => r.contains(m.target)) && r.textContent) meld.push(r.textContent); }); mo.observe(document.body, { childList: true, subtree: true, characterData: true });
        const hs = [...document.querySelectorAll("#drie img")].map((im) => L.fotoRing(im)); hs.forEach((h) => h.zet(20)); await w(350);
        o.drieNamen = hs.map((h) => h.el.getAttribute("aria-label"));
        hs.forEach((h) => h.klaar()); await w(700); o.drieMeld = [...new Set(meld)]; mo.disconnect(); }
      // vinkje (#7): ✓ wordt een SVG-vinkje dat zich tekent; zelfde tekst nogmaals = zonder animatie
      const ops = document.getElementById("ops"); L.vinkje(ops);
      o.vink = [!!ops.querySelector("svg.ld-vink.ld-vink-teken"), ops.textContent.trim(), ops.querySelector("svg.ld-vink").getBoundingClientRect().width];
      ops.textContent = "✓ Veilig op dit toestel · 10:00"; L.vinkje(ops); o.vinkStil = !!ops.querySelector("svg.ld-vink-stil");
      // bevestigingen op een neutraal vlak, ook buiten het inspectiescherm: nooit mint/groen (leest als een "C")
      const rgb = (e) => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = getComputedStyle(e).backgroundColor; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      o.neutraal = { ops: rgb(ops), frVink: rgb(document.querySelector("#ft .ld-fr-vink")), page: document.getElementById("app").dataset.page };
      // skelet: alleen na `na` ms
      const sv = document.createElement("div"); document.getElementById("tst").appendChild(sv);
      await L.skelet(sv, "dashboard", w(200), { na: 300 }); o.skeletSnel = !sv.querySelector(".ld-skelet");
      const sp = L.skelet(sv, "dashboard", w(700), { na: 300 });
      { const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.querySelector && n.querySelector("[role=status]")) o.skeletLeegBinnen = n.querySelector("[role=status]").textContent === ""; }))); mo.observe(sv, { childList: true }); await w(400); mo.disconnect(); }
      const bl = sv.querySelector(".ld-skelet"), stt = bl && bl.querySelector("[role=status]");
      o.skeletAria = bl ? [stt.closest("[aria-busy]") === null && !document.getElementById("hoofd").hasAttribute("aria-busy"), stt.textContent, bl.querySelector("[aria-hidden=true]") !== null] : null;
      await sp; o.skeletWeg = !sv.querySelector(".ld-skelet");
      // neutrale kleur op het inspectiescherm
      const app = document.getElementById("app"), oud = app.dataset.page;
      const kleur = () => getComputedStyle(document.body).getPropertyValue("--ld").trim();
      o.kleurNormaal = kleur(); app.dataset.page = "inspectie"; o.kleurInspectie = kleur(); o.soft = getComputedStyle(document.body).getPropertyValue("--soft").trim(); app.dataset.page = oud;
      o.accent = getComputedStyle(document.body).getPropertyValue("--accent").trim();
      return o;
    });
    ok(r.knopDirect && !r.knop150 && r.knop400, "knop: aria-busy direct, ring pas na 300 ms, breedte gelijk " + JSON.stringify([r.knopDirect, r.knop150, r.knop400]));
    ok(r.kliksBezig === 0 && r.kliksHold === 0 && r.kliksNa === 1, "knop: geen dubbele tik zolang bezig (" + r.kliksBezig + "/" + r.kliksHold + "), daarna weer wel (" + r.kliksNa + ")");
    ok(r.knopHold, "knop: een ring die er al stond blijft na knop(false) nog even staan (MIN), knop blijft bezig");
    { const k = r.knopTijdens; ok(k.x === 7 && k.in >= 280 && k.in <= 420 && k.zicht >= 480 && k.klaarNa >= k.uit - 5 && !k.busy, "knopTijdens 360 ms: ring na ±300 ms, minstens 500 ms zichtbaar (geen flits), uitkomst daarna " + JSON.stringify(k)); }
    ok(!r.knopTijdensSnel.ooit && r.knopTijdensSnel.ms < 200, "knopTijdens 100 ms: nooit een ring, geen extra wachttijd " + JSON.stringify(r.knopTijdensSnel));
    ok(r.ringMaat && r.ringMaat[0] === "18px" && r.ringMaat[1] === "18px", "ring-SVG heeft een vaste maat (niet 100% breed) " + JSON.stringify(r.ringMaat));
    ok(r.knopUit && r.knopSnel, "knop: na afloop terug zoals hij was; snelle actie = nooit een ring");
    { const m = r.maat, gelijk = m.voor.every((x, i) => Math.abs(x - m.tijdens[i]) < 0.5);
      ok(gelijk && m.ringen[0] && m.ringen[1] && m.binnen, "knop: exact dezelfde maat met ring, buren verspringen niet, inhoud blijft binnen de knop " + JSON.stringify(m));
      ok(m.tekstM3 === "Kort", "knop: past de bezig-tekst niet, dan blijft het eigen label staan (tekst wordt voorgelezen) " + JSON.stringify(m.tekstM3));
      ok(Math.abs(r.maatNa[0] - m.voor[0]) < 0.5 && Math.abs(r.maatNa[1] - m.voor[3]) < 0.5 && r.maatNa[2] === "width:auto" && r.maatNa[3] === "Kort", "knop: daarna weer de eigen stijl " + JSON.stringify(r.maatNa)); }
    ok(r.balkSnel && r.balk150 && r.balk400 && r.balkWeg, "balk: niet bij snelle actie, wel na 300 ms met role=status + tekst en aria-busy op main, daarna weg " + JSON.stringify([r.balkSnel, r.balk150, r.balk400, r.balkWeg]));
    ok(r.vg150 && r.vg400, "voortgang: pas na 300 ms zichtbaar");
    ok(r.vgAria[0] === "42" && r.vgAria[1] === "0" && r.vgAria[2] === "100" && r.vgAria[3] === "42 procent, Foto’s verkleinen (4 van 8)" && r.vgAria[4] && r.vgHoogte === 8 && r.vgKlaar, "voortgang: progressbar met aria-valuenow/-text en label, 8 px, klaar = 100 " + JSON.stringify([r.vgAria, r.vgHoogte]));
    ok(r.fr150 && r.fr400, "fotoRing: pas na 300 ms zichtbaar");
    ok(r.frAria[0] === "progressbar" && r.frAria[1] === "60" && /^Foto \d+ uploaden$/.test(r.frAria[2]), "fotoRing: progressbar met aria-valuenow en eigen naam " + JSON.stringify(r.frAria));
    ok(r.frWacht[0] && r.frWacht[1] === "Foto wacht op verbinding" && !r.frWacht[2] && r.frWacht[3] === 0 && r.frWacht[4] === 0, "fotoRing offline: \"Wacht op verbinding\" in beeld, één gedeelde melding, geen live-regio per ring, geen beweging " + JSON.stringify(r.frWacht));
    ok(JSON.stringify(r.drieNamen) === JSON.stringify([1, 2, 3].map((i) => `Foto ${i} van 3 bij de waarneming uploaden`)) && JSON.stringify(r.drieMeld) === JSON.stringify(["3 foto's geüpload"]), "fotoRing: drie foto's = elk een eigen naam, één melding \"3 foto's geüpload\" " + JSON.stringify([r.drieNamen, r.drieMeld]));
    ok(r.frFout && r.frKlaar, "fotoRing: fout met tekst, klaar met vinkje");
    ok(r.vink[0] && r.vink[1] === "Veilig op dit toestel · 10:00" && r.vink[2] === 14 && r.vinkStil, "vinkje: tekent zich één keer, tekst blijft, 14 px; zelfde tekst opnieuw zonder animatie " + JSON.stringify(r.vink));
    ok([r.neutraal.ops, r.neutraal.frVink].every(([R, G]) => G <= R), "bevestigingen (#7 vinkje, #5 klaar) op een neutraal vlak, niet mint/groen, ook buiten de inspectie " + JSON.stringify(r.neutraal));
    ok(r.skeletSnel && r.skeletAria && r.skeletAria[0] === true && r.skeletAria[1] === "Dashboard laden…" && r.skeletAria[2] && r.skeletLeegBinnen === true && r.skeletWeg, "skelet: niet bij snel laden; anders role=status die leeg binnenkomt en dan \"Dashboard laden…\" zegt (geen aria-busy erboven), vlakken aria-hidden; daarna weg " + JSON.stringify([r.skeletAria, r.skeletLeegBinnen]));
    ok(r.kleurNormaal === "#2F5D50" || /var\(--accent\)|#2F5D50/i.test(r.kleurNormaal), "laderkleur = accent buiten de inspectie (" + r.kleurNormaal + ")");
    ok(/var\(--soft\)|#72665A/i.test(r.kleurInspectie), "laderkleur neutraal (--soft) op het inspectiescherm (" + r.kleurInspectie + ")");
    await p.close();

    // ---------- 3. minder beweging: alles zichtbaar en stil ----------
    p = await nieuw(b, 390, 844, { rm: true });
    await p.goto(BASE + "/index.html"); await p.waitForTimeout(600);
    const rm = await p.evaluate(async () => {
      const w = (ms) => new Promise((x) => setTimeout(x, ms)), L = WPI.laad, v = document.getElementById("view"), o = {};
      v.insertAdjacentHTML("beforeend", `<div id="tst"><button class="btn primary" id="k1" style="width:auto">Afronden</button><span id="ops" class="opslag ok">✓ Veilig op dit toestel · 10:00</span><div id="sk"></div>
        <span id="syncchip" class="opslag">In wachtrij · 2</span></div>`);
      L.knop(document.getElementById("k1"), true); L.balk.start("Synchroniseren…"); L.vinkje(document.getElementById("ops"));
      L.skelet(document.getElementById("sk"), "dashboard", w(3000), { na: 0 });
      document.dispatchEvent(new CustomEvent("wpi-sync", { detail: { bezig: true } }));
      await w(500);
      const cs = (el, pseudo) => getComputedStyle(el, pseudo);
      const ring = document.querySelector("#k1 .ld-ring"), boog = ring.querySelector(".boog");
      o.ring = [cs(ring).animationName, cs(ring).transform, cs(boog).strokeDasharray, ring.getBoundingClientRect().width, cs(ring).animationIterationCount, parseFloat(cs(ring).animationDuration)];
      const ad = [];   // dekking van balk en ring over ±1,2 s: staat stil op 1 (geen ademen: dan zakt het contrast)
      for (let i = 0; i < 6; i++) { ad.push([+cs(document.querySelector(".ld-balk-top .ld-balk"), "::before").opacity, +cs(ring).opacity]); await w(200); }
      o.adem = ad;
      const lab = document.querySelector(".ld-balk-top .ld-balk-label"); o.label = [cs(lab).display, lab.textContent, lab.getBoundingClientRect().height > 10];
      const balk = document.querySelector(".ld-balk-top .ld-balk"), bb = cs(balk, "::before");
      o.balk = [bb.animationName, bb.width, balk.getBoundingClientRect().width, +bb.opacity, bb.transform];
      const s1 = document.querySelector("#sk .ld-sk"); o.sk = [cs(s1).animationName, +cs(s1).opacity];
      const pt = document.querySelectorAll("#syncchip .ld-punten i"); o.punten = [pt.length, [...pt].map((i) => cs(i).animationName + " " + cs(i).opacity)];
      const pad = document.querySelector("#ops .ld-vink path"); o.vink = [cs(pad).strokeDashoffset, cs(pad).animationName];
      L.balk.klaar();
      document.dispatchEvent(new CustomEvent("wpi-sync", { detail: { bezig: false } }));
      return o;
    });
    ok(rm.ring[0] === "none" && rm.ring[1] === "none" && rm.ring[2] !== "none" && rm.ring[3] === 18, "minder beweging: ring staat stil (vaste boog) " + JSON.stringify(rm.ring));
    ok(rm.balk[0] === "none" && Math.abs(parseFloat(rm.balk[1]) - rm.balk[2]) < 1 && rm.balk[3] === 1 && rm.balk[4] === "none", "minder beweging: balk = stilstaande volle lijn " + JSON.stringify(rm.balk));
    ok(rm.adem.every(([a, b]) => a === 1 && b === 1), "minder beweging: balk en ring op volle dekking, ook na 1,2 s (contrast ≥ 3:1 blijft) " + JSON.stringify(rm.adem));
    ok(rm.label[0] === "block" && rm.label[1] === "Synchroniseren…" && rm.label[2], "minder beweging: balk met zichtbaar label \"Synchroniseren…\" " + JSON.stringify(rm.label));
    ok(rm.sk[0] === "none" && rm.sk[1] === 1, "minder beweging: skelet staat stil en is zichtbaar " + JSON.stringify(rm.sk));
    ok(rm.punten[0] === 3 && rm.punten[1].every((x) => x === "none 0.6"), "minder beweging: punten stil en zichtbaar " + JSON.stringify(rm.punten));
    ok(rm.vink[0] === "0px" || rm.vink[0] === "0", "minder beweging: vinkje staat er meteen " + JSON.stringify(rm.vink));
    // opstartscherm bij minder beweging: icoon, naam en tekst meteen zichtbaar
    await p.route("**/data/cijfers.json", async (rt) => { await wacht(1200); rt.continue(); });
    await p.evaluate(() => localStorage.clear());   // geen sessie: opstartscherm (anders het skelet)
    await p.reload(); await p.waitForTimeout(700);
    const rmSplash = await p.evaluate(() => { const s = document.getElementById("ld-splash"), b = document.querySelector("#ld-splash .ld-balk"); return s ? [getComputedStyle(document.getElementById("ld-opstart")).opacity, ...[...s.children].map((c) => getComputedStyle(c).opacity), getComputedStyle(b, "::before").animationName, getComputedStyle(b, "::before").width] : null; });
    ok(rmSplash && rmSplash.slice(0, 5).every((x) => x === "1") && rmSplash[5] === "none", "minder beweging: opstartscherm volledig zichtbaar, lijn staat stil " + JSON.stringify(rmSplash));
    await p.waitForTimeout(800); await p.unroute("**/data/cijfers.json");
    await p.close();

    // ---------- 4. trage start, echt gesmoord (CDP: 1,6 Mbps, 150 ms, CPU 4x), op 390 en 1920 ----------
    // De app-schil staat er bij de eerste opbouw (met sessie: zijmenu met logo, naam en menuskelet); ±300 ms later
    // in het inhoudsvlak het skelet (met sessie) of het opstartscherm (zonder: vorm van het inlogscherm, één N);
    // de live-regio zegt één keer "Werkplekinspectie laden…"; zodra het scherm er staat is de lader weg, zonder
    // layout shift.
    for (const [bw, bh] of [[390, 844], [1920, 1080]]) for (const sessie of [true, false]) {
      p = await nieuw(b, bw, bh);
      await p.goto(BASE + "/index.html"); await p.waitForTimeout(400);
      if (sessie) await p.evaluate(() => App.login("u-hoofd")); else await p.evaluate(() => localStorage.clear());
      await p.waitForTimeout(300);
      const cdp = await p.context().newCDPSession(p);
      await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await p.addInitScript(() => {
        window.__cls = []; window.__fp = null;
        try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === "first-paint") window.__fp = Math.round(e.startTime); })).observe({ type: "paint", buffered: true }); } catch (e) {}
        try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__cls.push([Math.round(e.startTime), +e.value.toFixed(4)]))).observe({ type: "layout-shift", buffered: true }); } catch (e) {}
        new MutationObserver(() => { const v = document.getElementById("view");
          if (!window.__weg && window.__eerste && !document.getElementById("ld-opstart")) { const pl = document.querySelector("#view .vplan");
            window.__weg = [!!document.querySelector("#view #mijnact .listcard"), !pl || pl.children.length > 0, getComputedStyle(v).display]; }
          if (v && v.firstElementChild && !window.__eerste) { const h = document.getElementById("hoofd").getBoundingClientRect(); window.__eerste = [Math.round(performance.now()), !!document.getElementById("ld-opstart"), Math.round(h.x), Math.round(h.width)]; } })
          .observe(document, { childList: true, subtree: true });
        // de live-regio: komt leeg binnen, krijgt daarna precies één keer tekst
        window.__op = []; new MutationObserver(() => { const s = document.getElementById("ld-opstart-status"); if (s && s.textContent && window.__op[window.__op.length - 1] !== s.textContent) window.__op.push(s.textContent); })
          .observe(document, { childList: true, subtree: true, characterData: true });
      });
      await p.reload({ waitUntil: "commit" });
      const naam = sessie ? "skelet" : "opstartscherm";
      // eerste opbouw: schil er al, lader nog onzichtbaar
      await p.waitForFunction(() => window.__fp != null && document.getElementById("ld-opstart"), null, { timeout: 15000, polling: 50 });
      const vroeg = await p.evaluate(() => {
        const o = document.getElementById("ld-opstart"), logo = document.querySelector(".sidebrand .logo"), tb = document.getElementById("tabbar");
        return { op: +getComputedStyle(o).opacity, start: document.documentElement.getAttribute("data-ld-start"), zoom: document.documentElement.style.getPropertyValue("--zoom"),
          logo: !!logo && logo.getClientRects().length > 0 && getComputedStyle(logo).visibility !== "hidden", menu: getComputedStyle(tb).display !== "none" ? tb.querySelectorAll(".ld-tabsk").length : 0,
          brand: getComputedStyle(document.querySelector(".topbar .brand")).visibility, kern: !!window.App };
      });
      ok(vroeg.op === 0 && vroeg.start === (sessie ? "sessie" : "gast") && (bw < 900 || vroeg.zoom === "1.35"), `trage start ${bw} (${sessie ? "sessie" : "geen sessie"}): eerste opbouw in de goede vorm (js/laden-start.js), lader nog niet zichtbaar ` + JSON.stringify(vroeg));
      if (bw > 900 && sessie) ok(vroeg.logo && vroeg.menu === 6, "trage start 1920 (sessie): zijmenu met logo en menuskelet al bij de eerste opbouw (geen lege witte strook) " + JSON.stringify(vroeg));
      if (!sessie) ok(vroeg.menu === 0, `trage start ${bw} (geen sessie): geen zijmenu/tabbalk (vorm van het inlogscherm) ` + JSON.stringify(vroeg));
      await p.waitForFunction(() => window.__zicht.length, null, { timeout: 15000, polling: 50 });
      await p.waitForTimeout(700);
      const t = await p.evaluate(() => [window.__fp, window.__zicht.slice(), window.__ld.slice()]);
      // de CSS-vertraging (.3s) loopt vanaf het moment dat de stijl er is; op een druk toestel komt 'first-paint' daar
      // soms ±100 ms later achteraan, dus gemeten vanaf first-paint ruim: 150–700 ms (nooit meteen, nooit laat)
      const na = t[1][0][1] - t[0];
      ok(t[1].length === 1 && na >= 150 && na <= 700 && t[2].length === 0, `trage start ${bw}: lader ±300 ms na de eerste opbouw (${na} ms), één keer ` + JSON.stringify(t));
      const vlak = await p.evaluate((sessie) => {
        const zicht = (sel) => { const e = document.querySelector(sel); return !!e && e.getClientRects().length > 0 && +getComputedStyle(e).opacity > 0.99; };
        const l = document.getElementById(sessie ? "ld-opstartskelet" : "ld-splash"), hb = document.querySelector(".topbar").getBoundingClientRect(), lr = l.getBoundingClientRect();
        const st = document.getElementById("ld-opstart-status"), brand = document.querySelector(".topbar .brand");
        const ico = document.querySelector(".ld-splash-ico"), logo = document.querySelector(".brand .logo");
        return { zichtbaar: zicht("#ld-opstart") && l.getClientRects().length > 0, ander: document.getElementById(sessie ? "ld-splash" : "ld-opstartskelet").getClientRects().length,
          onderKop: lr.top >= hb.bottom - 1, status: st.textContent, busyBoven: !!st.closest("[aria-busy]"), img: !!document.querySelector("#ld-opstart img"),
          brandOp: +getComputedStyle(brand).opacity, nN: [...document.querySelectorAll(".logo,.ld-splash-ico")].filter((e) => e.getClientRects().length && +getComputedStyle(e).opacity > 0.5 && getComputedStyle(e).visibility !== "hidden" && +getComputedStyle(e.closest(".brand") || e).opacity > 0.5).length,
          icoKleur: ico ? [getComputedStyle(ico).backgroundColor, getComputedStyle(logo).backgroundColor] : null };
      }, sessie);
      ok(vlak.zichtbaar && !vlak.ander && vlak.onderKop && !vlak.img, `trage start ${bw}: alleen het ${naam}, in het inhoudsvlak onder de kopbalk ` + JSON.stringify(vlak));
      ok(vlak.status === "Werkplekinspectie laden…" && !vlak.busyBoven, `trage start ${bw}: role=status zegt "Werkplekinspectie laden…" (geen aria-busy erboven) ` + JSON.stringify(vlak));
      if (!sessie) ok(vlak.nN === 1 && vlak.brandOp < 0.05 && vlak.icoKleur[0] === vlak.icoKleur[1], `trage start ${bw}: opstartscherm met één N (logo in de kopbalk wijkt), icoon in de kleur van het logo ` + JSON.stringify(vlak));
      await shot(p, sessie ? `skelet-start-${bw}.png` : `splash-${bw}.png`);
      await p.waitForFunction(() => window.__eerste, null, { timeout: 25000 });
      await p.waitForTimeout(1500);
      const eind = await p.evaluate(() => { const h = document.getElementById("hoofd").getBoundingClientRect(); return [window.__eerste, !!document.getElementById("ld-opstart"), document.getElementById("view").dataset.page, window.__ld.length,
        window.__cls.reduce((a, x) => a + x[1], 0), Math.round(h.x), Math.round(h.width), window.__op.slice(), document.querySelectorAll("#tabbar .ld-tabsk").length, +getComputedStyle(document.querySelector(".topbar .brand")).opacity]; });
      ok(!eind[1] && eind[2] === (sessie ? "vandaag" : "login") && eind[3] === 0 && eind[8] === 0, `trage start ${bw}: lader weg zodra het ${sessie ? "startscherm" : "inlogscherm"} er staat, menuskelet vervangen ` + JSON.stringify(eind));
      ok(eind[4] < 0.01 && eind[0][2] === eind[5] && eind[0][3] === eind[6], `trage start ${bw}: geen layout shift (CLS ${eind[4].toFixed(4)}), inhoudsvlak op dezelfde plek ` + JSON.stringify([eind[0], eind[5], eind[6], eind[4]]));
      if (sessie) { const weg = await p.evaluate(() => window.__weg);
        ok(weg && weg[0] && weg[1] && weg[2] !== "none", `trage start ${bw}: de lader wijkt pas als het startscherm compleet is (acties en planning getekend; js/laden.js opstartHoud) ` + JSON.stringify(weg)); }
      ok(JSON.stringify(eind[7]) === JSON.stringify(["Werkplekinspectie laden…"]) && eind[9] === 1, `trage start ${bw}: één melding; logo weer zichtbaar ` + JSON.stringify([eind[7], eind[9]]));
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await p.close();
    }
    // klopt de keuze uit <head> niet (bijv. bewaarde sessie verlopen, of andersom): App.boot → opstartFase wisselt ter plekke
    p = await nieuw(b, 390, 844);
    await p.goto(BASE + "/index.html"); await p.waitForTimeout(300); await p.evaluate(() => localStorage.clear());
    await p.route("**/data/cijfers.json", async (rt) => { await wacht(1800); rt.continue(); });
    await p.reload(); await p.waitForTimeout(800);
    const wissel = await p.evaluate(() => { const z = (i) => document.getElementById(i).getClientRects().length > 0; const a = z("ld-splash"); WPI.laad.opstartFase(true); return [a, z("ld-splash"), z("ld-opstartskelet"), document.documentElement.getAttribute("data-ld-start"), document.querySelectorAll(".ld-tabsk").length]; });
    ok(wissel[0] && !wissel[1] && wissel[2] && wissel[3] === "sessie", "opstartscherm wisselt ter plekke naar het skelet zodra er een gebruiker is " + JSON.stringify(wissel));
    await p.waitForTimeout(1600);
    ok(await p.evaluate(() => !document.getElementById("ld-opstart") && !!document.getElementById("view").firstElementChild), "daarna weg zodra het scherm er staat");
    await p.unroute("**/data/cijfers.json"); await p.close();

    // ---------- 5. dashboard en rapportage: skelet alleen bij traag laden (> 1 s) ----------
    p = await nieuw(b, 1920, 1080);
    await p.goto(BASE + "/index.html"); await p.waitForTimeout(600);
    await p.evaluate(() => App.login("u-hoofd")); await p.waitForTimeout(400);
    await p.evaluate(() => { window.__ld = []; App.go("dashboard"); }); await p.waitForTimeout(1300);
    ok(!(await p.evaluate(() => window.__ld.length)) && await p.locator("#view h1", { hasText: "Dashboard" }).count() === 1, "dashboard met cijfers: meteen getekend, geen skelet");
    for (const [scherm, vorm, ms, verwacht] of [["dashboard", "dashboard", 500, false], ["dashboard", "dashboard", 2400, true], ["kwartaal", "kwartaal", 2400, true]]) {
      await p.route("**/data/cijfers.json", async (rt) => { await wacht(ms); rt.continue(); });
      await p.evaluate(() => App.go("vandaag")); await p.waitForTimeout(400);
      await p.evaluate((s) => { window.__ld = []; window.__ldT0 = Math.round(performance.now()); delete App.data.cijfers; App.go(s); }, scherm);
      await p.waitForTimeout(1250);
      const tus = await p.evaluate(() => { const s = document.querySelector("#view .ld-skelet"); return s ? [s.dataset.vorm, s.querySelector("[role=status]").closest("[aria-busy]") === null, s.querySelector("[role=status]").textContent, window.__ld.length ? window.__ld[0][1] - window.__ldT0 : null] : null; });
      if (verwacht) {
        ok(tus && tus[0] === vorm && tus[1] === true && /laden…$/.test(tus[2]) && tus[3] >= 950, `${scherm} traag (${ms} ms): skelet pas na ±1 s, met role=status ` + JSON.stringify(tus));
        if (scherm === "dashboard") await shot(p, "skelet-dashboard-1920.png");
      }
      await p.waitForTimeout(ms + 300);
      const eind = await p.evaluate(() => [window.__ld.map((x) => x[0]), !!document.querySelector("#view .ld-skelet"), !!document.querySelector("#view .grid"), !!App.data.cijfers]);
      ok(eind[0].length === (verwacht ? 1 : 0) && !eind[1] && eind[2] && eind[3], `${scherm} (${ms} ms): ${verwacht ? "skelet en daarna" : "geen skelet,"} het scherm met cijfers ` + JSON.stringify(eind));
      await p.unroute("**/data/cijfers.json");
    }
    await p.close();

    // ---------- 6. sync-pil (#8) en balk (#2) op 390 ----------
    p = await nieuw(b, 390, 844);
    await p.goto(BASE + "/index.html"); await p.waitForTimeout(600);
    await p.evaluate(() => App.login("u-hoofd")); await p.waitForTimeout(500);
    const sy = await p.evaluate(async () => {
      const w = (ms) => new Promise((x) => setTimeout(x, ms)), o = {};
      // de chip zoals js/sync.js hem maakt (alleen met backend): hier nagebootst in #acct
      const box = document.querySelector("#acct > div");
      box.insertAdjacentHTML("afterbegin", `<span id="syncchip" class="opslag" role="status" aria-live="polite">In wachtrij · 3</span>`);
      const ev = (bz) => document.dispatchEvent(new CustomEvent("wpi-sync", { detail: { bezig: bz } }));
      await w(200);
      window.__ls = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ls.push(+e.value.toFixed(4)))); po.observe({ type: "layout-shift" });
      const x0 = [...box.children].map((c) => Math.round(c.getBoundingClientRect().x * 10) / 10);
      ev(true); await w(150); o.p150 = document.querySelectorAll("#syncchip .ld-punten i").length;
      await w(250); const c = document.getElementById("syncchip"); o.p400 = [c.querySelectorAll(".ld-punten i").length, c.getAttribute("aria-busy"), c.querySelector(".ld-punten").getAttribute("aria-hidden"), c.textContent];
      c.textContent = "In wachtrij · 2"; await w(20); o.terug = document.querySelectorAll("#syncchip .ld-punten i").length;   // sync.js vult de chip opnieuw
      o.anim = [...document.querySelectorAll("#syncchip .ld-punten i")].map((i) => getComputedStyle(i).animationName);
      o.verschuiving = { x0, x1: [...box.children].map((c) => Math.round(c.getBoundingClientRect().x * 10) / 10), ls: window.__ls.slice() };
      const pr = document.querySelector("#syncchip .ld-punten").getBoundingClientRect(), cr = document.getElementById("syncchip").getBoundingClientRect();
      o.puntenOnder = pr.top >= cr.bottom && Math.abs((pr.left + pr.right) / 2 - (cr.left + cr.right) / 2) < 1.5 && pr.bottom <= document.querySelector(".topbar").getBoundingClientRect().bottom + 1;
      WPI.laad.balk.start("Synchroniseren…");
      return o;
    });
    ok(sy.p150 === 0 && sy.p400[0] === 3 && sy.p400[1] === "true" && sy.p400[2] === "true" && sy.p400[3] === "In wachtrij · 3", "sync-pil: punten pas na 300 ms, aria-busy, punten aria-hidden, tekst ongewijzigd " + JSON.stringify(sy));
    ok(sy.terug === 3 && sy.anim.every((x) => x === "ld-punt"), "sync-pil: punten blijven na opnieuw vullen door js/sync.js, zachte helderheidsgolf (ld-punt)");
    ok(JSON.stringify(sy.verschuiving.x0) === JSON.stringify(sy.verschuiving.x1) && sy.verschuiving.ls.length === 0 && sy.puntenOnder, "sync-pil: geen layout shift (punten absoluut onder de pil, binnen de kopbalk) " + JSON.stringify(sy.verschuiving));
    await p.waitForTimeout(500);
    await shot(p, "sync-pil-balk-390.png");
    const syEind = await p.evaluate(async () => {
      const w = (ms) => new Promise((x) => setTimeout(x, ms));
      document.dispatchEvent(new CustomEvent("wpi-sync", { detail: { bezig: false } })); WPI.laad.balk.klaar();
      await w(900); const c = document.getElementById("syncchip");
      return [c.querySelectorAll(".ld-punten").length, c.hasAttribute("aria-busy"), window.__ls.length];
    });
    ok(syEind[0] === 0 && !syEind[1] && syEind[2] === 0, "sync-pil: klaar = punten weg, aria-busy weg, nog steeds geen layout shift " + JSON.stringify(syEind));
    // handmatig "Nu synchroniseren" (App.syncOpnieuw) loopt via de balk
    ok(await p.evaluate(() => !App.syncOpnieuw || App.syncOpnieuw.ldBalk === true), "App.syncOpnieuw (Nu synchroniseren) toont de balk");
    await p.close();

    // ---------- 6b. in de echte app: opslagstatus (#7), knop bij formulier/data-laad (#3), foto-event (#5) ----------
    for (const zon of [false, true]) {
      p = await nieuw(b, 390, 844);
      await p.goto(BASE + "/index.html"); await p.waitForTimeout(500);
      await p.evaluate(() => App.login("u-hoofd2")); await p.waitForTimeout(400);
      await p.evaluate((zon) => { if (zon) { App.pref = { veld: true, zon: true }; App.pasPrefToe(); } App.startInspectie("DAM", "P26-168", "Damwand · RWZI Voorbeeldstad"); }, zon);
      await p.waitForTimeout(300);
      await p.fill("#f-taak", "ze halen de damwand eruit met de kraan"); await p.waitForTimeout(200);
      await p.locator("#taakvs .pick").first().click(); await p.waitForTimeout(300);
      await p.fill("#f-zie", "hijsband is rafelig en monteur staat onder de last"); await p.waitForTimeout(500);
      await p.click("text=Volgende: koppel aan de TRA"); await p.waitForTimeout(600);
      await p.locator(".q .pick").first().click(); await p.waitForTimeout(300);
      await p.click(".seg button.t-C"); await p.waitForTimeout(900);
      const os = await p.evaluate(() => {
        const o = document.getElementById("opslag"), rgb = (e) => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = getComputedStyle(e).backgroundColor; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); };
        const v = o.querySelector("svg.ld-vink");
        return { vink: !!v, tekst: o.textContent.trim(), bg: rgb(o), kleur: getComputedStyle(o).color, vinkKleur: v && getComputedStyle(v).color, soft: getComputedStyle(document.body).getPropertyValue("--soft").trim(), page: document.getElementById("app").dataset.page };
      });
      const [R, G, B] = os.bg;
      ok(os.page === "inspectie" && os.vink && /^Veilig op dit toestel · \d\d:\d\d$/.test(os.tekst) && Math.max(R, G, B) - Math.min(R, G, B) <= 16 && G <= R + 2,
        `inspectiescherm${zon ? " (zonmodus)" : ""}: "✓ Veilig op dit toestel" met tekenend vinkje op een neutraal vlak, niet groen/mint (geen "C") ` + JSON.stringify(os));
      await p.evaluate(() => { document.getElementById("opslag").scrollIntoView({ block: "start" }); window.scrollBy(0, -60); });
      await shot(p, `inspectie-opslag${zon ? "-zon" : ""}-390.png`);
      // lange knoptekst (veldmodus) loopt niet buiten de knop
      if (zon) {
        const pas = await p.evaluate(() => [...document.querySelectorAll("#view .btn")].filter((k) => k.offsetParent).map((k) => { const r = document.createRange(); r.selectNodeContents(k); const a = r.getBoundingClientRect(), b = k.getBoundingClientRect(); return a.left >= b.left - 1 && a.right <= b.right + 1 ? null : k.textContent.trim(); }).filter(Boolean));
        ok(pas.length === 0, "veld- en zonmodus 390: geen knoptekst buiten de knop " + JSON.stringify(pas));
      }
      await p.close();
    }
    p = await nieuw(b, 390, 844);
    await p.goto(BASE + "/index.html"); await p.waitForTimeout(500);
    await p.evaluate(() => App.login("u-hoofd")); await p.waitForTimeout(400);
    const bed = await p.evaluate(async () => {
      const w = (ms) => new Promise((x) => setTimeout(x, ms)), o = {}, v = document.getElementById("view");
      let n = 0; App.__traag = () => { n++; return w(700); }; App.__snel = () => { n++; return w(60); };
      v.insertAdjacentHTML("afterbegin", `<form id="tf" data-submit="__traag" novalidate><button type="submit" class="btn primary" id="tk" style="width:auto">Versturen</button></form>
        <button type="button" class="btn ghost" id="tl" data-action="__traag" data-laad="Bezig met laden…" style="width:auto">Laden</button>
        <button type="button" class="btn ghost" id="tz" data-action="__traag" style="width:auto">Zonder</button>
        <form id="ts" data-submit="__snel" novalidate><button type="submit" class="btn primary" id="tsk" style="width:auto">Snel</button></form>
        <div class="fb-beeld" id="fbb" style="width:96px;height:96px"><img id="fimg" alt="Foto 1 van 1 bij deze waarneming" src="icon-192.png" width="96" height="96"></div>`);
      const tk = document.getElementById("tk"), ring = (e) => !!e.querySelector(".ld-ring");
      tk.click(); await w(150); o.f150 = [ring(tk), tk.getAttribute("aria-busy")]; tk.click(); await w(250); o.f400 = ring(tk); o.nForm = n;
      await w(900); o.fEind = [ring(tk), tk.hasAttribute("aria-busy"), tk.textContent];
      const tl = document.getElementById("tl"); n = 0; tl.click(); await w(400); o.laad = [ring(tl), tl.getAttribute("aria-busy")]; await w(900); o.laadEind = ring(tl);
      const tz = document.getElementById("tz"); tz.click(); await w(400); o.zonder = [ring(tz), tz.hasAttribute("aria-busy")]; await w(500);
      const tsk = document.getElementById("tsk"); let ooit = false; const mo = new MutationObserver(() => { if (ring(tsk)) ooit = true; }); mo.observe(tsk, { childList: true, subtree: true });
      tsk.click(); await w(500); mo.disconnect(); o.snel = ooit;
      // js/sync.js meldt een foto-upload (document-event 'wpi-foto'): ring over die foto
      const src = document.getElementById("fimg").getAttribute("src"), ev = (stand) => document.dispatchEvent(new CustomEvent("wpi-foto", { detail: { src, stand } }));
      ev("bezig"); await w(150); const fr = () => document.querySelector("#fbb .ld-fotoring");
      o.foto150 = fr() && fr().classList.contains("zichtbaar"); await w(250);
      o.foto400 = fr() && [fr().classList.contains("zichtbaar"), fr().getAttribute("role"), fr().getAttribute("aria-label")];
      ev("wacht"); await w(600); o.fotoWacht = [fr().textContent.trim(), (document.getElementById("ld-foto-status") || {}).textContent];
      ev("bezig"); await w(100); ev("klaar"); await w(700); o.fotoKlaar = [!!document.querySelector("#fbb .ld-fr-vink"), (document.getElementById("ld-foto-status") || {}).textContent];
      return o;
    });
    ok(bed.f150[0] === false && bed.f150[1] === "true" && bed.f400 === true && bed.nForm === 1 && !bed.fEind[0] && !bed.fEind[1] && bed.fEind[2] === "Versturen",
      "formulier (data-submit) met Promise: knop direct aria-busy, ring na 300 ms, geen dubbele verzending, daarna terug " + JSON.stringify(bed));
    ok(bed.laad[0] && bed.laad[1] === "true" && !bed.laadEind && !bed.zonder[0] && !bed.zonder[1] && !bed.snel, "data-laad: ring in de knop; zonder data-laad niets; snelle actie (60 ms) nooit een ring " + JSON.stringify([bed.laad, bed.zonder, bed.snel]));
    ok(!bed.foto150 && bed.foto400 && bed.foto400[0] && bed.foto400[1] === "progressbar" && bed.foto400[2] === "Foto 1 van 1 bij deze waarneming uploaden", "'wpi-foto' (js/sync.js): ring over de foto na 300 ms, eigen naam " + JSON.stringify(bed.foto400));
    ok(bed.fotoWacht[0] === "Wacht op verbinding" && bed.fotoWacht[1] === "Foto wacht op verbinding" && bed.fotoKlaar[0] && bed.fotoKlaar[1] === "Foto geüpload", "'wpi-foto': offline \"Wacht op verbinding\", klaar met vinkje en één melding " + JSON.stringify([bed.fotoWacht, bed.fotoKlaar]));
    await p.close();

    // ---------- 7. demopagina met elke API (tijdelijk, alleen in deze test) ----------
    p = await nieuw(b, 390, 900);
    const demo = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Laadindicatoren · demo</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="css/laden.css">
      <style>body{padding:16px;background:var(--bg)}#app{min-height:0}.kaart{background:#fff;border-radius:22px;box-shadow:0 0 0 1px var(--line);padding:14px 16px;margin-bottom:12px}
      h2{font-size:14px;color:var(--soft);margin:0 0 10px;font-weight:800}.rij{display:flex;gap:12px;align-items:center;flex-wrap:wrap}</style></head>
      <body><div id="app"><main id="hoofd"><div id="view"><p class="sr-only">Demo van de laadindicatoren</p></div></main></div><div id="meldtekst" class="sr-only" role="status"></div>
      <div class="kaart"><h2>#3 Knop · WPI.laad.knop</h2><div class="rij"><button class="btn primary" id="d3" style="width:auto">Inspectie afronden</button><button class="btn ghost" id="d3b" style="width:auto">Opslaan</button></div></div>
      <div class="kaart"><h2>#4 Rapport-PDF · WPI.laad.voortgang</h2><div id="d4"></div></div>
      <div class="kaart"><h2>#5 Foto uploaden · WPI.laad.fotoRing</h2><div class="rij">
        <div id="d5a" style="width:96px;height:96px;border-radius:18px;background:#C9D6DE"></div><div id="d5b" style="width:96px;height:96px;border-radius:18px;background:#C9D6DE"></div><div id="d5c" style="width:96px;height:96px;border-radius:18px;background:#C9D6DE"></div></div></div>
      <div class="kaart"><h2>#7 Opslaan · WPI.laad.vinkje</h2><span id="opslag" class="opslag ok">✓ Veilig op dit toestel · 10:42</span></div>
      <div class="kaart"><h2>#8 Sync-pil</h2><span id="acct"><span id="syncchip" class="opslag" role="status">In wachtrij · 3</span></span></div>
      <div class="kaart"><h2>#1 Skelet · WPI.laad.skelet(…, "lijst")</h2><div id="d1"></div></div>
      <div class="kaart ld-neutraal"><h2>Inspectiescherm: neutraal (--soft)</h2><div class="rij"><button class="btn ghost" id="d3n" style="width:auto">Volgende</button></div><div id="d4n"></div></div>
      <script src="js/kern.js"></script><script src="js/laden.js"></script></body></html>`;
    await p.route("**/__laden-demo.html", (rt) => rt.fulfill({ contentType: "text/html; charset=utf-8", body: demo }));
    fs.writeFileSync(path.join(SHOTS, "laden-demo.html"), demo);   // kopie ter inzage (staat niet in de app)
    for (const rm2 of [false, true]) {
      await p.emulateMedia({ reducedMotion: rm2 ? "reduce" : "no-preference" });
      await p.goto(BASE + "/__laden-demo.html"); await p.waitForTimeout(300);
      await p.evaluate(() => {
        const L = WPI.laad, $ = (i) => document.getElementById(i);
        L.knop($("d3"), true, { tekst: "Afronden…" }); L.knop($("d3b"), true); L.knop($("d3n"), true);
        L.voortgang($("d4"), { titel: "Rapport maken", stap: "Foto’s verkleinen (4 van 8)", pct: 48 });
        L.voortgang($("d4n"), { titel: "Rapport maken", stap: "Pagina’s opmaken", pct: 84 });
        L.fotoRing($("d5a")).zet(62); L.fotoRing($("d5b")).wacht(); const c5 = L.fotoRing($("d5c")).zet(100); setTimeout(() => c5.klaar(), 350);
        L.vinkje($("opslag"), { opnieuw: true });
        document.dispatchEvent(new CustomEvent("wpi-sync", { detail: { bezig: true } }));
        L.skelet($("d1"), "lijst", new Promise(() => {}), { na: 0 });
        L.balk.start("Synchroniseren…");
      });
      await p.waitForTimeout(900);
      await p.screenshot({ path: path.join(SHOTS, rm2 ? "api-demo-minder-beweging-390.png" : "api-demo-390.png"), fullPage: true });
    }
    await p.close();
  } catch (e) { errs.push("EXC " + (e.stack || e)); }
  await b.close();
  console.log("schermafbeeldingen in " + SHOTS);
  console.log("errs", errs);
  process.exit(errs.length ? 1 : 0);
})();
