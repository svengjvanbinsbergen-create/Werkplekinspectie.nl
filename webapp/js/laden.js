/* Werkplekinspectie — js/laden.js
   Laadindicatoren (rustig, stijl B). Alles staat onder window.WPI.laad; de vormgeving staat in css/laden.css.
   Geladen direct na js/kern.js (heeft WPI nodig) en vóór js/sync.js (luistert naar de events 'wpi-sync' en 'wpi-foto').
   Bij het openen werkt ook js/laden-start.js (in <head>) mee, met de statische lader #ld-opstart in index.html.

   Spelregels (ontwerpverkenning laadanimaties, kandidaten #1–#8):
   - Elke lader verschijnt pas na ±300 ms (WPI.laad.NA): een snelle actie knippert nergens. Uitzondering op
     verzoek van de verkenning: het skelet van dashboard en rapportage pas na ±1 s (js/dashboard.js geeft {na: 1000}).
   - Eenmaal zichtbaar blijft een lader minstens ±500 ms staan (WPI.laad.MIN), anders is het een flits. Ook de
     ring in een knop (knop/knopTijdens). Uitzondering: de laders bij het openen wijken meteen voor de echte inhoud.
   - Kleur: --ld (= --accent). Op het inspectiescherm (C/A/V-knoppen) neutraal (--soft), zodat niets als een groene
     "C" leest. Nooit groen/geel/rood als laderkleur; bevestigingen (vinkje, foto klaar) op een neutraal vlak.
   - ARIA: role="status" of role="progressbar" met aria-valuenow, Nederlandse tekst. Een live-regio komt LEEG in het
     DOM en krijgt pas daarna zijn tekst (een regio die al gevuld binnenkomt wordt vaak niet voorgelezen), en staat
     nooit onder een element met aria-busy. Procenten gaan niet in een live-regio; alleen begin en einde.
   - Minder beweging (prefers-reduced-motion): eigen, stilstaande varianten in css/laden.css (na de globale regel).

   API (voor de andere modules):
     WPI.laad.knop(btn, true|false, {tekst})   #3 ring in een knop: aria-busy, vaste breedte en hoogte (buren
                                               verspringen niet), geen dubbele tik. {tekst} alleen als hij past.
     WPI.laad.knopTijdens(btn, belofte, {tekst}) idem rond een Promise; geeft de uitkomst door (na de MIN-staduur)
       Automatisch (js/kern.js, delegatielaag): elk formulier met data-submit waarvan de handler een Promise geeft
       (inloggen, MFA, uitnodigen …) en elke knop met data-action + data-laad (optioneel data-laad="Bezig met …").
     WPI.laad.balk.start(tekst) / .klaar()     #2 dunne balk bovenin (handmatig synchroniseren, scherm wacht op server)
     WPI.laad.balk.tijdens(belofte, tekst)       idem rond een Promise
     WPI.laad.vinkje(el, {opnieuw})            #7 het "✓" in een opslagstatus tekent zich één keer (±350 ms);
                                               js/kern.js toonOpslag (inspectie: "✓ Veilig op dit toestel") gebruikt het
     WPI.laad.voortgang(container, {stap, pct, titel})  #4 bepaalde balk (8 px) met % en stap → {zet, klaar, weg}
     WPI.laad.fotoRing(thumbEl, {naam})        #5 ring over de fotominiatuur → {zet(pct), wacht(), klaar(), fout(tekst)}
       Automatisch: js/sync.js meldt elke foto-upload met document-event 'wpi-foto' (detail {src, stand:
       "bezig"|"klaar"|"wacht"|"fout"}); staat die foto (<img src>) op het scherm, dan krijgt hij de ring.
     WPI.laad.skelet(container, vorm, belofte, {na, tekst})  #1 rustig skelet (puls) zolang een scherm laadt
     WPI.laad.skeletHtml(vorm)                 de vlakken zelf ("start", "dashboard", "kwartaal", "lijst")
     WPI.laad.ring({opKnop})                   de SVG van de ring (#3), bijv. voor een eigen statusregel
   Intern: #6/#1 bij het openen (#ld-opstart, App.boot → WPI.laad.opstartFase in js/kern.js; Vandaag houdt de
   lader met WPI.laad.opstartHoud tot alle kaarten er zijn) en #8 de punten onder
   de sync-pil (#syncchip, js/sync.js) via het document-event 'wpi-sync' (detail.bezig). */
