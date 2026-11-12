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

  const App = {
    data: {}, state: { inspectie: null, extra: [] }, user: null,

    async boot() {
      const names = ["cijfers", "kennisbank", "voorbeelddata", "trendacties"];
      const got = await Promise.all(names.map((n) => fetch("data/" + n + ".json").then((r) => r.json())));
      names.forEach((n, i) => (this.data[n] = got[i]));
      try { const u = JSON.parse(localStorage.getItem("wpi_user") || "null"); if (u) this.user = USERS.find((x) => x.id === u.id) || null; } catch (e) {}
      window.addEventListener("hashchange", () => this.route());
      this.route();
    },

    login(id) { this.user = USERS.find((u) => u.id === id); try { localStorage.setItem("wpi_user", JSON.stringify({ id })); } catch (e) {} this.go("vandaag"); this.route(); },
    logout() { this.user = null; try { localStorage.removeItem("wpi_user"); } catch (e) {} this.route(); },
    renderAcct() {
      if (!this.user) { $("acct").innerHTML = `<span class="chip">Voorbeeld · fictief</span>`; return; }
      $("acct").innerHTML = `<button class="chip" onclick="App.logout()" title="Uitloggen">${esc(this.user.full_name.split(" ")[0])} · ${ROL[this.user.role]} ×</button>`;
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

    // ---------------- INSPECTIE-FLOW ----------------
    startInspectie(code, project, titel) {
      const taken = [...new Set(this.data.kennisbank[code].regels.map((r) => r.taak))];
      this.state.inspectie = { code, project, titel, taak: null, oordelen: {}, acties: [] };
      this.go("inspectie/taak");
    },
    view_inspectie(parts) {
      const step = parts[0] || "taak";
      const ins = this.state.inspectie;
      if (!ins) return this.go("vandaag");
      if (step === "taak") return this.flowTaak(ins);
      if (step === "toets") return this.flowToets(ins);
      if (step === "klaar") return this.flowKlaar(ins);
    },
    flowHead(ins, kicker) {
      return `<div><button class="btn ghost sm" onclick="history.back()">${svg("back", 16)} Terug</button>
        <div class="kicker" style="margin-top:12px">${esc(kicker)}</div><h1>${esc(ins.titel)}</h1></div>`;
    },
    flowTaak(ins) {
      const regels = this.data.kennisbank[ins.code].regels;
      const taken = [...new Set(regels.map((r) => r.taak))];
      const v = $("view");
      v.appendChild(el(this.flowHead(ins, "Wat doen de monteurs nu?")));
      v.appendChild(el(`<div class="muted" style="margin-bottom:10px">Kies de taak die je ziet. Je toetst daarna alleen de risico’s die je waarneemt.</div>`));
      v.appendChild(el(`<div class="listcard">${taken.map((t) => {
        const n = regels.filter((r) => r.taak === t).length;
        return `<div class="row" style="cursor:pointer" onclick="App.kiesTaak('${esc(t).replace(/'/g, "\\'")}')">
          <span class="grow"><span class="t">${esc(t)}</span><div class="s">${n} risicoregels</div></span>${svg("chev", 18)}</div>`;
      }).join("")}</div>`));
    },
    kiesTaak(taak) { this.state.inspectie.taak = taak; this.go("inspectie/toets"); },
    flowToets(ins) {
      const regels = this.data.kennisbank[ins.code].regels.filter((r) => r.taak === ins.taak);
      const v = $("view");
      v.appendChild(el(this.flowHead(ins, "Toetsen · " + ins.taak)));
      const beoordeeld = regels.filter((r) => ins.oordelen[r.id]).length;
      const pct = regels.length ? Math.round(100 * beoordeeld / regels.length) : 0;
      v.appendChild(el(`<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--soft);font-weight:600"><span>${beoordeeld} van ${regels.length} beoordeeld</span><span>tik aan wat je ziet</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div></div>`));
      const wrap = el(`<div class="grid" style="gap:10px"></div>`);
      regels.forEach((r) => {
        const cur = ins.oordelen[r.id] || "";
        const maatr = Array.isArray(r.maatregelen) ? r.maatregelen.join(" · ") : (r.maatregelen || "");
        const btn = (o) => {
          const cls = cur ? (o === cur ? `t-${o} on-${o}` : "dim") : `t-${o}`;
          return `<button class="${cls}" onclick="App.zetOordeel('${esc(r.id)}','${o}')"><span class="l">${o}</span><span class="w">${{ C: "Conform", A: "Afwijking", V: "Verbeterpunt" }[o]}</span></button>`;
        };
        wrap.appendChild(el(`<div class="card${cur ? " done-" + cur : ""}" style="padding:14px 16px">
          <div style="font-size:12px;color:#4A5565;font-weight:600">${esc(r.id)} · ${esc(r.klasse || "")}</div>
          <div class="t" style="margin:3px 0 8px;font-size:16px">${esc(r.risico || "")}</div>
          ${maatr ? `<details style="margin-bottom:10px"><summary style="cursor:pointer;color:var(--soft);font-size:13px;font-weight:600;list-style:none">Maatregelen tonen</summary><div class="s" style="margin-top:6px">${esc(maatr)}</div></details>` : ""}
          <div class="seg" data-id="${esc(r.id)}">${["C", "A", "V"].map(btn).join("")}</div></div>`));
      });
      v.appendChild(wrap);
      const act = ins.acties.length ? ` · ${ins.acties.length} ${ins.acties.length === 1 ? "actie" : "acties"}` : "";
      v.appendChild(el(`<button class="btn primary" style="margin-top:16px" onclick="App.go('inspectie/klaar')">Afronden${act}</button>`));
    },
    zetOordeel(id, o) {
      const ins = this.state.inspectie;
      ins.oordelen[id] = ins.oordelen[id] === o ? "" : o;
      // acties bij A/V
      ins.acties = Object.entries(ins.oordelen).filter(([, v]) => v === "A" || v === "V").map(([rid, v]) => ({ rid, oordeel: v }));
      this.route();
    },
    flowKlaar(ins) {
      const vals = Object.values(ins.oordelen).filter(Boolean);
      const cnt = { C: 0, A: 0, V: 0 };
      vals.forEach((o) => cnt[o]++);
      const v = $("view");
      v.appendChild(el(this.flowHead(ins, "Afronden · " + ins.taak)));
      v.appendChild(el(`<div class="grid kpis">
        ${this.tile("sage", cnt.C, "Conform", "gezien")}
        ${this.tile("blush", cnt.A, "Afwijking", cnt.A ? "actie nodig" : "geen")}
        ${this.tile("butter", cnt.V, "Verbeterpunt", cnt.V ? "actie nodig" : "geen")}</div>`));
      if (ins.acties.length) {
        v.appendChild(el(`<h2>Acties (${ins.acties.length})</h2>`));
        v.appendChild(el(`<div class="listcard">${ins.acties.map((a) =>
          `<div class="row"><span class="grow"><span class="t">${esc(a.rid)}</span><div class="s">Standaard: Hoofd S&amp;M · termijn kort</div></span><span class="badge b-${a.oordeel}">[${a.oordeel}]</span></div>`).join("")}</div>`));
      }
      v.appendChild(el(`<div class="card" style="margin-top:16px"><div class="t">Getoetst tijdens bezoek</div>
        <div class="s">${esc(ins.titel)} · taak ${esc(ins.taak)} · ${vals.length} regels beoordeeld</div></div>`));
      v.appendChild(el(`<button class="btn primary" style="margin-top:16px" onclick="App.bewaarInspectie()">Inspectie vastleggen</button>`));
      v.appendChild(el(`<button class="btn ghost" style="margin-top:10px" onclick="App.go('vandaag')">Later afmaken</button>`));
    },
    bewaarInspectie() {
      this.state.extra.push(this.state.inspectie);
      this.state.inspectie = null;
      this.openModal("Vastgelegd", "De inspectie is opgeslagen in deze sessie (voorbeeld, geen echte opslag).",
        `<button class="btn primary" onclick="App.closeModal();App.go('vandaag')">Naar Vandaag</button>`);
    },

    // ---------------- INSPECTIES ----------------
    view_inspecties() {
      const wpis = this.data.voorbeelddata.wpis || [];
      const v = $("view");
      const extra = this.state.extra.map((e) => `<div class="row"><span class="grow"><span class="t">${esc(e.titel)}</span><div class="s">Zojuist · taak ${esc(e.taak)} · ${esc(this.user.full_name.split(" ")[0])}</div></span><span class="badge b-done">Nieuw</span></div>`).join("");
      if (!staf()) {
        v.appendChild(el(`<div><div class="kicker">Jouw inspecties</div><h1>Inspecties</h1></div>`));
        v.appendChild(el(`<div class="listcard">${extra || `<div class="row"><span class="grow s">Nog geen eigen inspecties. Start er een via Vandaag.</span></div>`}</div>`));
        return;
      }
      v.appendChild(el(`<div><div class="kicker">${wpis.length} inspecties · alle inspecteurs · mei–nov 2026</div><h1>Inspecties</h1></div>`));
      const rows = wpis.slice().reverse().map((w) => {
        const dam = (w.nr || "").split("-")[1] || "";
        return `<div class="row"><span class="grow"><span class="t">${esc(w.product || w.nr)}</span><div class="s">${esc(w.nr)} · ${esc(w.ingang || "")}</div></span><span class="s">${dam ? dam.slice(6, 8) + "-" + dam.slice(4, 6) : ""}</span></div>`;
      }).join("");
      v.appendChild(el(`<div class="listcard">${extra}${rows}</div>`));
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
      v.appendChild(el(`<h2>Trendacties (VCA 7.2)</h2>`));
      v.appendChild(el(`<div class="listcard">${t.map((a) =>
        `<div class="row"><span class="grow"><span class="t">${esc(a.nr)}</span><div class="s">${esc(a.onderwerp)} · ${esc(a.actiehouder)} · ${esc(a.termijn)}</div></span><span class="badge ${a.status === "Open" ? "b-V" : "b-done"}">${esc(a.status)}</span></div>`).join("")}</div>`));
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
