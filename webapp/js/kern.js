/* Werkplekinspectie — werkende prototype-app (vanilla JS, geen build-stap).
   Data: fictieve voorbeelddata. Client-side state; nog geen echte backend.

   kern.js — gedeelde helpers en constanten (window.WPI) en de kern van window.App:
   state, opstarten, inloggen, weergave, concept-opslag, account, zoeken, routering en modals.
   De overige bestanden in js/ voegen hun methoden toe met Object.assign(window.App, {...});
   start.js (als laatste geladen) roept App.boot() aan. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const el = (h) => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstElementChild; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MND = { "05": "mei", "06": "jun", "07": "jul", "08": "aug", "09": "sep", "10": "okt", "11": "nov", "12": "dec" };
  const mlabel = (m) => MND[m.slice(5, 7)] || m;

  const IC = {
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-8"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    check: '<path d="M4 12l5 5L20 6"/>', chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', cam: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.2"/><path d="M8 7l1.5-2h5L16 7"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  };
  // iconen zijn decoratief (aria-hidden): de knop of link eromheen draagt de naam (tekst of aria-label)
  const svg = (n, s = 24, w = 2) => `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

  // ---- event-delegatie: GEEN inline handler-attributen (onclick e.d.) meer, zodat de CSP script-src-attr 'none' kan zijn ----
  // In gegenereerde HTML zet je attributen met deze helpers; één luisteraar op document (zie onderaan) roept
  // de genoemde App-methode aan. Alleen eigen functies van window.App, nooit eval/new Function of andere code.
  //   act("naam", ...args)       klik → App.naam(...args)        →  data-action="naam" data-args="[…]"
  //   actSluit("naam", ...args)  eerst App.closeModal(), dan App.naam(...args)  (+ data-sluit)
  //   op("change"|"input"|"submit"|"enter"|"escape", "naam", ...args)
  //                              →  data-change / data-input / data-submit (altijd preventDefault) /
  //                                 data-enter / data-escape (keydown met die toets), met data-<soort>-args
  //   args: JSON (strings, getallen, null, true/false); WAARDE, ELEMENT en EVENT worden bij het aanroepen
  //   vervangen door element.value, het element zelf en het event (vroeger this.value, this en event).
  //   Extra (los attribuut): data-stop (stopPropagation, ook geen verdere data-action hogerop),
  //   data-geen-default (preventDefault bij klik), data-zelf (alleen als event.target het element zelf is),
  //   data-mic="sleutel" (push-to-talk: pointerdown/up/cancel → micDown/micUp, toetsenbordklik → toggleMic,
  //   geen contextmenu). Args komen altijd door esc(): servertekst kan nooit uit het attribuut breken.
  const WAARDE = Object.freeze({ "@": "waarde" }), ELEMENT = Object.freeze({ "@": "element" }), EVENT = Object.freeze({ "@": "event" });
  const argAttr = (n, args) => (args.length ? ` ${n}="${esc(JSON.stringify(args))}"` : "");
  const op = (soort, naam, ...args) => soort === "click" ? ` data-action="${esc(naam)}"${argAttr("data-args", args)}`
    : ` data-${soort}="${esc(naam)}"${argAttr("data-" + soort + "-args", args)}`;
  const act = (naam, ...args) => op("click", naam, ...args);
  const actSluit = (naam, ...args) => " data-sluit" + act(naam, ...args);

  // ---- lokale opslag (IndexedDB): inspecties blijven bewaard tot er een backend is ----
  // stores: inspecties (afgerond), acties (los van de inspectie in te stellen), concept (lopende inspectie)
  const DB = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((res, rej) => {
        const r = indexedDB.open("wpi", 4);   // v4: + outbox en syncmeta (js/sync.js); bestaande stores en data blijven
        r.onupgradeneeded = () => { ["inspecties", "acties", "concept", "planning", "outbox", "syncmeta"].forEach((n) => { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: "id" }); }); };
        r.onblocked = () => this.melding("Sluit andere vensters of tabbladen van Werkplekinspectie: de app wordt bijgewerkt en wacht daarop.");
        r.onsuccess = () => {
          this._db = r.result; this.melding(null);
          // een nieuwere versie (ander venster) wil bijwerken: loslaten, anders blijft die hangen
          this._db.onversionchange = () => { try { this._db.close(); } catch (e) {} this._db = null; this.melding("Werkplekinspectie is in een ander venster bijgewerkt. Laad deze pagina opnieuw om verder te gaan.", true); };
          res(this._db);
        };
        r.onerror = () => rej(r.error);
      });
    },
    // melding bovenin bij een geblokkeerde of verouderde database (null = weghalen)
    melding(t, herlaad) {
      let m = document.getElementById("dbmelding");
      if (!t) { if (m && !m.dataset.herlaad) m.remove(); return; }
      if (!m) { m = document.createElement("div"); m.id = "dbmelding"; m.setAttribute("role", "alert"); m.style.cssText = "position:fixed;left:12px;right:12px;top:12px;z-index:9999;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 6px 24px rgba(0,0,0,.15);font-weight:600;line-height:1.4"; document.body.appendChild(m); }
      m.dataset.herlaad = herlaad ? "1" : ""; m.textContent = t;
      if (herlaad) { const b = document.createElement("button"); b.className = "btn primary"; b.style.marginTop = "10px"; b.textContent = "Opnieuw laden"; b.onclick = () => location.reload(); m.appendChild(b); }
    },
    async tx(store, mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); },
    put(store, obj) { return this.tx(store, "readwrite", (o) => { o.put(obj); }); },
    del(store, id) { return this.tx(store, "readwrite", (o) => { o.delete(id); }); },
    get(store, id) { return this.tx(store, "readonly", (o) => o.get(id)); },
    async getAll(store) { return (await this.tx(store, "readonly", (o) => o.getAll())) || []; },
    save(obj) { return this.put("inspecties", obj); },
    all() { return this.getAll("inspecties"); },
  };
  // kleine helper: afbeelding verkleinen naar dataURL (bespaart opslag)
  function fotoDataURL(file, max = 1000) {
    return new Promise((res) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = img.width * sc; c.height = img.height * sc;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => res(null); img.src = url;
    });
  }

  // Demo-gebruikers: FICTIEF (geen echte namen in publieke code; de echte accounts komen in productie uit
  // Supabase-profielen, zie js/auth.js en supabase/seed.sql). De id's zijn alleen interne sleutels.
  const USERS = [
    { id: "u-hoofd", full_name: "Bram Voorbeeld", role: "hoofd", functie: "Hoofd Service & Montage" },
    { id: "u-coord1", full_name: "Carla Proef", role: "coordinator", functie: "Montage Coördinator" },
    { id: "u-coord2", full_name: "Dirk Demo", role: "coordinator", functie: "Montage Coördinator" },
    { id: "u-insp", full_name: "Inspecteur (demo)", role: "inspecteur", functie: "Inspecteur op locatie" },
  ];
  const ROL = { hoofd: "Hoofd S&M", coordinator: "Coördinator", inspecteur: "Inspecteur" };
  // Welke tabs mag welke rol zien
  const TABS = [
    { id: "vandaag", lab: "Vandaag", ic: "home", rollen: ["hoofd", "coordinator", "inspecteur"] },
    { id: "planning", lab: "Planning", ic: "cal", rollen: ["hoofd", "coordinator", "inspecteur"] },
    { id: "inspecties", lab: "Inspecties", ic: "list", rollen: ["hoofd", "coordinator", "inspecteur"] },
    { id: "acties", lab: "Acties", ic: "check", rollen: ["hoofd", "coordinator", "inspecteur"] },
    { id: "dashboard", lab: "Dashboard", ic: "chart", rollen: ["hoofd", "coordinator"], web: true },   // alleen webversie (computer)
    { id: "kwartaal", lab: "Rapportage", ic: "doc", rollen: ["hoofd", "coordinator"], web: true },
  ];
  const staf = () => App.user && (App.user.role === "hoofd" || App.user.role === "coordinator");
  // webversie = groot scherm (computer/tablet liggend); telefoon = de veld-app zonder dashboard en trendanalyse
  const isWeb = () => window.matchMedia("(min-width: 900px)").matches;
  const naam = (id) => { const u = USERS.find((x) => x.id === id); return u ? u.full_name : id ? String(id) : "–"; };

  // ---- eenvoudige trefwoord-matching (terugval als Claude niet beschikbaar is) ----
  const STOP = new Set(("de het een en van in op te is dat die niet met voor bij aan zijn er als ook om of door naar uit " +
    "wordt worden zo nog wel maar dan hij ze we je ik hun geen kan moet al over tot zit zitten staat staan hebben heeft " +
    "deze dit daar hier wat waar wie hoe heel erg zijn haar mijn onze").split(" "));
  // een paar werkwoorden/varianten naar één stam, zodat "eruit halen" ook "verwijderen" vindt
  const SYN = { eruit: "verwij", halen: "verwij", uithal: "verwij", weghal: "verwij", demont: "verwij", slopen: "verwij",
    afbouw: "verwij", zetten: "plaats", monter: "plaats", inbouw: "plaats", aanbre: "plaats", aanzet: "inscha",
    opstar: "inscha", starte: "inscha", ingesc: "inscha", helmen: "helm", uitsch: "afscha", afzett: "afzett" };
  const toks = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => { const k = w.slice(0, 6); return SYN[k] || k; });
  const overlap = (a, b) => { const B = new Set(b); let n = 0; new Set(a).forEach((w) => { if (B.has(w)) n++; }); return n; };
  // extra trefwoorden per algemeen onderwerp (A t/m I)
  const OW_KEYS = {
    A: "documenten werkvergunning tra lmra voorbereiding instructie toolbox vergunning tekening",
    B: "lototo afschakelen slot sloten vergrendeld spanningsvrij schakelkast veiligstellen duspol",
    C: "pbm helm helmen handschoenen bril veiligheidsschoenen schoenen vest hesje gehoorbescherming harnas",
    D: "gereedschap arbeidsmiddel keuring gekeurd ladder steiger machine slijptol boor",
    E: "hijsen kraan last hijsband stroppen hijsgereedschap haak",
    F: "orde netheid werkplek afzetting rommel struikel opruimen omgeving rondslingeren",
    G: "gevaarlijke stoffen hygiene afvalwater slib handen wassen milieu chemicalien handenwasset",
    H: "nood brandblusser ehbo verbanddoos vluchtweg noodvoorziening reddingsboei oogdouche",
    I: "gedrag samenwerking communicatie houding afspraak haast",
  };
  // TRA-maatregelen ["Collectief: a; b", ...] -> ["Collectief · a", "Collectief · b", ...]
  function splitMaatregelen(list) {
    const out = [];
    (Array.isArray(list) ? list : list ? [list] : []).forEach((item) => {
      const m = String(item).match(/^\s*([A-Za-zÀ-ÿ]+)\s*:\s*([\s\S]*)$/);
      const type = m ? m[1] : "", rest = m ? m[2] : String(item);
      rest.split(/;\s*/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean)
        .forEach((x) => out.push((type ? type + " · " : "") + (x.length > 110 ? x.slice(0, 107) + "…" : x)));
    });
    return out.slice(0, 8);
  }
  // afkappen op een woordgrens
  function kort(s, n) { s = String(s || ""); if (s.length <= n) return s; const c = s.slice(0, n); const i = c.lastIndexOf(" "); return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[;,.:\s]+$/, "") + "…"; }
  // datums (plandatum als JJJJ-MM-DD)
  const dag0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isoDag = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const plusDagen = (n) => { const d = dag0(); d.setDate(d.getDate() + n); return isoDag(d); };
  const dagLabel = (iso) => iso ? new Date(iso + "T00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : "–";
  const dagenTot = (iso) => Math.round((new Date(iso + "T00:00") - dag0()) / 864e5);
  const PRIO = { direct: { lab: "Direct", d: 0 }, kort: { lab: "Kort · ±2 weken", d: 14 }, planmatig: { lab: "Planmatig · ±8 weken", d: 56 } };
  // actie-statusmodel: Voorstel (uit inspectie) → Open → In uitvoering → Klaar voor toetsing → Afgerond (alleen door toetser)
  const ST_CLS = { "Voorstel": "b-vs", "Open": "b-todo", "In uitvoering": "b-uitv", "Klaar voor toetsing": "b-toets", "Afgerond": "b-done", "Vervallen": "b-N" };
  const stBadge = (s) => `<span class="badge ${ST_CLS[s] || "b-N"}">${esc(s || "–")}</span>`;
  const tril = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
  // welke woorden van de gebruiker een voorstel onderbouwen ("waarom")
  function eigenWoorden(tekst, doc) {
    const D = new Set(toks(doc)), uit = [];
    String(tekst || "").split(/\s+/).forEach((w) => { const t = toks(w)[0]; const schoon = w.replace(/[^\p{L}\p{N}-]/gu, ""); if (t && D.has(t) && schoon && !uit.includes(schoon.toLowerCase())) uit.push(schoon.toLowerCase()); });
    return uit.slice(0, 4);
  }

  // ---- toegankelijkheid: focus terugvinden na opnieuw tekenen, en korte meldingen voor schermlezers ----
  // focusSleutel/zoekSleutel: hetzelfde element (id, of data-action + data-args) in nieuw getekende HTML terugvinden
  // (zonder id/data-action, zoals de monteurchips uit js/beheer.js: zelfde soort knop met dezelfde tekst, zonder "✓ ")
  const knopTekst = (x) => (x.textContent || "").replace(/^\s*✓\s*/, "").replace(/\s+/g, " ").trim();
  const focusSleutel = (x) => ({ id: x.id || "", act: x.getAttribute("data-action") || "", args: x.getAttribute("data-args") || "", tag: x.tagName, tekst: knopTekst(x) });
  const zoekSleutel = (root, k) => {
    if (k.id) return root.querySelector("#" + CSS.escape(k.id));
    if (!k.act) return k.tag === "BUTTON" && k.tekst ? [...root.querySelectorAll("button")].find((x) => knopTekst(x) === k.tekst) || null : null;
    return [...root.querySelectorAll("[data-action]")].find((x) => x.getAttribute("data-action") === k.act && (x.getAttribute("data-args") || "") === k.args) || null;
  };
  // zeg("…"): tekst in de verborgen live-regio #meldtekst (index.html), bijv. bij een toast of zoekresultaat
  let zegTimer = null;
  const zeg = (t) => {
    const m = $("meldtekst"); if (!m) return;
    m.textContent = ""; clearTimeout(zegTimer);
    if (t) zegTimer = setTimeout(() => { m.textContent = String(t); }, 60);   // leegmaken + kort wachten: dezelfde tekst wordt ook opnieuw voorgelezen
  };

  const App = {
    data: {}, state: { inspectie: null, extra: [] }, user: null,
    caps: { dictation: null, sample: null }, micKey: null, _dictKey: null, _rec: null,

    async boot() {
      const names = ["cijfers", "kennisbank", "voorbeelddata", "trendacties"];
      const got = await Promise.all(names.map((n) => fetch("data/" + n + ".json").then((r) => r.json())));
      names.forEach((n, i) => (this.data[n] = got[i]));
      if (this.authActief && this.authActief()) await this.authHerstel();   // echte login (js/auth.js) zodra Supabase is ingesteld
      else try { const u = JSON.parse(localStorage.getItem("wpi_user") || "null"); if (u) this.user = USERS.find((x) => x.id === u.id) || null; } catch (e) {}
      this.laadPref();
      if (this.user) await this.herstelConcept();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && location.hash === "#/inspectie") this.wakeLock(true);
        if (document.visibilityState === "hidden" && this.state.inspectie) this.bewaarConcept(true);   // app weggeklikt: meteen bewaren
      });
      if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js"); } catch (e) {} }
      // Runtime-mogelijkheden van claude.ai (alleen in de gehoste versie): inspreken en Claude-voorstellen
      if (window.claude && typeof window.claude.use === "function") {
        window.claude.use("dictation").then((d) => {
          if (!d) return;
          this.caps.dictation = d;
          d.onFinal(({ text }) => this.appendVeld(this._dictKey, text));
          d.onPartial(({ text }) => { if (this.micKey) this.zegPartial(this.micKey, text); });
          d.onState(({ state }) => { if (state === "idle") { if (this.micKey) this.zegPartial(this.micKey, ""); this.micKey = null; this.markMic(); } });
        }).catch(() => {});
        window.claude.use("sample").then((s) => { this.caps.sample = s || null; }).catch(() => {});
      }
      window.addEventListener("hashchange", () => this.route());
      this._web = isWeb(); window.addEventListener("resize", () => { if (isWeb() !== this._web) { this._web = isWeb(); if (this.user) this.route(); } });
      setInterval(() => this.checkMeldingen(), 30 * 60 * 1000);   // elk half uur, zolang de app open is
      this.route();
    },

    async login(id, profiel) {
      if (this.authActief && this.authActief() && !profiel) return;   // met Supabase alleen via js/auth.js (geen voorbeeld-login)
      this.user = profiel || USERS.find((u) => u.id === id); try { if (!profiel) localStorage.setItem("wpi_user", JSON.stringify({ id })); } catch (e) {} this.state.inspectie = null; this.acties = null; this.planning = null; this.actFilter = null; await this.herstelConcept(); this.go("vandaag"); this.route(); },
    logout() {
      // lopende inspectie eerst veiligstellen (een wachtende bewaar-timer mag het concept niet meer wissen)
      clearTimeout(this._cTimer); if (this.user && this.state.inspectie) DB.put("concept", { id: "lopend-" + this.user.id, ins: this.state.inspectie, t: new Date().toISOString() }).catch(() => {});
      if (this.authLogout) this.authLogout(); this.stopMic(); this.user = null; this.state.inspectie = null; this.acties = null; this.actFilter = null; try { localStorage.removeItem("wpi_user"); } catch (e) {} this.route(); },

    // ---- weergave: veldmodus (grote knoppen) en zonmodus (hoog contrast) ----
    pref: { veld: false, zon: false },
    laadPref() { try { Object.assign(this.pref, JSON.parse(localStorage.getItem("wpi_pref") || "{}")); } catch (e) {} this.pasPrefToe(); },
    pasPrefToe() { document.body.classList.toggle("veld", !!this.pref.veld); document.body.classList.toggle("zon", !!this.pref.zon); },
    zetPref(k) { this.pref[k] = !this.pref[k]; try { localStorage.setItem("wpi_pref", JSON.stringify(this.pref)); } catch (e) {} this.pasPrefToe(); tril(15); this.openWeergave(); },
    openWeergave() {
      const sw = (k, t, s) => `<button type="button" class="row prefrow" role="switch" aria-checked="${!!this.pref[k]}"${act("zetPref", k)}><span class="grow"><span class="t">${t}</span><span class="s" style="display:block">${s}</span></span><span class="sw${this.pref[k] ? " on" : ""}" aria-hidden="true"></span></button>`;
      this.openModal("Weergave", "Voor op locatie. Wordt onthouden op dit toestel.",
        `<div class="listcard">${sw("veld", "Veldmodus", "Grotere knoppen en microfoon, voor werken met handschoenen")}${sw("zon", "Zonmodus", "Hoog contrast: zwart op wit met dikke randen, leesbaar in fel licht")}</div>
         <div class="s" style="margin-top:12px">Tijdens een inspectie blijft het scherm automatisch aan.</div>`);
    },
    // scherm aan houden tijdens de inspectie (Screen Wake Lock)
    async wakeLock(aan) {
      try {
        if (aan && !this._wl && navigator.wakeLock) { this._wl = await navigator.wakeLock.request("screen"); this._wl.addEventListener("release", () => { this._wl = null; }); }
        else if (!aan && this._wl) { const w = this._wl; this._wl = null; await w.release(); }
      } catch (e) { this._wl = null; }
    },

    // ---- lopende inspectie direct op het toestel bewaren (overleeft sluiten van de app) ----
    _opslag: null,
    async herstelConcept() {
      if (!this.user || this.state.inspectie) return;
      try { const c = await DB.get("concept", "lopend-" + this.user.id); if (c && c.ins) { this.state.inspectie = c.ins; this._opslag = { s: "ok", t: new Date(c.t) }; } } catch (e) {}
    },
    bewaarConcept(direct) {
      clearTimeout(this._cTimer);
      const user = this.user; if (!user) return;
      this._cTimer = setTimeout(async () => {
        if (this.user !== user) return;   // intussen uitgelogd: logout() heeft het concept al bewaard
        const ins = this.state.inspectie;
        try {
          if (ins) await DB.put("concept", { id: "lopend-" + user.id, ins, t: new Date().toISOString() });
          else await DB.del("concept", "lopend-" + user.id);
          this._opslag = { s: "ok", t: new Date() };
        } catch (e) { this._opslag = { s: "fout" }; }
        this.toonOpslag();
      }, direct ? 0 : 300);
    },
    toonOpslag() {
      const c = $("opslag"); if (!c) return; const o = this._opslag || {};
      c.className = "opslag " + (o.s || "");
      const h = o.s === "fout" ? `Niet opgeslagen · <button type="button" class="opnieuwlink"${act("bewaarConcept")}>opnieuw</button>`
        : o.t ? `✓ Veilig op dit toestel · ${o.t.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : "Wordt op dit toestel bewaard";
      if (c.innerHTML !== h) c.innerHTML = h;
    },
    renderAcct() {
      if (!this.user) { $("acct").innerHTML = `<span class="chip">Voorbeeld · fictief</span>`; return; }
      $("acct").innerHTML = `<div style="display:flex;gap:8px;align-items:center">
        <button type="button" class="rondknop bel"${act("openMeldingen")} title="Meldingen">${svg("bell", 19)}<span class="sr-only">Meldingen</span><span id="belnr" class="belnr hidden"></span></button>
        <button type="button" class="rondknop avatar"${act("openAccount")} title="${esc(this.user.full_name)}" aria-label="Account">${esc(this.user.full_name[0])}</button></div>`;
    },
    openAccount() {
      const u = this.user, r = (ic, t, s, on) => `<button class="row prefrow"${on}><span class="cirkel">${svg(ic, 18)}</span><span class="grow"><span class="t">${t}</span>${s ? `<div class="s">${s}</div>` : ""}</span><span class="s">${svg("chev", 16)}</span></button>`;
      this.openModal(u.full_name, u.functie + " · " + ROL[u.role],
        `<div class="listcard">${r("list", "Zoeken", "Producten, trendacties en inspecties", actSluit("openSearch"))}${r("sun", "Weergave", "Veldmodus en zonmodus", act("openWeergave"))}${u.role === "hoofd" ? r("tand", "Beheer", "Monteurs en doel % conform", actSluit("go", "beheer")) : ""}${r("back", "Uitloggen", "", actSluit("logout"))}</div>`);
    },
    async openSearch() {
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      this._search = { prod: Object.values(this.data.kennisbank).map((p) => p.naam), trend: this.data.trendacties, saved };
      this.openModal("Zoeken", "Producten, trendacties en je inspecties.",
        `<input id="zq" type="search" aria-label="Zoeken" placeholder="Typ om te zoeken…" autocomplete="off"${op("input", "doSearch", WAARDE)} style="width:100%;height:46px;border-radius:14px;border:0;box-shadow:inset 0 0 0 1px var(--line);padding:0 16px;font-size:15px;margin-bottom:10px">
         <div id="zr"></div>`);
      const i = $("zq"); if (i) i.focus();
    },
    doSearch(q) {
      q = (q || "").toLowerCase().trim();
      const out = $("zr"); if (!out) return;
      if (!q) { out.innerHTML = `<div class="s">Begin met typen…</div>`; return; }
      const s = this._search, hit = [];
      s.prod.filter((p) => p.toLowerCase().includes(q)).slice(0, 5).forEach((p) => hit.push(["Product", p, ""]));
      (isWeb() ? s.trend : []).filter((t) => (t.nr + " " + t.onderwerp).toLowerCase().includes(q)).slice(0, 5).forEach((t) => hit.push(["Trendactie", t.nr + " · " + t.onderwerp, ""]));
      s.saved.filter((r) => (r.titel + " " + r.taak + " " + r.inspecteur).toLowerCase().includes(q)).slice(0, 5).forEach((r) => hit.push(["Inspectie", r.titel + " · " + r.taak, "#/rapport/" + r.id]));
      zeg(hit.length ? hit.length + " resultaat" + (hit.length === 1 ? "" : "en") : "Niets gevonden");
      out.innerHTML = hit.length ? `<div class="listcard">${hit.map(([k, lab, href]) =>
        `<div class="row"${href ? ` style="cursor:pointer"${actSluit("go", href.replace(/^#\//, ""))}` : ""}><span class="grow"><span class="t">${esc(lab)}</span><div class="s">${k}</div></span>${href ? svg("chev", 16) : ""}</div>`).join("")}</div>`
        : `<div class="s">Niets gevonden voor “${esc(q)}”.</div>`;
    },

    go(h) { location.hash = "#/" + h; },
    route() {
      // focus na het opnieuw tekenen: menu → blijft op het menu; stond hij in de inhoud (of nergens) → naar de kop
      // van het nieuwe scherm (in de inspectie: de nieuwe vraag), zodat toetsenbord en schermlezer meegaan
      const fa = document.activeElement, inMenu = fa && $("tabbar").contains(fa);
      const naarKop = !inMenu && (!fa || fa === document.body || $("view").contains(fa));
      // zelfde scherm opnieuw getekend (bijv. een keuzechip aan/uit): focus terug op hetzelfde element
      const h0 = $("view").querySelector("h1"), zelfde = { page: this._page, kop: h0 ? h0.textContent : null, sleutel: fa && fa !== document.body && $("view").contains(fa) ? focusSleutel(fa) : null };
      this.renderAcct();
      if (!this.user) { $("app").classList.add("nonav"); $("view").dataset.page = "login"; $("tabbar").classList.add("hidden"); $("alert").classList.add("hidden"); $("view").innerHTML = ""; return this.view_login(); }
      $("tabbar").classList.remove("hidden");
      let parts = (location.hash.replace(/^#\/?/, "") || "vandaag").split("/");
      let page = parts[0];
      const tab = TABS.find((t) => t.id === page);
      if (tab && !tab.rollen.includes(this.user.role)) { return this.go("vandaag"); }  // geen toegang
      if (tab && tab.web && !isWeb()) page = "alleenweb";
      this.renderTabs(page);
      $("tabbar").classList.toggle("hidden", page === "inspectie");   // focus tijdens de inspectie
      $("app").classList.toggle("nonav", page === "inspectie"); $("view").dataset.page = page; $("app").dataset.page = page;
      this.wakeLock(page === "inspectie");
      this._page = page; this.checkMeldingen();
      const fn = this["view_" + page];
      $("view").innerHTML = "";
      if (fn) fn.call(this, parts.slice(1));
      else this.view_vandaag();
      window.scrollTo(0, 0);
      if (inMenu) { const a = $("tabbar").querySelector("a.on"); if (a) a.focus({ preventScroll: true }); }
      else if (naarKop && this.user) {
        const h1 = $("view").querySelector("h1"), a = document.activeElement;
        const terug = zelfde.sleutel && zelfde.page === page && h1 && h1.textContent === zelfde.kop && (!a || a === document.body) ? zoekSleutel($("view"), zelfde.sleutel) : null;
        if (terug) { try { terug.focus({ preventScroll: true }); } catch (e) {} } else this.focusKop();
      }
    },
    renderTabs(active) {
      $("tabbar").innerHTML = `<div class="sidebrand"><span class="logo" aria-hidden="true">N</span><span>Werkplekinspectie<small>Noardling</small></span></div>` + TABS.filter((t) => t.rollen.includes(this.user.role) && (!t.web || isWeb())).map((t) =>
        `<a href="#/${t.id}" class="${t.id === active ? "on" : ""}"${t.id === active ? ' aria-current="page"' : ""}><span class="ic">${svg(t.ic, 24)}</span>${t.lab}</a>`).join("");
    },

    view_login() {
      const v = $("view");
      v.appendChild(el(`<div style="padding:30px 0 10px"><div class="kicker">Werkplekinspectie · Noardling</div><h1>Inloggen</h1>
        <div class="muted" style="margin-top:-8px;margin-bottom:8px">Kies je account. (Voorbeeld-login; later Supabase Auth.)</div></div>`));
      v.appendChild(el(`<div class="listcard">${USERS.map((u) =>
        `<div class="row" style="cursor:pointer"${act("login", u.id)}>
          <span aria-hidden="true" style="width:40px;height:40px;border-radius:50%;background:var(--mist);display:grid;place-items:center;font-weight:700">${esc(u.full_name[0])}</span>
          <span class="grow"><span class="t">${esc(u.full_name)}</span><div class="s">${esc(u.functie)} · ${ROL[u.role]}</div></span>
          <span class="s">${svg("chev", 18)}</span></div>`).join("")}</div>`));
      v.appendChild(el(`<div class="muted" style="font-size:12px;margin-top:16px">Rollen bepalen wat je ziet: een inspecteur start en ziet eigen inspecties; een coördinator en het Hoofd S&amp;M zien alles, acties en het dashboard.</div>`));
    },

    // actie: attributen van WPI.act(…) (klikbare tegel) of leeg
    tile(cls, n, lab, sub, actie) {
      return `<div class="tile ${cls}${actie ? " click" : ""}"${actie || ""}>
        <div class="lab">${lab}</div><div class="n">${n}</div><div class="sub">${sub}${actie ? " ›" : ""}</div></div>`;
    },

    // Dialoog (#mod, role="dialog" aria-modal in index.html): titel = kop (#modtitel), sluitknop met naam,
    // focus naar de dialoog bij openen (of terug op hetzelfde element als het venster opnieuw wordt getekend),
    // Tab blijft binnen de dialoog en Escape sluit (zie de keydown-luisteraar onderaan), bij sluiten terug naar de opener.
    openModal(title, sub, body) {
      const mod = $("mod"), ov = $("ov"), open = ov.classList.contains("on"), a = document.activeElement;
      const sleutel = open && a && a !== mod && mod.contains(a) ? focusSleutel(a) : null;
      if (!open) this._modTerug = a && a !== document.body ? a : null;
      mod.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div id="modtitel" role="heading" aria-level="2" style="font-size:20px;font-weight:700">${esc(title)}</div>
        <button type="button" class="modsluit"${act("closeModal")} aria-label="Sluiten" style="background:#F3F4F6;width:44px;height:44px;flex:none;border-radius:50%;font-size:20px;color:#4A5565">×</button></div>
        ${sub ? `<div class="muted" style="font-size:13px;margin:4px 0 14px">${esc(sub)}</div>` : '<div style="height:10px"></div>'}${body}`;
      ov.classList.add("on");
      const terug = sleutel && zoekSleutel(mod, sleutel);
      try { (terug || mod).focus({ preventScroll: !terug }); } catch (e) {}
    },
    closeModal() {
      const ov = $("ov"), was = ov.classList.contains("on"), mod = $("mod");
      ov.classList.remove("on");
      if (!was) return;
      const t = this._modTerug, a = document.activeElement; this._modTerug = null;
      if (!a || a === document.body || mod.contains(a)) {
        if (t && t.isConnected && typeof t.focus === "function") { try { t.focus({ preventScroll: true }); } catch (e) {} }
        else if (this.user) this.focusKop();   // opener bestaat niet meer (scherm intussen opnieuw getekend): naar de kop
      }
    },
    focusKop() {
      const a = document.activeElement; if (a && a !== document.body && a.isConnected && !$("mod").contains(a)) return;   // het scherm zette zelf al focus (bijv. een invoerveld)
      if ($("ov").classList.contains("on")) return;
      const h = $("view").querySelector("h1"); if (!h) return;
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      try { h.focus({ preventScroll: true }); } catch (e) {}
    },
    // skiplink "Naar de inhoud" (index.html): geen hash-navigatie (die is van de router), alleen focus verplaatsen
    naarInhoud() { const v = $("view"), h = v && v.querySelector("h1"); if (h && !h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); (h || v).focus(); },
    printen() { window.print(); },   // "Opslaan als PDF / printen" (rapport, kwartaal)

    view_alleenweb() {
      $("view").appendChild(el(`<div class="leeg" style="margin-top:40px"><span class="bol">💻</span><h1 style="margin:14px 0 6px">Alleen op de computer</h1>
        <div class="s" style="max-width:300px;margin:0 auto">Het dashboard, de trendanalyse en de rapportages open je in de webversie op je computer.</div>
        <button class="btn primary" style="margin-top:20px;max-width:260px"${act("go", "vandaag")}>Naar Vandaag</button></div>`));
    },
  };
  window.App = App;

  // gedeelde helpers voor de andere modules (js/*.js)
  const WPI = window.WPI = {
    $, el, esc, MND, mlabel, IC, svg, DB, fotoDataURL, USERS, ROL, TABS, staf, isWeb, naam, STOP, SYN, toks, overlap,
    OW_KEYS, splitMaatregelen, kort, dag0, isoDag, plusDagen, dagLabel, dagenTot, PRIO, ST_CLS, stBadge, tril,
    eigenWoorden, act, actSluit, op, WAARDE, ELEMENT, EVENT, zeg
  };

  // ---- de delegatielaag (zie act/op hierboven): één luisteraar per eventsoort op document ----
  const NAAM_OK = /^[A-Za-z_$][\w$]*$/;
  // prototype-loos object + eigen-sleutelcontrole: {"@":"constructor"}, {"@":"__proto__"} e.d. zijn géén plaatshouder
  const SPECIAAL = Object.assign(Object.create(null), { waarde: (x) => x.value, element: (x) => x, event: (x, e) => e });
  const plaats = (a) => (a && typeof a === "object" && !Array.isArray(a) && typeof a["@"] === "string" &&
    Object.prototype.hasOwnProperty.call(SPECIAAL, a["@"]) ? SPECIAAL[a["@"]] : null);
  function roep(x, naam, ruw, e) {
    // alleen eigen functies van App (Object.assign in js/*.js); niets van Object.prototype en geen andere globals
    if (!naam || !NAAM_OK.test(naam) || !Object.prototype.hasOwnProperty.call(App, naam) || typeof App[naam] !== "function") {
      console.warn("Werkplekinspectie: onbekende actie", naam); return;
    }
    let args = [];
    if (ruw) { try { args = JSON.parse(ruw); } catch (err) { console.warn("Werkplekinspectie: ongeldige args bij", naam); return; } }
    if (!Array.isArray(args)) args = [args];
    args = args.map((a) => { const f = plaats(a); return f ? f(x, e) : a; });
    return App[naam].apply(App, args);
  }
  // loopt het pad van het event af (doel → document), zoals de inline handlers vroeger opborrelden
  function delegeer(e, attr, argsAttr, voor) {
    const pad = e.composedPath ? e.composedPath() : [];
    for (const x of pad) {
      if (!x || x.nodeType !== 1) continue;
      if (!x.hasAttribute(attr)) continue;
      if (x.hasAttribute("data-zelf") && e.target !== x) continue;
      if (e.type === "click" && x.disabled === true) continue;   // uitgeschakelde knop: nooit een actie
      if (voor) voor(x);
      roep(x, x.getAttribute(attr), x.getAttribute(argsAttr), e);
      if (x.hasAttribute("data-stop")) { e.stopPropagation(); break; }
    }
  }
  const mic = (e) => (e.target && e.target.closest ? e.target.closest("[data-mic]") : null);
  document.addEventListener("click", (e) => {
    const m = mic(e);
    if (m && e.detail === 0) App.toggleMic(m.getAttribute("data-mic"));   // toetsenbord/schakelaar: aan/uit
    delegeer(e, "data-action", "data-args", (x) => {
      if (x.hasAttribute("data-geen-default")) e.preventDefault();
      if (x.hasAttribute("data-sluit")) App.closeModal();
    });
  });
  document.addEventListener("change", (e) => delegeer(e, "data-change", "data-change-args"));
  document.addEventListener("input", (e) => delegeer(e, "data-input", "data-input-args"));
  document.addEventListener("submit", (e) => { if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-submit")) e.preventDefault(); delegeer(e, "data-submit", "data-submit-args"); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") delegeer(e, "data-enter", "data-enter-args");
    if (e.key === "Escape") delegeer(e, "data-escape", "data-escape-args");
    const ov = $("ov"), mod = $("mod"), open = ov && ov.classList.contains("on"), doel = e.target;
    // Escape sluit de dialoog (tenzij een veld zelf iets met Escape doet: data-escape)
    if (e.key === "Escape" && open && !e.defaultPrevented && !(doel && doel.closest && doel.closest("[data-escape]"))) { e.preventDefault(); App.closeModal(); return; }
    // Tab blijft binnen de open dialoog (focus-trap)
    if (e.key === "Tab" && open) {
      const f = focusbaar(mod), a = document.activeElement;
      if (!f.length) { e.preventDefault(); mod.focus(); return; }
      if (e.shiftKey && (a === f[0] || a === mod || !mod.contains(a))) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (a === f[f.length - 1] || !mod.contains(a))) { e.preventDefault(); f[0].focus(); }
      return;
    }
    // Enter/spatie op een niet-native knop (role="button" via bedienbaar hieronder) = klikken
    if ((e.key === "Enter" || e.key === " ") && doel && doel.nodeType === 1 && !NATIEF.has(doel.tagName) && doel.hasAttribute("data-action")
      && /^(button|switch|menuitem|tab|link)$/.test(doel.getAttribute("role") || "") && !e.repeat) {
      e.preventDefault();
      doel.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
  });
  // ---- klikbare niet-knoppen (rij, tegel, tabelrij, grafiekdeel met data-action) toetsenbordbedienbaar maken ----
  // Eén plek voor alle gegenereerde HTML: krijgt role="button" en tabindex="0" (Enter/spatie: zie hierboven).
  // SVG-delen zonder naam krijgen hun <title> of tekst als aria-label.
  const NATIEF = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "OPTION"]);
  function focusbaar(root) {
    return [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter((x) => x.getClientRects().length && getComputedStyle(x).visibility !== "hidden");
  }
  function maakBedienbaar(x) {
    if (NATIEF.has(x.tagName) || x.id === "ov" || x.hasAttribute("data-geen-knop")) return;
    if (!x.hasAttribute("role")) x.setAttribute("role", "button");
    if (!x.hasAttribute("tabindex")) x.setAttribute("tabindex", "0");
    if (x instanceof SVGElement && !x.hasAttribute("aria-label")) {
      const t = x.querySelector("title"), tekst = (t ? t.textContent : x.textContent || "").replace(/\s+/g, " ").trim();
      if (tekst) x.setAttribute("aria-label", tekst);
    }
  }
  function bedienbaar(n) {
    if (!n || n.nodeType !== 1) return;
    if (n.hasAttribute("data-action")) maakBedienbaar(n);
    n.querySelectorAll("[data-action]").forEach(maakBedienbaar);
  }
  new MutationObserver((ms) => ms.forEach((m) => { if (m.type === "attributes") bedienbaar(m.target); else m.addedNodes.forEach(bedienbaar); }))
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-action"] });
  if (document.body) bedienbaar(document.body);
  // push-to-talk (inspreken): ingedrukt houden = praten, loslaten = klaar (450 ms, zie App.micDown/micUp)
  document.addEventListener("pointerdown", (e) => { const m = mic(e); if (m) App.micDown(m.getAttribute("data-mic"), e); });
  document.addEventListener("pointerup", (e) => { const m = mic(e); if (m) App.micUp(m.getAttribute("data-mic")); });
  document.addEventListener("pointercancel", (e) => { const m = mic(e); if (m) App.micUp(m.getAttribute("data-mic")); });
  document.addEventListener("contextmenu", (e) => { if (mic(e)) e.preventDefault(); });
})();
