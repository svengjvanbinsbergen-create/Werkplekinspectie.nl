/* Werkplekinspectie — js/dashboard.js
   Dashboard (webversie): filters, cijfers, grafieken, drill-down en CSV-export.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, mlabel, svg, act, op, WAARDE } = window.WPI;
  Object.assign(window.App, {
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
      const waarn = { totaal: 0, TRA: 0, Algemeen: 0, buiten: 0 }, klasse = {}, om = {}, mset = new Set(), wset = new Set(), perWpi = {};
      regels.forEach((r) => {
        const o = r.oordeel; if (oordeel[o] !== undefined) oordeel[o]++;
        waarn.totaal++;
        if (/lgemeen/.test(r.soort || "")) waarn.Algemeen++; else if (r.soort === "TRA") waarn.TRA++; else waarn.buiten++;
        const pw = (perWpi[r.wpi] = perWpi[r.wpi] || { ingang: (wmap[r.wpi] || {}).ingang || "", oord: {} }); pw.oord[o] = (pw.oord[o] || 0) + 1;
        const k = r.classificatie || "—"; (klasse[k] = klasse[k] || { Afwijking: 0, Verbeterpunt: 0, Conform: 0, tot: 0});
        if (oordeel[o] !== undefined && klasse[k][o] !== undefined) klasse[k][o]++; klasse[k].tot++;
        const m = (r.datum || "").slice(0, 7); mset.add(m); (om[m] = om[m] || {}); om[m][o] = (om[m][o] || 0) + 1; wset.add(r.wpi);
      });
      return { oordeel, waarn, klasse, om, maanden: [...mset].sort(), n_wpi: wset.size, perWpi, wmap };
    },
    // de actieve filters in woorden (voor de detailvensters: zelfde selectie als de tegels)
    filterTekst() {
      const f = this.dashFilter, PER = { Q2: "Q2 (mei–jun)", Q3: "Q3 (jul–sep)", Q4: "Q4 (okt–nov)" }, d = [];
      if (f.product) d.push(f.product); if (f.locatie) d.push(f.locatie); if (f.periode) d.push(PER[f.periode] || f.periode); if (f.klasse) d.push("klasse " + f.klasse);
      return d.length ? "Selectie: " + d.join(" · ") + "." : "";
    },
    setFilter(k, val) { this.dashFilter[k] = this.dashFilter[k] === val ? "" : val; this.route(); },
    // ---- cijfers voor het dashboard en de rapportage, met een rustig skelet (#1, js/laden.js) ----
    // Normaal zijn de cijfers er al (geladen bij het opstarten): dan meteen tekenen, zonder lader. Ontbreken ze nog,
    // dan eerst laden; duurt dat langer dan ±1 s, dan een skelet in de vorm van het scherm (WPI.laad.skelet).
    // (Ontbreken = undefined; null = bewust leeg, zoals op de echte omgeving zonder voorbeelddata: js/auth.js.)
    DASH_DATA: ["cijfers", "voorbeelddata", "trendacties"],
    dashDataKlaar() { return this.DASH_DATA.every((n) => this.data[n] !== undefined); },
    dashDataLaden() {
      return Promise.all(this.DASH_DATA.filter((n) => this.data[n] === undefined).map((n) => fetch("data/" + n + ".json")
        .then((r) => { if (!r.ok) throw new Error(n + ": " + r.status); return r.json(); }).then((j) => { this.data[n] = j; })));
    },
    metCijfers(vorm, teken) {
      if (this.dashDataKlaar()) return teken();
      const v = $("view"), nr = this._routeNr, laden = this.dashDataLaden();
      return (WPI.laad ? WPI.laad.skelet(v, vorm, laden, { na: 1000 }) : laden).then(() => { if (nr === this._routeNr && this._page === vorm) return teken(); }, () => {
        if (nr !== this._routeNr) return;
        v.appendChild(el(`<div class="leeg" style="margin-top:40px"><h1 style="margin:14px 0 6px">${vorm === "kwartaal" ? "Rapportage" : "Dashboard"}</h1>
          <div class="s" role="alert" style="max-width:340px;margin:0 auto">De cijfers konden niet worden geladen. Controleer de verbinding en probeer het opnieuw.</div>
          <button class="btn primary" style="margin-top:20px;max-width:260px"${act("route")}>Opnieuw proberen</button></div>`));
      });
    },
    view_dashboard() { return this.metCijfers("dashboard", () => this.tekenDashboard()); },
    tekenDashboard() {
      const c = this.data.cijfers, D = this.computeDash(), f = this.dashFilter;
      const w = D.waarn, beo = D.oordeel.Conform + D.oordeel.Afwijking + D.oordeel.Verbeterpunt, pct = beo ? Math.round(100 * D.oordeel.Conform / beo) : 0;
      const progPct = Math.round(100 * c.vp_x / c.vp_y), progDoel = 90, doelC = this.doelConform();
      const v = $("view");
      const prods = [...new Set(this.data.voorbeelddata.wpis.map((x) => x.product))].sort();
      const locs = [...new Set(this.data.voorbeelddata.wpis.map((x) => x.locatie))].sort();
      const sel = (k, opts, lab) => `<select aria-label="${esc(lab)}"${op("change", "setFilter", k, WAARDE)} style="height:38px;border-radius:12px;border:0;box-shadow:inset 0 0 0 1px var(--line);padding:0 10px;font-size:13px;font-weight:600;background:#fff;color:${f[k] ? "var(--ink)" : "var(--soft)"}">
        <option value=""${f[k] ? "" : " selected"}>${lab}</option>${opts.map((o) => `<option value="${esc(o.v)}"${f[k] === o.v ? " selected" : ""}>${esc(o.l)}</option>`).join("")}</select>`;
      v.appendChild(el(`<div><div class="kicker">Trendanalyse · mei–nov 2026 · peildatum 11-11-2026</div><h1>Dashboard</h1></div>`));
      v.appendChild(el(`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${sel("product", prods.map((p) => ({ v: p, l: p })), "Alle producten")}
        ${sel("locatie", locs.map((p) => ({ v: p, l: p })), "Alle locaties")}
        ${sel("periode", [{ v: "Q2", l: "Q2 (mei–jun)" }, { v: "Q3", l: "Q3 (jul–sep)" }, { v: "Q4", l: "Q4 (okt–nov)" }], "Hele periode")}
        ${f.klasse ? `<button class="chip"${act("setFilter", "klasse", f.klasse)} style="box-shadow:inset 0 0 0 1px var(--line)">klasse: ${esc(f.klasse)} ×</button>` : ""}
      </div>`));
      v.appendChild(el(`<div class="muted" style="margin-bottom:10px;font-size:13px">Filters werken op waarnemingen en oordelen. Tik op een tegel, staaf of klasse voor detail / kruis-filter.</div>`));
      v.appendChild(el(`<div class="grid kpis">
        ${beo >= 5 ? this.tile(doelC != null && pct < doelC ? "mist" : "sage", pct + "%", "Conform", (doelC != null ? "doel " + doelC + "% · " : "") + D.oordeel.Conform + " van " + beo + " beoordeeld", act("drill", "conform"))
          : this.tile("mist", "n = " + beo, "Conform", "te weinig voor een percentage (n < 5)", act("drill", "conform"))}
        ${this.tile("sky", w.totaal, "Waarnemingen", "TRA " + w.TRA + " · onderw. " + w.Algemeen, act("drill", "waarnemingen"))}
        ${this.tile(progPct >= progDoel ? "sage" : "blush", progPct + "%", "Programma", "doel " + progDoel + "% · " + c.vp_x + "/" + c.vp_y, act("drill", "programma"))}
        ${this.tile(c.act_over.length ? "blush" : "mist", c.act_open_n, "Open acties", c.act_over.length + " over termijn", act("drill", "acties"))}
        ${this.tile("lilac", D.n_wpi, "Inspecties", f.product || f.locatie || f.periode ? "in selectie" : c.ingang.ingepland + " ingepland · " + c.ingang.spontaan + " spontaan", act("drill", "inspecties"))}
      </div>`));
      const PAL = this.PAL, leg = (items) => `<div class="legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
      const chartCard = el(`<div class="grid dashgrid" style="gap:14px;margin-top:14px"></div>`);
      chartCard.appendChild(el(`<div class="card grafiek breed"><h2 class="kaartkop">Hoeveel ziet er goed uit? <span class="sub">% conform per maand</span></h2>${this.chartTrend(D.maanden, D.om)}
        <div class="s" style="margin-top:6px">Een open rondje = minder dan 5 waarnemingen in die maand: te weinig voor een percentage.</div></div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h2 class="kaartkop">Oordelen per maand</h2>${this.chartOordeel(D.maanden, D.om)}
        ${leg([[PAL.C, "Conform"], [PAL.V, "Verbeterpunt"], [PAL.A, "Afwijking"]])}</div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h2 class="kaartkop">Inspectieprogramma <span class="sub">verplichte WPI’s per maand</span></h2>${this.chartProg()}
        ${leg([[PAL.C, "Uitgevoerd"], [PAL.gemist, "Gemist"], ["#E6DCCD", "Loopt nog"]])}</div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h2 class="kaartkop">Verdeling oordelen</h2>${this.chartDonut(D.oordeel)}</div>`));
      chartCard.appendChild(el(`<div class="card grafiek"><h2 class="kaartkop">Waar zitten de aandachtspunten? <span class="sub">per klasse</span></h2>${this.klasseBars(D.klasse)}
        ${leg([[PAL.A, "Afwijking"], [PAL.V, "Verbeterpunt"]])}</div>`));
      v.appendChild(chartCard);
      v.appendChild(el(`<div class="muted" style="font-size:12.5px;line-height:1.5;margin-top:14px">Klik op een maand, een stuk van de ring of een klasse voor de details. Methode: momentopnames; alleen wat de inspecteur zelf zag telt. Een A betekent “op dat moment niet op orde”, geen oordeel over personen.</div>`));
    },

    // doel % conform (Beheer; standaard 85, zoals de server: instellingen.doel_conform). Nooit ingesteld = 85;
    // bewust "geen doel" gekozen = lege waarde ("") → null (geen doellijn)
    DOEL_STANDAARD: 85,
    doelConform() {
      let v = null; try { v = localStorage.getItem("wpi_doel_conform"); } catch (e) {}
      if (v == null) return this.DOEL_STANDAARD;
      const n = String(v).trim() === "" ? NaN : Math.round(+v);
      return n >= 1 && n <= 100 ? n : null;
    },
    // zachte, warme kleuren die bij de app passen; dezelfde betekenis als in de rest van de app:
    // V geel, A rood, gemiste inspectie oranje
    PAL: { C: "#6FAF92", V: "#EEC643", A: "#EC8C74", gemist: "#F0954E", N: "#D8CDBE", track: "#F6F0E7", ink: "#2A2622", soft: "#72665A", doel: "#2F5D50" },
    // %-conform per maand als zachte lijn met vlak eronder
    chartTrend(mnd, om) {
      const doel = this.doelConform(), P = this.PAL, W = 1100, H = 230, L = 44, R = doel != null ? 92 : 24, T = 30, Bm = 30, iw = W - L - R, ih = H - T - Bm;
      const pts = mnd.map((m, i) => { const o = om[m] || {}, tot = (o.Conform || 0) + (o.Afwijking || 0) + (o.Verbeterpunt || 0);
        return { m, tot, p: tot ? (o.Conform || 0) / tot : null, x: L + (mnd.length === 1 ? iw / 2 : iw * i / (mnd.length - 1)) }; });
      const y = (p) => T + ih * (1 - p);
      const geldig = pts.filter((q) => q.p !== null);
      let g = `<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.C}" stop-opacity=".35"/><stop offset="1" stop-color="${P.C}" stop-opacity="0"/></linearGradient></defs>`;
      [0, .5, 1].forEach((t) => { g += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="${P.track}" stroke-width="2" stroke-dasharray="${t === 0 ? "" : "4 6"}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="${P.soft}">${t * 100}%</text>`; });
      if (doel != null) {   // streepjeslijn met het doel; label rechts naast de lijn, buiten de punten
        const yd = y(doel / 100);
        // rustig: dun, half doorzichtig, label rechts buiten de punten
        g += `<g class="doellijn"><line x1="${L}" x2="${W - R + 14}" y1="${yd}" y2="${yd}" stroke="${P.doel}" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="6 7" stroke-linecap="round"/>
          <text x="${W - R + 20}" y="${yd + 4.5}" text-anchor="start" font-size="12.5" font-weight="700" fill="${P.doel}" fill-opacity=".8">doel ${doel}%</text></g>`;
      }
      if (geldig.length > 1) {
        let d = `M${geldig[0].x},${y(geldig[0].p)}`;
        for (let k = 1; k < geldig.length; k++) { const a = geldig[k - 1], b = geldig[k], cx = (a.x + b.x) / 2; d += ` C${cx},${y(a.p)} ${cx},${y(b.p)} ${b.x},${y(b.p)}`; }
        g += `<path d="${d} L${geldig[geldig.length - 1].x},${T + ih} L${geldig[0].x},${T + ih} Z" fill="url(#tg)"/><path d="${d}" fill="none" stroke="${P.C}" stroke-width="4" stroke-linecap="round"/>`;
      }
      const yDoel = doel != null ? y(doel / 100) : null;
      pts.forEach((q) => {
        const klein = q.tot < 5, yy = q.p === null ? T + ih : y(q.p);
        // label boven de punt; raakt het de doellijn, dan eronder (en met een witte rand voor de leesbaarheid)
        const ly = yDoel != null && Math.abs(yDoel - (yy - 19)) < 12.5 && yy + 26 < T + ih + 4 ? yy + 26 : yy - 14;
        const lx = q.x === L && mnd.length > 1 ? q.x - 6 : q.x, la = lx === q.x ? "middle" : "start";   // eerste punt: niet over de as-labels
        g += `<g style="cursor:pointer" aria-label="${esc((q.p !== null && !klein ? Math.round(q.p * 100) + "%" : "n=" + q.tot) + " " + mlabel(q.m) + " · % conform, details")}"${act("drill", "oordeelmaand", q.m)}><rect x="${q.x - 30}" y="0" width="60" height="${H}" fill="transparent"/>
          <circle cx="${q.x}" cy="${yy}" r="7" fill="${klein ? "#fff" : P.C}" stroke="${klein ? P.N : "#fff"}" stroke-width="3"/>
          ${q.p !== null && !klein ? `<text class="pctlab" x="${lx}" y="${ly}" text-anchor="${la}" font-size="13" font-weight="800" fill="${P.ink}" stroke="#fff" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${Math.round(q.p * 100)}%</text>` : `<text x="${lx}" y="${ly}" text-anchor="${la}" font-size="12" fill="${P.soft}" stroke="#fff" stroke-width="4" stroke-linejoin="round" paint-order="stroke">n=${q.tot}</text>`}
          <text x="${q.x}" y="${H - 8}" text-anchor="middle" font-size="13" font-weight="700" fill="${P.soft}">${mlabel(q.m)}</text></g>`;
      });
      return `<svg viewBox="0 0 ${W} ${H}" class="svgchart">${g}</svg>`;
    },
    // gestapelde ronde staven met een zacht spoor erachter
    staven(kol, max, labels, actieFn) {   // actieFn(i) → attributen van act(…)
      const P = this.PAL, W = 560, H = 230, pad = 8, top = 30, bot = 30, gap = (W - pad * 2) / kol.length, bw = Math.min(42, gap * 0.5), ih = H - top - bot;
      let g = "";
      kol.forEach((segs, i) => {
        const x = pad + gap * i + (gap - bw) / 2; let yb = top + ih, tot = 0, p = "";
        p += `<rect x="${x}" y="${top}" width="${bw}" height="${ih}" rx="${bw / 2}" fill="${P.track}"/>`;
        segs.forEach(([val, col, pat]) => { if (!val) return; tot += val; const h = Math.max(6, val / max * ih); yb -= h;
          p += `<rect x="${x}" y="${yb + 1.5}" width="${bw}" height="${h - 3}" rx="${Math.min(bw / 2, (h - 3) / 2)}" fill="${col}"${pat ? ` stroke="#CFC2B0" stroke-dasharray="3 3"` : ""}/>`; });
        p += `<text x="${x + bw / 2}" y="${yb - 8}" text-anchor="middle" font-size="15" font-weight="800" fill="${P.ink}">${labels[i][0]}</text>`;
        p += ` <text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="15" font-weight="700" fill="${P.soft}">${labels[i][1]}</text>`;
        p += `<rect x="${pad + gap * i}" y="0" width="${gap}" height="${H}" fill="transparent"/>`;
        g += `<g style="cursor:pointer" aria-label="${esc(labels[i][0] + " " + labels[i][1] + (labels[i][2] ? ": " + labels[i][2] : "") + " · details")}"${actieFn(i)}>${p}</g>`;   // [2]: uitsplitsing voor de schermlezer (zichtbare tekst blijft vooraan, WCAG 2.5.3)
      });
      return `<svg viewBox="0 0 ${W} ${H}" class="svgchart">${g}</svg>`;
    },
    chartOordeel(mnd, om) {
      const P = this.PAL, tot = mnd.map((m) => ["Conform", "Verbeterpunt", "Afwijking"].reduce((a, k) => a + ((om[m] || {})[k] || 0), 0));
      return this.staven(mnd.map((m) => [[(om[m] || {}).Conform, P.C], [(om[m] || {}).Verbeterpunt, P.V], [(om[m] || {}).Afwijking, P.A]]),
        Math.max(...tot, 1), mnd.map((m, i) => { const o = om[m] || {};
          return [tot[i], mlabel(m), `van de ${tot[i]} oordelen ${o.Conform || 0} conform, ${o.Verbeterpunt || 0} verbeterpunt, ${o.Afwijking || 0} afwijking`]; }), (i) => act("drill", "oordeelmaand", mnd[i]));
    },
    chartProg() {
      const P = this.PAL, c = this.data.cijfers, mnd = c.maanden, vm = c.vp_maand;
      const kol = mnd.map((m) => { const d = vm[m] || {}; return [[d.ok || 0, P.C], [(d.y || 0) - (d.ok || 0), P.gemist], [d.lopend || 0, "#EFE6D8", true]]; });
      const max = Math.max(...mnd.map((m) => ((vm[m] || {}).y || 0) + ((vm[m] || {}).lopend || 0)), 1);
      return this.staven(kol, max, mnd.map((m) => { const d = vm[m] || {};
        return [(d.ok || 0) + "/" + (d.y || 0), mlabel(m), `${d.ok || 0} van ${d.y || 0} verplichte inspecties uitgevoerd${d.lopend ? `, ${d.lopend} nog lopend` : ""}`]; }), (i) => act("drill", "programma", mnd[i]));
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
        g += `<path d="M${x0},${y0} A${R},${R} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${big} 0 ${x3},${y3} Z" fill="${col}" style="cursor:pointer" aria-label="${esc(k + ": " + val + " · details")}"${act("drill", "conform")}/>`;
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
      return `<div class="kbars">${rows.map(([k, a, vv]) => `<button class="kbar"${act("setFilter", "klasse", k)}>
        <span class="kl">${esc(k)}</span><span class="spoor"><span style="width:${(a / mx * 100).toFixed(1)}%;background:${P.A}"></span><span style="width:${(vv / mx * 100).toFixed(1)}%;background:${P.V}"></span></span><b>${a + vv}</b></button>`).join("")}</div>`;
    },
    drill(key, param) {
      // tegels, grafieken en detailvensters rekenen met dezelfde gefilterde waarnemingen (computeDash)
      const c = this.data.cijfers, D = this.computeDash(), ft = this.filterTekst(), sel = (t) => (ft ? ft + " " : "") + t;
      const oc = (o) => ["Conform", "Afwijking", "Verbeterpunt", "Niet van toepassing"].filter((k) => o[k]).map((k) =>
        `<span class="badge b-${k === "Niet van toepassing" ? "N" : k[0]}">${k[0]} ${o[k]}</span>`).join(" ") || "—";
      const tbl = (h, rows) => `<table><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      if (key === "conform" || key === "waarnemingen") {
        const o = D.oordeel, w = D.waarn;
        return this.openModal("Waarnemingen en oordelen", sel("Alle waarnemingen in de " + (this.dashFilter.periode ? "gekozen periode" : "periode") + " (momentopname)."),
          tbl(["Oordeel", "Aantal"], [["Conform", o.Conform], ["Afwijking", o.Afwijking], ["Verbeterpunt", o.Verbeterpunt], ["Niet van toepassing", o["Niet van toepassing"]]].map((r) => [`<span class="badge b-${r[0] === "Niet van toepassing" ? "N" : r[0][0]}">${esc(r[0])}</span>`, r[1]]))
          + `<div class="muted" style="margin-top:14px;font-size:13px">TRA-regels ${w.TRA} · onderwerpen ${w.Algemeen} · buiten TRA ${w.buiten} · totaal ${w.totaal}${o["Niet van toepassing"] ? ` (waarvan ${o["Niet van toepassing"]} niet van toepassing)` : ""}.</div>`);
      }
      if (key === "programma") {
        let rows = c.vp_mis.map((o) => [esc(o.project.replace(" (fictief)", "")), esc(o.product), esc(o.locatie), mlabel(o.maand), esc(o.cat), `<span class="badge b-A">gemist</span>`]);
        let sub = `${c.vp_x} van ${c.vp_y} verplichte WPI’s uitgevoerd; ${c.vp_mis.length} gemist.`;
        if (param) { rows = rows.filter((r) => r[3] === mlabel(param)); sub = `Maand ${mlabel(param)}: gemiste verplichte WPI’s.`; }
        return this.openModal("Gemiste verplichte WPI’s", sub, rows.length ? tbl(["Project", "Product", "Locatie", "Maand", "Soort", ""], rows) : `<div class="muted">Geen gemiste WPI’s in deze selectie.</div>`);
      }
      if (key === "oordeelmaand") {
        const o = D.om[param] || {};
        return this.openModal("Oordelen · " + mlabel(param), sel("Waarnemingen in deze maand."), `<div style="margin-bottom:6px">${oc(o)}</div>`);
      }
      if (key === "klasse") {
        const v = D.klasse[param] || {};
        return this.openModal(param, sel("Waarnemingen in deze klasse."), tbl(["", "Aantal"],
          [["Conform", v.Conform || 0], ["Afwijking", v.Afwijking || 0], ["Verbeterpunt", v.Verbeterpunt || 0], ["Totaal gezien", v.tot || 0]].map((r) => [`<span class="badge b-${r[0] === "Totaal gezien" ? "N" : r[0][0]}">${esc(r[0])}</span>`, r[1]])));
      }
      if (key === "inspecties") {
        const wmap = D.wmap;
        const rows = Object.entries(D.perWpi).sort().map(([nr, w]) => [esc(nr), wmap[nr] && wmap[nr].inspecteur ? WPI.inspLabel(null, wmap[nr].inspecteur) : "–", esc(w.ingang || ""), oc(w.oord || {})]);
        return this.openModal("Inspecties", sel(D.n_wpi + (D.n_wpi === 1 ? " WPI" : " WPI’s") + (ft ? " in deze selectie." : " in de periode.")), rows.length ? `<div class="tablewrap">${tbl(["WPI", "Inspecteur", "Ingang", "Oordelen"], rows)}</div>` : `<div class="muted">Geen inspecties in deze selectie.</div>`);
      }
      if (key === "acties") {
        const rows = this.data.trendacties.map((a) => [esc(a.nr), esc(a.onderwerp), esc(a.actiehouder), esc(a.termijn), `<span class="badge ${a.status === "Open" ? "b-V" : "b-done"}">${esc(a.status)}</span>`]);
        return this.openModal("Trendacties (VCA 7.2)", "Acties uit de trendanalyse, met actiehouder en termijn.", `<div class="tablewrap">${tbl(["Nr", "Onderwerp", "Actiehouder", "Termijn", "Status"], rows)}</div>
          <button class="btn ghost sm" style="margin-top:14px"${act("exportCSV")}>${svg("list", 16)} Exporteer CSV</button>`);
      }
    },
  });
})();
