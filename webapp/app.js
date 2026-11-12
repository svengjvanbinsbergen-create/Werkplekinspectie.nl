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
  };
  const svg = (n, s = 24, w = 2) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

  // ---- lokale opslag (IndexedDB): inspecties blijven bewaard tot er een backend is ----
  const DB = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((res, rej) => {
        const r = indexedDB.open("wpi", 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("inspecties")) r.result.createObjectStore("inspecties", { keyPath: "id" }); };
        r.onsuccess = () => { this._db = r.result; res(this._db); };
        r.onerror = () => rej(r.error);
      });
    },
    async save(obj) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction("inspecties", "readwrite"); t.objectStore("inspecties").put(obj); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async all() { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction("inspecties").objectStore("inspecties").getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); }); },
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
    { id: "acties", lab: "Acties", ic: "list", rollen: ["hoofd", "coordinator"] },
    { id: "dashboard", lab: "Dashboard", ic: "chart", rollen: ["hoofd", "coordinator"] },
  ];
  const staf = () => App.user && (App.user.role === "hoofd" || App.user.role === "coordinator");

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
  function termijn(prio) {
    const d = new Date(); d.setDate(d.getDate() + (prio === "direct" ? 0 : prio === "kort" ? 14 : 56));
    return d.toLocaleDateString("nl-NL");
  }

  const App = {
    data: {}, state: { inspectie: null, extra: [] }, user: null,
    caps: { dictation: null, sample: null }, micKey: null, _dictKey: null, _rec: null,

    async boot() {
      const names = ["cijfers", "kennisbank", "voorbeelddata", "trendacties"];
      const got = await Promise.all(names.map((n) => fetch("data/" + n + ".json").then((r) => r.json())));
      names.forEach((n, i) => (this.data[n] = got[i]));
      try { const u = JSON.parse(localStorage.getItem("wpi_user") || "null"); if (u) this.user = USERS.find((x) => x.id === u.id) || null; } catch (e) {}
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
      this.route();
    },

    login(id) { this.user = USERS.find((u) => u.id === id); try { localStorage.setItem("wpi_user", JSON.stringify({ id })); } catch (e) {} this.go("vandaag"); this.route(); },
    logout() { this.user = null; try { localStorage.removeItem("wpi_user"); } catch (e) {} this.route(); },
    renderAcct() {
      if (!this.user) { $("acct").innerHTML = `<span class="chip">Voorbeeld · fictief</span>`; return; }
      $("acct").innerHTML = `<div style="display:flex;gap:8px;align-items:center">
        <button class="chip" onclick="App.openSearch()" title="Zoeken" aria-label="Zoeken" style="width:40px;justify-content:center;padding:0">${svg("list", 18)}</button>
        <button class="chip" onclick="App.logout()" title="Uitloggen">${esc(this.user.full_name.split(" ")[0] === ROL[this.user.role] ? ROL[this.user.role] : this.user.full_name.split(" ")[0] + " · " + ROL[this.user.role])} ×</button></div>`;
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
      s.trend.filter((t) => (t.nr + " " + t.onderwerp).toLowerCase().includes(q)).slice(0, 5).forEach((t) => hit.push(["Trendactie", t.nr + " · " + t.onderwerp, ""]));
      s.saved.filter((r) => (r.titel + " " + r.taak + " " + r.inspecteur).toLowerCase().includes(q)).slice(0, 5).forEach((r) => hit.push(["Inspectie", r.titel + " · " + r.taak, "#/rapport/" + r.id]));
      out.innerHTML = hit.length ? `<div class="listcard">${hit.map(([k, lab, href]) =>
        `<div class="row"${href ? ` style="cursor:pointer" onclick="App.closeModal();location.hash='${href}'"` : ""}><span class="grow"><span class="t">${esc(lab)}</span><div class="s">${k}</div></span>${href ? svg("chev", 16) : ""}</div>`).join("")}</div>`
        : `<div class="s">Niets gevonden voor “${esc(q)}”.</div>`;
    },

    go(h) { location.hash = "#/" + h; },
    route() {
      this.renderAcct();
      if (!this.user) { $("tabbar").classList.add("hidden"); $("view").innerHTML = ""; return this.view_login(); }
      $("tabbar").classList.remove("hidden");
      let parts = (location.hash.replace(/^#\/?/, "") || "vandaag").split("/");
      let page = parts[0];
      const tab = TABS.find((t) => t.id === page);
      if (tab && !tab.rollen.includes(this.user.role)) { return this.go("vandaag"); }  // geen toegang
      this.renderTabs(page);
      $("tabbar").classList.toggle("hidden", page === "inspectie");   // focus tijdens de inspectie
      const fn = this["view_" + page];
      $("view").innerHTML = "";
      if (fn) fn.call(this, parts.slice(1));
      else this.view_vandaag();
      window.scrollTo(0, 0);
    },
    renderTabs(active) {
      $("tabbar").innerHTML = TABS.filter((t) => t.rollen.includes(this.user.role)).map((t) =>
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
    view_vandaag() {
      const c = this.data.cijfers;
      const v = $("view");
      const vn = this.user.full_name.split(" ")[0];
      v.appendChild(el(`<div><div class="kicker">Woensdag 11 november 2026 · ${esc(ROL[this.user.role])}</div><h1>Hallo ${esc(vn)}</h1></div>`));
      if (staf()) {
        v.appendChild(el(`<div class="grid kpis">
          ${this.tile("sage", c.vp_x + " / " + c.vp_y, "Per werkplek", c.vp_mis.length + " gemist", "App.go('dashboard')")}
          ${this.tile("sky", c.n_wpi, "Inspecties", c.ingang.ingepland + " ingepland · " + c.ingang.spontaan + " spontaan", "App.go('inspecties')")}
          ${this.tile("blush", c.act_open_n, "Open acties", c.act_over.length + " over termijn", "App.go('acties')")}
        </div>`));
      } else {
        const eigen = this.state.extra.length;
        v.appendChild(el(`<div class="grid kpis">
          ${this.tile("sky", eigen, "Mijn inspecties", eigen ? "vandaag vastgelegd" : "nog geen vandaag", "App.go('inspecties')")}
          ${this.tile("sage", "1", "Ingepland", "Damwand · P26-168")}
        </div>`));
      }
      const lo = this.state.inspectie;
      if (lo) {
        const n = lo.waarnemingen.length;
        v.appendChild(el(`<h2>Lopende inspectie</h2>`));
        v.appendChild(el(`<div class="card" style="background:var(--lilac);box-shadow:none"><div class="row" style="border:0">
          <div class="grow"><div class="t" style="font-size:17px">${esc(lo.titel)}</div><div class="s">${n} waarneming${n === 1 ? "" : "en"}${lo.taak ? " · " + esc(lo.taak) : ""}</div></div></div>
          <button class="btn primary" onclick="App.goIns()">Verder met de inspectie</button></div>`));
      }
      v.appendChild(el(`<h2>Ingepland vandaag</h2>`));
      const card = el(`<div class="card"><div class="row" style="border:0">
        <div class="grow"><div class="s">P26-168 · RWZI Voorbeeldstad · 2 monteurs</div><div class="t" style="font-size:19px;margin-top:2px">Damwand</div></div>
        <span class="badge b-todo">Ingepland</span></div>
        <button class="btn primary" style="margin-top:10px" onclick="App.startInspectie('DAM','P26-168','Damwand · RWZI Voorbeeldstad')">${svg("check", 18)} Start inspectie</button>
        </div>`);
      v.appendChild(card);
      v.appendChild(el(`<h2>Of spontaan</h2>`));
      v.appendChild(el(`<input id="zoek" placeholder="Zoek product…" oninput="App.filterProd(this.value)" autocomplete="off" style="width:100%;height:46px;border-radius:14px;border:0;box-shadow:inset 0 0 0 1px var(--line);padding:0 16px;font-size:15px;margin-bottom:8px;background:#fff">`));
      v.appendChild(el(`<div class="listcard" id="prodlist">${this.productKeuzeRows()}</div>`));
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
    startInspectie(code, project, titel) {
      this.stopMic();
      this.state.inspectie = { code, project, titel, taak: null, taken: [], stap: "taak", taakTekst: "",
        waarnemingen: [], cur: null, voorstel: null, laatste: null, gesprek: "", positief: "", handtekening: null,
        start: new Date().toISOString() };
      this.goIns();
    },
    goIns() { if (location.hash === "#/inspectie") this.route(); else this.go("inspectie"); },
    stap(s) { this.stopMic(); const ins = this.state.inspectie; if (!ins) return; ins.stap = s; this.goIns(); window.scrollTo(0, 0); },
    nieuweWaarneming(onderwerp) {
      const ins = this.state.inspectie;
      ins.cur = { id: "w" + Date.now(), taak: ins.taak, tekst: "", foto: null, regel_id: null, onderwerp: onderwerp || null,
        buiten: false, direct: false, maatregelen: [], oordeel: null, vraag: "",
        actie: { tekst: "", herkomst: "", prio: null, terPlaatse: "niets" } };
      ins.voorstel = null; ins.stap = "zie";
    },
    kiesTaak(t) { const ins = this.state.inspectie; ins.taak = t; if (!ins.taken.includes(t)) ins.taken.push(t); this.nieuweWaarneming(); this.stap("zie"); },
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
      this.syncKnoppen();
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
        <button class="mic${this.micKey === key ? " on" : ""}" data-mic="${key}" onclick="App.toggleMic('${key}')" aria-label="Inspreken">${svg("mic", 22)}</button></div>
        <div class="partial" id="p-${key}"></div>`;
    },

    // --- inspreken: Claude-dictatie > spraakherkenning browser > microfoon van het toetsenbord ---
    toggleMic(key) {
      if (this.micKey) { const was = this.micKey; this.stopMic(); if (was === key) return; }
      const d = this.caps && this.caps.dictation;
      if (d) {
        this.micKey = key; this._dictKey = key; this.markMic();
        d.start().catch((e) => {
          if (this.micKey === key) { this.micKey = null; this.markMic(); }
          if (e && (e.code === "unavailable" || e.code === "not_granted")) {
            this.caps.dictation = null;
            this.zegHint(key, "Inspreken via Claude kan hier niet; tik nog eens op de microfoon of gebruik die van je toetsenbord.");
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
          rec.onend = () => { if (this.micKey === key) { this.micKey = null; this.markMic(); this.zegPartial(key, ""); } };
          rec.onerror = (ev) => {
            if (this.micKey === key) { this.micKey = null; this.markMic(); }
            if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) this.zegHint(key, "Microfoon geblokkeerd; gebruik de microfoon van je toetsenbord.");
          };
          this._rec = rec; this.micKey = key; this.markMic(); rec.start();
          return;
        } catch (e) { this.micKey = null; this.markMic(); }
      }
      const t = $("f-" + key); if (t) t.focus();
      this.zegHint(key, "Tik op de microfoon van je toetsenbord om in te spreken.");
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
    renderTaakVs() {
      const box = $("taakvs"), ins = this.state.inspectie; if (!box || !ins) return;
      const regels = this.data.kennisbank[ins.code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      const vs = ins.taakTekst.trim() ? this.lokaalVoorstel(ins.taakTekst, taken.map((t) => ({ id: t, naam: t, doc: regels.filter((r) => r.taak === t).map((r) => (r.taakstap || "") + " " + (r.risico || "")).join(" ") }))).slice(0, 2) : [];
      box.innerHTML = vs.length ? `<div style="margin-top:12px"><span class="lbl vs">Voorstel</span> <span class="s">is dit de taak?</span></div>` +
        vs.map((t) => `<button class="pick" onclick="App.kiesTaak(${esc(JSON.stringify(t))})"><div class="t">${esc(t)}</div><div class="s">${regels.filter((r) => r.taak === t).length} risicoregels in de TRA · tik om te bevestigen</div></button>`).join("") : "";
    },

    // --- schermen ---
    view_inspectie() {
      const ins = this.state.inspectie;
      if (!ins) return this.go("vandaag");
      const v = $("view"), f = this["ins_" + ins.stap];
      if (f) f.call(this, ins, v);
      this.syncKnoppen();
      if (ins.stap === "klaar") this.setupSignature();
    },
    insHead(ins, kicker, titel) {
      const n = ins.waarnemingen.length, a = ins.waarnemingen.filter((w) => w.oordeel === "A" || w.oordeel === "V").length;
      return `<div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <button class="btn ghost sm" onclick="App.terug()">${svg("back", 16)} Terug</button>
        <span class="s" style="text-align:right">${esc(ins.titel)}<br>${n} waarneming${n === 1 ? "" : "en"}${a ? " · " + a + " actie" + (a === 1 ? "" : "s") : ""}</span></div>
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
      return `<div class="toast"><span>✓ Vastgelegd: ${esc(info.ref)} · [${w.oordeel}]${w.oordeel === "A" || w.oordeel === "V" ? " · actie aangemaakt" : ""}</span>
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
        <div class="qs" style="margin-top:0">${ow ? "Vertel wat je zag bij " + esc(ow.naam.toLowerCase()) + "." : "Vertel wat je ziet gebeuren, of maak een foto. Alleen wat je ziet telt."}</div>
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
      const pick = (id) => { const i = this.regelInfo(id); return `<button class="pick" onclick="App.kiesRegel('${id}')"><div class="t">${esc(i.ref)} · ${esc(kort(i.titel, 110))}</div>${i.maatregelen.length ? `<div class="s">${esc(kort(i.maatregelen.slice(0, 2).join(" · "), 150))}</div>` : ""}</button>`; };
      v.appendChild(el(`<div class="q">${this.citaat(cur)}
        ${vs.bezig ? `<div class="s" style="margin-top:14px;font-weight:600">Even koppelen aan de TRA…</div>`
          : vs.ids.length ? `<div style="margin-top:14px"><span class="lbl vs">Voorstel${vs.bron ? " · " + esc(vs.bron) : ""}</span> <span class="s">tik aan wat klopt</span></div>${vs.ids.map(pick).join("")}`
          : `<div class="s" style="margin-top:14px">Geen duidelijke regel gevonden. Kies hieronder zelf, of leg het vast als buiten de TRA.</div>`}
        <button class="btn ghost" style="margin-top:12px;width:100%" onclick="App.buitenTRA()">Staat niet in de TRA (buiten TRA)</button></div>`));
      const regels = this.regelsVanTaak(ins);
      v.appendChild(el(`<details class="card" style="margin-top:12px"><summary style="cursor:pointer;font-weight:650">Zelf kiezen: risico's van deze taak (${regels.length}) en algemene onderwerpen</summary>
        <div style="margin-top:8px">${regels.map((r) => `<button class="pick" style="background:#fff;box-shadow:inset 0 0 0 1px var(--line)" onclick="App.kiesRegel('${r.id}')"><div class="t">${esc(r.id)} · ${esc(kort(r.risico, 90))}</div></button>`).join("")}
        ${this.onderwerpen().map((o) => `<button class="pick" style="background:#fff;box-shadow:inset 0 0 0 1px var(--line)" onclick="App.kiesRegel('ALG-${o.ref}')"><div class="t">Algemeen ${o.ref} · ${esc(o.naam)}</div></button>`).join("")}</div></details>`));
    },
    kiesRegel(id) { const ins = this.state.inspectie, cur = ins.cur; cur.regel_id = id; cur.buiten = false; cur.vraag = (ins.voorstel && ins.voorstel.vraag) || ""; cur.maatregelen = []; this.stap("oordeel"); },
    buitenTRA() { const cur = this.state.inspectie.cur; cur.regel_id = null; cur.buiten = true; cur.vraag = ""; cur.maatregelen = []; this.stap("oordeel"); },
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
      const ins = this.state.inspectie, cur = ins.cur; cur.oordeel = o;
      if (o === "A" || o === "V") { if (!cur.actie.prio) cur.actie.prio = cur.direct ? "direct" : o === "A" ? "kort" : "planmatig"; return this.stap("actie"); }
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
      v.appendChild(el(this.insHead(ins, info.ref + " · " + (cur.oordeel === "A" ? "Afwijking" : "Verbeterpunt"), "Wat moet er gebeuren?")));
      const chip = (k, val, lab) => `<button class="chipb${a[k] === val ? " on" : ""}" onclick="App.zetActie('${k}','${val}')">${lab}</button>`;
      const gecorr = a.terPlaatse === "gecorrigeerd";
      v.appendChild(el(`<div class="q">${this.citaat(cur)}
        <div class="s" style="margin:14px 0 6px;font-weight:600">Verbeteractie ${a.herkomst === "Voorstel" ? '<span class="lbl vs">Voorstel</span> pas aan of bevestig' : ""}</div>
        ${this.invoer("actie", "Bijv. gasmeter altijd bij de man in de put; toolbox gasmeting")}
        <button class="btn ghost sm" id="btn-av" onclick="App.actieVoorstel()">Laat de app een actie voorstellen</button>
        <div class="s" style="margin:16px 0 6px;font-weight:600">Prioriteit</div>
        <div class="chips">${chip("prio", "direct", "Direct")}${chip("prio", "kort", "Kort · 2 weken")}${chip("prio", "planmatig", "Planmatig · 8 weken")}</div>
        <div class="s" style="margin:16px 0 6px;font-weight:600">Ter plaatse</div>
        <div class="chips">${chip("terPlaatse", "niets", "Niets gedaan")}${chip("terPlaatse", "maatregel", "Maatregel genomen")}${chip("terPlaatse", "gecorrigeerd", "Direct gecorrigeerd")}</div>
        ${a.terPlaatse === "maatregel" ? `<div class="s" style="margin-top:8px">Een direct genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot de verbeteractie is uitgevoerd en getoetst.</div>` : ""}
        ${gecorr ? `<div class="s" style="margin-top:8px">Direct gecorrigeerd: de verbeteractie zelf is ter plaatse uitgevoerd; jij toetst dit nu ter plaatse.</div>` : ""}
        <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--mist);font-size:14px;line-height:1.8">
          <div><span class="lbl std">Standaard</span> Actiehouder: Montage Coördinator van het project</div>
          <div><span class="lbl std">Standaard</span> Toetser: ${gecorr ? "jij, ter plaatse" : "Hoofd Service &amp; Montage"}</div>
          <div><span class="lbl std">Standaard</span> Termijn: ${termijn(a.prio)}</div></div>
        <button class="btn primary" style="margin-top:14px" data-need="actie" onclick="App.bevestigActie()">Actie vastleggen</button></div>`));
    },
    zetActie(k, val) { this.state.inspectie.cur.actie[k] = val; this.route(); },
    async actieVoorstel() {
      const ins = this.state.inspectie, cur = ins.cur, info = this.regelInfo(cur.regel_id, cur.buiten);
      const btn = $("btn-av"); if (btn) { btn.disabled = true; btn.textContent = "Even denken…"; }
      let tekst = "";
      const s = this.caps && this.caps.sample;
      if (s) {
        try {
          const out = await s.json(
            `Stel één concrete verbeteractie voor bij een werkplekinspectie. Gebruik alleen de gegevens hieronder en verzin geen feiten.\n` +
            `Oordeel van de inspecteur: ${cur.oordeel === "A" ? "Afwijking" : "Verbeterpunt"}\nRisico of onderwerp: ${info.titel}\n` +
            `Maatregelen uit de TRA: ${info.maatregelen.join("; ").slice(0, 700) || "(geen)"}\nWaarneming van de inspecteur: "${cur.tekst}"\n` +
            `Antwoord alleen met JSON: {"actie":"gebiedende wijs, maximaal 25 woorden, Nederlands"}`, { modelTier: "quick" });
          if (out && typeof out.actie === "string") tekst = out.actie.trim();
        } catch (e) { if (e && (e.code === "not_granted" || e.code === "sampling_disabled")) this.caps.sample = null; }
      }
      if (!tekst) tekst = info.maatregelen.length
        ? "Zorg dat de TRA-maatregel wordt toegepast: " + (info.maatregelen.find((m) => !cur.maatregelen.includes(m)) || info.maatregelen[0]).replace(/^[^·]*·\s*/, "")
        : cur.buiten ? "Risico beoordelen en een maatregel opnemen in de TRA: " + cur.tekst.trim()
        : "Met de ploeg bespreken en verhelpen: " + cur.tekst.trim();
      if (this.state.inspectie !== ins || ins.cur !== cur) return;
      cur.actie.tekst = tekst; cur.actie.herkomst = "Voorstel"; this.route();
    },
    bevestigActie() {
      const ins = this.state.inspectie, cur = ins.cur, a = cur.actie, gecorr = a.terPlaatse === "gecorrigeerd";
      a.houder = "Montage Coördinator (project)";
      a.toetser = gecorr ? this.user.full_name + " (ter plaatse)" : "Hoofd Service & Montage";
      a.termijn = termijn(a.prio);
      a.status = gecorr ? "Afgerond · ter plaatse getoetst" : "Open";
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
    ins_klaar(ins, v) {
      const ws = ins.waarnemingen, cnt = { C: 0, A: 0, V: 0, NVT: 0 };
      ws.forEach((w) => { cnt[w.oordeel] = (cnt[w.oordeel] || 0) + 1; });
      v.appendChild(el(this.insHead(ins, "Afronden", "Klopt dit?")));
      v.appendChild(el(`<div class="grid kpis">${this.tile("sage", cnt.C, "Conform", "gezien")}${this.tile("blush", cnt.A, "Afwijking", cnt.A ? "met actie" : "geen")}${this.tile("butter", cnt.V, "Verbeterpunt", cnt.V ? "met actie" : "geen")}</div>`));
      const w = [];
      if (!ws.length) w.push("Er is nog geen waarneming vastgelegd.");
      if (!cnt.C && !ins.positief.trim()) w.push("Nog geen positieve bevinding: leg een Conform vast of vul 'Wat ging opvallend goed' in.");
      if (!ins.gesprek.trim()) w.push("Het gesprek met de monteurs is nog leeg.");
      if (w.length) v.appendChild(el(`<div class="card" style="margin-top:14px;background:var(--butter);box-shadow:none">${w.map((x) => `<div style="color:#7A4300;font-weight:600;font-size:14px;margin:2px 0">• ${esc(x)}</div>`).join("")}</div>`));
      v.appendChild(el(`<div class="card" style="margin-top:14px"><div class="t">Getoetst tijdens bezoek</div><div class="s">${ins.taken.map(esc).join(" · ") || "—"}</div></div>`));
      if (ws.length) v.appendChild(el(this.vastgelegdLijst(ins)));
      v.appendChild(el(`<h2>Handtekening inspecteur</h2>`));
      v.appendChild(el(`<div class="card">
        <canvas id="sig" width="640" height="200" style="width:100%;height:160px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);touch-action:none;background:#fff;display:block"></canvas>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span class="s" id="sigstat">${ins.handtekening ? "Ondertekend ✓" : "Teken in het vak"}</span>
          <button class="btn ghost sm" onclick="App.clearSig()">Wissen</button></div></div>`));
      v.appendChild(el(`<button class="btn primary" style="margin-top:16px" onclick="App.bewaarInspectie()">Inspectie vastleggen</button>`));
      v.appendChild(el(`<button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.go('vandaag')">Later afmaken</button>`));
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
    async bewaarInspectie() {
      this.stopMic();
      const ins = this.state.inspectie;
      const rec = { id: "WPI-" + Date.now(), versie: 2, titel: ins.titel, code: ins.code, project: ins.project,
        taken: ins.taken.slice(), taak: ins.taken[0] || ins.taak || "", waarnemingen: ins.waarnemingen,
        gesprek: ins.gesprek, positief: ins.positief, handtekening: ins.handtekening,
        inspecteur: this.user.full_name, inspecteur_id: this.user.id, start: ins.start, opgeslagen: new Date().toISOString() };
      try { await DB.save(rec); } catch (e) {}
      this.state.inspectie = null;
      this.openModal("Vastgelegd", "De inspectie is lokaal bewaard op dit toestel (nog geen cloud-opslag).",
        `<button class="btn primary" onclick="App.closeModal();location.hash='#/rapport/${rec.id}'">Bekijk rapport</button>
         <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.closeModal();App.go('inspecties')">Naar inspecties</button>`);
    },

    // ---------------- INSPECTIES ----------------
    async view_inspecties() {
      const wpis = this.data.voorbeelddata.wpis || [];
      const v = $("view");
      const mine = !staf();
      v.appendChild(el(`<div><div class="kicker">${mine ? "Jouw inspecties" : wpis.length + " voorbeeld-inspecties · alle inspecteurs"}</div><h1>Inspecties</h1></div>`));
      const box = el(`<div class="listcard"><div class="row"><span class="grow s">Laden…</span></div></div>`);
      v.appendChild(box);
      let saved = [];
      try { saved = await DB.all(); } catch (e) {}
      saved = saved.filter((r) => !mine || r.inspecteur_id === this.user.id).sort((a, b) => b.opgeslagen.localeCompare(a.opgeslagen));
      const savedRows = saved.map((r) => {
        const n = r.versie === 2 ? r.waarnemingen.length : Object.values(r.oordelen || {}).filter(Boolean).length;
        return `<div class="row" style="cursor:pointer" onclick="location.hash='#/rapport/${r.id}'">
          <span class="grow"><span class="t">${esc(r.titel)}</span><div class="s">${new Date(r.opgeslagen).toLocaleString("nl-NL")} · ${esc(r.inspecteur.split(" ")[0])} · ${n} waarneming${n === 1 ? "" : "en"}${r.handtekening ? " · ondertekend" : ""}</div></span>
          <span class="badge b-done">eigen</span></div>`;
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
      const ws = r.versie === 2 ? r.waarnemingen : Object.entries(r.oordelen || {}).filter(([, o]) => o)
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
      const aRows = acties.map((w, n) => {
        const i = this.infoVoor(r.code, w.regel_id, w.buiten), a = w.actie;
        return `<div class="row" style="align-items:flex-start"><span class="grow"><span class="t">${n + 1}. ${esc(a.tekst || "(geen actietekst)")}</span>
          <div class="s">${esc(i.ref)} · prioriteit ${prioLab[a.prio] || "–"} · termijn ${esc(a.termijn || "–")}</div>
          <div class="s">Actiehouder: ${esc(a.houder || "–")} · toetser: ${esc(a.toetser || "–")}</div>
          ${a.terPlaatse === "maatregel" ? `<div class="s">Ter plaatse een maatregel genomen; actie blijft open tot uitgevoerd en getoetst.</div>` : ""}</span>
          <span class="badge ${String(a.status || "").startsWith("Afgerond") ? "b-done" : "b-V"}">${esc(a.status || "Open")}</span></div>`;
      }).join("");
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
      </div>`));
      v.appendChild(el(`<button class="btn primary noprint" style="margin-top:16px" onclick="window.print()">${svg("list", 18)} Opslaan als PDF / printen</button>`));
    },

    // ---------------- ACTIES ----------------
    view_acties() {
      const c = this.data.cijfers, t = this.data.trendacties;
      const v = $("view");
      v.appendChild(el(`<div><div class="kicker">Hoofd Service &amp; Montage</div><h1>Acties</h1></div>`));
      v.appendChild(el(`<div class="grid kpis">
        ${this.tile("blush", c.act_status.Open, "Open", c.act_over.length + " over termijn")}
        ${this.tile("sage", c.act_status.Afgerond, "Afgerond", "getoetst")}
        ${this.tile("butter", c.act_prio.direct, "Direct", "hoogste prioriteit")}</div>`));
      const head = el(`<div style="display:flex;justify-content:space-between;align-items:center"><h2>Trendacties (VCA 7.2)</h2><button class="btn ghost sm" onclick="App.exportCSV()">${svg("list", 16)} Exporteer CSV</button></div>`);
      v.appendChild(head);
      v.appendChild(el(`<div class="listcard">${t.map((a) =>
        `<div class="row"><span class="grow"><span class="t">${esc(a.nr)}</span><div class="s">${esc(a.onderwerp)} · ${esc(a.actiehouder)} · ${esc(a.termijn)}</div></span><span class="badge ${a.status === "Open" ? "b-V" : "b-done"}">${esc(a.status)}</span></div>`).join("")}</div>`));
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
      const w = D.waarn, pct = w.totaal ? Math.round(100 * D.oordeel.Conform / w.totaal) : 0;
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
        ${this.tile("sage", pct + "%", "Conform", D.oordeel.Conform + " van " + w.totaal, "App.drill('conform')")}
        ${this.tile("sky", w.totaal, "Waarnemingen", "TRA " + w.TRA + " · onderw. " + w.Algemeen, "App.drill('waarnemingen')")}
        ${this.tile(progPct >= progDoel ? "sage" : "blush", progPct + "%", "Programma", "doel " + progDoel + "% · " + c.vp_x + "/" + c.vp_y, "App.drill('programma')")}
        ${this.tile(c.act_over.length ? "blush" : "mist", c.act_open_n, "Open acties", c.act_over.length + " over termijn", "App.drill('acties')")}
        ${this.tile("lilac", D.n_wpi, "Inspecties", f.product || f.locatie || f.periode ? "in selectie" : c.ingang.ingepland + " ingepland · " + c.ingang.spontaan + " spontaan", "App.drill('inspecties')")}
      </div>`));
      const chartCard = el(`<div class="grid" style="grid-template-columns:1fr;gap:14px;margin-top:14px"></div>`);
      chartCard.appendChild(el(`<div class="card"><h3>Oordelen per maand</h3>${this.chartOordeel(D.maanden, D.om)}
        <div class="legend"><span><i style="background:var(--green)"></i>Conform</span><span><i style="background:var(--amber)"></i>Verbeterpunt</span><span><i style="background:var(--red)"></i>Afwijking</span></div></div>`));
      chartCard.appendChild(el(`<div class="card"><h3>Verplichte WPI’s per maand <span class="muted" style="font-size:12px;font-weight:500">· hele periode</span></h3>${this.chartProg()}
        <div class="legend"><span><i style="background:var(--green)"></i>Uitgevoerd</span><span><i style="background:var(--red)"></i>Gemist</span><span><i style="background:var(--grey)"></i>Loopt nog</span></div></div>`));
      chartCard.appendChild(el(`<div class="card"><h3>Afwijkingen en verbeterpunten per klasse</h3>${this.klasseBars(D.klasse)}
        <div class="muted" style="font-size:12px;margin-top:8px">Tik een klasse om alles erop te filteren.</div></div>`));
      v.appendChild(chartCard);
    },
    chartOordeel(mnd, om) {
      const c = this.data.cijfers;
      const tot = mnd.map((m) => Object.values(om[m] || {}).reduce((a, b) => a + b, 0));
      const mx = Math.max(...tot, 1), W = 640, H = 200, pad = 28, gap = (W - pad) / mnd.length, bw = gap * 0.52;
      const col = { Conform: "#1E7A4C", Verbeterpunt: "#8A4B00", Afwijking: "#B42318", "Niet van toepassing": "#9AA2AE" };
      let g = "";
      mnd.forEach((m, i) => {
        const x = pad + gap * i + (gap - bw) / 2; let y = H - 22; let p = "";
        ["Conform", "Verbeterpunt", "Afwijking", "Niet van toepassing"].forEach((k) => {
          const val = (om[m] || {})[k] || 0; if (!val) return; const h = val / mx * (H - 50); y -= h;
          p += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${col[k]}"/>`;
        });
        p += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="#141A22">${tot[i]}</text>`;
        p += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="12" fill="#4A5565">${mlabel(m)}</text>`;
        p += `<rect x="${(pad + gap * i).toFixed(1)}" y="0" width="${gap.toFixed(1)}" height="${H}" fill="transparent"/>`;
        g += `<g style="cursor:pointer" onclick="App.drill('oordeelmaand','${m}')">${p}</g>`;
      });
      return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
    },
    chartProg() {
      const c = this.data.cijfers, mnd = c.maanden, vm = c.vp_maand;
      const ys = mnd.map((m) => (vm[m] || {}).y + ((vm[m] || {}).lopend || 0));
      const mx = Math.max(...ys, 1), W = 640, H = 200, pad = 28, gap = (W - pad) / mnd.length, bw = gap * 0.52;
      let g = `<defs><pattern id="h" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F3F4F6"/><line x1="0" y1="0" x2="0" y2="6" stroke="#C9CED6" stroke-width="2"/></pattern></defs>`;
      mnd.forEach((m, i) => {
        const d = vm[m] || {}, ok = d.ok || 0, y_ = d.y || 0, lop = d.lopend || 0, gem = y_ - ok;
        const x = pad + gap * i + (gap - bw) / 2; let y = H - 22; let p = "";
        [[ok, "#1E7A4C", 0], [gem, "#B42318", 0], [lop, "url(#h)", 1]].forEach(([val, cl, ht]) => {
          if (val <= 0) return; const h = val / mx * (H - 50); y -= h;
          p += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${cl}" stroke="${ht ? "#9AA2AE" : "none"}" stroke-width="${ht}"/>`;
        });
        p += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="#141A22">${ok}/${y_}</text>`;
        p += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="12" fill="#4A5565">${mlabel(m)}</text>`;
        p += `<rect x="${(pad + gap * i).toFixed(1)}" y="0" width="${gap.toFixed(1)}" height="${H}" fill="transparent"/>`;
        g += `<g style="cursor:pointer" onclick="App.drill('programma','${m}')">${p}</g>`;
      });
      return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
    },
    klasseBars(kg) {
      kg = kg || this.data.cijfers.klasse_gezien;
      const rows = Object.entries(kg).map(([k, v]) => [k, v.Afwijking || 0, v.Verbeterpunt || 0]).filter((r) => r[1] + r[2] > 0).sort((a, b) => (b[1] + b[2]) - (a[1] + a[2])).slice(0, 7);
      if (!rows.length) return `<div class="muted" style="font-size:13px">Geen afwijkingen of verbeterpunten in deze selectie.</div>`;
      const mx = Math.max(...rows.map((r) => r[1] + r[2]), 1);
      return rows.map(([k, a, vv]) => `<div onclick="App.setFilter('klasse','${esc(k).replace(/'/g, "\\'")}')" style="display:flex;align-items:center;gap:12px;margin:9px 0;cursor:pointer">
        <div style="width:190px;font-size:13px;font-weight:500;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k)}</div>
        <div style="flex:1;display:flex;align-items:center;height:16px">
          <div style="width:${(a / mx * 100).toFixed(1)}%;height:16px;background:var(--red);border-radius:3px 0 0 3px"></div>
          <div style="width:${(vv / mx * 100).toFixed(1)}%;height:16px;background:var(--amber);border-radius:0 3px 3px 0"></div>
          <span style="margin-left:8px;font-size:12px;color:var(--soft);font-weight:600">${a + vv}</span></div></div>`).join("");
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
        return this.openModal("Trendacties (VCA 7.2)", "Acties uit de trendanalyse, met actiehouder en termijn.", tbl(["Nr", "Onderwerp", "Actiehouder", "Termijn", "Status"], rows));
      }
    },
  };
  window.App = App;
  App.boot();
})();
