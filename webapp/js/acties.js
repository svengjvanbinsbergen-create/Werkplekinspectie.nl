/* Werkplekinspectie — js/acties.js
   Acties: statusmodel, bakjes, overzicht, actiekaart/-tabel, actie openen en alle statuswijzigingen.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, fotoDataURL, USERS, staf, isWeb, naam, kort, plusDagen, dagLabel, dagenTot, PRIO,
    stBadge, tril } = window.WPI;
  Object.assign(window.App, {
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
        <div style="margin:8px 0 14px;display:flex;gap:10px;align-items:flex-start"><span class="lbl jij">Waarneming</span><div style="flex:1;line-height:1.45">“${esc(a.waarneming || "")}”</div>${a.foto ? `<img src="${esc(WPI.fotoSrc(a.foto))}" alt="foto" style="height:64px;border-radius:10px">` : ""}</div>`;
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
        if (a.nafoto) h += `<div class="s" style="font-weight:600;margin-bottom:4px">Na-foto (na uitvoering)</div><div style="display:flex;gap:10px;margin-bottom:12px">${a.foto ? `<figure style="margin:0"><img src="${esc(WPI.fotoSrc(a.foto))}" style="height:110px;border-radius:10px"><figcaption class="s">voor</figcaption></figure>` : ""}<figure style="margin:0"><img src="${esc(WPI.fotoSrc(a.nafoto))}" style="height:110px;border-radius:10px"><figcaption class="s">na</figcaption></figure></div>`;
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
  });
})();
