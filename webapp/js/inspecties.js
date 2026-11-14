/* Werkplekinspectie — js/inspecties.js
   Inspecties: overzicht van afgeronde inspecties en het rapport.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, staf, naam, kort, dagLabel, stBadge, act, op, WAARDE } = window.WPI;
  // oordeel uit een (lokaal) record alleen als C/A/V/NVT in de HTML (anders leeg): nooit ruwe tekst in class of tekst
  const ov = (o) => ({ C: "C", A: "A", V: "V", NVT: "NVT" }[o] === o ? o : "");
  Object.assign(window.App, {
    // ---------------- INSPECTIES ----------------
    // filter per inspecteur (geen filter per monteur: monteurs blijven wel aan de inspectie gekoppeld en staan op de kaart)
    inspFilter: { insp: "" },
    zetInspFilter(k, waarde) { if (k !== "insp") return; this.inspFilter[k] = waarde; this.route(); },
    wisInspFilter() { this.inspFilter = { insp: "" }; this.route(); },
    async view_inspecties() {
      const v = $("view"), mine = !WPI.mag("zietAlles"), f = this.inspFilter;   // iedereen in het team ziet alle inspecties
      const nr = this._routeNr;
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      if (nr !== this._routeNr) return;   // intussen opnieuw gerouteerd: niet dubbel tekenen
      // één lijst: eigen (op dit toestel) + voorbeeld-inspecties, met inspecteur en monteurs
      const rijen = saved.filter((r) => !mine || r.inspecteur_id === this.user.id).map((r) => ({
        eigen: true, id: r.id, titel: r.titel, datum: (r.opgeslagen || "").slice(0, 10), inspecteur: r.inspecteur, inspecteur_id: r.inspecteur_id || null, monteurs: r.monteurs || [],
        sub: ((n) => n + (n === 1 ? " waarneming" : " waarnemingen"))(r.versie >= 2 ? r.waarnemingen.length : Object.values(r.oordelen || {}).filter(Boolean).length) + (r.handtekening ? " · ondertekend" : "") }))
        .concat(mine ? [] : (this.data.voorbeelddata.wpis || []).map((w) => ({ eigen: false, id: w.nr, titel: w.product + " · " + (w.locatie || ""), datum: w.datum, inspecteur: w.inspecteur, monteurs: this.demoMonteurs(w), sub: w.nr + " · " + (w.ingang || "") })))
        .sort((a, b) => b.datum.localeCompare(a.datum));
      const inspecteurs = [...new Set(rijen.map((r) => r.inspecteur))].sort();
      const lijst = rijen.filter((r) => !f.insp || r.inspecteur === f.insp);
      v.appendChild(el(`<div><div class="hi">${mine ? "Jouw inspecties" : "Alle inspecties"}</div><h1 class="groot">Inspecties</h1></div>`));
      const sel = (k, opts, lab) => `<select class="fin filtersel${f[k] ? " aan" : ""}" aria-label="${esc(lab)}"${op("change", "zetInspFilter", k, WAARDE)}><option value="">${lab}</option>${opts.map((o) => `<option${f[k] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      if (!mine) v.appendChild(el(`<div class="filterbalk">${sel("insp", inspecteurs, "Alle inspecteurs")}
        ${f.insp ? `<button class="linkje"${act("wisInspFilter")}>Wis filter</button>` : ""}</div>`));
      v.appendChild(el(`<div class="s uitleg">${lijst.length} inspectie${lijst.length === 1 ? "" : "s"}${f.insp ? ` door ${esc(f.insp)}` : ""}. Eigen inspecties staan veilig op dit toestel; voorbeelden zijn fictief.</div>`));
      v.appendChild(el(lijst.length ? `<div class="ikaarten">${lijst.map((r) => `<div class="ikaart"${r.eigen ? ` style="cursor:pointer"${act("go", "rapport/" + r.id)}` : ""}>
          <div class="boven"><span class="dchip">📅 ${dagLabel(r.datum)}</span>${r.eigen ? `<span class="badge b-done">op dit toestel</span>` : `<span class="s">voorbeeld</span>`}</div>
          <div class="titel">${esc(r.titel)}</div><div class="s">${esc(r.sub)}</div>
          <div class="onder"><span class="sr-only">Inspecteur:</span>${WPI.inspLabel(r.inspecteur_id, r.inspecteur)}</div>
          ${r.monteurs.length ? `<div class="monteurs"><span class="sr-only">Monteurs:</span>${r.monteurs.map((n) => `<span class="mchip">${esc(n)}</span>`).join("")}</div>` : ""}</div>`).join("")}</div>`
        : `<div class="leeg"><span class="bol">🔍</span><div class="t">Geen inspecties gevonden</div><div class="s">${mine ? "Start er een via Vandaag." : "Pas het filter aan."}</div></div>`));
    },
    async view_rapport(parts) {
      const id = parts[0], rnr = this._routeNr;
      const v = $("view");
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      if (rnr !== this._routeNr) return;   // intussen opnieuw gerouteerd: niet dubbel tekenen
      const r = saved.find((x) => x.id === id);
      if (!r) { v.appendChild(el(`<div><button class="btn ghost sm"${act("go", "inspecties")}>${svg("back", 16)} Terug</button><h1>Rapport niet gevonden</h1></div>`)); return; }
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
          <span class="badge b-${ov(w.oordeel) === "NVT" ? "N" : ov(w.oordeel)}">[${ov(w.oordeel)}] ${ob[ov(w.oordeel)] || ""}</span></div>`;
      }).join("");
      const acties = ws.filter((w) => (w.oordeel === "A" || w.oordeel === "V") && w.actie);
      await this.laadActies();
      if (rnr !== this._routeNr) return;   // intussen opnieuw gerouteerd: niet dubbel tekenen
      const aRows = acties.map((w, n) => {
        const i = this.infoVoor(r.code, w.regel_id, w.buiten), live = (this.acties || []).find((x) => x.id === w.actie.actie_id);
        const a = live || w.actie;   // live status uit Acties; oude rapporten (v2) vallen terug op het record
        const houder = live ? (live.houder ? naam(live.houder) : "nog in te stellen") : a.houder || "–";
        const toetser = live ? (live.toetser ? naam(live.toetser) : "nog in te stellen") : a.toetser || "–";
        return `<div class="row" style="align-items:flex-start${live ? ";cursor:pointer" : ""}"${live ? `${act("openActie", live.id)}` : ""}><span class="grow"><span class="t">${n + 1}. ${esc(a.tekst || "(geen actietekst)")}</span>
          <div class="s">${esc(i.ref)} · dringendheid volgens inspecteur: ${prioLab[w.actie.prio] || "–"}${live ? " · plandatum " + dagLabel(live.plandatum) : a.termijn ? " · termijn " + esc(a.termijn) : ""}</div>
          <div class="s">Actiehouder: ${esc(houder)} · toetser: ${esc(toetser)}</div>
          ${w.actie.terPlaatse === "maatregel" ? `<div class="s">Ter plaatse een maatregel genomen; actie blijft open tot uitgevoerd en getoetst.</div>` : ""}</span>
          ${stBadge(live ? live.status : a.status || "Open")}</div>`;
      }).join("");
      const kz = r.keuzes || [], kc = (u) => kz.filter((k) => k.uitkomst === u).length, meer = (n, een, veel) => n + " " + (n === 1 ? een : veel);
      let nr = 0; const kop = (t) => `<h2>${++nr}. ${t}</h2>`;   // doorlopend genummerd, ook als een sectie ontbreekt
      // alle foto's per waarneming (hoofdfoto + extraFotos, zie App.fotoLijst); oude records met alleen w.foto blijven werken
      const fotos = ws.flatMap((w) => { const l = this.fotoLijst(w); return l.map((f, i) => ({ w, f, i, n: l.length })); });
      v.appendChild(el(`<div class="noprint"><button class="btn ghost sm"${act("go", "inspecties")}>${svg("back", 16)} Terug</button></div>`));
      v.appendChild(el(`<div id="rap">
        <div class="kicker" style="margin-top:12px">WPI-rapport · momentopname · ${new Date(r.opgeslagen).toLocaleString("nl-NL")}</div>
        <h1 style="margin-bottom:6px">${esc(r.titel)}</h1>
        <div class="s rapkop">Project ${esc(r.project || "–")} · inspecteur ${WPI.inspLabel(r.inspecteur_id, r.inspecteur)}</div>
        ${kop("Getoetst tijdens bezoek")}<div class="card"><div class="s">${taken.map(esc).join(" · ")}</div>
          <div class="s" style="margin-top:6px">Monteurs: ${(r.monteurs || []).length ? (r.monteurs || []).map(esc).join(", ") : "niet vastgelegd"}</div></div>
        ${kop("Waarnemingen")}<div class="listcard">${wRows || '<div class="row"><span class="s">Geen</span></div>'}</div>
        ${acties.length ? `${kop("Acties")}<div class="listcard">${aRows}</div>` : ""}
        ${r.gesprek ? `${kop("Gesprek met de monteurs")}<div class="card" style="line-height:1.5">${esc(r.gesprek)}</div>` : ""}
        ${r.positief ? `${kop("Wat ging opvallend goed")}<div class="card" style="line-height:1.5">${esc(r.positief)}</div>` : ""}
        ${fotos.length ? `${kop("Foto's")}<div class="rapfotos" style="display:flex;gap:10px;flex-wrap:wrap">${fotos.map(({ w, f, i, n }) => `<figure style="margin:0"><img src="${esc(WPI.fotoSrc(f))}" alt="${esc(this.infoVoor(r.code, w.regel_id, w.buiten).ref)} · foto ${i + 1} van ${n}" style="width:180px;border-radius:12px"><figcaption class="s">${esc(this.infoVoor(r.code, w.regel_id, w.buiten).ref)}${n > 1 ? ` · foto ${i + 1}/${n}` : ""}</figcaption></figure>`).join("")}</div>` : ""}
        ${kop("Ondertekening")}
        <div class="card"><div class="s">Inspecteur: ${esc(r.inspecteur)} · ${new Date(r.opgeslagen).toLocaleString("nl-NL")}</div>
          ${r.handtekening ? `<img src="${esc(WPI.fotoSrc(r.handtekening))}" alt="Handtekening van ${esc(r.inspecteur || "de inspecteur")}" style="height:90px;margin-top:8px">` : `<div class="s" style="margin-top:8px">Niet ondertekend</div>`}</div>
        ${kz.length ? `<div class="s" style="margin-top:14px;line-height:1.5">Hulp van de app bij deze inspectie: ${meer(kc("voorstel gebruikt"), "voorstel", "voorstellen")} gebruikt · ${kc("voorstel aangepast")} aangepast · ${kc("zelf gekozen") + kc("zelf geschreven")} keer zelf gekozen. Elk oordeel (C/A/V) is door de inspecteur zelf gegeven.</div>` : ""}
        ${r.open_punten && r.open_punten.length ? `<div class="s" style="margin-top:6px">Vastgelegd met ${meer(r.open_punten.length, "open herinnering", "open herinneringen")}: ${esc(r.open_punten.join(" "))}</div>` : ""}
      </div>`));
      v.appendChild(el(`<button class="btn primary noprint" style="margin-top:16px"${act("printen")}>${svg("list", 18)} Opslaan als PDF / printen</button>`));
    },
  });
})();
