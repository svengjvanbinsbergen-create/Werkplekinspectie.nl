/* Werkplekinspectie — js/kwartaal.js
   Kwartaalrapportage (directie, webversie).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, isoDag, stBadge, act } = window.WPI;
  Object.assign(window.App, {
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
    kiesKwartaal(q) { this.kwartaal = q; this.route(); },
    view_kwartaal() {
      const qs = Object.keys(this.KW); if (!this.kwartaal) this.kwartaal = qs[qs.length - 1];
      const K = this.kwCijfers(this.kwartaal), qi = qs.indexOf(this.kwartaal), V = qi > 0 ? this.kwCijfers(qs[qi - 1]) : null, P = this.PAL, v = $("view");
      const delta = (nu, toen, eenheid) => nu == null || toen == null ? "" : nu === toen ? `<span class="delta">= gelijk aan ${V.q}</span>` : `<span class="delta ${nu > toen ? "op" : "neer"}">${nu > toen ? "▲" : "▼"} ${Math.abs(nu - toen)}${eenheid} t.o.v. ${V.q}</span>`;
      const lopend = K.mnd.some((m) => m >= isoDag(new Date()).slice(0, 7));
      v.appendChild(el(`<div class="noprint"><div class="hi">Voor de directie · VCA 7.1 en 7.2</div><h1 class="groot">Kwartaalrapportage</h1>
        <div class="tabs" style="margin-bottom:16px"><span role="group" aria-label="Kwartaal kiezen" style="display:contents">${qs.map((q) => `<button class="tabp${q === this.kwartaal ? " on" : ""}"${act("kiesKwartaal", q)} aria-pressed="${q === this.kwartaal}">${q}</button>`).join("")}</span>
        <button class="tabp" style="margin-left:auto"${act("printen")}>${svg("doc", 16)} Opslaan als PDF</button></div></div>`));
      const top3 = Object.entries(K.klasse).filter(([, x]) => x.AV).sort((a, b) => b[1].AV - a[1].AV).slice(0, 3);
      const goed = Object.entries(K.klasse).filter(([, x]) => x.C >= 3).sort((a, b) => (b[1].C / (b[1].C + b[1].AV)) - (a[1].C / (a[1].C + a[1].AV)) || b[1].C - a[1].C).slice(0, 3);
      const zin = [];
      zin.push(`In ${K.q} zijn <b>${K.wpis.length} werkplekinspecties</b> uitgevoerd${K.producten.length ? ` bij ${K.producten.length} producten` : ""}, met <b>${K.regels.length} waarnemingen</b>.`);
      // doel % conform (Beheer) hoort bij de conform-zin; het programmadoel (90%) bij de programma-zin
      const doel = this.doelConform ? this.doelConform() : null;
      if (K.pct != null) zin.push(`<b>${K.pct}%</b> van de beoordeelde waarnemingen was conform${V && V.pct != null ? (K.pct > V.pct ? `, ${K.pct - V.pct} procentpunt hoger dan in ${V.q}` : K.pct < V.pct ? `, ${V.pct - K.pct} procentpunt lager dan in ${V.q}` : `, gelijk aan ${V.q}`) : ""}`
        + (doel != null ? (K.pct >= doel ? `; daarmee is het doel van ${doel}% conform gehaald` : `; dat is onder het doel van ${doel}% conform`) : "") + `.`);
      else if (doel != null) zin.push(`Of het doel van ${doel}% conform is gehaald, is niet te zeggen: te weinig beoordeelde waarnemingen (n = ${K.beo}).`);
      if (K.progPct != null) zin.push(`Van het verplichte inspectieprogramma is <b>${K.prog.ok} van ${K.prog.y}</b> (${K.progPct}%) uitgevoerd${K.progPct < 90 ? ", onder het programmadoel van 90%" : "; het programmadoel van 90% is gehaald"}.`);
      if (top3.length) zin.push(`De meeste aandachtspunten zaten bij <b>${esc(top3[0][0].toLowerCase())}</b>${top3[1] ? ` en ${esc(top3[1][0].toLowerCase())}` : ""}.`);
      v.appendChild(el(`<div id="kwrap" class="kwrap">
        <div class="kwkop"><div><div class="hi">Werkplekinspecties · Noardling</div><div class="kwtitel">Kwartaalrapportage ${K.q}</div>
          <div class="s">Peildatum ${esc(this.data.voorbeelddata.peildatum || "")} · ${lopend ? "kwartaal loopt nog" : "afgesloten kwartaal"} · voorbeelddata (fictief)</div></div><span class="logo groot">N</span></div>

        <div class="card kwverhaal"><h2 class="kaartkop">In het kort</h2><p>${zin.join(" ")}</p></div>

        <div class="grid kpis kwkpis">
          <div class="tile ${doel != null && K.pct != null && K.pct < doel ? "mist" : "sage"}"><div class="lab">Conform</div><div class="n">${K.pct != null ? K.pct + "%" : "n=" + K.beo}</div><div class="sub">${doel != null ? "doel " + doel + "% " : ""}${delta(K.pct, V && V.pct, " pp")}</div></div>
          <div class="tile ${K.progPct >= 90 ? "sage" : "blush"}"><div class="lab">Programma</div><div class="n">${K.progPct != null ? K.progPct + "%" : "–"}</div><div class="sub">${K.prog.ok}/${K.prog.y} · doel 90% ${delta(K.progPct, V && V.progPct, " pp")}</div></div>
          <div class="tile sky"><div class="lab">Inspecties</div><div class="n">${K.wpis.length}</div><div class="sub">${delta(K.wpis.length, V && V.wpis.length, "")}</div></div>
          <div class="tile ${K.over.length ? "blush" : "sage"}"><div class="lab">Acties op tijd afgerond</div><div class="n">${K.af.length ? Math.round(100 * K.optijd.length / K.af.length) + "%" : "–"}</div><div class="sub">${K.optijd.length} van ${K.af.length} afgerond · ${K.over.length} over termijn</div></div>
        </div>

        <div class="grid dashgrid kwgrid">
          <div class="card grafiek breed"><h2 class="kaartkop">1 · Hoe ontwikkelt het zich? <span class="sub">% conform per maand</span></h2>${this.chartTrend(K.maanden, K.om)}</div>
          <div class="card"><h2 class="kaartkop">2 · Wat ging goed</h2>
            <p class="s" style="margin-bottom:10px">${K.o.Conform} conforme waarnemingen. Waar het het beste ging:</p>
            ${goed.length ? goed.map(([k, x]) => `<div class="kwrij"><span class="bolletje" style="background:${P.C}"></span><span class="grow">${esc(k)}</span><b>${Math.round(100 * x.C / (x.C + x.AV))}% conform</b></div>`).join("") : `<div class="s">Te weinig waarnemingen per klasse.</div>`}</div>
          <div class="card"><h2 class="kaartkop">3 · Waar moet aandacht naartoe</h2>
            ${top3.length ? top3.map(([k, x], i) => `<div class="kwrij"><span class="nr">${i + 1}</span><span class="grow">${esc(k)}</span><b>${x.AV}×</b></div>`).join("") : `<div class="s">Geen afwijkingen of verbeterpunten. 🌿</div>`}
            ${K.themas.length ? `<div class="s" style="margin:12px 0 6px;font-weight:800">Terugkerende thema's</div>${K.themas.map((t) => `<div class="kwthema">“${esc(t.thema)}” <span class="s">· ${t.nq}× dit kwartaal</span></div>`).join("")}` : ""}</div>
          <div class="card"><h2 class="kaartkop">4 · Acties</h2>
            <div class="kwrij"><span class="grow">Aangemaakt</span><b>${K.acties.length}</b></div>
            <div class="kwrij"><span class="grow">Afgerond na toetsing</span><b>${K.af.length}</b></div>
            <div class="kwrij"><span class="grow">Daarvan op tijd</span><b>${K.optijd.length}</b></div>
            <div class="kwrij"><span class="grow">Nog open</span><b>${K.open.length}</b></div>
            <div class="kwrij"><span class="grow">Over termijn</span><b style="color:${K.over.length ? P.warmInk || "#8F5409" : "inherit"}">${K.over.length}</b></div></div>
          <div class="card"><h2 class="kaartkop">5 · Wat gaan we doen <span class="sub">trendacties VCA 7.2</span></h2>
            ${this.data.trendacties.slice(0, 5).map((t) => `<div class="kwrij"><span class="grow">${esc(t.onderwerp)}</span>${stBadge(t.status === "Open" ? "Open" : "Afgerond")}</div>`).join("")}
            <div class="s noprint" style="margin-top:8px"><a href="#/kwartaal" data-geen-default${act("drill", "acties")} style="color:var(--accent);font-weight:800">Alle trendacties ›</a></div></div>
        </div>

        <div class="card kwnoot"><h2 class="kaartkop">Methode</h2><p class="s">Werkplekinspecties zijn momentopnames: alleen wat de inspecteur zelf zag telt (VCA 2026/6.1 eis 7.1). Conform-% is berekend over beoordeelde waarnemingen (C, A, V), zonder ‘niet van toepassing’. Bij minder dan 5 waarnemingen tonen we geen percentage. Een afwijking zegt iets over de situatie op dat moment, niet over personen. Acties zijn pas afgerond na toetsing door een ander dan de actiehouder.</p>
          <div class="kwteken"><div><div class="s">Opgesteld door</div><b>${esc(this.user.full_name)}</b><div class="s">${esc(this.user.functie)}</div></div><div><div class="s">Datum</div><b>${new Date().toLocaleDateString("nl-NL")}</b></div><div><div class="s">Besproken met directie op</div><div class="lijntje"></div></div></div></div>
      </div>`));
    },
  });
})();
