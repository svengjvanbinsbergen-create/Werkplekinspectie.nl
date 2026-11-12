/* Werkplekinspectie — werkende prototype-app (vanilla JS, geen build-stap).
   Data: fictieve voorbeelddata. Client-side state; nog geen echte backend. */
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
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  };
  const svg = (n, s = 24, w = 2) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

  // ---- lokale opslag (IndexedDB): inspecties blijven bewaard tot er een backend is ----
  // stores: inspecties (afgerond), acties (los van de inspectie in te stellen), concept (lopende inspectie)
  const DB = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((res, rej) => {
        const r = indexedDB.open("wpi", 2);
        r.onupgradeneeded = () => { ["inspecties", "acties", "concept"].forEach((n) => { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: "id" }); }); };
        r.onsuccess = () => { this._db = r.result; res(this._db); };
        r.onerror = () => rej(r.error);
      });
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

  // Demo-gebruikers (spiegelt supabase/seed.sql; later te vervangen door Supabase Auth)
  const USERS = [
    { id: "u-bjorn", full_name: "Björn Sloos", role: "hoofd", functie: "Hoofd Service & Montage" },
    { id: "u-winfred", full_name: "Winfred Loerts", role: "coordinator", functie: "Montage Coördinator" },
    { id: "u-douwe", full_name: "Douwe de Boer", role: "coordinator", functie: "Montage Coördinator" },
    { id: "u-insp", full_name: "Inspecteur (demo)", role: "inspecteur", functie: "Inspecteur op locatie" },
  ];
  const ROL = { hoofd: "Hoofd S&M", coordinator: "Coördinator", inspecteur: "Inspecteur" };
  // Welke tabs mag welke rol zien
  const TABS = [
    { id: "vandaag", lab: "Vandaag", ic: "home", rollen: ["hoofd", "coordinator", "inspecteur"] },
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

  const App = {
    data: {}, state: { inspectie: null, extra: [] }, user: null,
    caps: { dictation: null, sample: null }, micKey: null, _dictKey: null, _rec: null,

    async boot() {
      const names = ["cijfers", "kennisbank", "voorbeelddata", "trendacties"];
      const got = await Promise.all(names.map((n) => fetch("data/" + n + ".json").then((r) => r.json())));
      names.forEach((n, i) => (this.data[n] = got[i]));
      try { const u = JSON.parse(localStorage.getItem("wpi_user") || "null"); if (u) this.user = USERS.find((x) => x.id === u.id) || null; } catch (e) {}
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

    async login(id) { this.user = USERS.find((u) => u.id === id); try { localStorage.setItem("wpi_user", JSON.stringify({ id })); } catch (e) {} this.state.inspectie = null; this.acties = null; this.actFilter = null; await this.herstelConcept(); this.go("vandaag"); this.route(); },
    logout() { this.stopMic(); this.user = null; this.state.inspectie = null; this.acties = null; this.actFilter = null; try { localStorage.removeItem("wpi_user"); } catch (e) {} this.route(); },

    // ---- weergave: veldmodus (grote knoppen) en zonmodus (hoog contrast) ----
    pref: { veld: false, zon: false },
    laadPref() { try { Object.assign(this.pref, JSON.parse(localStorage.getItem("wpi_pref") || "{}")); } catch (e) {} this.pasPrefToe(); },
    pasPrefToe() { document.body.classList.toggle("veld", !!this.pref.veld); document.body.classList.toggle("zon", !!this.pref.zon); },
    zetPref(k) { this.pref[k] = !this.pref[k]; try { localStorage.setItem("wpi_pref", JSON.stringify(this.pref)); } catch (e) {} this.pasPrefToe(); tril(15); this.openWeergave(); },
    openWeergave() {
      const sw = (k, t, s) => `<button class="row prefrow" onclick="App.zetPref('${k}')"><span class="grow"><span class="t">${t}</span><div class="s">${s}</div></span><span class="sw${this.pref[k] ? " on" : ""}" role="switch" aria-checked="${!!this.pref[k]}"></span></button>`;
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
      c.innerHTML = o.s === "fout" ? `Niet opgeslagen · <u style="cursor:pointer" onclick="App.bewaarConcept()">opnieuw</u>`
        : o.t ? `✓ Veilig op dit toestel · ${o.t.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : "Wordt op dit toestel bewaard";
    },
    renderAcct() {
      if (!this.user) { $("acct").innerHTML = `<span class="chip">Voorbeeld · fictief</span>`; return; }
      $("acct").innerHTML = `<div style="display:flex;gap:8px;align-items:center">
        <button class="rondknop bel" onclick="App.openMeldingen()" title="Meldingen" aria-label="Meldingen">${svg("bell", 19)}<span id="belnr" class="belnr hidden"></span></button>
        <button class="rondknop avatar" onclick="App.openAccount()" title="${esc(this.user.full_name)}" aria-label="Account">${esc(this.user.full_name[0])}</button></div>`;
    },
    openAccount() {
      const u = this.user, r = (ic, t, s, on) => `<button class="row prefrow" onclick="${on}"><span class="cirkel">${svg(ic, 18)}</span><span class="grow"><span class="t">${t}</span>${s ? `<div class="s">${s}</div>` : ""}</span><span class="s">${svg("chev", 16)}</span></button>`;
      this.openModal(u.full_name, u.functie + " · " + ROL[u.role],
        `<div class="listcard">${r("list", "Zoeken", "Producten, trendacties en inspecties", "App.closeModal();App.openSearch()")}${r("sun", "Weergave", "Veldmodus en zonmodus", "App.openWeergave()")}${r("back", "Uitloggen", "", "App.closeModal();App.logout()")}</div>`);
    },
    async openSearch() {
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      this._search = { prod: Object.values(this.data.kennisbank).map((p) => p.naam), trend: this.data.trendacties, saved };
      this.openModal("Zoeken", "Producten, trendacties en je inspecties.",
        `<input id="zq" placeholder="Typ om te zoeken…" autocomplete="off" oninput="App.doSearch(this.value)" style="width:100%;height:46px;border-radius:14px;border:0;box-shadow:inset 0 0 0 1px var(--line);padding:0 16px;font-size:15px;margin-bottom:10px">
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
      out.innerHTML = hit.length ? `<div class="listcard">${hit.map(([k, lab, href]) =>
        `<div class="row"${href ? ` style="cursor:pointer" onclick="App.closeModal();location.hash='${href}'"` : ""}><span class="grow"><span class="t">${esc(lab)}</span><div class="s">${k}</div></span>${href ? svg("chev", 16) : ""}</div>`).join("")}</div>`
        : `<div class="s">Niets gevonden voor “${esc(q)}”.</div>`;
    },

    go(h) { location.hash = "#/" + h; },
    route() {
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
    },
    renderTabs(active) {
      $("tabbar").innerHTML = `<div class="sidebrand"><span class="logo">N</span><span>Werkplekinspectie<small>Noardling</small></span></div>` + TABS.filter((t) => t.rollen.includes(this.user.role) && (!t.web || isWeb())).map((t) =>
        `<a href="#/${t.id}" class="${t.id === active ? "on" : ""}"><span class="ic">${svg(t.ic, 24)}</span>${t.lab}</a>`).join("");
    },

    view_login() {
      const v = $("view");
      v.appendChild(el(`<div style="padding:30px 0 10px"><div class="kicker">Werkplekinspectie · Noardling</div><h1>Inloggen</h1>
        <div class="muted" style="margin-top:-8px;margin-bottom:8px">Kies je account. (Voorbeeld-login; later Supabase Auth.)</div></div>`));
      v.appendChild(el(`<div class="listcard">${USERS.map((u) =>
        `<div class="row" style="cursor:pointer" onclick="App.login('${u.id}')">
          <span style="width:40px;height:40px;border-radius:50%;background:var(--mist);display:grid;place-items:center;font-weight:700">${esc(u.full_name[0])}</span>
          <span class="grow"><span class="t">${esc(u.full_name)}</span><div class="s">${esc(u.functie)} · ${ROL[u.role]}</div></span>
          <span class="s">${svg("chev", 18)}</span></div>`).join("")}</div>`));
      v.appendChild(el(`<div class="muted" style="font-size:12px;margin-top:16px">Rollen bepalen wat je ziet: een inspecteur start en ziet eigen inspecties; een coördinator en het Hoofd S&amp;M zien alles, acties en het dashboard.</div>`));
    },

    tile(cls, n, lab, sub, onclick) {
      return `<div class="tile ${cls}${onclick ? " click" : ""}" ${onclick ? `onclick="${onclick}"` : ""}>
        <div class="lab">${lab}</div><div class="n">${n}</div><div class="sub">${sub}${onclick ? " ›" : ""}</div></div>`;
    },

    openModal(title, sub, body) {
      $("mod").innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="font-size:20px;font-weight:700">${esc(title)}</div>
        <button onclick="App.closeModal()" style="background:#F3F4F6;width:36px;height:36px;border-radius:50%;font-size:18px;color:#4A5565">×</button></div>
        ${sub ? `<div class="muted" style="font-size:13px;margin:4px 0 14px">${esc(sub)}</div>` : '<div style="height:10px"></div>'}${body}`;
      $("ov").classList.add("on");
    },
    closeModal() { $("ov").classList.remove("on"); },

    // ---------------- VANDAAG ----------------
    view_alleenweb() {
      $("view").appendChild(el(`<div class="leeg" style="margin-top:40px"><span class="bol">💻</span><h1 style="margin:14px 0 6px">Alleen op de computer</h1>
        <div class="s" style="max-width:300px;margin:0 auto">Het dashboard, de trendanalyse en de rapportages open je in de webversie op je computer.</div>
        <button class="btn primary" style="margin-top:20px;max-width:260px" onclick="App.go('vandaag')">Naar Vandaag</button></div>`));
    },
    view_vandaag() {
      const v = $("view"), vn = this.user.full_name.split(" ")[0], u = new Date().getHours();
      const groet = u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
      const lo = this.state.inspectie;
      v.appendChild(el(`<div><div class="hi">${groet} ${esc(vn)} 👋</div><h1 class="groot">${lo ? "Je inspectie<br>loopt nog" : "Eén inspectie<br>op de planning"}</h1></div>`));
      if (lo) {
        const n = lo.waarnemingen.length;
        v.appendChild(el(`<div class="hero paars"><div class="k">Bezig · ${n} waarneming${n === 1 ? "" : "en"}</div><div class="t">${esc(lo.titel.split(" · ")[0])}</div>
          <div class="s">${esc(lo.titel.split(" · ").slice(1).join(" · ") || "")}${lo.taak ? " · " + esc(lo.taak) : ""}</div>
          <button class="btn primary" onclick="App.goIns()">Verder met de inspectie</button></div>`));
      }
      v.appendChild(el(`<div class="hero${lo ? " klein" : ""}"><div class="k">Vandaag · P26-168</div><div class="t">Damwand</div><div class="s">RWZI Voorbeeldstad · 2 monteurs</div>
        <button class="btn primary" onclick="App.startInspectie('DAM','P26-168','Damwand · RWZI Voorbeeldstad')">Start inspectie</button></div>`));
      const act = el(`<div id="mijnact"></div>`); v.appendChild(act);
      this.laadActies().then(() => {
        if (!document.body.contains(act)) return;
        const B = this.bakjes(), voorJou = B.instellen.length + B.toetsen.length + B.gepland.length;
        const laat = this.meldingen().filter((m) => m.soort === "laat");
        act.innerHTML = `<div class="duo">
            <button class="pil${B.telaat.length ? " warm" : ""}" onclick="App.actFilter='telaat';App.go('acties')"><span class="n">${B.telaat.length}</span><span class="l">te laat</span></button>
            <button class="pil" onclick="App.actFilter=null;App.go('acties')"><span class="n">${voorJou}</span><span class="l">${voorJou === 1 ? "actie" : "acties"} voor jou</span></button></div>
          ${laat.length ? `<button class="notitie" onclick="App.actFilter='telaat';App.go('acties')"><span class="em">⏰</span><span>${laat.length === 1 ? esc(kort(laat[0].titel.replace(/^Te laat: /, ""), 46)) + " is " + (-laat[0].d) + " dag" + (laat[0].d === -1 ? "" : "en") + " over de plandatum" : laat.length + " acties zijn over de plandatum"}</span></button>` : ""}`;
      });
      if (!this._spontaan) v.appendChild(el(`<button class="linkknop" onclick="App._spontaan=true;App.route()">Andere inspectie starten</button>`));
      else {
        v.appendChild(el(`<h2>Andere inspectie starten</h2>`));
        v.appendChild(el(`<input id="zoek" class="fin" placeholder="Zoek product…" oninput="App.filterProd(this.value)" autocomplete="off" style="margin-bottom:10px">`));
        v.appendChild(el(`<div class="listcard" id="prodlist">${this.productKeuzeRows()}</div>`));
        v.appendChild(el(`<button class="linkknop" onclick="App._spontaan=false;App.route()">Inklappen</button>`));
      }
    },
    productKeuzeRows() {
      const kb = this.data.kennisbank;
      return Object.keys(kb).map((code) =>
        `<div class="row" data-naam="${esc(kb[code].naam.toLowerCase())}" style="cursor:pointer" onclick="App.startInspectie('${code}','spontaan','${esc(kb[code].naam)}')">
          <span class="grow"><span class="t">${esc(kb[code].naam)}</span> <span class="s">· ${kb[code].regels.length} regels</span></span>
          <span class="s">${svg("chev", 18)}</span></div>`).join("");
    },
    filterProd(q) {
      q = (q || "").toLowerCase().trim();
      document.querySelectorAll("#prodlist .row").forEach((r) => {
        r.style.display = (!q || r.getAttribute("data-naam").includes(q)) ? "" : "none";
      });
    },

    // ---------------- INSPECTIE: begeleid gesprek ----------------
    // De app stelt de vragen; de inspecteur spreekt in of typt en maakt foto's.
    // Koppeling aan een TRA-regel is altijd een Voorstel; het oordeel kiest alleen de inspecteur.
    startInspectie(code, project, titel, zeker) {
      const lo = this.state.inspectie;
      if (lo && !zeker && (lo.waarnemingen.length || lo.taken.length)) {
        return this.openModal("Er loopt nog een inspectie", lo.titel + " · " + lo.waarnemingen.length + " waarneming(en)",
          `<button class="btn primary" onclick="App.closeModal();App.goIns()">Verder met de lopende inspectie</button>
           <button class="btn danger" style="margin-top:10px;width:100%" onclick='App.closeModal();App.startInspectie(${esc(JSON.stringify(code))},${esc(JSON.stringify(project))},${esc(JSON.stringify(titel))},true)'>Lopende weggooien en nieuw starten</button>`);
      }
      this.stopMic();
      this.state.inspectie = { code, project, titel, taak: null, taken: [], stap: "taak", taakTekst: "",
        waarnemingen: [], cur: null, voorstel: null, laatste: null, gesprek: "", positief: "", handtekening: null,
        keuzes: [], start: new Date().toISOString() };
      this._opslag = null;
      this.goIns();
    },
    // vastleggen wat de inspecteur met elk voorstel deed (bewijs: de mens beslist)
    logKeuze(soort, uitkomst, wat) { const ins = this.state.inspectie; if (!ins) return; (ins.keuzes = ins.keuzes || []).push({ soort, uitkomst, wat: String(wat || "").slice(0, 120), t: new Date().toISOString() }); },
    goIns() { if (location.hash === "#/inspectie") this.route(); else this.go("inspectie"); },
    stap(s) { this.stopMic(); const ins = this.state.inspectie; if (!ins) return; ins.stap = s; this.goIns(); window.scrollTo(0, 0); },
    nieuweWaarneming(onderwerp) {
      const ins = this.state.inspectie;
      ins.cur = { id: "w" + Date.now(), taak: ins.taak, tekst: "", foto: null, regel_id: null, onderwerp: onderwerp || null,
        buiten: false, direct: false, maatregelen: [], oordeel: null, vraag: "",
        actie: { tekst: "", herkomst: "", prio: null, terPlaatse: "niets" } };
      ins.voorstel = null; ins.stap = "zie";
    },
    kiesTaak(t) {
      const ins = this.state.inspectie; ins.taak = t; if (!ins.taken.includes(t)) ins.taken.push(t);
      this.logKeuze("taak", (this._taakVs || []).includes(t) ? "voorstel gebruikt" : "zelf gekozen", t);
      tril(20); this.nieuweWaarneming(); this.stap("zie");
    },
    andereTaak() { const ins = this.state.inspectie; ins.taakTekst = ""; ins.cur = null; this.stap("taak"); },
    terug() {
      const ins = this.state.inspectie; if (!ins) return this.go("vandaag");
      const m = { taak: null, zie: ins.waarnemingen.length ? "meer" : "taak", koppel: "zie",
        oordeel: ins.cur && ins.cur.onderwerp ? "zie" : "koppel", actie: "oordeel", meer: null,
        algemeen: "meer", monteurs: "meer", klaar: "monteurs" }[ins.stap];
      if (!m) { this.stopMic(); return this.go("vandaag"); }
      if (ins.stap === "zie" && m === "meer") ins.cur = null;
      this.stap(m);
    },

    // --- invoervelden (inspreken of typen) ---
    veld(key) {
      const i = this.state.inspectie; if (!i) return "";
      if (key === "taak") return i.taakTekst;
      if (key === "zie") return i.cur ? i.cur.tekst : "";
      if (key === "actie") return i.cur ? i.cur.actie.tekst : "";
      if (key === "gesprek") return i.gesprek;
      if (key === "positief") return i.positief;
      return "";
    },
    setVeld(key, v) {
      const i = this.state.inspectie; if (!i) return;
      if (key === "taak") { i.taakTekst = v; this.renderTaakVs(); }
      else if (key === "zie" && i.cur) i.cur.tekst = v;
      else if (key === "actie" && i.cur) { i.cur.actie.tekst = v; i.cur.actie.herkomst = "Jij"; }
      else if (key === "gesprek") i.gesprek = v;
      else if (key === "positief") i.positief = v;
      this.syncKnoppen(); this.bewaarConcept();
    },
    appendVeld(key, txt) {
      if (!key || !txt) return;
      const cur = this.veld(key);
      let add = cur ? txt : txt.replace(/^\s+/, "");
      if (cur && !/\s$/.test(cur) && !/^\s/.test(add)) add = " " + add;
      const nv = cur + add;
      this.setVeld(key, nv);
      const t = $("f-" + key); if (t) t.value = nv;
    },
    syncKnoppen() {
      document.querySelectorAll("[data-need]").forEach((b) => {
        const ins = this.state.inspectie;
        const ok = b.getAttribute("data-need").split(",").some((k) =>
          k === "foto" ? !!(ins && ins.cur && ins.cur.foto) : !!this.veld(k).trim());
        b.disabled = !ok;
      });
    },
    invoer(key, ph) {
      return `<div class="inbox"><textarea id="f-${key}" placeholder="${esc(ph)}" oninput="App.setVeld('${key}',this.value)">${esc(this.veld(key))}</textarea>
        <button class="mic${this.micKey === key ? " on" : ""}" data-mic="${key}" aria-label="Inspreken: ingedrukt houden of aantikken" title="Ingedrukt houden = praten, loslaten = klaar. Kort tikken = aan/uit."
          onpointerdown="App.micDown('${key}',event)" onpointerup="App.micUp('${key}')" onpointercancel="App.micUp('${key}')" oncontextmenu="return false"
          onclick="if(event.detail===0)App.toggleMic('${key}')">${svg("mic", 24)}</button></div>
        <div class="partial" id="p-${key}"></div>`;
    },

    // --- inspreken: Claude-dictatie > spraakherkenning browser > microfoon van het toetsenbord ---
    // push-to-talk: ingedrukt houden = praten, loslaten = klaar; kort tikken = aan/uit (zoals een WhatsApp-spraakbericht)
    micDown(key, e) {
      if (e) e.preventDefault();
      const was = this.micKey === key; this._pd = { key, t: Date.now(), was };
      if (!was) { if (this.micKey) this.stopMic(); this.startMic(key); tril(25); }
    },
    micUp(key) {
      const p = this._pd; this._pd = null; if (!p || p.key !== key) return;
      if (p.was) { tril(15); return this.stopMic(); }
      if (Date.now() - p.t >= 450) { if (this.micKey === key) { tril(15); this.stopMic(); } }
      else if (this.micKey === key) this.zegPartial(key, "Luistert… tik nogmaals om te stoppen");
    },
    toggleMic(key) {
      if (this.micKey) { const was = this.micKey; this.stopMic(); if (was === key) return; }
      this.startMic(key);
    },
    startMic(key) {
      const d = this.caps && this.caps.dictation;
      if (d) {
        this.micKey = key; this._dictKey = key; this.markMic();
        d.start().catch((e) => {
          if (this.micKey === key) { this.micKey = null; this.markMic(); }
          if (e && (e.code === "unavailable" || e.code === "not_granted")) {
            this.caps.dictation = null;
            this.toetsenbordHint(key);
          }
        });
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        try {
          const rec = new SR(); rec.lang = "nl-NL"; rec.continuous = true; rec.interimResults = true;
          rec.onresult = (e) => {
            let fin = "", part = "";
            for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else part += t; }
            if (fin) this.appendVeld(key, fin);
            this.zegPartial(key, part);
          };
          let gestart = false;
          rec.onstart = () => { gestart = true; this.zegPartial(key, "Luistert… spreek nu"); };
          rec.onend = () => { if (this.micKey === key) { this.micKey = null; this.markMic(); this.zegPartial(key, ""); } };
          rec.onerror = (ev) => {
            if (this.micKey === key) { this.micKey = null; this.markMic(); }
            if (!ev || ev.error !== "no-speech") this.toetsenbordHint(key);
          };
          this._rec = rec; this.micKey = key; this.markMic(); rec.start();
          // Sommige omgevingen (bijv. iPhone binnen claude.ai) starten stil niet: na 2,5 s terugvallen.
          setTimeout(() => { if (!gestart && this._rec === rec) { try { rec.abort(); } catch (e) {} this._rec = null; if (this.micKey === key) { this.micKey = null; this.markMic(); } this.toetsenbordHint(key); } }, 2500);
          return;
        } catch (e) { this.micKey = null; this.markMic(); }
      }
      this.toetsenbordHint(key);
    },
    toetsenbordHint(key) {
      const t = $("f-" + key); if (t) t.focus();
      const p = $("p-" + key); if (!p) return;
      p.innerHTML = `<div class="hint">Inspreken met de knop kan hier niet. Tik in het tekstvak en gebruik de <b>microfoon van je toetsenbord</b> (iPhone: 🎤 rechtsonder, Android: 🎤 op Gboard).</div>`;
    },
    stopMic() {
      const k = this.micKey; this.micKey = null;
      try { const d = this.caps && this.caps.dictation; if (d && d.active()) d.stop().catch(() => {}); } catch (e) {}
      try { if (this._rec) { this._rec.onend = null; this._rec.stop(); } } catch (e) {}
      this._rec = null; this.markMic(); if (k) this.zegPartial(k, "");
    },
    markMic() { document.querySelectorAll("[data-mic]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-mic") === this.micKey)); },
    zegPartial(key, text) { const p = key && $("p-" + key); if (p) p.textContent = text ? "… " + text : ""; },
    zegHint(key, text) { const p = key && $("p-" + key); if (p) p.textContent = text; },

    // --- foto bij de lopende waarneming ---
    addFoto() {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const d = await fotoDataURL(f);
        const ins = this.state.inspectie; if (d && ins && ins.cur) { ins.cur.foto = d; this.route(); }
      };
      inp.click();
    },

    // --- kennis: regels, onderwerpen, voorstellen ---
    regelsVanTaak(ins) { return this.data.kennisbank[ins.code].regels.filter((r) => r.taak === ins.taak); },
    onderwerpen() {
      if (this._ow) return this._ow;
      const seen = {};
      (this.data.voorbeelddata.regels || []).forEach((x) => { if (x.soort === "Algemeen" && !seen[x.ref]) seen[x.ref] = { ref: x.ref, naam: x.omschrijving, klasse: x.classificatie }; });
      this._ow = Object.values(seen).sort((a, b) => a.ref.localeCompare(b.ref));
      return this._ow;
    },
    kandidaten(ins) {
      const regels = this.regelsVanTaak(ins).map((r) => ({ id: r.id, naam: r.risico, doc: [r.risico, (r.maatregelen || []).join(" "), r.klasse, r.taakstap || ""].join(" ") }));
      const ow = this.onderwerpen().map((o) => ({ id: "ALG-" + o.ref, naam: o.naam + " " + (OW_KEYS[o.ref] || ""), doc: o.naam + " " + (OW_KEYS[o.ref] || "") }));
      return regels.concat(ow);
    },
    // score = som van IDF-gewichten van gedeelde woorden; woorden in de naam tellen dubbel
    lokaalVoorstel(tekst, kand) {
      const q = new Set(toks(tekst)); if (!q.size || !kand.length) return [];
      const docs = kand.map((k) => ({ id: k.id, t: new Set(toks(k.doc).concat(toks(k.naam))), n: new Set(toks(k.naam)) }));
      const N = docs.length, df = {};
      docs.forEach((d) => d.t.forEach((w) => { df[w] = (df[w] || 0) + 1; }));
      const scored = docs.map((d) => {
        let s = 0; q.forEach((w) => { if (d.t.has(w)) s += Math.log((N + 1) / df[w]) * (d.n.has(w) ? 2 : 1); });
        return { id: d.id, s };
      }).filter((x) => x.s > 0.2).sort((a, b) => b.s - a.s);
      if (!scored.length) return [];
      const top = scored[0].s;
      return scored.filter((x) => x.s >= top * 0.45).slice(0, 3).map((x) => x.id);
    },
    infoVoor(code, id, buiten) {
      if (buiten || !id) return { ref: "Buiten de TRA", titel: "Risico dat de TRA niet noemt", maatregelen: [] };
      if (String(id).startsWith("ALG-")) {
        const o = this.onderwerpen().find((x) => "ALG-" + x.ref === id);
        return { ref: "Algemeen " + (o ? o.ref : ""), titel: o ? o.naam : id, maatregelen: [] };
      }
      const r = (this.data.kennisbank[code] || { regels: [] }).regels.find((x) => x.id === id) || {};
      return { ref: id, titel: r.risico || id, maatregelen: splitMaatregelen(r.maatregelen) };
    },
    regelInfo(id, buiten) { return this.infoVoor(this.state.inspectie.code, id, buiten); },
    // ---- één vaste Voorstel-component: label, bron, waarom, en jij kiest ----
    vsKop(vraag, bron) { return `<div class="vskop"><span class="lbl vs">Voorstel</span>${bron ? `<span class="s">via ${esc(bron)}</span>` : ""}<span class="s">· ${esc(vraag)}</span></div>`; },
    vsPick(onclick, titel, sub, waarom) {
      return `<button class="pick" onclick="${onclick}"><div class="t">${titel}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}${waarom ? `<div class="waarom">Waarom: ${waarom}</div>` : ""}<div class="gebruik">Gebruik dit ›</div></button>`;
    },
    waarom(tekst, doc, bron) {
      const w = eigenWoorden(tekst, doc);
      if (w.length) return "je zei " + w.map((x) => "“" + esc(x) + "”").join(", ");
      return bron && /Claude/.test(bron) ? "past inhoudelijk bij je waarneming (Claude)" : "";
    },
    renderTaakVs() {
      const box = $("taakvs"), ins = this.state.inspectie; if (!box || !ins) return;
      const regels = this.data.kennisbank[ins.code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      const docVan = (t) => t + " " + regels.filter((r) => r.taak === t).map((r) => (r.taakstap || "") + " " + (r.risico || "")).join(" ");
      const vs = ins.taakTekst.trim() ? this.lokaalVoorstel(ins.taakTekst, taken.map((t) => ({ id: t, naam: t, doc: docVan(t) }))).slice(0, 2) : [];
      this._taakVs = vs;
      box.innerHTML = vs.length ? this.vsKop("is dit de taak?") +
        vs.map((t) => this.vsPick(`App.kiesTaak(${esc(JSON.stringify(t))})`, esc(t), regels.filter((r) => r.taak === t).length + " risicoregels in de TRA", this.waarom(ins.taakTekst, docVan(t)))).join("") : "";
    },

    // --- schermen ---
    view_inspectie() {
      const ins = this.state.inspectie;
      if (!ins) return this.go("vandaag");
      const v = $("view"), f = this["ins_" + ins.stap];
      if (f) f.call(this, ins, v);
      this.syncKnoppen();
      if (ins.stap === "klaar") this.setupSignature();
      this.toonOpslag(); this.bewaarConcept(true);
    },
    insHead(ins, kicker, titel) {
      const n = ins.waarnemingen.length, a = ins.waarnemingen.filter((w) => w.oordeel === "A" || w.oordeel === "V").length;
      return `<div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <button class="btn ghost sm" onclick="App.terug()">${svg("back", 16)} Terug</button>
        <span class="s" style="text-align:right">${esc(ins.titel)}<br>${n} waarneming${n === 1 ? "" : "en"}${a ? " · " + a + " actievoorstel" + (a === 1 ? "" : "len") : ""}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px">
          <span id="opslag" class="opslag"></span>
          <button class="chip" onclick="App.openWeergave()" aria-label="Weergave">${svg("sun", 16)}&nbsp;Weergave</button></div>
        <div class="kicker" style="margin-top:14px">${esc(kicker)}</div><h1 style="margin:2px 0 4px">${esc(titel)}</h1></div>`;
    },
    citaat(cur) {
      return `<div style="display:flex;gap:10px;align-items:flex-start"><span class="lbl jij">Jij</span>
        <div style="flex:1;font-size:16px;line-height:1.4">${cur.tekst.trim() ? "“" + esc(cur.tekst.trim()) + "”" : '<span class="s">(alleen een foto)</span>'}</div>
        ${cur.foto ? `<img src="${cur.foto}" alt="foto" style="height:52px;border-radius:10px">` : ""}</div>`;
    },
    toastLaatste(ins) {
      const w = ins.waarnemingen.find((x) => x.id === ins.laatste); if (!w) return "";
      const info = this.regelInfo(w.regel_id, w.buiten);
      return `<div class="toast"><span>✓ Vastgelegd: ${esc(info.ref)} · [${w.oordeel}]${w.oordeel === "A" || w.oordeel === "V" ? " · actievoorstel genoteerd" : ""}</span>
        <button class="btn ghost sm" onclick="App.ongedaan()">Ongedaan maken</button></div>`;
    },

    ins_taak(ins, v) {
      const regels = this.data.kennisbank[ins.code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      v.appendChild(el(this.insHead(ins, ins.taken.length ? "Volgende taak" : "Begeleide inspectie · momentopname", "Wat doen de monteurs nu?")));
      v.appendChild(el(`<div class="q"><div class="qs" style="margin-top:0">Vertel het in je eigen woorden. De app stelt de taak voor; jij bevestigt.</div>
        ${this.invoer("taak", "Bijv. ze halen de damwand eruit met de kraan")}
        <div id="taakvs"></div>
        <details style="margin-top:12px"><summary class="s" style="cursor:pointer;font-weight:600">Zelf kiezen uit alle taken (${taken.length})</summary>
          <div class="chips" style="margin-top:8px">${taken.map((t) => `<button class="chipb" onclick="App.kiesTaak(${esc(JSON.stringify(t))})">${esc(t)}</button>`).join("")}</div></details></div>`));
      this.renderTaakVs();
    },
    ins_zie(ins, v) {
      const cur = ins.cur; if (!cur) { this.nieuweWaarneming(); return this.ins_zie(ins, v); }
      const ow = cur.onderwerp ? this.onderwerpen().find((o) => o.ref === cur.onderwerp) : null;
      v.appendChild(el(this.insHead(ins, ow ? "Algemeen onderwerp · " + ow.naam : "Taak · " + ins.taak, "Wat zie je?")));
      v.appendChild(el(`<div class="q">
        ${cur.direct ? `<div class="toast" style="background:var(--red-bg);color:var(--red);margin:0 0 12px">Direct gevaar · laat het werk stilleggen</div>` : ""}
        <div class="qs" style="margin-top:0">${ow ? "Vertel wat je zag bij " + esc(ow.naam.toLowerCase()) + "." : "Vertel wat je ziet gebeuren, of maak een foto. Alleen wat je ziet telt."} Houd de microfoon ingedrukt terwijl je praat.</div>
        ${this.invoer("zie", "Bijv. de gasmeter hangt boven aan de ladder, niet bij de man in de put")}
        <div style="display:flex;gap:10px;align-items:center;margin-top:10px">
          <button class="btn ghost sm" onclick="App.addFoto()">${svg("cam", 16)} ${cur.foto ? "Foto vervangen" : "Foto maken"}</button>
          ${cur.foto ? `<img src="${cur.foto}" alt="foto" style="height:48px;border-radius:10px">` : ""}</div>
        <button class="btn primary" style="margin-top:14px" data-need="zie,foto" onclick="App.koppel()">${ow ? "Volgende: beoordelen" : "Volgende: koppel aan de TRA"}</button>
        ${ow || cur.direct ? "" : `<button class="btn danger" style="margin-top:10px;width:100%" onclick="App.directGevaar()">${svg("warn", 18)} Direct gevaar · werk stilleggen</button>`}
      </div>`));
      if (ins.waarnemingen.length && !ow) v.appendChild(el(`<button class="btn ghost" style="margin-top:12px;width:100%" onclick="App.terug()">Niets meer gezien bij deze taak</button>`));
    },
    directGevaar() {
      this.openModal("Direct gevaar", "Eerst veiligheid, dan vastleggen.",
        `<div style="font-size:15px;line-height:1.5">1. Laat de monteurs het werk direct stilleggen.<br>2. Spreek in wat je zag en koppel het aan de TRA.<br>3. Het wordt een actie met prioriteit <b>Direct</b>; het oordeel kies jij.</div>
         <button class="btn primary" style="margin-top:16px" onclick="App.closeModal();App.state.inspectie.cur.direct=true;App.route()">Werk is stilgelegd</button>`);
    },
    async koppel() {
      this.stopMic();
      const ins = this.state.inspectie, cur = ins.cur;
      if (cur.onderwerp) { cur.regel_id = "ALG-" + cur.onderwerp; return this.stap("oordeel"); }
      const kand = this.kandidaten(ins);
      ins.stap = "koppel"; ins.voorstel = { ids: [], bron: "", bezig: true, vraag: "" }; this.route(); window.scrollTo(0, 0);
      let ids = [], vraag = "", bron = "";
      const s = this.caps && this.caps.sample;
      if (s && cur.tekst.trim()) {
        try {
          const lijst = kand.map((k) => `${k.id} | ${k.doc.replace(/\s+/g, " ").slice(0, 240)}`).join("\n");
          const out = await s.json(
            `Je helpt een inspecteur bij een werkplekinspectie volgens de momentopname-methode. Koppel zijn waarneming aan de best passende risicoregel(s) uit de lijst. Je geeft GEEN oordeel (niet conform of afwijking) en verzint niets: baseer je alleen op de waarneming.\n\n` +
            `Taak die de monteurs uitvoeren: ${ins.taak}\nWaarneming van de inspecteur: "${cur.tekst.trim()}"\n\n` +
            `Regels (id | risico, maatregelen, klasse). Id's met ALG- zijn algemene onderwerpen:\n${lijst}\n\n` +
            `Antwoord alleen met JSON: {"regels":["ID", ...] (maximaal 3, best passend eerst; leeg als niets past), "vraag":"één korte doorvraag in het Nederlands die de inspecteur helpt vastleggen welke maatregel hij wel of niet zag"}\n` +
            `Voorbeeld: {"regels":["DAM-2.07"],"vraag":"Hing de gasmeter bij de man in de put?"}`, { modelTier: "quick" });
          const valid = new Set(kand.map((k) => k.id));
          ids = (Array.isArray(out && out.regels) ? out.regels : []).map(String).filter((x) => valid.has(x)).slice(0, 3);
          vraag = out && typeof out.vraag === "string" ? out.vraag.slice(0, 200) : "";
          bron = "Claude";
        } catch (e) { if (e && (e.code === "not_granted" || e.code === "sampling_disabled")) this.caps.sample = null; }
      }
      if (!ids.length) { const l = this.lokaalVoorstel(cur.tekst, kand); if (l.length) { ids = l; bron = bron ? bron + " + trefwoorden" : "trefwoorden"; } }
      if (this.state.inspectie !== ins || ins.stap !== "koppel") return;
      ins.voorstel = { ids, bron, bezig: false, vraag }; this.route();
    },
    ins_koppel(ins, v) {
      const cur = ins.cur, vs = ins.voorstel || { ids: [], bezig: true };
      v.appendChild(el(this.insHead(ins, "Taak · " + ins.taak, "Waar hoort dit bij?")));
      const kand = this.kandidaten(ins);
      const pick = (id) => { const i = this.regelInfo(id), k = kand.find((x) => x.id === id);
        return this.vsPick(`App.kiesRegel('${id}')`, esc(i.ref) + " · " + esc(kort(i.titel, 110)), i.maatregelen.length ? kort(i.maatregelen.slice(0, 2).join(" · "), 150) : "", this.waarom(cur.tekst, k ? k.doc + " " + k.naam : i.titel, vs.bron)); };
      v.appendChild(el(`<div class="q">${this.citaat(cur)}
        ${vs.bezig ? `<div class="s" style="margin-top:14px;font-weight:600">Even koppelen aan de TRA…</div>`
          : vs.ids.length ? `<div style="margin-top:14px">${this.vsKop("tik aan wat klopt", vs.bron)}</div>${vs.ids.map(pick).join("")}`
          : `<div class="s" style="margin-top:14px">Geen duidelijke regel gevonden. Kies hieronder zelf, of leg het vast als buiten de TRA.</div>`}
        <button class="btn ghost" style="margin-top:12px;width:100%" onclick="App.buitenTRA()">Staat niet in de TRA (buiten TRA)</button></div>`));
      const regels = this.regelsVanTaak(ins);
      v.appendChild(el(`<details class="card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:650">Zelf kiezen: risico's van deze taak (${regels.length}) en algemene onderwerpen</summary>
        <div style="margin-top:8px">${regels.map((r) => `<button class="pick" style="background:#fff;box-shadow:inset 0 0 0 1px var(--line)" onclick="App.kiesRegel('${r.id}')"><div class="t">${esc(r.id)} · ${esc(kort(r.risico, 90))}</div></button>`).join("")}
        ${this.onderwerpen().map((o) => `<button class="pick" style="background:#fff;box-shadow:inset 0 0 0 1px var(--line)" onclick="App.kiesRegel('ALG-${o.ref}')"><div class="t">Algemeen ${o.ref} · ${esc(o.naam)}</div></button>`).join("")}</div></details>`));
    },
    kiesRegel(id) {
      const ins = this.state.inspectie, cur = ins.cur, vsIds = (ins.voorstel && ins.voorstel.ids) || [];
      this.logKeuze("TRA-regel", vsIds.includes(id) ? "voorstel gebruikt" : "zelf gekozen", id);
      cur.regel_id = id; cur.buiten = false; cur.vraag = (ins.voorstel && ins.voorstel.vraag) || ""; cur.maatregelen = []; tril(20); this.stap("oordeel");
    },
    buitenTRA() { this.logKeuze("TRA-regel", "zelf gekozen", "buiten TRA"); const cur = this.state.inspectie.cur; cur.regel_id = null; cur.buiten = true; cur.vraag = ""; cur.maatregelen = []; this.stap("oordeel"); },
    togMaatregel(i) {
      const cur = this.state.inspectie.cur, m = this.regelInfo(cur.regel_id, cur.buiten).maatregelen[i]; if (!m) return;
      cur.maatregelen = cur.maatregelen.includes(m) ? cur.maatregelen.filter((x) => x !== m) : cur.maatregelen.concat([m]);
      this.route();
    },
    ins_oordeel(ins, v) {
      const cur = ins.cur, info = this.regelInfo(cur.regel_id, cur.buiten);
      v.appendChild(el(this.insHead(ins, info.ref, "Hoe beoordeel je dit?")));
      let h = `<div class="q">${this.citaat(cur)}
        <div style="margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--mist)"><div class="s" style="font-weight:600">${esc(info.ref)}</div><div class="clamp3" style="font-weight:600" title="${esc(info.titel)}">${esc(info.titel)}</div></div>`;
      if (cur.direct) h += `<div class="toast" style="background:var(--red-bg);color:var(--red)">Direct gevaar · werk stilgelegd</div>`;
      if (cur.vraag) h += `<div style="margin-top:12px;line-height:1.45"><span class="lbl vs">Doorvraag</span> ${esc(cur.vraag)}</div>`;
      if (info.maatregelen.length) h += `<div class="s" style="margin:14px 0 6px;font-weight:600">Welke maatregel zag je? <span style="font-weight:500">(optioneel)</span></div>
        <div class="chips">${info.maatregelen.map((m, i) => `<button class="chipb${cur.maatregelen.includes(m) ? " on" : ""}" onclick="App.togMaatregel(${i})">${esc(m)}</button>`).join("")}</div>`;
      h += `<div class="s" style="margin:16px 0 6px;font-weight:600">Jouw oordeel</div>
        <div class="seg">${["C", "A", "V"].map((o) => `<button class="t-${o}${cur.oordeel === o ? " on-" + o : ""}" onclick="App.oordeel('${o}')"><span class="l">${o}</span><span class="w">${{ C: "Conform", A: "Afwijking", V: "Verbeterpunt" }[o]}</span></button>`).join("")}</div>
        <button class="btn ghost sm" style="margin-top:10px" onclick="App.oordeel('NVT')">Niet van toepassing</button></div>`;
      v.appendChild(el(h));
    },
    oordeel(o) {
      const ins = this.state.inspectie, cur = ins.cur; cur.oordeel = o; tril(o === "C" ? 25 : [25, 60, 25]);
      if (o === "A" || o === "V") {
        if (!cur.actie.prio) cur.actie.prio = cur.direct ? "direct" : o === "A" ? "kort" : "planmatig";
        this.stap("actie");
        if (!cur.actie.tekst.trim()) this.actieVoorstel();   // voorstel op basis van wat de inspecteur zei
        return;
      }
      const terug = cur.onderwerp ? "algemeen" : "meer";
      this.bewaarWaarneming(); this.stap(terug);
    },
    bewaarWaarneming() {
      const ins = this.state.inspectie, cur = ins.cur; if (!cur) return;
      const i = ins.waarnemingen.findIndex((w) => w.id === cur.id);
      if (i >= 0) ins.waarnemingen[i] = cur; else ins.waarnemingen.push(cur);
      if (cur.taak && !ins.taken.includes(cur.taak)) ins.taken.push(cur.taak);
      ins.laatste = cur.id; ins.cur = null;
    },
    ongedaan() {
      const ins = this.state.inspectie, w = ins.waarnemingen.find((x) => x.id === ins.laatste); if (!w) return;
      ins.waarnemingen = ins.waarnemingen.filter((x) => x !== w); w.oordeel = null; ins.cur = w; ins.laatste = null;
      this.stap("oordeel");
    },
    ins_actie(ins, v) {
      const cur = ins.cur, info = this.regelInfo(cur.regel_id, cur.buiten), a = cur.actie;
      v.appendChild(el(this.insHead(ins, info.ref + " · " + (cur.oordeel === "A" ? "Afwijking" : "Verbeterpunt"), "Wat zou er moeten gebeuren?")));
      const chip = (k, val, lab) => `<button class="chipb${a[k] === val ? " on" : ""}" onclick="App.zetActie('${k}','${val}')">${lab}</button>`;
      const gecorr = a.terPlaatse === "gecorrigeerd";
      v.appendChild(el(`<div class="q">${this.citaat(cur)}
        <div style="margin:14px 0 6px">${a.bezig ? `<span class="s" style="font-weight:600">Even een voorstel maken op basis van wat je zei…</span>`
          : a.herkomst === "Voorstel" ? this.vsKop("pas aan of laat staan", a.vsBron) + (a.vsWaarom ? `<div class="waarom" style="margin-top:4px">Waarom: ${a.vsWaarom}</div>` : "")
          : `<span class="s" style="font-weight:600">Actievoorstel</span>`}</div>
        ${this.invoer("actie", "Bijv. gasmeter altijd bij de man in de put; toolbox gasmeting")}
        <button class="btn ghost sm" id="btn-av" onclick="App.actieVoorstel()">${a.tekst ? "Nieuw voorstel" : "Laat de app een actie voorstellen"}</button>
        <div class="s" style="margin:16px 0 6px;font-weight:600">Hoe dringend vind jij het?</div>
        <div class="chips">${chip("prio", "direct", "Direct")}${chip("prio", "kort", "Kort · ±2 weken")}${chip("prio", "planmatig", "Planmatig · ±8 weken")}</div>
        <div class="s" style="margin:16px 0 6px;font-weight:600">Ter plaatse</div>
        <div class="chips">${chip("terPlaatse", "niets", "Niets gedaan")}${chip("terPlaatse", "maatregel", "Maatregel genomen")}${chip("terPlaatse", "gecorrigeerd", "Direct gecorrigeerd")}</div>
        ${a.terPlaatse === "maatregel" ? `<div class="s" style="margin-top:8px">Een direct genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot ze is uitgevoerd en getoetst.</div>` : ""}
        ${gecorr ? `<div class="s" style="margin-top:8px">Direct gecorrigeerd: de ploeg heeft het ter plaatse opgelost en jij hebt het gezien. Dit wordt vastgelegd als afgerond, met jou als toetser.</div>` : ""}
        <div class="hint" style="margin-top:14px;background:var(--mist);color:var(--soft)">${gecorr ? "Geen verdere instelling nodig." : "Dit wordt een <b>actievoorstel</b>. Een coördinator stelt daarna de actie in: actiehouder, toetser en plandatum."}</div>
        <button class="btn primary" style="margin-top:14px" data-need="actie" onclick="App.bevestigActie()">Actievoorstel vastleggen</button></div>`));
    },
    zetActie(k, val) { this.state.inspectie.cur.actie[k] = val; tril(15); this.route(); },
    async actieVoorstel() {
      const ins = this.state.inspectie, cur = ins.cur, info = this.regelInfo(cur.regel_id, cur.buiten);
      cur.actie.bezig = true; const btn = $("btn-av"); if (btn) { btn.disabled = true; btn.textContent = "Even denken…"; }
      if (ins.stap === "actie") this.route();
      let tekst = "", bron = "", waarom = "";
      const s = this.caps && this.caps.sample;
      if (s) {
        try {
          const out = await s.json(
            `Stel één concrete verbeteractie voor bij een werkplekinspectie. Baseer je op wat de inspecteur zei en op de TRA-maatregelen. Verzin geen feiten en geef geen oordeel.\n` +
            `Oordeel van de inspecteur: ${cur.oordeel === "A" ? "Afwijking" : "Verbeterpunt"}\nRisico of onderwerp: ${info.titel}\n` +
            `Maatregelen uit de TRA: ${info.maatregelen.join("; ").slice(0, 700) || "(geen)"}\nWat de inspecteur zei: "${cur.tekst}"\n` +
            (ins.gesprek ? `Uit het gesprek met de monteurs: "${ins.gesprek.slice(0, 400)}"\n` : "") +
            `Antwoord alleen met JSON: {"actie":"gebiedende wijs, maximaal 25 woorden, Nederlands"}`, { modelTier: "quick" });
          if (out && typeof out.actie === "string") { tekst = out.actie.trim(); bron = "Claude"; waarom = "jouw waarneming en de maatregelen uit de TRA"; }
        } catch (e) { if (e && (e.code === "not_granted" || e.code === "sampling_disabled")) this.caps.sample = null; }
      }
      if (!tekst) {
        const m = info.maatregelen.find((x) => !cur.maatregelen.includes(x)) || info.maatregelen[0];
        tekst = m ? "Zorg dat de TRA-maatregel wordt toegepast: " + m.replace(/^[^·]*·\s*/, "")
          : cur.buiten ? "Risico beoordelen en een maatregel opnemen in de TRA: " + cur.tekst.trim()
          : "Met de ploeg bespreken en verhelpen: " + cur.tekst.trim();
        bron = m ? "TRA-maatregel" : "jouw woorden"; waarom = m ? "deze TRA-maatregel heb je niet als gezien aangevinkt" : cur.buiten ? "het risico staat niet in de TRA" : "wat je zelf zag en zei";
      }
      cur.actie.bezig = false;
      if (this.state.inspectie !== ins || ins.cur !== cur) return;
      if (cur.actie.tekst.trim() && cur.actie.herkomst === "Jij") { if (ins.stap === "actie") this.route(); return; }   // niet over eigen tekst heen schrijven
      Object.assign(cur.actie, { tekst, herkomst: "Voorstel", vsTekst: tekst, vsBron: bron, vsWaarom: waarom });
      if (ins.stap === "actie") this.route();
    },
    bevestigActie() {
      const ins = this.state.inspectie, cur = ins.cur, a = cur.actie;
      this.logKeuze("actietekst", a.vsTekst ? (a.tekst.trim() === a.vsTekst.trim() ? "voorstel gebruikt" : "voorstel aangepast") : "zelf geschreven", a.tekst);
      a.status = a.terPlaatse === "gecorrigeerd" ? "Afgerond" : "Voorstel";
      tril([20, 40, 20]);
      const terug = cur.onderwerp ? "algemeen" : "meer";
      this.bewaarWaarneming(); this.stap(terug);
    },
    ins_meer(ins, v) {
      v.appendChild(el(this.insHead(ins, "Taak · " + ins.taak, "Nog iets gezien?")));
      const t = this.toastLaatste(ins); if (t) v.appendChild(el(t));
      v.appendChild(el(`<div class="q">
        <button class="btn primary" onclick="App.nieuweWaarneming();App.stap('zie')">${svg("mic", 18)} Ja, volgende waarneming</button>
        <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.stap('algemeen')">Algemene onderwerpen nalopen</button>
        <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.andereTaak()">Andere taak toetsen</button>
        <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.stap('monteurs')">Nee, naar het gesprek met de monteurs</button></div>`));
      if (ins.waarnemingen.length) v.appendChild(el(this.vastgelegdLijst(ins)));
    },
    ins_algemeen(ins, v) {
      v.appendChild(el(this.insHead(ins, "Geheugensteun · niet verplicht", "Algemene onderwerpen")));
      const t = this.toastLaatste(ins); if (t) v.appendChild(el(t));
      v.appendChild(el(`<div class="q"><div class="qs" style="margin-top:0">Leg alleen vast wat je zag. Tik op een onderwerp om er een waarneming bij te geven.</div>
        ${this.onderwerpen().map((o) => {
          const ws = ins.waarnemingen.filter((x) => x.regel_id === "ALG-" + o.ref);
          return `<button class="pick" style="background:#fff;box-shadow:inset 0 0 0 1px var(--line);display:flex;align-items:center;gap:12px" onclick="App.nieuweWaarneming('${o.ref}');App.stap('zie')">
            <span style="width:30px;height:30px;border-radius:8px;background:var(--mist);display:grid;place-items:center;font-weight:700;flex:none">${o.ref}</span>
            <span style="flex:1" class="t">${esc(o.naam)}</span>${ws.map((x) => `<span class="badge b-${x.oordeel === "NVT" ? "N" : x.oordeel}">[${x.oordeel}]</span>`).join(" ")}</button>`;
        }).join("")}
        <button class="btn primary" style="margin-top:14px" onclick="App.stap('meer')">Klaar met de onderwerpen</button></div>`));
    },
    ins_monteurs(ins, v) {
      v.appendChild(el(this.insHead(ins, "Vast onderdeel", "Gesprek met de monteurs")));
      v.appendChild(el(`<div class="q"><div class="qt">Wat heb je besproken en hoe reageerden ze?</div><div class="qs">Ideeën van de monteurs komen in het rapport.</div>
        ${this.invoer("gesprek", "Bijv. besproken dat de gasmeter bij de man hoort; monteurs stelden een clip aan het harnas voor")}</div>`));
      v.appendChild(el(`<div class="q"><div class="qt">Wat ging opvallend goed?</div><div class="qs">Elk rapport bevat ten minste één positieve bevinding.</div>
        ${this.invoer("positief", "Bijv. LOTOTO netjes toegepast: sloten van opdrachtgever en Noardling hingen erop")}
        <button class="btn primary" style="margin-top:14px" onclick="App.stap('klaar')">Naar afronden</button></div>`));
    },
    vastgelegdLijst(ins) {
      return `<h2>Vastgelegd</h2><div class="listcard">${ins.waarnemingen.map((w) => {
        const i = this.regelInfo(w.regel_id, w.buiten);
        return `<div class="row"><span class="grow"><span class="t">${esc(i.ref)} · ${esc(kort(i.titel, 60))}</span>
          <div class="s">${w.tekst.trim() ? "“" + esc(kort(w.tekst.trim(), 90)) + "”" : "foto"}${w.actie && w.actie.tekst ? " · actie: " + esc(kort(w.actie.tekst, 60)) : ""}</div></span>
          ${w.foto ? `<img src="${w.foto}" alt="" style="height:36px;border-radius:8px">` : ""}
          <span class="badge b-${w.oordeel === "NVT" ? "N" : w.oordeel}">[${w.oordeel}]</span></div>`;
      }).join("")}</div>`;
    },
    // controle vóór ondertekenen: alleen herinneringen, je kunt altijd vastleggen
    controlePunten(ins) {
      const ws = ins.waarnemingen, p = [];
      if (!ws.length) p.push("Er is nog geen waarneming vastgelegd.");
      ws.filter((w) => w.oordeel === "A" && !w.foto).forEach((w) => p.push("Afwijking bij " + this.regelInfo(w.regel_id, w.buiten).ref + " heeft geen foto."));
      ws.filter((w) => (w.oordeel === "A" || w.oordeel === "V") && !(w.actie && w.actie.tekst.trim())).forEach((w) => p.push("Bij " + this.regelInfo(w.regel_id, w.buiten).ref + " ontbreekt een actievoorstel."));
      if (!ws.some((w) => w.oordeel === "C") && !ins.positief.trim()) p.push("Nog geen positieve bevinding: leg een Conform vast of vul ‘Wat ging opvallend goed’ in.");
      if (!ins.gesprek.trim()) p.push("Het gesprek met de monteurs is nog leeg.");
      if (!ins.handtekening) p.push("Je hebt nog niet ondertekend.");
      return p;
    },
    ins_klaar(ins, v) {
      const ws = ins.waarnemingen, cnt = { C: 0, A: 0, V: 0, NVT: 0 };
      ws.forEach((w) => { cnt[w.oordeel] = (cnt[w.oordeel] || 0) + 1; });
      v.appendChild(el(this.insHead(ins, "Afronden", "Klopt dit?")));
      v.appendChild(el(`<div class="grid kpis">${this.tile("sage", cnt.C, "Conform", "gezien")}${this.tile("blush", cnt.A, "Afwijking", cnt.A ? "met actievoorstel" : "geen")}${this.tile("butter", cnt.V, "Verbeterpunt", cnt.V ? "met actievoorstel" : "geen")}</div>`));
      const p = this.controlePunten(ins).filter((x) => !/ondertekend/.test(x));
      v.appendChild(el(p.length ? `<div class="card" style="margin-top:14px;background:var(--butter);box-shadow:none">
          <div style="font-weight:700;color:#5E4500">Nog even nalopen</div><div class="s" style="margin-bottom:6px;color:#7A5A00">Herinnering — je kunt de inspectie ook gewoon vastleggen.</div>
          ${p.map((x) => `<div style="color:#7A4300;font-weight:600;font-size:14px;margin:3px 0">• ${esc(x)}</div>`).join("")}</div>`
        : `<div class="toast" style="margin-top:14px">✓ Alles compleet: foto’s, actievoorstellen, positieve bevinding en gesprek.</div>`));
      v.appendChild(el(`<div class="card" style="margin-top:14px"><div class="t">Getoetst tijdens bezoek</div><div class="s">${ins.taken.map(esc).join(" · ") || "—"}</div></div>`));
      if (ws.length) v.appendChild(el(this.vastgelegdLijst(ins)));
      v.appendChild(el(`<h2>Handtekening inspecteur</h2>`));
      v.appendChild(el(`<div class="card">
        <canvas id="sig" width="640" height="200" style="width:100%;height:160px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);touch-action:none;background:#fff;display:block"></canvas>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span class="s" id="sigstat">${ins.handtekening ? "Ondertekend ✓" : "Teken in het vak"}</span>
          <button class="btn ghost sm" onclick="App.clearSig()">Wissen</button></div></div>`));
      v.appendChild(el(`<button class="btn primary" style="margin-top:16px" onclick="App.bewaarInspectie()">Inspectie vastleggen</button>`));
      v.appendChild(el(`<button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.go('vandaag')">Later afmaken (blijft bewaard)</button>`));
    },
    setupSignature() {
      const cv = $("sig"); if (!cv) return;
      const ins = this.state.inspectie, ctx = cv.getContext("2d");
      ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#141A22";
      if (ins.handtekening) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height); im.src = ins.handtekening; }
      let drawing = false, last = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      cv.onpointerdown = (e) => { e.preventDefault(); drawing = true; last = pos(e); };
      cv.onpointermove = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; };
      const end = () => { if (!drawing) return; drawing = false; ins.handtekening = cv.toDataURL("image/png"); const s = $("sigstat"); if (s) s.textContent = "Ondertekend ✓ · " + new Date().toLocaleString("nl-NL"); };
      cv.onpointerup = end; cv.onpointerleave = end;
    },
    clearSig() { const cv = $("sig"); if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); if (this.state.inspectie) this.state.inspectie.handtekening = null; const s = $("sigstat"); if (s) s.textContent = "Teken in het vak"; },
    async bewaarInspectie(toch) {
      this.stopMic();
      const ins = this.state.inspectie; if (!ins) return;
      const p = this.controlePunten(ins);
      if (p.length && !toch) {
        return this.openModal("Nog " + p.length + " punt" + (p.length === 1 ? "" : "en") + " open", "Herinnering: je kunt aanvullen of toch vastleggen.",
          `<div class="card" style="background:var(--butter);box-shadow:none">${p.map((x) => `<div style="color:#7A4300;font-weight:600;font-size:14px;margin:3px 0">• ${esc(x)}</div>`).join("")}</div>
           <button class="btn ghost" style="margin-top:14px;width:100%" onclick="App.closeModal()">Terug om aan te vullen</button>
           <button class="btn primary" style="margin-top:10px" onclick="App.closeModal();App.bewaarInspectie(true)">Toch vastleggen</button>`);
      }
      const rec = { id: "WPI-" + Date.now(), versie: 3, titel: ins.titel, code: ins.code, project: ins.project,
        taken: ins.taken.slice(), taak: ins.taken[0] || ins.taak || "", waarnemingen: ins.waarnemingen,
        gesprek: ins.gesprek, positief: ins.positief, handtekening: ins.handtekening, keuzes: ins.keuzes || [],
        open_punten: p, inspecteur: this.user.full_name, inspecteur_id: this.user.id, start: ins.start, opgeslagen: new Date().toISOString() };
      // elk A/V-oordeel wordt een actievoorstel; instellen (houder, toetser, plandatum) gebeurt daarna handmatig
      const nu = new Date().toISOString(), nieuw = [];
      rec.waarnemingen.forEach((w, n) => {
        if (!((w.oordeel === "A" || w.oordeel === "V") && w.actie)) return;
        const gecorr = w.actie.terPlaatse === "gecorrigeerd", id = "ACT-" + Date.now() + "-" + n;
        w.actie.actie_id = id;
        nieuw.push({ id, inspectie_id: rec.id, inspectie_titel: rec.titel, inspecteur: rec.inspecteur, ref: this.infoVoor(rec.code, w.regel_id, w.buiten).ref,
          waarneming: (w.tekst || "").trim(), foto: w.foto || null, oordeel: w.oordeel, tekst: w.actie.tekst, prio: w.actie.prio, terPlaatse: w.actie.terPlaatse,
          status: gecorr ? "Afgerond" : "Voorstel", houder: null, toetser: gecorr ? this.user.id : null, plandatum: gecorr ? isoDag(new Date()) : null,
          log: [{ t: nu, wie: rec.inspecteur, wat: gecorr ? "Ter plaatse gecorrigeerd en door de inspecteur gezien" : "Actievoorstel uit de inspectie" + (w.actie.herkomst === "Voorstel" ? " (tekst voorgesteld door de app)" : "") }] });
      });
      let ok = true;
      try { await DB.save(rec); for (const a of nieuw) await DB.put("acties", a); } catch (e) { ok = false; }
      if (!ok) return this.openModal("Niet opgeslagen", "Het toestel kon de inspectie niet bewaren. Je gegevens staan nog in de lopende inspectie.", `<button class="btn primary" onclick="App.closeModal();App.bewaarInspectie(true)">Opnieuw proberen</button>`);
      this.acties = null;
      this.state.inspectie = null; this.bewaarConcept(true); tril([30, 50, 30]);
      const nv = nieuw.filter((a) => a.status === "Voorstel").length;
      this.openModal("Vastgelegd", "Veilig bewaard op dit toestel (cloud-opslag volgt met de backend).",
        `${nv ? `<div class="hint" style="margin-bottom:12px">${nv} actievoorstel${nv === 1 ? "" : "len"} klaargezet. Een coördinator stelt ze in onder <b>Acties › In te stellen</b>.</div>` : ""}
         <button class="btn primary" onclick="App.closeModal();location.hash='#/rapport/${rec.id}'">Bekijk rapport</button>
         <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.closeModal();App.go('inspecties')">Naar inspecties</button>`);
    },

    // ---------------- INSPECTIES ----------------
    async view_inspecties() {
      const wpis = this.data.voorbeelddata.wpis || [];
      const v = $("view");
      const mine = !staf();
      v.appendChild(el(`<div><div class="kicker">${mine ? "Jouw inspecties" : wpis.length + " voorbeeld-inspecties · alle inspecteurs"}</div><h1>Inspecties</h1></div>`));
      v.appendChild(el(`<div class="muted" style="font-size:13px;margin:-8px 0 12px">Eigen inspecties staan veilig op dit toestel. Delen tussen telefoons volgt met de cloud-koppeling.</div>`));
      const box = el(`<div class="listcard"><div class="row"><span class="grow s">Laden…</span></div></div>`);
      v.appendChild(box);
      let saved = [];
      try { saved = await DB.all(); } catch (e) {}
      saved = saved.filter((r) => !mine || r.inspecteur_id === this.user.id).sort((a, b) => b.opgeslagen.localeCompare(a.opgeslagen));
      const savedRows = saved.map((r) => {
        const n = r.versie >= 2 ? r.waarnemingen.length : Object.values(r.oordelen || {}).filter(Boolean).length;
        return `<div class="row" style="cursor:pointer" onclick="location.hash='#/rapport/${r.id}'">
          <span class="grow"><span class="t">${esc(r.titel)}</span><div class="s">${new Date(r.opgeslagen).toLocaleString("nl-NL")} · ${esc(r.inspecteur.split(" ")[0])} · ${n} waarneming${n === 1 ? "" : "en"}${r.handtekening ? " · ondertekend" : ""}</div></span>
          <span class="badge b-done">op dit toestel</span></div>`;
      }).join("");
      const vbRows = mine ? "" : wpis.slice().reverse().map((w) => {
        const dam = (w.nr || "").split("-")[1] || "";
        return `<div class="row"><span class="grow"><span class="t">${esc(w.product || w.nr)}</span><div class="s">${esc(w.nr)} · ${esc(w.ingang || "")}</div></span><span class="s">${dam ? dam.slice(6, 8) + "-" + dam.slice(4, 6) : ""}</span></div>`;
      }).join("");
      box.innerHTML = (savedRows || (mine ? `<div class="row"><span class="grow s">Nog geen eigen inspecties. Start er een via Vandaag.</span></div>` : "")) + vbRows;
    },
    async view_rapport(parts) {
      const id = parts[0];
      const v = $("view");
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      const r = saved.find((x) => x.id === id);
      if (!r) { v.appendChild(el(`<div><button class="btn ghost sm" onclick="App.go('inspecties')">${svg("back", 16)} Terug</button><h1>Rapport niet gevonden</h1></div>`)); return; }
      const ws = r.versie >= 2 ? r.waarnemingen : Object.entries(r.oordelen || {}).filter(([, o]) => o)
        .map(([rid, o]) => ({ regel_id: rid, oordeel: o, tekst: "", foto: (r.fotos || {})[rid] || null, maatregelen: [], actie: { tekst: "" } }));
      const taken = r.taken || [r.taak];
      const ob = { C: "Conform", A: "Afwijking", V: "Verbeterpunt", NVT: "Niet van toepassing" };
      const prioLab = { direct: "Direct", kort: "Kort", planmatig: "Planmatig" };
      const wRows = ws.map((w) => {
        const i = this.infoVoor(r.code, w.regel_id, w.buiten);
        return `<div class="row" style="align-items:flex-start"><span class="grow"><span class="t">${esc(i.ref)} · ${esc(kort(i.titel, 90))}</span>
          ${w.tekst ? `<div class="s">Waarneming: “${esc(w.tekst.trim())}”</div>` : ""}
          ${w.maatregelen && w.maatregelen.length ? `<div class="s">Maatregel gezien: ${esc(w.maatregelen.join("; "))}</div>` : ""}</span>
          <span class="badge b-${w.oordeel === "NVT" ? "N" : w.oordeel}">[${w.oordeel}] ${ob[w.oordeel] || ""}</span></div>`;
      }).join("");
      const acties = ws.filter((w) => (w.oordeel === "A" || w.oordeel === "V") && w.actie);
      await this.laadActies();
      const aRows = acties.map((w, n) => {
        const i = this.infoVoor(r.code, w.regel_id, w.buiten), live = (this.acties || []).find((x) => x.id === w.actie.actie_id);
        const a = live || w.actie;   // live status uit Acties; oude rapporten (v2) vallen terug op het record
        const houder = live ? (live.houder ? naam(live.houder) : "nog in te stellen") : a.houder || "–";
        const toetser = live ? (live.toetser ? naam(live.toetser) : "nog in te stellen") : a.toetser || "–";
        return `<div class="row" style="align-items:flex-start${live ? ";cursor:pointer" : ""}"${live ? ` onclick="App.openActie('${live.id}')"` : ""}><span class="grow"><span class="t">${n + 1}. ${esc(a.tekst || "(geen actietekst)")}</span>
          <div class="s">${esc(i.ref)} · dringendheid volgens inspecteur: ${prioLab[w.actie.prio] || "–"}${live ? " · plandatum " + dagLabel(live.plandatum) : a.termijn ? " · termijn " + esc(a.termijn) : ""}</div>
          <div class="s">Actiehouder: ${esc(houder)} · toetser: ${esc(toetser)}</div>
          ${w.actie.terPlaatse === "maatregel" ? `<div class="s">Ter plaatse een maatregel genomen; actie blijft open tot uitgevoerd en getoetst.</div>` : ""}</span>
          ${stBadge(live ? live.status : a.status || "Open")}</div>`;
      }).join("");
      const kz = r.keuzes || [], kc = (u) => kz.filter((k) => k.uitkomst === u).length;
      const fotos = ws.filter((w) => w.foto);
      v.appendChild(el(`<div class="noprint"><button class="btn ghost sm" onclick="App.go('inspecties')">${svg("back", 16)} Terug</button></div>`));
      v.appendChild(el(`<div id="rap">
        <div class="kicker" style="margin-top:12px">WPI-rapport · momentopname · ${new Date(r.opgeslagen).toLocaleString("nl-NL")}</div>
        <h1 style="margin-bottom:6px">${esc(r.titel)}</h1>
        <div class="s" style="margin-bottom:14px">Project ${esc(r.project || "–")} · inspecteur ${esc(r.inspecteur)}</div>
        <div class="card"><div class="t">1. Getoetst tijdens bezoek</div><div class="s">${taken.map(esc).join(" · ")}</div></div>
        <h2>2. Waarnemingen</h2><div class="listcard">${wRows || '<div class="row"><span class="s">Geen</span></div>'}</div>
        ${acties.length ? `<h2>3. Acties</h2><div class="listcard">${aRows}</div>` : ""}
        ${r.gesprek ? `<h2>4. Gesprek met de monteurs</h2><div class="card" style="line-height:1.5">${esc(r.gesprek)}</div>` : ""}
        ${r.positief ? `<h2>5. Wat ging opvallend goed</h2><div class="card" style="line-height:1.5">${esc(r.positief)}</div>` : ""}
        ${fotos.length ? `<h2>Foto's</h2><div style="display:flex;gap:10px;flex-wrap:wrap">${fotos.map((w) => `<figure style="margin:0"><img src="${w.foto}" style="width:180px;border-radius:12px"><figcaption class="s">${esc(this.infoVoor(r.code, w.regel_id, w.buiten).ref)}</figcaption></figure>`).join("")}</div>` : ""}
        <h2>Ondertekening</h2>
        <div class="card"><div class="s">Inspecteur: ${esc(r.inspecteur)} · ${new Date(r.opgeslagen).toLocaleString("nl-NL")}</div>
          ${r.handtekening ? `<img src="${r.handtekening}" style="height:90px;margin-top:8px">` : `<div class="s" style="margin-top:8px">Niet ondertekend</div>`}</div>
        ${kz.length ? `<div class="s" style="margin-top:14px;line-height:1.5">Hulp van de app bij deze inspectie: ${kc("voorstel gebruikt")} voorstel(len) gebruikt · ${kc("voorstel aangepast")} aangepast · ${kc("zelf gekozen") + kc("zelf geschreven")} keer zelf gekozen. Elk oordeel (C/A/V) is door de inspecteur zelf gegeven.</div>` : ""}
        ${r.open_punten && r.open_punten.length ? `<div class="s" style="margin-top:6px">Vastgelegd met ${r.open_punten.length} open herinnering(en): ${esc(r.open_punten.join(" "))}</div>` : ""}
      </div>`));
      v.appendChild(el(`<button class="btn primary noprint" style="margin-top:16px" onclick="window.print()">${svg("list", 18)} Opslaan als PDF / printen</button>`));
    },

    // ---------------- ACTIES ----------------
    acties: null, actFilter: null,
    async laadActies() {
      if (this.acties) return this.acties;
      let a = []; try { a = await DB.getAll("acties"); } catch (e) {}
      if (!a.some((x) => x.demo) && !(localStorage.getItem("wpi_demo_acties"))) {   // eenmalig voorbeeldacties (fictief)
        const d = this.demoActies(); try { for (const x of d) await DB.put("acties", x); localStorage.setItem("wpi_demo_acties", "1"); } catch (e) {}
        a = a.concat(d);
      }
      this.acties = a; return a;
    },
    demoActies() {
      const t = "Voorbeeld · Damwand · P26-168", L = (wat) => [{ t: new Date().toISOString(), wie: "Voorbeelddata", wat }];
      const b = (o) => Object.assign({ demo: true, inspectie_titel: t, inspecteur: "Inspecteur (demo)", foto: null, terPlaatse: "niets" }, o);
      return [
        b({ id: "ACT-demo1", ref: "DAM-2.07", oordeel: "A", waarneming: "Gasmeter hing boven aan de ladder, niet bij de man in de put.", tekst: "Gasmeter altijd meenemen naar de man in de put; toolbox gasmeting houden", prio: "kort", status: "In uitvoering", houder: "u-winfred", toetser: "u-bjorn", plandatum: plusDagen(-2), log: L("Ingesteld en gestart") }),
        b({ id: "ACT-demo2", ref: "Algemeen F", oordeel: "V", waarneming: "Afzetting rond de bouwput was aan één zijde weggehaald.", tekst: "Afzetting rond de bouwput rondom herstellen en dagelijks controleren", prio: "kort", status: "Open", houder: "u-douwe", toetser: "u-winfred", plandatum: plusDagen(0), log: L("Ingesteld") }),
        b({ id: "ACT-demo3", ref: "DAM-1.03", oordeel: "A", waarneming: "Hijsband vertoonde een rafelige rand.", tekst: "Hijsband afkeuren en vervangen; hijsmiddelencheck opnemen in de LMRA", prio: "direct", status: "Klaar voor toetsing", houder: "u-winfred", toetser: "u-douwe", plandatum: plusDagen(1), log: L("Klaar voor toetsing gemeld") }),
        b({ id: "ACT-demo4", ref: "Algemeen C", oordeel: "V", waarneming: "Eén monteur droeg geen gehoorbescherming bij het trillen van de damwand.", tekst: "Gehoorbescherming bij trilwerk bespreken in de toolbox en voorraad in de bus aanvullen", prio: "planmatig", status: "Voorstel", houder: null, toetser: null, plandatum: null, log: L("Actievoorstel uit de inspectie") }),
        b({ id: "ACT-demo5", ref: "DAM-3.02", oordeel: "V", waarneming: "Kabels lagen over het looppad naar de keet.", tekst: "Kabels via een kabelbrug of opgehangen langs het looppad leggen", prio: "planmatig", status: "Klaar voor toetsing", houder: "u-douwe", toetser: "u-bjorn", plandatum: plusDagen(6), log: L("Klaar voor toetsing gemeld") }),
      ];
    },
    // bakjes: hoofd ziet het hele team, anderen hun eigen acties
    bakjes() {
      const me = this.user.id, A = this.acties || [], hoofd = this.user.role === "hoofd";
      const loopt = (a) => a.status === "Open" || a.status === "In uitvoering";
      const scope = A.filter((a) => loopt(a) && (hoofd || a.houder === me));
      const opDatum = (x, y) => (x.plandatum || "9").localeCompare(y.plandatum || "9");
      return {
        telaat: A.filter((a) => loopt(a) && a.plandatum && dagenTot(a.plandatum) < 0).sort(opDatum),   // hele team: iedereen krijgt de meldingen
        gepland: scope.filter((a) => !a.plandatum || dagenTot(a.plandatum) >= 0).sort(opDatum),
        toetsen: A.filter((a) => a.status === "Klaar voor toetsing" && a.toetser === me).sort(opDatum),
        instellen: A.filter((a) => a.status === "Voorstel"),   // iedereen mag instellen
        alle: (staf() ? A : A.filter((a) => a.houder === me || a.toetser === me)).slice().sort((x, y) => (x.status === "Afgerond") - (y.status === "Afgerond") || opDatum(x, y)),
      };
    },
    // ---- meldingen over plandata: 1× een week vooraf, daarna na verstrijken elke 2 dagen; voor iedereen ----
    meldingen() {
      const uit = [];
      (this.acties || []).filter((a) => (a.status === "Open" || a.status === "In uitvoering") && a.plandatum).forEach((a) => {
        const d = dagenTot(a.plandatum);
        if (d < 0) {
          const k = Math.floor((-d - 1) / 2);   // dag 1, 3, 5 … na de plandatum telt als nieuwe melding
          uit.push({ id: a.id + ":laat:" + k, actie: a.id, soort: "laat", d, titel: "Te laat: " + kort(a.tekst, 70),
            tekst: `Plandatum ${dagLabel(a.plandatum)} is ${-d} dag${-d === 1 ? "" : "en"} verstreken · actiehouder ${naam(a.houder)}` });
        } else if (d <= 7) {
          uit.push({ id: a.id + ":week", actie: a.id, soort: "week", d, titel: (d === 0 ? "Vandaag" : "Over " + d + " dag" + (d === 1 ? "" : "en")) + ": " + kort(a.tekst, 70),
            tekst: `Plandatum ${dagLabel(a.plandatum)} · actiehouder ${naam(a.houder)}` });
        }
      });
      return uit.sort((x, y) => x.d - y.d);
    },
    _set(k) { try { return new Set(JSON.parse(localStorage.getItem(k + "_" + this.user.id) || "[]")); } catch (e) { return new Set(); } },
    _bewaarSet(k, set) { try { localStorage.setItem(k + "_" + this.user.id, JSON.stringify([...set].slice(-400))); } catch (e) {} },
    async checkMeldingen() {
      if (!this.user) return;
      await this.laadActies(); if (!this.user) return;
      const M = this.meldingen(), gelezen = this._set("wpi_gelezen"), getoond = this._set("wpi_getoond");
      const ongelezen = M.filter((m) => !gelezen.has(m.id));
      const nr = $("belnr"); if (nr) { nr.textContent = ongelezen.length; nr.classList.toggle("hidden", !ongelezen.length); }
      // vaste alert in beeld zolang er acties over de plandatum zijn (niet tijdens het inspecteren)
      const laat = M.filter((m) => m.soort === "laat"), al = $("alert");
      if (al) {
        al.classList.toggle("hidden", !laat.length || this._page === "inspectie" || this._page === "vandaag" || !location.hash || location.hash === "#/");
        al.innerHTML = laat.length ? `${svg("warn", 16)}<span class="al-t">${laat.length} actie${laat.length === 1 ? "" : "s"} over de plandatum</span><b>Bekijk ›</b>` : "";
      }
      // meldingen van het toestel (als toegestaan) voor alles wat nog niet getoond is
      let nieuw = false;
      for (const m of ongelezen) { if (getoond.has(m.id)) continue; if (await this.systeemMelding(m)) { getoond.add(m.id); nieuw = true; } }
      if (nieuw) this._bewaarSet("wpi_getoond", getoond);
    },
    async systeemMelding(m) {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return false;
        const opt = { body: m.tekst, icon: "icon-192.png", badge: "icon-192.png", tag: m.id, data: { hash: "#/acties" } };
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg) await reg.showNotification(m.titel, opt); else new Notification(m.titel, opt);
        return true;
      } catch (e) { return false; }
    },
    async meldingenAan() {
      try { const r = await Notification.requestPermission(); if (r === "granted") { this._bewaarSet("wpi_getoond", new Set()); await this.checkMeldingen(); } } catch (e) {}
      this.openMeldingen();
    },
    async openMeldingen() {
      await this.laadActies();
      const M = this.meldingen(), gelezen = this._set("wpi_gelezen");
      const perm = !("Notification" in window) ? "nee" : Notification.permission;
      const permHtml = perm === "granted" ? `<div class="s" style="margin-top:12px">✓ Meldingen op dit toestel staan aan.</div>`
        : perm === "denied" ? `<div class="hint" style="margin-top:12px">Meldingen zijn op dit toestel geblokkeerd. Zet ze aan in de instellingen van je browser. In de app zie je ze altijd hier.</div>`
        : perm === "nee" ? `<div class="s" style="margin-top:12px">Dit toestel ondersteunt geen meldingen in deze weergave; je ziet ze altijd hier en in de rode balk.</div>`
        : `<button class="btn primary" style="margin-top:14px" onclick="App.meldingenAan()">${svg("bell", 18)} Meldingen op dit toestel aanzetten</button>`;
      this.openModal("Meldingen", "Een week vóór de plandatum één keer; daarna elke 2 dagen zolang de actie te laat is. Iedereen krijgt ze.",
        (M.length ? `<div class="listcard">${M.map((m) => `<div class="row" style="cursor:pointer" onclick="App.leesMelding('${m.id}','${m.actie}')">
            <span style="width:10px;height:10px;border-radius:50%;flex:none;background:${gelezen.has(m.id) ? "transparent" : m.soort === "laat" ? "var(--red)" : "var(--amber)"}"></span>
            <span class="grow"><span class="t" style="${gelezen.has(m.id) ? "font-weight:500" : ""}">${esc(m.titel)}</span><div class="s">${esc(m.tekst)}</div></span>
            <span class="badge ${m.soort === "laat" ? "b-A" : "b-V"}">${m.soort === "laat" ? "te laat" : "binnen 7 d"}</span></div>`).join("")}</div>
            <button class="btn ghost sm" style="margin-top:10px" onclick="App.allesGelezen()">Alles gelezen</button>`
          : `<div class="s">Geen meldingen. Alle acties liggen op schema.</div>`) + permHtml);
    },
    leesMelding(mid, aid) { const g = this._set("wpi_gelezen"); g.add(mid); this._bewaarSet("wpi_gelezen", g); this.checkMeldingen(); this.openActie(aid); },
    allesGelezen() { const g = this._set("wpi_gelezen"); this.meldingen().forEach((m) => g.add(m.id)); this._bewaarSet("wpi_gelezen", g); this.checkMeldingen(); this.openMeldingen(); },
    async view_acties() {
      await this.laadActies();
      const v = $("view"), B = this.bakjes(), hoofd = this.user.role === "hoofd";
      const tabs = [["telaat", "Te laat"], ["gepland", "Gepland"], ["toetsen", "Te toetsen"], ["instellen", "In te stellen"], ["alle", "Alle"]];
      if (!this.actFilter) this.actFilter = B.telaat.length ? "telaat" : B.toetsen.length ? "toetsen" : B.instellen.length ? "instellen" : "gepland";
      v.appendChild(el(`<div><div class="hi">${hoofd ? "Het hele team" : "Jouw acties"}</div><h1 class="groot">Acties</h1></div>`));
      v.appendChild(el(`<div class="tabs">${tabs.map(([k, l]) => `<button class="tabp${this.actFilter === k ? " on" : ""}${k === "telaat" && B.telaat.length ? " warm" : ""}" onclick="App.actFilter='${k}';App.route()">${l}<span>${B[k].length}</span></button>`).join("")}</div>`));
      const uitleg = { telaat: "Van het hele team. Iedereen krijgt hier elke 2 dagen een melding over.", gepland: "Op volgorde van plandatum.", toetsen: "Klaar gemeld door de actiehouder. Alleen jij als toetser kunt afronden.", instellen: "Voorstellen uit inspecties. Iedereen mag ze instellen.", alle: "" }[this.actFilter];
      if (uitleg) v.appendChild(el(`<div class="s uitleg">${uitleg}</div>`));
      const LEEG = { telaat: ["🌿", "Niets te laat", "Alle acties liggen op schema."], gepland: ["📅", "Niets gepland", "Er staan geen lopende acties op jouw naam."], toetsen: ["✅", "Niets te toetsen", "Er wacht niets op jouw toetsing."], instellen: ["✨", "Alles ingesteld", "Er staan geen voorstellen uit inspecties klaar."], alle: ["📋", "Nog geen acties", ""] }[this.actFilter];
      const lijst = B[this.actFilter] || [];
      if (!isWeb()) v.appendChild(el(`<button class="btn primary" style="margin:0 0 14px" onclick="App.nieuweActie()">${svg("plus", 18)} Nieuwe actie</button>`));
      if (isWeb() && lijst.length) { v.appendChild(el(this.actieTabel(lijst))); return; }
      v.appendChild(el(lijst.length ? `<div class="akaarten">${lijst.map((a) => this.actieKaart(a)).join("")}</div>`
        : `<div class="leeg"><span class="bol">${LEEG[0]}</span><div class="t">${LEEG[1]}</div><div class="s">${LEEG[2]}</div></div>`));
    },
    actieKaart(a) {
      const d = a.plandatum ? dagenTot(a.plandatum) : null, loopt = a.status === "Open" || a.status === "In uitvoering";
      const plan = !a.plandatum ? `<span class="dchip">nog geen plandatum</span>`
        : loopt && d < 0 ? `<span class="dchip warm">${-d} dag${d === -1 ? "" : "en"} te laat</span>`
        : loopt && d === 0 ? `<span class="dchip warm">vandaag</span>` : `<span class="dchip">📅 ${dagLabel(a.plandatum)}</span>`;
      const h = a.houder ? USERS.find((u) => u.id === a.houder) : null;
      return `<button class="akaart" onclick="App.openActie('${a.id}')">
        <div class="boven">${stBadge(a.status)}${plan}</div>
        <div class="titel">${esc(kort(a.tekst || "(geen tekst)", 110))}</div>
        <div class="onder"><span class="mini-av">${h ? esc(h.full_name[0]) : "?"}</span><span>${h ? esc(h.full_name) : "nog geen actiehouder"}</span><span class="dot">·</span><span>${esc(a.ref || "")}</span>${a.demo ? `<span class="dot">·</span><span>voorbeeld</span>` : ""}</div></button>`;
    },
    actieRij(a) { return this.actieKaart(a); },
    // computer: overzicht als tabel
    actieTabel(lijst) {
      const plan = (a) => { const d = a.plandatum ? dagenTot(a.plandatum) : null, loopt = a.status === "Open" || a.status === "In uitvoering";
        return !a.plandatum ? `<span class="s">–</span>` : loopt && d < 0 ? `<span class="dchip warm">${-d} d te laat</span>` : loopt && d === 0 ? `<span class="dchip warm">vandaag</span>` : dagLabel(a.plandatum); };
      const persoon = (id) => { const u = USERS.find((x) => x.id === id); return u ? `<span class="pers"><span class="mini-av">${esc(u.full_name[0])}</span>${esc(u.full_name)}</span>` : `<span class="s">–</span>`; };
      return `<div class="card tabelkaart"><div class="tablewrap"><table class="atabel"><thead><tr><th>Status</th><th>Actie</th><th>Actiehouder</th><th>Toetser</th><th>Plandatum</th><th>Herkomst</th></tr></thead><tbody>
        ${lijst.map((a) => `<tr onclick="App.openActie('${a.id}')"><td>${stBadge(a.status)}</td><td><div class="at">${esc(kort(a.tekst || "", 120))}</div><div class="s">${esc(a.ref || "")} · oordeel ${esc(a.oordeel || "–")}</div></td>
          <td>${persoon(a.houder)}</td><td>${persoon(a.toetser)}</td><td>${plan(a)}</td><td class="s">${esc(a.handmatig ? "Handmatig" : (a.inspectie_titel || "").replace(/^Voorbeeld · /, "").split(" · ")[0])}${a.demo ? " · voorbeeld" : ""}</td></tr>`).join("")}
      </tbody></table></div></div>`;
    },
    // telefoon: zelf een actie aanmaken (los van een inspectie)
    nieuweActie() {
      const opts = `<option value="">Kies…</option>` + USERS.filter((u) => u.role !== "qhse").map((u) => `<option value="${u.id}">${esc(u.full_name)} · ${esc(u.functie)}</option>`).join("");
      const veld = (lab, inner) => `<label class="flab">${lab}</label>${inner}`;
      this.openModal("Nieuwe actie", "Bijvoorbeeld uit een melding, toolbox of overleg.",
        `${veld("Wat moet er gebeuren?", `<textarea id="na-tekst" class="fin" rows="3" placeholder="Bijv. hijsbanden in de bus vervangen"></textarea>`)}
         ${veld("Aanleiding (optioneel)", `<textarea id="na-aanl" class="fin" rows="2" placeholder="Wat zag of hoorde je?"></textarea>`)}
         ${veld("Actiehouder", `<select id="ai-houder" class="fin">${opts}</select>`)}
         ${veld("Toetser (niet de actiehouder)", `<select id="ai-toetser" class="fin">${opts}</select>`)}
         ${veld("Plandatum", `<input type="date" id="ai-plan" class="fin" value="${plusDagen(14)}">`)}
         <div id="ai-fout" class="fout"></div>
         <button class="btn primary" style="margin-top:10px" onclick="App.maakActie()">Actie aanmaken</button>`);
    },
    async maakActie() {
      const tekst = $("na-tekst").value.trim(), houder = $("ai-houder").value, toetser = $("ai-toetser").value, plan = $("ai-plan").value;
      if (!tekst) return this.fout("Beschrijf wat er moet gebeuren.");
      if (!houder || !toetser) return this.fout("Kies een actiehouder én een toetser.");
      if (houder === toetser) return this.fout("De toetser mag niet de actiehouder zijn.");
      if (!plan) return this.fout("Kies een plandatum.");
      await this.laadActies();
      const a = { id: "ACT-" + Date.now(), handmatig: true, inspectie_titel: "Handmatig aangemaakt", ref: "Handmatig", oordeel: "–", waarneming: $("na-aanl").value.trim(),
        foto: null, tekst, prio: null, status: "Open", houder, toetser, plandatum: plan, log: [] };
      this.acties.push(a);
      await this.bewaarActie(a, `Handmatig aangemaakt: actiehouder ${naam(houder)}, toetser ${naam(toetser)}, plandatum ${dagLabel(plan)}`);
      tril(30); this.closeModal(); this.actFilter = "gepland"; this.route();
    },
    openActie(id) {
      const a = (this.acties || []).find((x) => x.id === id); if (!a) return;
      const me = this.user.id, isHouder = a.houder === me, isToetser = a.toetser === me;
      const opts = (sel, uitsluit) => `<option value="">Kies…</option>` + USERS.filter((u) => u.role !== "qhse" && u.id !== uitsluit).map((u) => `<option value="${u.id}"${sel === u.id ? " selected" : ""}>${esc(u.full_name)} · ${esc(u.functie)}</option>`).join("");
      const veld = (lab, inner) => `<label class="flab">${lab}</label>${inner}`;
      let h = `<div class="s" style="font-weight:600">${esc(a.inspectie_titel || "")} · ${esc(a.ref || "")} · oordeel ${esc(a.oordeel || "–")}${a.inspecteur ? " · gezien door " + esc(a.inspecteur) : ""}</div>
        <div style="margin:8px 0 14px;display:flex;gap:10px;align-items:flex-start"><span class="lbl jij">Waarneming</span><div style="flex:1;line-height:1.45">“${esc(a.waarneming || "")}”</div>${a.foto ? `<img src="${a.foto}" alt="foto" style="height:64px;border-radius:10px">` : ""}</div>`;
      if (a.status === "Voorstel") {
        {
          h += `<div class="vskop" style="margin-bottom:6px"><span class="lbl vs">Voorstel uit de inspectie</span><span class="s">· pas aan en stel in</span></div>
            <textarea id="ai-tekst" class="fin" rows="3">${esc(a.tekst || "")}</textarea>
            <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:6px">
              <div>${veld("Actiehouder", `<select id="ai-houder" class="fin">${opts(null)}</select>`)}</div>
              <div>${veld("Toetser (niet de actiehouder)", `<select id="ai-toetser" class="fin">${opts(null)}</select>`)}</div>
              <div>${veld("Plandatum", `<input type="date" id="ai-plan" class="fin" value="${plusDagen((PRIO[a.prio] || PRIO.kort).d)}">`)}</div></div>
            <div class="s" style="margin-top:6px">De inspecteur vond het: <b>${esc((PRIO[a.prio] || {}).lab || "–")}</b>. De plandatum staat daarop voorgesteld; pas gerust aan.</div>
            <div id="ai-fout" class="fout"></div>
            <button class="btn primary" style="margin-top:12px" onclick="App.stelIn('${a.id}')">Actie instellen</button>
            <details style="margin-top:12px"><summary class="s" style="cursor:pointer;font-weight:600">Geen actie nodig?</summary>
              <textarea id="ai-reden" class="fin" rows="2" placeholder="Reden, bijv. al opgelost via trendactie T-04"></textarea>
              <button class="btn ghost sm" style="margin-top:8px" onclick="App.vervalVoorstel('${a.id}')">Voorstel laten vervallen</button></details>`;
        }
      } else {
        h += `<div class="card" style="background:var(--mist);box-shadow:none;margin-bottom:12px"><div class="t" style="font-size:16px">${esc(a.tekst)}</div>
          <div class="s" style="margin-top:6px;line-height:1.7">${stBadge(a.status)} · actiehouder <b>${esc(naam(a.houder))}</b> · toetser <b>${esc(naam(a.toetser))}</b> · plandatum <b>${dagLabel(a.plandatum)}</b></div></div>`;
        if (a.nafoto) h += `<div class="s" style="font-weight:600;margin-bottom:4px">Na-foto (na uitvoering)</div><div style="display:flex;gap:10px;margin-bottom:12px">${a.foto ? `<figure style="margin:0"><img src="${a.foto}" style="height:110px;border-radius:10px"><figcaption class="s">voor</figcaption></figure>` : ""}<figure style="margin:0"><img src="${a.nafoto}" style="height:110px;border-radius:10px"><figcaption class="s">na</figcaption></figure></div>`;
        if ((a.status === "Open" || a.status === "In uitvoering") && (isHouder || staf())) {
          if (a.status === "Open") h += `<button class="btn ghost" style="width:100%;margin-bottom:10px" onclick="App.zetStatus('${a.id}','In uitvoering','Uitvoering gestart')">Start uitvoering</button>`;
          h += `<button class="btn primary" onclick="App.naFoto('${a.id}')">${svg("cam", 18)} Klaar · na-foto maken</button>
            <button class="btn ghost" style="width:100%;margin-top:10px" onclick="App.zetStatus('${a.id}','Klaar voor toetsing','Klaar voor toetsing gemeld (zonder na-foto)')">Klaar voor toetsing, zonder foto</button>`;
        }
        if (a.status === "Klaar voor toetsing") {
          if (isToetser) h += `<button class="btn primary" onclick="App.akkoord('${a.id}')">${svg("check", 18)} Akkoord na toetsing · afronden</button>
            <textarea id="ai-reden" class="fin" rows="2" style="margin-top:12px" placeholder="Reden bij niet akkoord"></textarea><div id="ai-fout" class="fout"></div>
            <button class="btn danger" style="width:100%;margin-top:8px" onclick="App.nietAkkoord('${a.id}')">Niet akkoord · terug naar actiehouder</button>`;
          else h += `<div class="hint">Wacht op toetsing door <b>${esc(naam(a.toetser))}</b>. Alleen de toetser kan afronden.</div>`;
        }
        if (staf() && (a.status === "Open" || a.status === "In uitvoering" || a.status === "Klaar voor toetsing")) {
          h += `<details style="margin-top:14px"><summary class="s" style="cursor:pointer;font-weight:600">Plandatum wijzigen</summary>
            <div style="display:flex;gap:8px;margin-top:8px"><input type="date" id="ai-plan2" class="fin" style="flex:1" value="${a.plandatum || ""}"><button class="btn ghost sm" onclick="App.wijzigPlan('${a.id}')">Opslaan</button></div></details>`;
        }
      }
      h += `<div class="s" style="font-weight:700;margin:18px 0 4px">Verloop</div><div class="tijdlijn">${(a.log || []).slice().reverse().map((l) => `<div><span>${new Date(l.t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> ${esc(l.wie)} · ${esc(l.wat)}</div>`).join("")}</div>`;
      this.openModal(kort(a.tekst || "Actie", 60), a.demo ? "Voorbeeldactie (fictief)" : "", h);
    },
    async bewaarActie(a, wat) {
      a.log = (a.log || []).concat([{ t: new Date().toISOString(), wie: this.user.full_name, wat }]);
      try { await DB.put("acties", a); } catch (e) { alert("Opslaan mislukt op dit toestel."); }
      this.checkMeldingen();
    },
    fout(t) { const f = $("ai-fout"); if (f) f.textContent = t; tril([40, 40, 40]); },
    async stelIn(id) {
      const a = this.acties.find((x) => x.id === id); if (!a) return;
      const tekst = $("ai-tekst").value.trim(), houder = $("ai-houder").value, toetser = $("ai-toetser").value, plan = $("ai-plan").value;
      if (!tekst) return this.fout("Vul de actietekst in.");
      if (!houder || !toetser) return this.fout("Kies een actiehouder én een toetser.");
      if (houder === toetser) return this.fout("De toetser mag niet de actiehouder zijn.");
      if ((USERS.find((u) => u.id === houder) || {}).role === "qhse") return this.fout("De QHSE-manager kan geen actiehouder zijn.");
      if (!plan) return this.fout("Kies een plandatum.");
      const aangepast = tekst !== a.tekst; Object.assign(a, { tekst, houder, toetser, plandatum: plan, status: "Open" });
      await this.bewaarActie(a, `Ingesteld${aangepast ? " (tekst aangepast)" : ""}: actiehouder ${naam(houder)}, toetser ${naam(toetser)}, plandatum ${dagLabel(plan)}`);
      tril(30); this.closeModal(); this.route();
    },
    async vervalVoorstel(id) {
      const a = this.acties.find((x) => x.id === id), r = ($("ai-reden") || {}).value || "";
      if (!r.trim()) { const f = $("ai-reden"); if (f) { f.focus(); f.placeholder = "Reden is verplicht"; } return; }
      a.status = "Vervallen"; await this.bewaarActie(a, "Voorstel vervallen: " + r.trim()); this.closeModal(); this.route();
    },
    async zetStatus(id, st, wat) { const a = this.acties.find((x) => x.id === id); a.status = st; await this.bewaarActie(a, wat); tril(25); this.closeModal(); this.route(); },
    naFoto(id) {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
      inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; const d = await fotoDataURL(f); const a = this.acties.find((x) => x.id === id); if (!d || !a) return;
        a.nafoto = d; a.status = "Klaar voor toetsing"; await this.bewaarActie(a, "Klaar voor toetsing gemeld, met na-foto"); tril(25); this.closeModal(); this.route(); };
      inp.click();
    },
    async akkoord(id) {
      const a = this.acties.find((x) => x.id === id); if (!a || a.toetser !== this.user.id) return;
      if (a.houder === a.toetser) return this.fout("Toetser en actiehouder zijn dezelfde persoon; afronden kan niet.");
      a.status = "Afgerond"; await this.bewaarActie(a, "Getoetst en akkoord · afgerond"); tril([30, 50, 30]); this.closeModal(); this.route();
    },
    async nietAkkoord(id) {
      const a = this.acties.find((x) => x.id === id), r = ($("ai-reden") || {}).value || ""; if (!a || a.toetser !== this.user.id) return;
      if (!r.trim()) return this.fout("Geef een reden, zodat de actiehouder weet wat er nog moet gebeuren.");
      a.status = "In uitvoering"; await this.bewaarActie(a, "Niet akkoord na toetsing: " + r.trim()); this.closeModal(); this.route();
    },
    async wijzigPlan(id) {
      const a = this.acties.find((x) => x.id === id), v = ($("ai-plan2") || {}).value; if (!a || !v) return;
      const oud = a.plandatum; a.plandatum = v; await this.bewaarActie(a, `Plandatum gewijzigd van ${dagLabel(oud)} naar ${dagLabel(v)}`); this.closeModal(); this.route();
    },
    exportCSV() {
      const t = this.data.trendacties;
      const cols = ["nr", "onderwerp", "actiehouder", "toetser", "termijn", "status"];
      const q = (s) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
      const csv = [cols.join(";")].concat(t.map((a) => cols.map((c) => q(a[c])).join(";"))).join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "trendacties.csv"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    // ---------------- DASHBOARD ----------------
    dashFilter: { product: "", locatie: "", periode: "", klasse: "" },
    computeDash() {
      const f = this.dashFilter, vd = this.data.voorbeelddata, wmap = {};
      vd.wpis.forEach((w) => (wmap[w.nr] = w));
      const perMatch = (m) => {
        if (!f.periode) return true;
        if (f.periode[0] === "Q") return ({ Q2: ["05", "06"], Q3: ["07", "08", "09"], Q4: ["10", "11"] }[f.periode] || []).includes(m.slice(5, 7));
        return m === f.periode;
      };
      const regels = vd.regels.filter((r) => {
        const w = wmap[r.wpi] || {}, m = (r.datum || "").slice(0, 7);
        return perMatch(m) && (!f.product || w.product === f.product) && (!f.locatie || w.locatie === f.locatie) && (!f.klasse || r.classificatie === f.klasse);
      });
      const oordeel = { Conform: 0, Afwijking: 0, Verbeterpunt: 0, "Niet van toepassing": 0 };
      const waarn = { totaal: 0, TRA: 0, Algemeen: 0 }, klasse = {}, om = {}, mset = new Set(), wset = new Set();
      regels.forEach((r) => {
        const o = r.oordeel; if (oordeel[o] !== undefined) oordeel[o]++;
        waarn.totaal++;
        if (/lgemeen/.test(r.soort || "")) waarn.Algemeen++; else if (r.soort === "TRA") waarn.TRA++;
        const k = r.classificatie || "—"; (klasse[k] = klasse[k] || { Afwijking: 0, Verbeterpunt: 0, Conform: 0, tot: 0});
        if (oordeel[o] !== undefined && klasse[k][o] !== undefined) klasse[k][o]++; klasse[k].tot++;
        const m = (r.datum || "").slice(0, 7); mset.add(m); (om[m] = om[m] || {}); om[m][o] = (om[m][o] || 0) + 1; wset.add(r.wpi);
      });
      return { oordeel, waarn, klasse, om, maanden: [...mset].sort(), n_wpi: wset.size };
    },
    setFilter(k, val) { this.dashFilter[k] = this.dashFilter[k] === val ? "" : val; this.route(); },
    view_dashboard() {
      const c = this.data.cijfers, D = this.computeDash(), f = this.dashFilter;
      const w = D.waarn, beo = D.oordeel.Conform + D.oordeel.Afwijking + D.oordeel.Verbeterpunt, pct = beo ? Math.round(100 * D.oordeel.Conform / beo) : 0;
      const progPct = Math.round(100 * c.vp_x / c.vp_y), progDoel = 90;
      const v = $("view");
      const prods = [...new Set(this.data.voorbeelddata.wpis.map((x) => x.product))].sort();
      const locs = [...new Set(this.data.voorbeelddata.wpis.map((x) => x.locatie))].sort();
      const sel = (k, opts, lab) => `<select onchange="App.setFilter('${k}',this.value)" style="height:38px;border-radius:12px;border:0;box-shadow:inset 0 0 0 1px var(--line);padding:0 10px;font-size:13px;font-weight:600;background:#fff;color:${f[k] ? "var(--ink)" : "var(--soft)"}">
        <option value=""${f[k] ? "" : " selected"}>${lab}</option>${opts.map((o) => `<option value="${esc(o.v)}"${f[k] === o.v ? " selected" : ""}>${esc(o.l)}</option>`).join("")}</select>`;
      v.appendChild(el(`<div><div class="kicker">Trendanalyse · mei–nov 2026 · peildatum 11-11-2026</div><h1>Dashboard</h1></div>`));
      v.appendChild(el(`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${sel("product", prods.map((p) => ({ v: p, l: p })), "Alle producten")}
        ${sel("locatie", locs.map((p) => ({ v: p, l: p })), "Alle locaties")}
        ${sel("periode", [{ v: "Q2", l: "Q2 (mei–jun)" }, { v: "Q3", l: "Q3 (jul–sep)" }, { v: "Q4", l: "Q4 (okt–nov)" }], "Hele periode")}
        ${f.klasse ? `<button class="chip" onclick="App.setFilter('klasse','${esc(f.klasse).replace(/'/g, "\\'")}')" style="box-shadow:inset 0 0 0 1px var(--line)">klasse: ${esc(f.klasse)} ×</button>` : ""}
      </div>`));
      v.appendChild(el(`<div class="muted" style="margin-bottom:10px;font-size:13px">Filters werken op waarnemingen en oordelen. Tik op een tegel, staaf of klasse voor detail / kruis-filter.</div>`));
      v.appendChild(el(`<div class="grid kpis">
        ${beo >= 5 ? this.tile("sage", pct + "%", "Conform", D.oordeel.Conform + " van " + beo + " beoordeeld", "App.drill('conform')")
          : this.tile("mist", "n = " + beo, "Conform", "te weinig voor een percentage (n < 5)", "App.drill('conform')")}
        ${this.tile("sky", w.totaal, "Waarnemingen", "TRA " + w.TRA + " · onderw. " + w.Algemeen, "App.drill('waarnemingen')")}
        ${this.tile(progPct >= progDoel ? "sage" : "blush", progPct + "%", "Programma", "doel " + progDoel + "% · " + c.vp_x + "/" + c.vp_y, "App.drill('programma')")}
        ${this.tile(c.act_over.length ? "blush" : "mist", c.act_open_n, "Open acties", c.act_over.length + " over termijn", "App.drill('acties')")}
        ${this.tile("lilac", D.n_wpi, "Inspecties", f.product || f.locatie || f.periode ? "in selectie" : c.ingang.ingepland + " ingepland · " + c.ingang.spontaan + " spontaan", "App.drill('inspecties')")}
      </div>`));
      const PAL = this.PAL, leg = (items) => `<div class="legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
      const chartCard = el(`<div class="grid dashgrid" style="gap:14px;margin-top:14px"></div>`);
      chartCard.appendChild(el(`<div class="card grafiek breed"><h3>Hoeveel ziet er goed uit? <span class="sub">% conform per maand</span></h3>${this.chartTrend(D.maanden, D.om)}
        <div class="s" style="margin-top:6px">Een open rondje = minder dan 5 waarnemingen in die maand: te weinig voor een percentage.</div></div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h3>Oordelen per maand</h3>${this.chartOordeel(D.maanden, D.om)}
        ${leg([[PAL.C, "Conform"], [PAL.V, "Verbeterpunt"], [PAL.A, "Afwijking"]])}</div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h3>Verdeling oordelen</h3>${this.chartDonut(D.oordeel)}</div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h3>Inspectieprogramma <span class="sub">verplichte WPI’s per maand</span></h3>${this.chartProg()}
        ${leg([[PAL.C, "Uitgevoerd"], [PAL.A, "Gemist"], ["#E6DCCD", "Loopt nog"]])}</div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h3>Waar zitten de aandachtspunten? <span class="sub">per klasse</span></h3>${this.klasseBars(D.klasse)}
        ${leg([[PAL.A, "Afwijking"], [PAL.V, "Verbeterpunt"]])}</div>`));
      v.appendChild(chartCard);
      v.appendChild(el(`<div class="muted" style="font-size:12.5px;line-height:1.5;margin-top:14px">Klik op een maand, een stuk van de ring of een klasse voor de details. Methode: momentopnames; alleen wat de inspecteur zelf zag telt. Een A betekent “op dat moment niet op orde”, geen oordeel over personen.</div>`));
    },
    // ---------------- KWARTAALRAPPORTAGE (directie, webversie) ----------------
    kwartaal: null,
    KW: { "Q2 2026": ["2026-04", "2026-05", "2026-06"], "Q3 2026": ["2026-07", "2026-08", "2026-09"], "Q4 2026": ["2026-10", "2026-11", "2026-12"] },
    kwCijfers(q) {
      const vd = this.data.voorbeelddata, c = this.data.cijfers, mnd = this.KW[q], inQ = (d) => mnd.includes(String(d || "").slice(0, 7));
      const wpis = vd.wpis.filter((w) => inQ(w.datum)), regels = vd.regels.filter((r) => inQ(r.datum)), acties = vd.acties.filter((a) => inQ(a.datum));
      const o = { Conform: 0, Afwijking: 0, Verbeterpunt: 0, "Niet van toepassing": 0 }; regels.forEach((r) => { if (o[r.oordeel] !== undefined) o[r.oordeel]++; });
      const beo = o.Conform + o.Afwijking + o.Verbeterpunt;
      const prog = mnd.reduce((t, m) => { const d = c.vp_maand[m] || {}; t.ok += d.ok || 0; t.y += d.y || 0; t.lopend += d.lopend || 0; return t; }, { ok: 0, y: 0, lopend: 0 });
      const klasse = {}; regels.forEach((r) => { const k = r.classificatie || "—"; (klasse[k] = klasse[k] || { C: 0, AV: 0 }); if (r.oordeel === "Conform") klasse[k].C++; if (r.oordeel === "Afwijking" || r.oordeel === "Verbeterpunt") klasse[k].AV++; });
      const peil = vd.peildatum || isoDag(new Date());
      const af = acties.filter((a) => a.status === "Afgerond"), optijd = af.filter((a) => a.afgerond_op && a.termijn && a.afgerond_op <= a.termijn);
      const open = acties.filter((a) => a.status !== "Afgerond"), over = open.filter((a) => a.termijn && a.termijn < peil);
      const wset = new Set(wpis.map((w) => w.nr));
      const themas = (c.thema || []).map((t) => ({ ...t, nq: t.wpis.filter((x) => wset.has(x)).length })).filter((t) => t.nq).sort((a, b) => b.nq - a.nq).slice(0, 3);
      const om = {}; regels.forEach((r) => { const m = r.datum.slice(0, 7); (om[m] = om[m] || {}); om[m][r.oordeel] = (om[m][r.oordeel] || 0) + 1; });
      return { q, mnd, wpis, regels, o, beo, pct: beo >= 5 ? Math.round(100 * o.Conform / beo) : null, prog, progPct: prog.y ? Math.round(100 * prog.ok / prog.y) : null,
        klasse, acties, af, optijd, open, over, themas, om, maanden: Object.keys(om).sort(), producten: [...new Set(wpis.map((w) => w.product))] };
    },
    view_kwartaal() {
      const qs = Object.keys(this.KW); if (!this.kwartaal) this.kwartaal = qs[qs.length - 1];
      const K = this.kwCijfers(this.kwartaal), qi = qs.indexOf(this.kwartaal), V = qi > 0 ? this.kwCijfers(qs[qi - 1]) : null, P = this.PAL, v = $("view");
      const delta = (nu, toen, eenheid) => nu == null || toen == null ? "" : nu === toen ? `<span class="delta">= gelijk aan ${V.q}</span>` : `<span class="delta ${nu > toen ? "op" : "neer"}">${nu > toen ? "▲" : "▼"} ${Math.abs(nu - toen)}${eenheid} t.o.v. ${V.q}</span>`;
      const lopend = K.mnd.some((m) => m >= isoDag(new Date()).slice(0, 7));
      v.appendChild(el(`<div class="noprint"><div class="hi">Voor de directie · VCA 7.1 en 7.2</div><h1 class="groot">Kwartaalrapportage</h1>
        <div class="tabs" style="margin-bottom:16px">${qs.map((q) => `<button class="tabp${q === this.kwartaal ? " on" : ""}" onclick="App.kwartaal='${q}';App.route()">${q}</button>`).join("")}
        <button class="tabp" style="margin-left:auto" onclick="window.print()">${svg("doc", 16)} Opslaan als PDF</button></div></div>`));
      const top3 = Object.entries(K.klasse).filter(([, x]) => x.AV).sort((a, b) => b[1].AV - a[1].AV).slice(0, 3);
      const goed = Object.entries(K.klasse).filter(([, x]) => x.C >= 3).sort((a, b) => (b[1].C / (b[1].C + b[1].AV)) - (a[1].C / (a[1].C + a[1].AV)) || b[1].C - a[1].C).slice(0, 3);
      const zin = [];
      zin.push(`In ${K.q} zijn <b>${K.wpis.length} werkplekinspecties</b> uitgevoerd${K.producten.length ? ` bij ${K.producten.length} producten` : ""}, met <b>${K.regels.length} waarnemingen</b>.`);
      if (K.pct != null) zin.push(`<b>${K.pct}%</b> van de beoordeelde waarnemingen was conform${V && V.pct != null ? (K.pct > V.pct ? `, ${K.pct - V.pct} procentpunt hoger dan in ${V.q}` : K.pct < V.pct ? `, ${V.pct - K.pct} procentpunt lager dan in ${V.q}` : `, gelijk aan ${V.q}`) : ""}.`);
      if (K.progPct != null) zin.push(`Van het verplichte inspectieprogramma is <b>${K.prog.ok} van ${K.prog.y}</b> (${K.progPct}%) uitgevoerd${K.progPct < 90 ? "; het doel van 90% is niet gehaald" : "; het doel van 90% is gehaald"}.`);
      if (top3.length) zin.push(`De meeste aandachtspunten zaten bij <b>${esc(top3[0][0].toLowerCase())}</b>${top3[1] ? ` en ${esc(top3[1][0].toLowerCase())}` : ""}.`);
      v.appendChild(el(`<div id="kwrap" class="kwrap">
        <div class="kwkop"><div><div class="hi">Werkplekinspecties · Noardling</div><div class="kwtitel">Kwartaalrapportage ${K.q}</div>
          <div class="s">Peildatum ${esc(this.data.voorbeelddata.peildatum || "")} · ${lopend ? "kwartaal loopt nog" : "afgesloten kwartaal"} · voorbeelddata (fictief)</div></div><span class="logo groot">N</span></div>

        <div class="card kwverhaal"><h3>In het kort</h3><p>${zin.join(" ")}</p></div>

        <div class="grid kpis kwkpis">
          <div class="tile sage"><div class="lab">Conform</div><div class="n">${K.pct != null ? K.pct + "%" : "n=" + K.beo}</div><div class="sub">${delta(K.pct, V && V.pct, " pp")}</div></div>
          <div class="tile ${K.progPct >= 90 ? "sage" : "blush"}"><div class="lab">Programma</div><div class="n">${K.progPct != null ? K.progPct + "%" : "–"}</div><div class="sub">${K.prog.ok}/${K.prog.y} · doel 90% ${delta(K.progPct, V && V.progPct, " pp")}</div></div>
          <div class="tile sky"><div class="lab">Inspecties</div><div class="n">${K.wpis.length}</div><div class="sub">${delta(K.wpis.length, V && V.wpis.length, "")}</div></div>
          <div class="tile ${K.over.length ? "blush" : "sage"}"><div class="lab">Acties op tijd afgerond</div><div class="n">${K.af.length ? Math.round(100 * K.optijd.length / K.af.length) + "%" : "–"}</div><div class="sub">${K.optijd.length} van ${K.af.length} afgerond · ${K.over.length} over termijn</div></div>
        </div>

        <div class="grid dashgrid kwgrid">
          <div class="card grafiek breed"><h3>1 · Hoe ontwikkelt het zich? <span class="sub">% conform per maand</span></h3>${this.chartTrend(K.maanden, K.om)}</div>
          <div class="card"><h3>2 · Wat ging goed</h3>
            <p class="s" style="margin-bottom:10px">${K.o.Conform} conforme waarnemingen. Waar het het beste ging:</p>
            ${goed.length ? goed.map(([k, x]) => `<div class="kwrij"><span class="bolletje" style="background:${P.C}"></span><span class="grow">${esc(k)}</span><b>${Math.round(100 * x.C / (x.C + x.AV))}% conform</b></div>`).join("") : `<div class="s">Te weinig waarnemingen per klasse.</div>`}</div>
          <div class="card"><h3>3 · Waar moet aandacht naartoe</h3>
            ${top3.length ? top3.map(([k, x], i) => `<div class="kwrij"><span class="nr">${i + 1}</span><span class="grow">${esc(k)}</span><b>${x.AV}×</b></div>`).join("") : `<div class="s">Geen afwijkingen of verbeterpunten. 🌿</div>`}
            ${K.themas.length ? `<div class="s" style="margin:12px 0 6px;font-weight:800">Terugkerende thema's</div>${K.themas.map((t) => `<div class="kwthema">“${esc(t.thema)}” <span class="s">· ${t.nq}× dit kwartaal</span></div>`).join("")}` : ""}</div>
          <div class="card"><h3>4 · Acties</h3>
            <div class="kwrij"><span class="grow">Aangemaakt</span><b>${K.acties.length}</b></div>
            <div class="kwrij"><span class="grow">Afgerond na toetsing</span><b>${K.af.length}</b></div>
            <div class="kwrij"><span class="grow">Daarvan op tijd</span><b>${K.optijd.length}</b></div>
            <div class="kwrij"><span class="grow">Nog open</span><b>${K.open.length}</b></div>
            <div class="kwrij"><span class="grow">Over termijn</span><b style="color:${K.over.length ? P.warmInk || "#A3610F" : "inherit"}">${K.over.length}</b></div></div>
          <div class="card"><h3>5 · Wat gaan we doen <span class="sub">trendacties VCA 7.2</span></h3>
            ${this.data.trendacties.slice(0, 5).map((t) => `<div class="kwrij"><span class="grow">${esc(t.onderwerp)}</span>${stBadge(t.status === "Open" ? "Open" : "Afgerond")}</div>`).join("")}
            <div class="s noprint" style="margin-top:8px"><a href="javascript:App.drill('acties')" style="color:var(--accent);font-weight:800">Alle trendacties ›</a></div></div>
        </div>

        <div class="card kwnoot"><h3>Methode</h3><p class="s">Werkplekinspecties zijn momentopnames: alleen wat de inspecteur zelf zag telt (VCA 2026/6.1 eis 7.1). Conform-% is berekend over beoordeelde waarnemingen (C, A, V), zonder ‘niet van toepassing’. Bij minder dan 5 waarnemingen tonen we geen percentage. Een afwijking zegt iets over de situatie op dat moment, niet over personen. Acties zijn pas afgerond na toetsing door een ander dan de actiehouder.</p>
          <div class="kwteken"><div><div class="s">Opgesteld door</div><b>${esc(this.user.full_name)}</b><div class="s">${esc(this.user.functie)}</div></div><div><div class="s">Datum</div><b>${new Date().toLocaleDateString("nl-NL")}</b></div><div><div class="s">Besproken met directie op</div><div class="lijntje"></div></div></div></div>
      </div>`));
    },
    // zachte, warme kleuren die bij de app passen
    PAL: { C: "#6FAF92", V: "#F2BE6B", A: "#EC8C74", N: "#D8CDBE", track: "#F6F0E7", ink: "#2A2622", soft: "#8B7F72" },
    // %-conform per maand als zachte lijn met vlak eronder
    chartTrend(mnd, om) {
      const P = this.PAL, W = 1100, H = 230, L = 44, R = 24, T = 30, Bm = 30, iw = W - L - R, ih = H - T - Bm;
      const pts = mnd.map((m, i) => { const o = om[m] || {}, tot = (o.Conform || 0) + (o.Afwijking || 0) + (o.Verbeterpunt || 0);
        return { m, tot, p: tot ? (o.Conform || 0) / tot : null, x: L + (mnd.length === 1 ? iw / 2 : iw * i / (mnd.length - 1)) }; });
      const y = (p) => T + ih * (1 - p);
      const geldig = pts.filter((q) => q.p !== null);
      let g = `<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.C}" stop-opacity=".35"/><stop offset="1" stop-color="${P.C}" stop-opacity="0"/></linearGradient></defs>`;
      [0, .5, 1].forEach((t) => { g += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="${P.track}" stroke-width="2" stroke-dasharray="${t === 0 ? "" : "4 6"}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="${P.soft}">${t * 100}%</text>`; });
      if (geldig.length > 1) {
        let d = `M${geldig[0].x},${y(geldig[0].p)}`;
        for (let k = 1; k < geldig.length; k++) { const a = geldig[k - 1], b = geldig[k], cx = (a.x + b.x) / 2; d += ` C${cx},${y(a.p)} ${cx},${y(b.p)} ${b.x},${y(b.p)}`; }
        g += `<path d="${d} L${geldig[geldig.length - 1].x},${T + ih} L${geldig[0].x},${T + ih} Z" fill="url(#tg)"/><path d="${d}" fill="none" stroke="${P.C}" stroke-width="4" stroke-linecap="round"/>`;
      }
      pts.forEach((q) => {
        const klein = q.tot < 5, yy = q.p === null ? T + ih : y(q.p);
        g += `<g style="cursor:pointer" onclick="App.drill('oordeelmaand','${q.m}')"><rect x="${q.x - 30}" y="0" width="60" height="${H}" fill="transparent"/>
          <circle cx="${q.x}" cy="${yy}" r="7" fill="${klein ? "#fff" : P.C}" stroke="${klein ? P.N : "#fff"}" stroke-width="3"/>
          ${q.p !== null && !klein ? `<text x="${q.x}" y="${yy - 14}" text-anchor="middle" font-size="13" font-weight="800" fill="${P.ink}">${Math.round(q.p * 100)}%</text>` : `<text x="${q.x}" y="${yy - 14}" text-anchor="middle" font-size="12" fill="${P.soft}">n=${q.tot}</text>`}
          <text x="${q.x}" y="${H - 8}" text-anchor="middle" font-size="13" font-weight="700" fill="${P.soft}">${mlabel(q.m)}</text></g>`;
      });
      return `<svg viewBox="0 0 ${W} ${H}" class="svgchart">${g}</svg>`;
    },
    // gestapelde ronde staven met een zacht spoor erachter
    staven(kol, max, labels, onclickFn) {
      const P = this.PAL, W = 560, H = 230, pad = 8, top = 30, bot = 30, gap = (W - pad * 2) / kol.length, bw = Math.min(42, gap * 0.5), ih = H - top - bot;
      let g = "";
      kol.forEach((segs, i) => {
        const x = pad + gap * i + (gap - bw) / 2; let yb = top + ih, tot = 0, p = "";
        p += `<rect x="${x}" y="${top}" width="${bw}" height="${ih}" rx="${bw / 2}" fill="${P.track}"/>`;
        segs.forEach(([val, col, pat]) => { if (!val) return; tot += val; const h = Math.max(6, val / max * ih); yb -= h;
          p += `<rect x="${x}" y="${yb + 1.5}" width="${bw}" height="${h - 3}" rx="${Math.min(bw / 2, (h - 3) / 2)}" fill="${col}"${pat ? ` stroke="#CFC2B0" stroke-dasharray="3 3"` : ""}/>`; });
        p += `<text x="${x + bw / 2}" y="${yb - 8}" text-anchor="middle" font-size="15" font-weight="800" fill="${P.ink}">${labels[i][0]}</text>`;
        p += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="15" font-weight="700" fill="${P.soft}">${labels[i][1]}</text>`;
        p += `<rect x="${pad + gap * i}" y="0" width="${gap}" height="${H}" fill="transparent"/>`;
        g += `<g style="cursor:pointer" onclick="${onclickFn(i)}">${p}</g>`;
      });
      return `<svg viewBox="0 0 ${W} ${H}" class="svgchart">${g}</svg>`;
    },
    chartOordeel(mnd, om) {
      const P = this.PAL, tot = mnd.map((m) => ["Conform", "Verbeterpunt", "Afwijking"].reduce((a, k) => a + ((om[m] || {})[k] || 0), 0));
      return this.staven(mnd.map((m) => [[(om[m] || {}).Conform, P.C], [(om[m] || {}).Verbeterpunt, P.V], [(om[m] || {}).Afwijking, P.A]]),
        Math.max(...tot, 1), mnd.map((m, i) => [tot[i], mlabel(m)]), (i) => `App.drill('oordeelmaand','${mnd[i]}')`);
    },
    chartProg() {
      const P = this.PAL, c = this.data.cijfers, mnd = c.maanden, vm = c.vp_maand;
      const kol = mnd.map((m) => { const d = vm[m] || {}; return [[d.ok || 0, P.C], [(d.y || 0) - (d.ok || 0), P.A], [d.lopend || 0, "#EFE6D8", true]]; });
      const max = Math.max(...mnd.map((m) => ((vm[m] || {}).y || 0) + ((vm[m] || {}).lopend || 0)), 1);
      return this.staven(kol, max, mnd.map((m) => [((vm[m] || {}).ok || 0) + "/" + ((vm[m] || {}).y || 0), mlabel(m)]), (i) => `App.drill('programma','${mnd[i]}')`);
    },
    // ring met verdeling, conform-% in het midden
    chartDonut(o) {
      const P = this.PAL, d = [["Conform", P.C], ["Verbeterpunt", P.V], ["Afwijking", P.A], ["Niet van toepassing", P.N]].map(([k, c]) => [k, o[k] || 0, c]);
      const tot = d.reduce((a, x) => a + x[1], 0) || 1, R = 70, r = 46, cx = 90, cy = 90;
      let a0 = -Math.PI / 2, g = "";
      d.forEach(([k, val, col]) => {
        if (!val) return; const a1 = a0 + val / tot * Math.PI * 2 - 0.03;
        const pt = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)], big = a1 - a0 > Math.PI ? 1 : 0;
        const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
        g += `<path d="M${x0},${y0} A${R},${R} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${big} 0 ${x3},${y3} Z" fill="${col}" style="cursor:pointer" onclick="App.drill('conform')"/>`;
        a0 = a1 + 0.03;
      });
      const ok = (o.Conform || 0) + (o.Afwijking || 0) + (o.Verbeterpunt || 0), pc = ok >= 5 ? Math.round(100 * (o.Conform || 0) / ok) + "%" : "n=" + ok;
      g += `<text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="26" font-weight="800" fill="${P.ink}">${pc}</text><text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="12" font-weight="700" fill="${P.soft}">conform</text>`;
      return `<div class="donut"><svg viewBox="0 0 180 180" class="svgdonut">${g}</svg><div class="donutleg">${d.map(([k, val, col]) =>
        `<div><i style="background:${col}"></i><span>${k}</span><b>${val}</b></div>`).join("")}</div></div>`;
    },
    klasseBars(kg) {
      const P = this.PAL;
      kg = kg || this.data.cijfers.klasse_gezien;
      const rows = Object.entries(kg).map(([k, v]) => [k, v.Afwijking || 0, v.Verbeterpunt || 0]).filter((r) => r[1] + r[2] > 0).sort((a, b) => (b[1] + b[2]) - (a[1] + a[2])).slice(0, 6);
      if (!rows.length) return `<div class="muted" style="font-size:13px">Geen afwijkingen of verbeterpunten in deze selectie. 🌿</div>`;
      const mx = Math.max(...rows.map((r) => r[1] + r[2]), 1);
      return `<div class="kbars">${rows.map(([k, a, vv]) => `<button class="kbar" onclick="App.setFilter('klasse','${esc(k).replace(/'/g, "\\'")}')">
        <span class="kl">${esc(k)}</span><span class="spoor"><span style="width:${(a / mx * 100).toFixed(1)}%;background:${P.A}"></span><span style="width:${(vv / mx * 100).toFixed(1)}%;background:${P.V}"></span></span><b>${a + vv}</b></button>`).join("")}</div>`;
    },
    drill(key, param) {
      const c = this.data.cijfers, OB = { C: "b-C", A: "b-A", V: "b-V" };
      const bg = (o) => `<span class="badge b-${o[0] === "N" ? "N" : o[0]}">${o[0]} ${0}</span>`;
      const oc = (o) => ["Conform", "Afwijking", "Verbeterpunt", "Niet van toepassing"].filter((k) => o[k]).map((k) =>
        `<span class="badge b-${k === "Niet van toepassing" ? "N" : k[0]}">${k[0]} ${o[k]}</span>`).join(" ") || "—";
      const tbl = (h, rows) => `<table><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      if (key === "conform" || key === "waarnemingen") {
        const o = c.oordeel, w = c.waarnemingen;
        return this.openModal("Waarnemingen en oordelen", "Alle waarnemingen in de periode (momentopname).",
          tbl(["Oordeel", "Aantal"], [["Conform", o.Conform], ["Afwijking", o.Afwijking], ["Verbeterpunt", o.Verbeterpunt], ["Niet van toepassing", o["Niet van toepassing"]]].map((r) => [`<span class="badge b-${r[0] === "Niet van toepassing" ? "N" : r[0][0]}">${esc(r[0])}</span>`, r[1]]))
          + `<div class="muted" style="margin-top:14px;font-size:13px">TRA-regels ${w.TRA} · onderwerpen ${w.Algemeen} · buiten TRA ${w.buiten_TRA} · totaal ${w.totaal}.</div>`);
      }
      if (key === "programma") {
        let rows = c.vp_mis.map((o) => [esc(o.project.replace(" (fictief)", "")), esc(o.product), esc(o.locatie), mlabel(o.maand), esc(o.cat), `<span class="badge b-A">gemist</span>`]);
        let sub = `${c.vp_x} van ${c.vp_y} verplichte WPI’s uitgevoerd; ${c.vp_mis.length} gemist.`;
        if (param) { rows = rows.filter((r) => r[3] === mlabel(param)); sub = `Maand ${mlabel(param)}: gemiste verplichte WPI’s.`; }
        return this.openModal("Gemiste verplichte WPI’s", sub, rows.length ? tbl(["Project", "Product", "Locatie", "Maand", "Soort", ""], rows) : `<div class="muted">Geen gemiste WPI’s in deze selectie.</div>`);
      }
      if (key === "oordeelmaand") {
        const o = c.oordeel_maand[param] || {};
        return this.openModal("Oordelen · " + mlabel(param), "Waarnemingen in deze maand.", `<div style="margin-bottom:6px">${oc(o)}</div>`);
      }
      if (key === "klasse") {
        const v = c.klasse_gezien[param] || {};
        return this.openModal(param, "Waarnemingen in deze klasse.", tbl(["", "Aantal"],
          [["Conform", v.Conform || 0], ["Afwijking", v.Afwijking || 0], ["Verbeterpunt", v.Verbeterpunt || 0], ["Totaal gezien", v.tot || 0]].map((r) => [`<span class="badge b-${r[0] === "Totaal gezien" ? "N" : r[0][0]}">${esc(r[0])}</span>`, r[1]])));
      }
      if (key === "inspecties") {
        const rows = Object.entries(c.per_wpi).sort().map(([nr, w]) => [esc(nr), esc(w.ingang || ""), oc(w.oord || {})]);
        return this.openModal("Inspecties", c.n_wpi + " WPI’s in de periode.", tbl(["WPI", "Ingang", "Oordelen"], rows));
      }
      if (key === "acties") {
        const rows = this.data.trendacties.map((a) => [esc(a.nr), esc(a.onderwerp), esc(a.actiehouder), esc(a.termijn), `<span class="badge ${a.status === "Open" ? "b-V" : "b-done"}">${esc(a.status)}</span>`]);
        return this.openModal("Trendacties (VCA 7.2)", "Acties uit de trendanalyse, met actiehouder en termijn.", `<div class="tablewrap">${tbl(["Nr", "Onderwerp", "Actiehouder", "Termijn", "Status"], rows)}</div>
          <button class="btn ghost sm" style="margin-top:14px" onclick="App.exportCSV()">${svg("list", 16)} Exporteer CSV</button>`);
      }
    },
  };
  window.App = App;
  App.boot();
})();