(function () {
  "use strict";
  const WPI = window.WPI, $ = WPI.$, esc = WPI.esc;
  const NA = 300, MIN = 500, SKELET_NA = NA, OPSTART_NA = NA;
  const nu = () => (window.performance && performance.now ? performance.now() : Date.now());
  const zeg = (t) => { try { WPI.zeg(t); } catch (e) {} };
  let volgNr = 0;
  const nieuwId = (p) => "ld-" + p + "-" + (++volgNr);

  // ---------------- SVG's (vaste maten: de globale regel svg{display:block;width:100%} geldt hier niet) ----------------
  const ring = (o = {}) => `<svg class="ld-ring${o.opKnop ? " op-knop" : ""}" viewBox="0 0 24 24" width="${o.maat || 18}" height="${o.maat || 18}" aria-hidden="true" focusable="false">`
    + `<circle class="rail" cx="12" cy="12" r="9.5"/><circle class="boog" cx="12" cy="12" r="9.5" pathLength="100"/></svg>`;
  const VINK = `<svg class="ld-vink" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" pathLength="1"/></svg>`;

  // ---------------- #1 rustig skelet ----------------
  const START_HTML = (() => { const e = document.getElementById("ld-opstartskelet"); return e ? e.innerHTML : ""; })();
  const sk = (cls, stijl) => `<div class="ld-sk${cls ? " " + cls : ""}"${stijl ? ` style="${stijl}"` : ""}></div>`;
  const VORMEN = {
    // startscherm (Vandaag): dezelfde vlakken als het statische skelet in index.html (#ld-opstartskelet; maten in
    // css/laden.css, gelijk aan het echte scherm). Dat is de bron; dit is de terugval voor een pagina zonder.
    start: () => START_HTML || `<div class="ld-sk-start"><div class="ld-sk-kop">${sk("ld-sk-hi")}${sk("ld-sk-h1")}</div><div class="ld-sk-vgrid">${sk("r ld-sk-held")}`
      + `<div class="ld-sk-act">${sk("r ld-sk-tip")}${sk("ld-sk-sectie")}${sk("r ld-sk-actlijst")}</div>`
      + [0, 1].map((i) => `<div class="ld-sk-onder${i ? " ld-sk-breed" : ""}">${sk("ld-sk-sectie")}${sk("r ld-sk-onderlijst")}</div>`).join("") + `</div></div>`,
    dashboard: () => `<div class="ld-sk-dash">
        ${sk("", "height:14px;width:min(360px,60%)")}${sk("", "height:30px;width:min(240px,50%);margin-top:10px")}
        <div class="ld-sk-rij">${sk("pil", "width:170px")}${sk("pil", "width:240px")}${sk("pil", "width:150px")}</div>
        <div class="ld-sk-tegels">${[1, 2, 3, 4, 5].map(() => sk("r", "height:150px")).join("")}</div>
        ${sk("r", "height:340px;margin-top:14px")}
        <div class="ld-sk-duo">${sk("r", "height:260px")}${sk("r", "height:260px")}</div></div>`,
    kwartaal: () => `<div class="ld-sk-dash">
        ${sk("", "height:14px;width:min(300px,60%)")}${sk("", "height:34px;width:min(380px,70%);margin-top:10px")}
        <div class="ld-sk-rij">${sk("pil", "width:96px")}${sk("pil", "width:96px")}${sk("pil", "width:96px")}</div>
        ${sk("r", "height:120px;margin-top:14px")}
        <div class="ld-sk-tegels vier">${[1, 2, 3, 4].map(() => sk("r", "height:130px")).join("")}</div>
        ${sk("r", "height:300px;margin-top:14px")}
        <div class="ld-sk-duo">${sk("r", "height:200px")}${sk("r", "height:200px")}</div></div>`,
    lijst: () => `<div class="ld-sk-dash">${sk("", "height:30px;width:min(260px,60%)")}
        <div class="ld-sk-lijst">${[1, 2, 3, 4].map(() => `<div class="ld-sk-lrij">${sk("bol")}<div style="flex:1">${sk("", "height:14px;width:60%")}${sk("", "height:11px;width:40%;margin-top:8px")}</div></div>`).join("")}</div></div>`,
  };
  const TITEL = { start: "Werkplekinspectie laden…", dashboard: "Dashboard laden…", kwartaal: "Rapportage laden…", lijst: "Laden…" };
  const skeletHtml = (vorm) => (VORMEN[vorm] || VORMEN.lijst)();
  // de live-regio komt leeg binnen en krijgt pas daarna zijn tekst (dan wordt hij voorgelezen); geen aria-busy op
  // een voorouder van de regio (dan slaat een schermlezer hem over), alleen op het verborgen beeld
  const skeletBlok = (vorm) => `<div class="ld-skelet" data-vorm="${esc(vorm)}"><p class="sr-only" role="status"></p><div aria-hidden="true" aria-busy="true">${skeletHtml(vorm)}</div></div>`;
  const meldIn = (regio, tekst) => setTimeout(() => { if (regio && regio.isConnected) regio.textContent = tekst; }, 80);

  // skelet(container, vorm, belofte, {na, tekst}): toont het skelet in container pas als de belofte na `na` ms
  // (standaard 300 ms; dashboard en rapportage geven 1000) nog loopt, laat het dan minstens MIN ms staan en haalt
  // het weg. Geeft de uitkomst van de belofte.
  function skelet(container, vorm, belofte, o = {}) {
    const na = o.na == null ? SKELET_NA : o.na;
    let blok = null, sinds = 0;
    const tm = setTimeout(() => {
      if (!container.isConnected) return;
      container.insertAdjacentHTML("beforeend", skeletBlok(vorm));
      blok = container.lastElementChild; sinds = nu();
      meldIn(blok.querySelector("[role=status]"), o.tekst || TITEL[vorm] || "Laden…");
    }, na);
    const weg = () => new Promise((res) => {
      clearTimeout(tm);
      if (!blok) return res();
      setTimeout(() => { if (blok) blok.remove(); blok = null; res(); }, Math.max(0, MIN - (nu() - sinds)));
    });
    return Promise.resolve(belofte).then((x) => weg().then(() => x), (e) => weg().then(() => { throw e; }));
  }

  // ---------------- #2 dunne balk bovenin ----------------
  const balk = (() => {
    let n = 0, tm = null, elm = null, sinds = 0, weg = null;
    const maak = () => {
      if (elm && elm.isConnected) return elm;
      elm = document.createElement("div");
      elm.className = "ld-balk-top"; elm.hidden = true;
      elm.innerHTML = `<div class="ld-balk" aria-hidden="true"></div><span class="ld-balk-label" aria-hidden="true"></span><span class="sr-only" role="status"></span>`;
      document.body.appendChild(elm); return elm;
    };
    const hoofd = (aan) => { const h = $("hoofd"); if (h) { if (aan) h.setAttribute("aria-busy", "true"); else h.removeAttribute("aria-busy"); } };
    return {
      start(tekst) {
        n++;
        if (n > 1) return;
        clearTimeout(weg); weg = null;
        const e = maak(); e.dataset.tekst = tekst || "Gegevens ophalen…";
        if (!e.hidden && !e.classList.contains("klaar")) return;   // nog zichtbaar van de vorige keer
        clearTimeout(tm);
        tm = setTimeout(() => {
          tm = null; if (n < 1) return;
          e.classList.remove("klaar"); e.hidden = false; sinds = nu(); hoofd(true);
          e.querySelector(".ld-balk-label").textContent = e.dataset.tekst;
          e.querySelector("[role=status]").textContent = e.dataset.tekst;
        }, NA);
      },
      klaar() {
        if (n < 1) return; n--;
        if (n > 0) return;
        clearTimeout(tm); tm = null;
        const e = elm; if (!e || e.hidden) return;
        weg = setTimeout(() => {
          if (n > 0) return;
          e.classList.add("klaar"); e.querySelector("[role=status]").textContent = ""; hoofd(false);
          weg = setTimeout(() => { if (n === 0) { e.hidden = true; e.classList.remove("klaar"); } }, 600);
        }, Math.max(0, MIN - (nu() - sinds)));
      },
      async tijdens(belofte, tekst) { this.start(tekst); try { return await belofte; } finally { this.klaar(); } },
      get actief() { return n > 0; },
    };
  })();

  // ---------------- #3 rustige ring in een knop ----------------
  // De knop krijgt bij het begin een vaste maat (exact zijn huidige breedte en hoogte), zodat hij en zijn buren
  // nooit verspringen. Na 300 ms komt de ring erin; past de ring (met de bezig-tekst) niet in die vaste maat, dan
  // eerst met minder binnenruimte, dan met het eigen label in plaats van de bezig-tekst (die wordt dan voorgelezen),
  // en pas als laatste alleen de ring (het label blijft dan voor schermlezers staan). Een icoon vooraan in de knop
  // maakt plaats voor de ring.
  const KNOP = new WeakMap();
  // breedte/hoogte van de inhoud (alle kinderen samen, inclusief de ruimte ertussen) en de ruimte binnen de padding
  const knopPast = (btn) => {
    const cs = getComputedStyle(btn), rg = document.createRange(); rg.selectNodeContents(btn);
    const r = rg.getBoundingClientRect();
    const bw = btn.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const bh = btn.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return r.width <= bw + 0.5 && r.height <= Math.max(bh, btn.clientHeight * 0.8) + 0.5;
  };
  function knop(btn, aan, o = {}) {
    if (!btn) return btn;
    const st = KNOP.get(btn);
    if (aan) {
      if (st) { if (st.uit) { clearTimeout(st.uit.tm); st.uit.res(); st.uit = null; } return btn; }   // weer bezig: de ring blijft gewoon staan
      const s = { html: btn.innerHTML, stijl: btn.getAttribute("style"), tm: null, vervangen: false, ico: null, ring: null, sinds: 0, uit: null };
      KNOP.set(btn, s);
      const r = btn.getBoundingClientRect();
      if (r.width > 0) {   // vaste maat: breedte en hoogte blijven exact gelijk, wat er ook in de knop komt
        const w = r.width + "px", h = r.height + "px";
        Object.assign(btn.style, { boxSizing: "border-box", width: w, minWidth: w, maxWidth: w, height: h, minHeight: h, flexShrink: "0", flexGrow: "0" });
      }
      btn.setAttribute("aria-busy", "true"); btn.setAttribute("data-ld-bezig", "");
      s.tm = setTimeout(() => {
        if (KNOP.get(btn) !== s) return;
        s.sinds = nu();
        btn.classList.add("ld-knop-bezig");
        const opVlak = /\b(primary|on)\b/.test(btn.className) || getComputedStyle(btn).color === "rgb(255, 255, 255)";
        const R = ring({ opKnop: opVlak });
        const eigen = () => {   // eigen label houden; een icoon vooraan maakt plaats voor de ring
          if (s.vervangen) { btn.innerHTML = s.html; s.vervangen = false; }
          if (s.ring && s.ring.isConnected) s.ring.remove();
          let ico = null;
          for (const n of btn.childNodes) {
            if (n.nodeType === 3 && !n.nodeValue.trim()) continue;
            if (n.nodeType === 1 && (n.tagName === "svg" || n.tagName === "IMG" || n.getAttribute("aria-hidden") === "true") && !(n.textContent || "").trim()) ico = n;
            break;
          }
          if (ico) { ico.setAttribute("data-ld-verborgen", ""); s.ico = ico; }
          btn.insertAdjacentHTML("afterbegin", R); s.ring = btn.firstElementChild;
        };
        const pogingen = [];
        if (o.tekst) pogingen.push(() => { btn.innerHTML = R + `<span class="ld-knoptekst">${esc(o.tekst)}</span>`; s.vervangen = true; s.ring = btn.firstElementChild; });
        pogingen.push(eigen);
        let gelukt = false;
        for (const p of pogingen) {
          p();
          btn.classList.remove("ld-knop-krap"); if (knopPast(btn)) { gelukt = true; break; }
          btn.classList.add("ld-knop-krap"); if (knopPast(btn)) { gelukt = true; break; }
          btn.classList.remove("ld-knop-krap");
        }
        if (!gelukt) {   // te smal voor ring + tekst: alleen de ring, het label blijft voor schermlezers
          const label = (o.tekst || btn.textContent || "").trim();
          btn.innerHTML = R + `<span class="sr-only">${esc(label)}</span>`; s.vervangen = true; s.ring = btn.firstElementChild;
          btn.classList.add("ld-knop-krap");
        }
        if (o.tekst) zeg(o.tekst);
      }, NA);
      return btn;
    }
    if (!st) return btn;
    knopUit(btn, st);
    return btn;
  }
  // de ring weghalen; stond hij er al, dan pas als hij minstens MIN ms zichtbaar was (geen flits). Tot dan blijft de
  // knop bezig (aria-busy, geen dubbele tik). Geeft een Promise die afloopt zodra de knop weer de oude is.
  function knopUit(btn, st) {
    if (st.uit) return st.uit.p;
    clearTimeout(st.tm);
    const rest = st.sinds ? MIN - (nu() - st.sinds) : 0;
    if (rest <= 0) { herstelKnop(btn, st); return Promise.resolve(); }
    const u = st.uit = {}; u.p = new Promise((res) => { u.res = res; u.tm = setTimeout(() => { if (st.uit === u) { st.uit = null; herstelKnop(btn, st); } res(); }, rest); });
    return u.p;
  }
  function herstelKnop(btn, st) {
    if (KNOP.get(btn) !== st) return;
    KNOP.delete(btn);
    // alleen terugzetten wat nog van ons is: zette de actie zelf intussen een andere tekst in de knop
    // (bijv. "Bezig…" → "Inloggen"), dan die laten staan
    if (st.vervangen) { if (st.ring && st.ring.isConnected && btn.contains(st.ring)) btn.innerHTML = st.html; }
    else {
      if (st.ring && st.ring.isConnected) st.ring.remove();
      if (st.ico) st.ico.removeAttribute("data-ld-verborgen");
    }
    btn.classList.remove("ld-knop-bezig", "ld-knop-krap"); btn.removeAttribute("aria-busy"); btn.removeAttribute("data-ld-bezig");
    if (st.stijl == null) btn.removeAttribute("style"); else btn.setAttribute("style", st.stijl);
  }
  // knopTijdens: de uitkomst (of fout) komt pas door als de ring weg is, zodat wat daarna gebeurt niet over een
  // nog zichtbare ring heen tekent
  async function knopTijdens(btn, belofte, o) {
    knop(btn, true, o);
    let x, fout = null, mis = false;
    try { x = await belofte; } catch (e) { fout = e; mis = true; }
    const st = btn && KNOP.get(btn);
    if (st) await knopUit(btn, st);
    if (mis) throw fout;
    return x;
  }
  // geen dubbele tik: een knop die bezig is, geeft zijn klik niet door aan de delegatielaag (js/kern.js)
  const tegenhouden = (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-ld-bezig]") : null;
    const s = e.type === "submit" && e.submitter && e.submitter.hasAttribute("data-ld-bezig");
    if (t || s) { e.preventDefault(); e.stopPropagation(); }
  };
  document.addEventListener("click", tegenhouden, true);
  document.addEventListener("submit", tegenhouden, true);

  // ---------------- #7 vinkje in de opslagstatus ----------------
  let laatsteVink = "";
  // vinkje(el, {opnieuw}): vervangt het "✓" vooraan in el door een vinkje dat zich één keer tekent (±350 ms).
  // Zelfde tekst als de vorige keer (opnieuw getekend scherm): meteen getekend, zonder animatie; {opnieuw:true} forceert.
  function vinkje(el, o = {}) {
    if (!el) return el;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t = w.nextNode(); while (t && !t.nodeValue.trim()) t = w.nextNode();
    if (!t || !/^\s*✓/.test(t.nodeValue)) return el;
    t.nodeValue = t.nodeValue.replace(/^\s*✓\s*/, "");
    const tekst = (el.textContent || "").trim(), sleutel = (el.id || el.className) + "|" + tekst;
    const stil = !o.opnieuw && sleutel === laatsteVink;
    laatsteVink = sleutel;
    const tmp = document.createElement("span"); tmp.innerHTML = VINK;
    const s = tmp.firstChild; s.classList.add(stil ? "ld-vink-stil" : "ld-vink-teken");
    t.parentNode.insertBefore(s, t);
    el.classList.add("ld-vinkvlak");   // neutraal vlak (css/laden.css), niet het mint/groen van .opslag.ok
    return el;
  }

  // ---------------- #4 bepaalde voortgangsbalk met stappen ----------------
  const VG = new WeakMap();
  // voortgang(container, {stap, pct, titel}): eerste aanroep maakt de balk (zichtbaar na 300 ms), volgende werken hem bij.
  // Geeft {zet({stap, pct}), klaar(tekst), weg()}.
  function voortgang(container, o = {}) {
    let h = VG.get(container);
    if (!h) {
      const id = nieuwId("vg"), blok = document.createElement("div");
      blok.className = "ld-vg"; blok.hidden = true;
      blok.innerHTML = `<div class="ld-vg-kop"><span class="ld-vg-titel" id="${id}">${esc(o.titel || "Rapport maken")}</span><span class="ld-vg-pct" aria-hidden="true">0%</span></div>
        <div class="ld-voortgang" role="progressbar" aria-labelledby="${id}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
        <div class="ld-vg-stap"></div>`;
      container.appendChild(blok);
      const bar = blok.querySelector("[role=progressbar]"), vul = bar.firstElementChild, pc = blok.querySelector(".ld-vg-pct"), stap = blok.querySelector(".ld-vg-stap"), tit = blok.querySelector(".ld-vg-titel");
      let klaarOp = false;
      const tm = setTimeout(() => { if (!klaarOp && blok.isConnected) { blok.hidden = false; zeg(tit.textContent + "…"); } }, NA);
      h = {
        zet(x = {}) {
          if (x.titel) tit.textContent = x.titel;
          if (x.stap != null) stap.textContent = x.stap;
          if (x.pct != null) {
            const p = Math.max(0, Math.min(100, Math.round(+x.pct || 0)));
            vul.style.width = p + "%"; pc.textContent = p + "%";
            bar.setAttribute("aria-valuenow", String(p));
          }
          bar.setAttribute("aria-valuetext", bar.getAttribute("aria-valuenow") + " procent" + (stap.textContent ? ", " + stap.textContent : ""));
          return h;
        },
        klaar(tekst) {
          klaarOp = true; clearTimeout(tm);
          h.zet({ pct: 100, titel: tekst || "Rapport klaar", stap: "" });
          blok.classList.add("klaar");
          if (!blok.hidden) zeg(tekst || "Rapport klaar");
          return h;
        },
        weg() { clearTimeout(tm); blok.remove(); VG.delete(container); },
        el: blok,
      };
      VG.set(container, h);
    }
    return h.zet(o);
  }

  // ---------------- #5 ring over de fotominiatuur ----------------
  // fotoRing(thumbEl, {naam}): thumbEl = het element om de miniatuur heen (bij een <img>: zijn ouder).
  // zet(pct) uploaden (ring vult zich, zichtbaar na 300 ms) · wacht() offline: stil, "Wacht op verbinding", geen spinner
  // · klaar() klein vinkje · fout(tekst) stil, met tekst. Geen groen/geel/rood.
  // Schermlezers: elke ring is een progressbar met een EIGEN naam ({naam}, anders de alt van de foto, anders
  // "Foto 2"); de meldingen (klaar, wacht, fout) gaan via één gedeelde live-regio en worden samengevat
  // ("3 foto's geüpload"), zodat drie foto's niet drie keer hetzelfde zeggen.
  const fotoMeld = (() => {
    const laatst = new Map(); let tm = null, regio = null;   // per ring de laatste stand in dit tijdvak
    const zin = (k, n) => k === "klaar" ? (n > 1 ? n + " foto's geüpload" : "Foto geüpload")
      : k === "wacht" ? (n > 1 ? n + " foto's wachten op verbinding" : "Foto wacht op verbinding")
      : (n > 1 ? n + " foto's niet geüpload" : "Foto niet geüpload");
    const regioMaak = () => {
      if (regio && regio.isConnected) return regio;
      regio = document.createElement("p"); regio.className = "sr-only"; regio.id = "ld-foto-status"; regio.setAttribute("role", "status");
      document.body.appendChild(regio); return regio;
    };
    return (ring, stand) => {
      regioMaak();   // al in het DOM (leeg) vóór de eerste melding
      laatst.set(ring, stand); clearTimeout(tm);
      tm = setTimeout(() => {
        const tel = { klaar: 0, wacht: 0, fout: 0 }; laatst.forEach((st) => { tel[st]++; }); laatst.clear();
        const t = ["klaar", "wacht", "fout"].filter((k) => tel[k]).map((k) => zin(k, tel[k])).join(", ");
        const r = regioMaak(); r.textContent = ""; setTimeout(() => { r.textContent = t; }, 60);
      }, 400);
    };
  })();
  function fotoRing(thumbEl, o = {}) {
    const host = thumbEl && thumbEl.tagName === "IMG" ? thumbEl.parentElement : thumbEl;
    if (!host) return { zet() { return this; }, wacht() { return this; }, klaar() { return this; }, fout() { return this; } };
    const img = thumbEl && thumbEl.tagName === "IMG" ? thumbEl : host.querySelector("img");
    const oud = host.querySelector(":scope > .ld-fotoring"); if (oud) oud.remove();
    const oudV = host.querySelector(":scope > .ld-fr-vink"); if (oudV) oudV.remove();
    host.classList.add("ld-foto");
    const naam = o.naam || (img && (img.getAttribute("alt") || "").trim()) || ("Foto " + ([...document.querySelectorAll(".ld-foto")].indexOf(host) + 1));
    const lag = document.createElement("div");
    lag.className = "ld-fotoring";
    lag.innerHTML = `<svg class="ld-fr-svg" viewBox="0 0 40 40" width="46" height="46" aria-hidden="true" focusable="false"><circle class="rail" cx="20" cy="20" r="16"/><circle class="vul" cx="20" cy="20" r="16" pathLength="100"/></svg>
      <span class="ld-fr-pct" aria-hidden="true"></span><span class="ld-fr-tekst"></span>`;
    host.appendChild(lag);
    const vul = lag.querySelector(".vul"), pct = lag.querySelector(".ld-fr-pct"), tekst = lag.querySelector(".ld-fr-tekst");
    let tm = null, stand = "nieuw";
    const toon = () => { clearTimeout(tm); tm = null; lag.classList.add("zichtbaar"); };
    const progress = (aan, p) => {
      if (aan) { lag.setAttribute("role", "progressbar"); lag.setAttribute("aria-label", naam + " uploaden"); lag.setAttribute("aria-valuemin", "0"); lag.setAttribute("aria-valuemax", "100"); lag.setAttribute("aria-valuenow", String(p)); lag.setAttribute("aria-valuetext", p + " procent"); }
      else ["role", "aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"].forEach((a) => lag.removeAttribute(a));
    };
    const h = {
      zet(p) {
        p = Math.max(0, Math.min(100, Math.round(+p || 0)));
        if (stand !== "uploaden") { stand = "uploaden"; lag.classList.remove("wacht", "fout", "klaar"); tekst.textContent = ""; lag.removeAttribute("title"); if (!lag.classList.contains("zichtbaar") && !tm) tm = setTimeout(toon, NA); }
        vul.style.strokeDashoffset = String(100 - p); pct.textContent = p + "%"; progress(true, p);
        return h;
      },
      wacht() {
        if (stand === "wacht") return h;
        stand = "wacht"; progress(false); toon();
        lag.classList.remove("fout", "klaar"); lag.classList.add("wacht"); pct.textContent = "";
        tekst.textContent = "Wacht op verbinding"; lag.setAttribute("title", "Wacht op verbinding · de foto staat veilig op dit toestel");
        fotoMeld(lag, "wacht");
        return h;
      },
      klaar() {
        if (stand === "klaar") return h;
        const zichtbaar = lag.classList.contains("zichtbaar");
        stand = "klaar"; clearTimeout(tm); tm = null; progress(false);
        vul.style.strokeDashoffset = "0"; pct.textContent = ""; tekst.textContent = "Geüpload";
        lag.classList.remove("wacht", "fout"); lag.classList.add("klaar");
        // een snelle upload (ring nooit zichtbaar) krijgt ook geen vinkje en geen melding: er was niets te zien
        if (zichtbaar) {
          if (!host.querySelector(":scope > .ld-fr-vink")) host.insertAdjacentHTML("beforeend", `<span class="ld-fr-vink" aria-hidden="true">${VINK}</span>`);
          fotoMeld(lag, "klaar");
        }
        setTimeout(() => { if (stand === "klaar") lag.remove(); }, 1200);
        return h;
      },
      fout(t) {
        if (stand === "fout") return h;
        stand = "fout"; progress(false); toon();
        lag.classList.remove("wacht", "klaar"); lag.classList.add("fout"); pct.textContent = "";
        tekst.textContent = t || "Niet geüpload";
        fotoMeld(lag, "fout");
        return h;
      },
      el: lag,
    };
    return h;
  }
  // js/sync.js: document-event 'wpi-foto' {src, stand} bij elke foto-upload → ring over die foto als hij op het
  // scherm staat. Alleen als de foto een eigen omlijsting heeft (één <img> in zijn ouder): de ring bedekt die ouder.
  const RINGEN = new WeakMap();
  document.addEventListener("wpi-foto", (e) => {
    const d = e.detail || {}; if (typeof d.src !== "string" || !d.src) return;
    for (const img of document.images) {
      if (img.getAttribute("src") !== d.src || !img.parentElement || img.parentElement.querySelectorAll("img").length !== 1 || !img.getClientRects().length) continue;
      let h = RINGEN.get(img);
      if (!h || !h.el.isConnected) { if (d.stand === "klaar") continue; h = fotoRing(img); RINGEN.set(img, h); }
      if (d.stand === "bezig") h.zet(d.pct == null ? 15 : d.pct);
      else if (d.stand === "klaar") h.klaar();
      else if (d.stand === "wacht") h.wacht();
      else if (d.stand === "fout") h.fout();
    }
  });

  // ---------------- #6 opstartscherm + #1 skelet bij het openen van de app ----------------
  // De lader staat al als HTML in index.html (#ld-opstart, vóór #view) en verschijnt via CSS pas ±300 ms na de
  // eerste schermopbouw: zo is hij er ook op een traag netwerk vóórdat dit script binnen is. js/laden-start.js
  // (in <head>) heeft al gekozen: met bewaarde sessie het skelet van het startscherm (naast het zijmenu), zonder
  // het opstartscherm (in de vorm van het inlogscherm). Hier alleen nog:
  // - de schermlezer: één live-regio (#ld-opstart-status, leeg in de HTML) krijgt één keer "Werkplekinspectie
  //   laden…" zodra de lader zichtbaar wordt (animationstart; geen aria-busy op een voorouder); bij het wisselen
  //   van opstartscherm naar skelet geen tweede melding;
  // - App.boot meldt of er echt een gebruiker is (opstartFase): klopte de keuze uit <head> niet, dan wisselen;
  // - zodra #view iets toont is de lader METEEN weg (geen minimale staduur: de echte inhoud gaat voor), en het
  //   kleine logo in de kopbalk komt rustig terug als het opstartscherm het even had overgenomen;
  // - opstartHoud(beloftes): een scherm dat zijn kaarten pas na het inlezen tekent (Vandaag: planning, acties,
  //   oefentip, laatste inspecties) houdt #view verborgen (#view[data-ld-houd], css/laden.css) en de lader in
  //   beeld tot die delen er zijn (hooguit HOUD_MAX ms). Dan verschijnt het scherm in één keer: op een traag of
  //   druk toestel geen tussenstand die daarna verspringt (layout shift). Alleen bij het openen van de app.
  const op = { klaar: false, gemeld: false, tm: null, houd: 0 };
  const HOUD_MAX = 2500;
  const opBlok = () => $("ld-opstart");
  function opMeld() {
    if (op.klaar || op.gemeld) return;
    op.gemeld = true;
    const r = $("ld-opstart-status"), T = "Werkplekinspectie laden…";
    meldIn(r, T);
    // zolang het document nog laadt, markeert de browser de hele pagina als "bezig" en kan een schermlezer de
    // melding overslaan: is de lader er bij 'load' nog, dan de melding één keer opnieuw (leeg → tekst)
    if (document.readyState !== "complete") window.addEventListener("load", () => {
      if (op.klaar || !r.isConnected) return;
      r.textContent = ""; meldIn(r, T);
    }, { once: true });
  }
  function opstartKlaar() {
    if (op.klaar) return;
    op.klaar = true; clearTimeout(op.tm);
    op.houd = 0; const vw = $("view"); if (vw) vw.removeAttribute("data-ld-houd");
    const b = opBlok();
    if (b) {
      const zichtbaar = parseFloat(getComputedStyle(b).opacity) > 0.01 && b.getClientRects().length > 0;
      const brand = document.querySelector(".topbar .brand");
      if (zichtbaar && brand && parseFloat(getComputedStyle(brand).opacity) < 0.99) {
        brand.classList.add("ld-terug");
        brand.addEventListener("animationend", () => brand.classList.remove("ld-terug"), { once: true });
      }
      b.remove();
    }
    // de menuplaatshouders (index.html) verdwijnen met renderTabs; bij het inlogscherm (menu verborgen) hier
    document.querySelectorAll("#tabbar .ld-tabsk").forEach((e) => e.remove());
    if (kijker) kijker.disconnect();
  }
  // App.boot (js/kern.js) meldt of er na het laden van de gegevens een gebruiker is
  function opstartFase(metGebruiker) {
    if (op.klaar) return;
    const d = document.documentElement, nu0 = d.getAttribute("data-ld-start");
    const nieuw = metGebruiker ? "sessie" : "gast";
    if (nu0 !== nieuw) d.setAttribute("data-ld-start", nieuw);   // zelden: bewaarde sessie verlopen, of andersom
  }
  function opstartHoud(beloftes) {
    const v = $("view"), lijst = [].concat(beloftes || []).filter((b) => b && typeof b.then === "function");
    if (op.klaar || !v || !lijst.length) return;
    op.houd++; v.setAttribute("data-ld-houd", "");
    let open = lijst.length, los = false;
    const vrij = () => {
      if (los) return; los = true; clearTimeout(tm);
      if (op.klaar || --op.houd > 0) return;
      v.removeAttribute("data-ld-houd");
      if (v.firstElementChild) opstartKlaar();
    };
    const tm = setTimeout(vrij, HOUD_MAX);
    const een = () => { if (--open <= 0) vrij(); };
    lijst.forEach((b) => b.then(een, een));
  }
  const kijker = window.MutationObserver ? new MutationObserver(() => { const v = $("view"); if (v && v.firstElementChild && !op.houd) opstartKlaar(); }) : null;
  (function opstart() {
    const v = $("view"), b = opBlok();
    if (!b) { op.klaar = true; return; }   // geen statische lader (bijv. een testpagina)
    if (!v || v.firstElementChild) { opstartKlaar(); return; }
    if (!document.documentElement.hasAttribute("data-ld-start")) document.documentElement.setAttribute("data-ld-start", "gast");
    b.addEventListener("animationstart", (e) => { if (e.target === b) opMeld(); });
    if (parseFloat(getComputedStyle(b).opacity) > 0.01) opMeld();   // al zichtbaar vóór dit script binnen was
    if (kijker) kijker.observe(v, { childList: true });
    // vangnet: nooit langer dan 20 s een lader (bijv. een fout tijdens het opstarten)
    op.tm = setTimeout(opstartKlaar, 20000);
  })();

  // ---------------- #8 sync-pil met ademende punten (#syncchip, js/sync.js) ----------------
  // js/sync.js stuurt document-event 'wpi-sync' met detail {bezig: true|false} bij begin en einde van versturen/ophalen.
  const sync = { bezig: false, punten: false, tm: null, sinds: 0, weg: null };
  const PERIODE = 1400;
  function pil() {
    const c = $("syncchip"); if (!c) return;
    // de punten staan absoluut ONDER de pil (#syncchip{position:relative} in css/laden.css; sync.js zet className
    // steeds opnieuw): de pil wordt niet breder en de kopbalk verschuift niet (geen layout shift bij elke sync)
    if (sync.punten) {
      if (c.getAttribute("aria-busy") !== "true") c.setAttribute("aria-busy", "true");
      if (!c.querySelector(":scope > .ld-punten")) {
        const p = document.createElement("span");
        p.className = "ld-punten"; p.setAttribute("aria-hidden", "true");
        const fase = nu() % PERIODE;   // zelfde fase na opnieuw tekenen: de golf loopt door, springt niet terug
        p.innerHTML = [0, 1, 2].map((k) => `<i style="animation-delay:${Math.round(k * 200 - fase)}ms"></i>`).join("");
        c.appendChild(p);
      }
    } else {
      if (c.hasAttribute("aria-busy")) c.removeAttribute("aria-busy");
      const p = c.querySelector(":scope > .ld-punten"); if (p) p.remove();
    }
  }
  document.addEventListener("wpi-sync", (e) => {
    const b = !!(e.detail && e.detail.bezig);
    if (b === sync.bezig) return;
    sync.bezig = b;
    if (b) {
      clearTimeout(sync.weg); sync.weg = null;
      if (!sync.punten && !sync.tm) sync.tm = setTimeout(() => { sync.tm = null; if (sync.bezig) { sync.punten = true; sync.sinds = nu(); pil(); } }, NA);
    } else {
      clearTimeout(sync.tm); sync.tm = null;
      if (!sync.punten) return;
      sync.weg = setTimeout(() => {
        sync.weg = null; if (sync.bezig) return;
        sync.punten = false; pil();
      }, Math.max(0, MIN - (nu() - sync.sinds)));
    }
  });
  // #syncchip wordt door js/sync.js steeds opnieuw gevuld (textContent) en bij elke route opnieuw gemaakt: punten terugzetten
  (function () {
    const acct = $("acct"); if (!acct || !window.MutationObserver) return;
    new MutationObserver(() => { if ($("syncchip")) pil(); }).observe(acct, { childList: true, subtree: true });
  })();

  // ---------------- "Nu synchroniseren" (handmatig): dunne balk bovenin ----------------
  document.addEventListener("DOMContentLoaded", () => {
    const App = window.App, o = App && App.syncOpnieuw;
    if (typeof o !== "function" || o.ldBalk) return;
    const w = function () { return balk.tijdens(Promise.resolve().then(() => o.apply(this, arguments)), "Synchroniseren…"); };
    w.ldBalk = true; App.syncOpnieuw = w;
  });

  WPI.laad = Object.freeze({ NA, MIN, SKELET_NA, OPSTART_NA, ring, knop, knopTijdens, balk, vinkje, voortgang, fotoRing, skelet, skeletHtml, opstartFase, opstartKlaar, opstartHoud });
})();
