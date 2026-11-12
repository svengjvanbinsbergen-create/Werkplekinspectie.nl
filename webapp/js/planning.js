/* Werkplekinspectie — js/planning.js
   Planning: ingeplande inspecties (model, demo-data, formulier, overzicht).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, USERS, staf, naam, isoDag, plusDagen, dagLabel, dagenTot, stBadge, tril } = window.WPI;
  Object.assign(window.App, {
    // ---------------- PLANNING ----------------
    planning: null,
    productNaam(code) { return ((this.data.kennisbank || {})[code] || {}).naam || code || "–"; },
    async laadPlanning() {
      if (this.planning) return this.planning;
      let p = []; try { p = await DB.getAll("planning"); } catch (e) {}
      if (!p.length && !localStorage.getItem("wpi_demo_plan")) {
        const d = this.demoPlanning(); try { for (const x of d) await DB.put("planning", x); localStorage.setItem("wpi_demo_plan", "1"); } catch (e) {}
        p = d;
      }
      this.planning = p; return p;
    },
    demoPlanning() {
      const b = (o) => Object.assign({ demo: true, status: "gepland", toelichting: "" }, o);
      return [
        b({ id: "PL-demo1", datum: plusDagen(0), code: "DAM", project: "P26-168", locatie: "RWZI Voorbeeldstad", inspecteur: "u-insp", monteurs: 2 }),
        b({ id: "PL-demo2", datum: plusDagen(0), code: "POM", project: "P26-171", locatie: "Gemaal De Hoek", inspecteur: "u-winfred", monteurs: 3 }),
        b({ id: "PL-demo3", datum: plusDagen(1), code: "ROO", project: "P26-175", locatie: "RWZI Oostdijk", inspecteur: "u-douwe", monteurs: 2 }),
        b({ id: "PL-demo4", datum: plusDagen(5), code: "IDV", project: "P26-180", locatie: "Gemaal Noordpolder", inspecteur: "u-winfred", monteurs: 4 }),
        b({ id: "PL-demo5", datum: plusDagen(8), code: "BAN", project: "P26-182", locatie: "RWZI Voorbeeldstad", inspecteur: "u-bjorn", monteurs: 2 }),
        b({ id: "PL-demo6", datum: plusDagen(-3), code: "ROO", project: "P26-166", locatie: "RWZI Westerkwartier", inspecteur: "u-douwe", monteurs: 2 }),
      ];
    },
    startGepland(id) {
      const p = (this.planning || []).find((x) => x.id === id); if (!p) return;
      this.startInspectie(p.code, p.project || "", this.productNaam(p.code) + (p.locatie ? " · " + p.locatie : ""), false, p.id);
    },
    planForm(id) {
      const p = id ? (this.planning || []).find((x) => x.id === id) : null, kb = this.data.kennisbank;
      const prod = Object.keys(kb).sort((a, b) => kb[a].naam.localeCompare(kb[b].naam)).map((c) => `<option value="${c}"${p && p.code === c ? " selected" : ""}>${esc(kb[c].naam)}</option>`).join("");
      const mens = USERS.map((u) => `<option value="${u.id}"${(p ? p.inspecteur : this.user.id) === u.id ? " selected" : ""}>${esc(u.full_name)} · ${esc(u.functie)}</option>`).join("");
      const veld = (lab, inner) => `<label class="flab">${lab}</label>${inner}`;
      const snel = [[0, "Vandaag"], [1, "Morgen"], [7, "Over een week"]].map(([n, l]) => `<button class="chipb" onclick="document.getElementById('pl-datum').value='${plusDagen(n)}'">${l}</button>`).join("");
      this.openModal(p ? "Inspectie wijzigen" : "Inspectie inplannen", "Wie inspecteert wat, waar en wanneer.",
        `${veld("Product", `<select id="pl-code" class="fin"><option value="">Kies…</option>${prod}</select>`)}
         <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div>${veld("Project", `<input id="pl-project" class="fin" placeholder="P26-…" value="${esc(p ? p.project : "")}">`)}</div>
           <div>${veld("Monteurs", `<input id="pl-mont" class="fin" type="number" min="0" placeholder="aantal" value="${p && p.monteurs ? p.monteurs : ""}">`)}</div></div>
         ${veld("Locatie", `<input id="pl-loc" class="fin" placeholder="Bijv. RWZI Voorbeeldstad" value="${esc(p ? p.locatie : "")}">`)}
         ${veld("Datum", `<input id="pl-datum" type="date" class="fin" value="${p ? p.datum : plusDagen(1)}"><div class="chips" style="margin-top:8px">${snel}</div>`)}
         ${veld("Inspecteur", `<select id="pl-insp" class="fin">${mens}</select>`)}
         ${veld("Toelichting (optioneel)", `<textarea id="pl-toel" class="fin" rows="2" placeholder="Bijv. let op hijswerk met mobiele kraan">${esc(p ? p.toelichting : "")}</textarea>`)}
         <div id="ai-fout" class="fout"></div>
         <button class="btn primary" style="margin-top:8px" onclick="App.bewaarPlan(${p ? `'${p.id}'` : "null"})">${p ? "Opslaan" : "Inplannen"}</button>
         ${p ? `<button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.verwijderPlan('${p.id}')">Uit de planning halen</button>` : ""}`);
    },
    async bewaarPlan(id) {
      const code = $("pl-code").value, datum = $("pl-datum").value, insp = $("pl-insp").value;
      if (!code) return this.fout("Kies een product.");
      if (!datum) return this.fout("Kies een datum.");
      await this.laadPlanning();
      let p = id ? this.planning.find((x) => x.id === id) : null;
      if (!p) { p = { id: "PL-" + Date.now(), status: "gepland", gemaakt_door: this.user.id }; this.planning.push(p); }
      Object.assign(p, { code, datum, inspecteur: insp, project: $("pl-project").value.trim(), locatie: $("pl-loc").value.trim(), monteurs: +$("pl-mont").value || null, toelichting: $("pl-toel").value.trim() });
      try { await DB.put("planning", p); } catch (e) { return this.fout("Opslaan op dit toestel mislukt."); }
      tril(30); this.closeModal();
      this.toast = `Ingepland: ${this.productNaam(code)} · ${dagLabel(datum)} · ${naam(insp)}`; this.route();
    },
    async verwijderPlan(id) { this.planning = this.planning.filter((x) => x.id !== id); try { await DB.del("planning", id); } catch (e) {} this.closeModal(); this.route(); },
    async view_planning() {
      await this.laadPlanning();
      const v = $("view"), vandaag = isoDag(new Date()), me = this.user.id, P = this.planning;
      const zicht = staf() ? P : P.filter((p) => p.inspecteur === me);
      v.appendChild(el(`<div><div class="hi">${staf() ? "Inspectieprogramma van het team" : "Jouw inspecties"}</div><h1 class="groot">Planning</h1></div>`));
      if (this.toast) { v.appendChild(el(`<div class="toast" style="margin:-6px 0 12px">✓ ${esc(this.toast)}</div>`)); this.toast = null; }
      v.appendChild(el(`<button class="btn primary" style="margin-bottom:16px" onclick="App.planForm()">${svg("plus", 18)} Inspectie inplannen</button>`));
      const g = (l, lijst, warm) => lijst.length ? `<h2 class="${warm ? "warmkop" : ""}">${l} <span class="s">${lijst.length}</span></h2><div class="pkaarten">${lijst.map((p) => this.planKaart(p, vandaag)).join("")}</div>` : "";
      const gp = zicht.filter((p) => p.status === "gepland").sort((a, b) => a.datum.localeCompare(b.datum));
      const html = g("Nog niet gedaan", gp.filter((p) => p.datum < vandaag), true) + g("Vandaag", gp.filter((p) => p.datum === vandaag))
        + g("Komende 7 dagen", gp.filter((p) => p.datum > vandaag && dagenTot(p.datum) <= 7)) + g("Later", gp.filter((p) => dagenTot(p.datum) > 7))
        + (zicht.some((p) => p.status === "uitgevoerd") ? g("Uitgevoerd", zicht.filter((p) => p.status === "uitgevoerd").sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 6)) : "");
      v.appendChild(el(`<div>${html || `<div class="leeg"><span class="bol">📅</span><div class="t">Nog niets ingepland</div><div class="s">Tik op “Inspectie inplannen”.</div></div>`}</div>`));
    },
    planKaart(p, vandaag) {
      const d = dagenTot(p.datum), dl = d === 0 ? "Vandaag" : d === 1 ? "Morgen" : dagLabel(p.datum), u = USERS.find((x) => x.id === p.inspecteur);
      const magStarten = p.status === "gepland" && p.datum <= vandaag && p.inspecteur === this.user.id;
      return `<div class="pkaart"><div class="boven"><span class="dchip${p.status === "gepland" && d < 0 ? " warm" : ""}">📅 ${dl}</span>${p.status === "uitgevoerd" ? stBadge("Afgerond").replace("Afgerond", "Uitgevoerd") : ""}${p.demo ? `<span class="s">voorbeeld</span>` : ""}
          ${p.status === "gepland" ? `<button class="wijzig" onclick="App.planForm('${p.id}')" aria-label="Wijzigen">Wijzig</button>` : ""}</div>
        <div class="titel">${esc(this.productNaam(p.code))}</div>
        <div class="s">${esc([p.project, p.locatie].filter(Boolean).join(" · "))}${p.monteurs ? " · " + p.monteurs + " monteurs" : ""}</div>
        ${p.toelichting ? `<div class="s" style="margin-top:4px">“${esc(p.toelichting)}”</div>` : ""}
        <div class="onder"><span class="mini-av">${u ? esc(u.full_name[0]) : "?"}</span><span>${u ? esc(u.full_name) : "–"}</span>
          ${magStarten ? `<button class="btn primary sm" style="margin-left:auto" onclick="App.startGepland('${p.id}')">Start</button>` : ""}
          ${p.status === "uitgevoerd" && p.inspectie_id ? `<a class="s" style="margin-left:auto;color:var(--accent);font-weight:800" href="#/rapport/${p.inspectie_id}">Rapport ›</a>` : ""}</div></div>`;
    },
  });
})();
