/* Werkplekinspectie — js/acties.js
   Acties: statusmodel, bakjes, overzicht, actiekaart/-tabel, actie openen en alle statuswijzigingen.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, fotoDataURL, USERS, staf, mag, personenOpties, nietKiesbaar, isWeb, naam, kort, plusDagen, dagLabel, dagenTot, PRIO,
    stBadge, tril, act } = window.WPI;
  // prioriteit volgens de inspecteur: rustige chip (warm oranje blijft voor "te laat")
  const prioChip = (p) => PRIO[p] ? `<span class="pchip p-${esc(p)}"><span class="pbol" aria-hidden="true"></span>Prio ${esc(PRIO[p].lab.split(" · ")[0].toLowerCase())}</span>` : "";
  const prioTekst = (p) => PRIO[p] ? PRIO[p].lab : "";
  Object.assign(window.App, {
    // ---------------- ACTIES ----------------
    acties: null, actFilter: null,
    actTab(k) { this.actFilter = k; this.route(); },   // tabblad op Acties
    // naar Acties met een filter (null = standaard); al op Acties: opnieuw tekenen
    naarActies(f) { this.actFilter = f == null ? null : f; if (location.hash === "#/acties") this.route(); else this.go("acties"); },
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
      const b = (o) => Object.assign({ demo: true, inspectie_titel: t, inspecteur: "Carla Proef", foto: null, terPlaatse: "niets" }, o);
      return [
        b({ id: "ACT-demo1", ref: "DAM-2.07", oordeel: "A", waarneming: "Gasmeter hing boven aan de ladder, niet bij de man in de put.", tekst: "Gasmeter altijd meenemen naar de man in de put; toolbox gasmeting houden", prio: "kort", status: "In uitvoering", houder: "u-coord1", toetser: "u-hoofd", plandatum: plusDagen(-2), log: L("Ingesteld en gestart") }),
        b({ id: "ACT-demo2", ref: "Algemeen F", oordeel: "V", waarneming: "Afzetting rond de bouwput was aan één zijde weggehaald.", tekst: "Afzetting rond de bouwput rondom herstellen en dagelijks controleren", prio: "kort", status: "Open", houder: "u-coord2", toetser: "u-coord1", plandatum: plusDagen(0), log: L("Ingesteld") }),
        b({ id: "ACT-demo3", ref: "DAM-1.03", oordeel: "A", waarneming: "Hijsband vertoonde een rafelige rand.", tekst: "Hijsband afkeuren en vervangen; hijsmiddelencheck opnemen in de LMRA", prio: "direct", status: "Klaar voor toetsing", houder: "u-coord1", toetser: "u-coord2", plandatum: plusDagen(1), log: L("Klaar voor toetsing gemeld") }),
        b({ id: "ACT-demo4", ref: "Algemeen C", oordeel: "V", waarneming: "Eén monteur droeg geen gehoorbescherming bij het trillen van de damwand.", tekst: "Gehoorbescherming bij trilwerk bespreken in de toolbox en voorraad in de bus aanvullen", prio: "planmatig", status: "Voorstel", houder: null, toetser: null, plandatum: null, log: L("Actievoorstel uit de inspectie") }),
        b({ id: "ACT-demo5", ref: "DAM-3.02", oordeel: "V", waarneming: "Kabels lagen over het looppad naar de keet.", tekst: "Kabels via een kabelbrug of opgehangen langs het looppad leggen", prio: "planmatig", status: "Klaar voor toetsing", houder: "u-coord2", toetser: "u-hoofd", plandatum: plusDagen(6), log: L("Klaar voor toetsing gemeld") }),
      ];
    },
    // bakjes: hoofd, QHSE-manager en beheerder zien het lopende werk van het hele team, anderen hun eigen acties
    bakjes() {
      const me = this.user.id, A = this.acties || [], hoofd = mag("team");
      const loopt = (a) => a.status === "Open" || a.status === "In uitvoering";
      const scope = A.filter((a) => loopt(a) && (hoofd || a.houder === me));
      const opDatum = (x, y) => (x.plandatum || "9").localeCompare(y.plandatum || "9");
      const telaat = A.filter((a) => loopt(a) && a.plandatum && dagenTot(a.plandatum) < 0).sort(opDatum);   // hele team: iedereen krijgt de meldingen
      const wie = this.user.full_name, betrokken = (a) => a.houder === me || a.toetser === me || a.status === "Voorstel" || telaat.includes(a)
        || (a.log || []).some((l) => l.wie === wie);   // ook wat jij instelde of aanmaakte: "Alle" toont minstens wat de andere tabs tonen
      return {
        telaat,
        gepland: scope.filter((a) => !a.plandatum || dagenTot(a.plandatum) >= 0).sort(opDatum),
        toetsen: A.filter((a) => a.status === "Klaar voor toetsing" && a.toetser === me).sort(opDatum),
        instellen: A.filter((a) => a.status === "Voorstel"),   // iedereen mag instellen (zoals de server: zie supabase/migrations/0003_rls_rechten.sql)
        alle: (mag("zietAlles") ? A : A.filter(betrokken)).slice().sort((x, y) => (x.status === "Afgerond") - (y.status === "Afgerond") || opDatum(x, y)),
      };
    },

    async view_acties() {
      await this.laadActies();
      const v = $("view"), B = this.bakjes(), hoofd = mag("team");
      const tabs = [["telaat", "Te laat"], ["gepland", "Gepland"], ["toetsen", "Te toetsen"], ["instellen", "In te stellen"], ["alle", "Alle"]];
      if (!this.actFilter) this.actFilter = B.telaat.length ? "telaat" : B.toetsen.length ? "toetsen" : B.instellen.length ? "instellen" : "gepland";
      v.appendChild(el(`<div><div class="hi">${hoofd ? "Het hele team" : "Jouw acties"}</div><h1 class="groot">Acties</h1></div>`));
      // groot scherm (≥ 1500px): rechts een rustig overzicht (wie heeft wat, wat komt eraan), zodat een korte lijst geen
      // halve lege pagina geeft. Smaller: alles onder elkaar zoals altijd.
      const zij = isWeb() && window.matchMedia("(min-width: 1500px)").matches;
      let v2 = v;
      if (zij) { const g = el(`<div class="agrid"><div class="ahoofd"></div></div>`); v.appendChild(g); v2 = g.firstElementChild; g.appendChild(el(this.actieZij())); }
      { const v = v2;   // de rest van het scherm in de hoofdkolom
      v.appendChild(el(`<div class="tabs" role="group" aria-label="Welke acties tonen">${tabs.map(([k, l]) => `<button class="tabp${this.actFilter === k ? " on" : ""}${k === "telaat" && B.telaat.length ? " warm" : ""}"${act("actTab", k)} aria-pressed="${this.actFilter === k}">${l}<span>${B[k].length}</span></button>`).join("")}</div>`));
      const uitleg = { telaat: "Van het hele team. Iedereen krijgt hier elke 2 dagen een melding over.", gepland: "Op volgorde van plandatum.", toetsen: "Klaar gemeld door de actiehouder. Alleen jij als toetser kunt afronden.", instellen: "Voorstellen uit inspecties. Iedereen mag ze instellen: kies een actiehouder, een andere persoon als toetser en een plandatum.", alle: mag("zietAlles") ? "" : "Op jouw naam, door jou ingesteld of aangemaakt, voorstellen en wat te laat is." }[this.actFilter];
      if (uitleg) v.appendChild(el(`<div class="s uitleg">${uitleg}</div>`));
      const LEEG = { telaat: ["🌿", "Niets te laat", "Alle acties liggen op schema."], gepland: ["📅", "Niets gepland", "Er staan geen lopende acties op jouw naam."], toetsen: ["✅", "Niets te toetsen", "Er wacht niets op jouw toetsing."], instellen: ["✨", "Alles ingesteld", "Er staan geen voorstellen uit inspecties klaar."], alle: ["📋", "Nog geen acties", ""] }[this.actFilter];
      const lijst = B[this.actFilter] || [];
      if (!isWeb()) v.appendChild(el(`<button class="btn primary" style="margin:0 0 14px"${act("nieuweActie")}>${svg("plus", 18)} Nieuwe actie</button>`));
      if (isWeb() && lijst.length) { v.appendChild(el(this.actieTabel(lijst))); return; }
      v.appendChild(el(lijst.length ? `<div class="akaarten">${lijst.map((a) => this.actieKaart(a)).join("")}</div>`
        : `<div class="leeg"><span class="bol">${LEEG[0]}</span><div class="t">${LEEG[1]}</div><div class="s">${LEEG[2]}</div></div>`));
      }
    },
    // zijpaneel op een groot scherm: lopende acties per actiehouder en de eerstvolgende plandata (zelfde reikwijdte als "Alle")
    actieZij() {
      const A = mag("zietAlles") ? (this.acties || []) : this.bakjes().alle, loopt = (a) => a.status === "Open" || a.status === "In uitvoering";
      const lopend = A.filter(loopt), per = {};
      lopend.forEach((a) => { const k = a.houder || ""; (per[k] = per[k] || { n: 0, laat: 0 }).n++; if (a.plandatum && dagenTot(a.plandatum) < 0) per[k].laat++; });
      const wie = Object.entries(per).sort((x, y) => y[1].laat - x[1].laat || y[1].n - x[1].n || naam(x[0]).localeCompare(naam(y[0]), "nl"));
      const tel = (st) => A.filter((a) => a.status === st).length;
      const komt = lopend.filter((a) => a.plandatum && dagenTot(a.plandatum) >= 0).sort((x, y) => x.plandatum.localeCompare(y.plandatum)).slice(0, 4);
      const stand = [["Voorstel", "In te stellen"], ["Open", "Open"], ["In uitvoering", "In uitvoering"], ["Klaar voor toetsing", "Klaar voor toetsing"], ["Afgerond", "Afgerond"]];
      return `<aside class="azij" aria-label="Overzicht van de acties">
        <section class="card azkaart"><h2 class="azkop">Stand van zaken</h2><div class="azstand">${stand.map(([st, l]) => `<div><b>${tel(st)}</b><span>${l}</span></div>`).join("")}</div></section>
        <section class="card azkaart"><h2 class="azkop">Lopend per actiehouder</h2>${wie.length ? `<ul class="azlijst">${wie.map(([id, x]) => `<li>${id ? WPI.persLabel(id) : `<span class="s">nog geen actiehouder</span>`}
            <span class="aztal">${x.laat ? `<span class="dchip warm">${x.laat} te laat</span>` : ""}<b>${x.n}</b><span class="sr-only"> lopend</span></span></li>`).join("")}</ul>` : `<p class="s">Geen lopende acties.</p>`}</section>
        <section class="card azkaart"><h2 class="azkop">Eerstvolgende plandata</h2>${komt.length ? `<ul class="azlijst">${komt.map((a) => `<li><button class="azactie"${act("openActie", a.id)}><span class="dchip${dagenTot(a.plandatum) === 0 ? " warm" : ""}">${dagenTot(a.plandatum) === 0 ? "vandaag" : esc(dagLabel(a.plandatum))}</span><span class="azt">${esc(kort(a.tekst || "", 70))}</span></button></li>`).join("")}</ul>` : `<p class="s">Niets ingepland.</p>`}</section>
      </aside>`;
    },
    actieKaart(a) {
      const d = a.plandatum ? dagenTot(a.plandatum) : null, loopt = a.status === "Open" || a.status === "In uitvoering";
      const plan = !a.plandatum ? `<span class="dchip">nog geen plandatum</span>`
        : loopt && d < 0 ? `<span class="dchip warm">${-d} dag${d === -1 ? "" : "en"} te laat</span>`
        : loopt && d === 0 ? `<span class="dchip warm">vandaag</span>` : `<span class="dchip">📅 ${dagLabel(a.plandatum)}</span>`;
      const h = a.houder ? USERS.find((u) => u.id === a.houder) : null;
      return `<button class="akaart"${act("openActie", a.id)}>
        <div class="boven">${stBadge(a.status)}${plan}${prioChip(a.prio)}</div>
        <div class="titel">${esc(kort(a.tekst || "(geen tekst)", 110))}</div>
        <div class="onder">${h ? WPI.persLabel(h.id) : `<span>nog geen actiehouder</span>`}<span class="dot">·</span><span>${esc(a.ref || "")}</span>${a.demo ? `<span class="dot">·</span><span>voorbeeld</span>` : ""}</div></button>`;
    },
    actieRij(a) { return this.actieKaart(a); },
    // foto's bij de waarneming: a.foto (hoofdfoto, ook in oude acties) + a.extraFotos [{ foto }] (zie fotoLijst in inspectie.js)
    actieFotos(a) {
      const l = this.fotoLijst(a).map((f) => WPI.fotoSrc(f)).filter(Boolean).slice(0, 6);
      return l.length ? `<span class="afotos">${l.map((f, i) => `<img src="${esc(f)}" alt="Foto ${i + 1} van ${l.length} bij de waarneming">`).join("")}</span>` : "";
    },
    // computer: overzicht als tabel
    actieTabel(lijst) {
      const plan = (a) => { const d = a.plandatum ? dagenTot(a.plandatum) : null, loopt = a.status === "Open" || a.status === "In uitvoering";
        return !a.plandatum ? `<span class="s">–</span>` : loopt && d < 0 ? `<span class="dchip warm">${-d} d te laat</span>` : loopt && d === 0 ? `<span class="dchip warm">vandaag</span>` : dagLabel(a.plandatum); };
      const persoon = (id) => { const u = USERS.find((x) => x.id === id); return u ? `<span class="pers">${WPI.persLabel(u.id)}</span>` : `<span class="s">–</span>`; };
      // status boven de actietekst (niet in een eigen smalle kolom) en de herkomst in de grijze regel: de actietekst krijgt
      // de ruimte, ook naast het overzicht rechts op een groot scherm
      const herkomst = (a) => (a.handmatig ? "Handmatig" : (a.inspectie_titel || "").replace(/^Voorbeeld · /, "").split(" · ")[0]) + (a.demo ? " · voorbeeld" : "");
      return `<div class="card tabelkaart"><div class="tablewrap"><table class="atabel"><thead><tr><th>Actie</th><th>Actiehouder</th><th>Toetser</th><th>Plandatum</th></tr></thead><tbody>
        ${lijst.map((a) => `<tr${act("openActie", a.id)}><td class="atcel"><div class="atst">${stBadge(a.status)}</div><div class="at">${esc(kort(a.tekst || "", 140))}</div><div class="s">${esc(a.ref || "")} · oordeel ${esc(a.oordeel || "–")}${PRIO[a.prio] ? " · prio " + esc(prioTekst(a.prio).split(" · ")[0].toLowerCase()) : ""}${herkomst(a) ? " · " + esc(herkomst(a)) : ""}</div></td>
          <td>${persoon(a.houder)}</td><td>${persoon(a.toetser)}</td><td>${plan(a)}</td></tr>`).join("")}
      </tbody></table></div></div>`;
    },
    // telefoon: zelf een actie aanmaken (los van een inspectie)
    nieuweActie() {
      const veld = (lab, inner) => { const m = inner.match(/\bid="([^"]+)"/); return `<label class="flab"${m ? ` for="${m[1]}"` : ""}>${lab}</label>${inner}`; };   // label gekoppeld aan het veld (for=id)
      this.openModal("Nieuwe actie", "Bijvoorbeeld uit een melding, toolbox of overleg.",
        `${veld("Wat moet er gebeuren?", `<textarea id="na-tekst" class="fin" rows="3" placeholder="Bijv. hijsbanden in de bus vervangen"></textarea>`)}
         ${veld("Aanleiding (optioneel)", `<textarea id="na-aanl" class="fin" rows="2" placeholder="Wat zag of hoorde je?"></textarea>`)}
         ${veld("Actiehouder", `<select id="ai-houder" class="fin">${personenOpties("houder", null)}</select>`)}
         ${veld("Toetser (niet de actiehouder)", `<select id="ai-toetser" class="fin">${personenOpties("toetser", null)}</select>`)}
         ${veld("Plandatum", `<input type="date" id="ai-plan" class="fin" value="${plusDagen(14)}">`)}
         <div id="ai-fout" class="fout" role="alert"></div>
         <button class="btn primary" style="margin-top:10px"${act("maakActie")}>Actie aanmaken</button>`);
    },
    async maakActie() {
      const tekst = $("na-tekst").value.trim(), houder = $("ai-houder").value, toetser = $("ai-toetser").value, plan = $("ai-plan").value;
      if (!tekst) return this.fout("Beschrijf wat er moet gebeuren.", "na-tekst");
      if (!houder || !toetser) return this.fout("Kies een actiehouder én een toetser.", houder ? "ai-toetser" : "ai-houder");
      if (houder === toetser) return this.fout("De toetser mag niet de actiehouder zijn.", "ai-toetser");
      if (nietKiesbaar("houder", houder)) return this.fout(nietKiesbaar("houder", houder), "ai-houder");
      if (nietKiesbaar("toetser", toetser)) return this.fout(nietKiesbaar("toetser", toetser), "ai-toetser");
      if (!plan) return this.fout("Kies een plandatum.", "ai-plan");
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
      const veld = (lab, inner) => { const m = inner.match(/\bid="([^"]+)"/); return `<label class="flab"${m ? ` for="${m[1]}"` : ""}>${lab}</label>${inner}`; };   // label gekoppeld aan het veld (for=id)
      let h = `<div class="s" style="font-weight:600">${esc(a.inspectie_titel || "")} · ${esc(a.ref || "")} · oordeel ${esc(a.oordeel || "–")}${a.inspecteur ? " · gezien door " + WPI.inspLabel(a.inspecteur_id || null, a.inspecteur) : ""}</div>
        <div style="margin:8px 0 14px;display:flex;gap:10px;align-items:flex-start"><span class="lbl jij">Waarneming</span><div style="flex:1;line-height:1.45">“${esc(a.waarneming || "")}”</div>${this.actieFotos(a)}</div>`;
      if (a.status === "Voorstel") {
        {
          h += `<div class="vskop" style="margin-bottom:6px"><span class="lbl vs">Voorstel uit de inspectie</span><span class="s">· pas aan en stel in</span></div>
            <textarea id="ai-tekst" class="fin" rows="3" aria-label="Wat moet er gebeuren? (voorstel, pas aan)">${esc(a.tekst || "")}</textarea>
            <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:6px">
              <div>${veld("Actiehouder", `<select id="ai-houder" class="fin">${personenOpties("houder", null)}</select>`)}</div>
              <div>${veld("Toetser (niet de actiehouder)", `<select id="ai-toetser" class="fin">${personenOpties("toetser", null)}</select>`)}</div>
              <div>${veld("Plandatum", `<input type="date" id="ai-plan" class="fin" value="${plusDagen((PRIO[a.prio] || PRIO.kort).d)}">`)}</div></div>
            <div class="s" style="margin-top:6px">De inspecteur vond het: <b>${esc((PRIO[a.prio] || {}).lab || "–")}</b>. De plandatum staat daarop voorgesteld; pas gerust aan.</div>
            <div id="ai-fout" class="fout" role="alert"></div>
            <button class="btn primary" style="margin-top:12px"${act("stelIn", a.id)}>Actie instellen</button>
            <details style="margin-top:12px"><summary class="s" style="cursor:pointer;font-weight:600">Geen actie nodig?</summary>
              <textarea id="ai-reden" class="fin" rows="2" aria-label="Reden waarom geen actie nodig is" placeholder="Reden, bijv. al opgelost via trendactie T-04"></textarea>
              <button class="btn ghost sm" style="margin-top:8px"${act("vervalVoorstel", a.id)}>Voorstel laten vervallen</button></details>`;
        }
      } else {
        h += `<div class="card" style="background:var(--mist);box-shadow:none;margin-bottom:12px"><div class="t" style="font-size:16px">${esc(a.tekst)}</div>
          <div class="s" style="margin-top:6px;line-height:1.7">${stBadge(a.status)} · actiehouder <b>${esc(naam(a.houder))}</b> · toetser <b>${esc(naam(a.toetser))}</b> · plandatum <b>${dagLabel(a.plandatum)}</b>${PRIO[a.prio] ? ` · prio <b>${esc(prioTekst(a.prio))}</b>` : ""}</div></div>`;
        if (a.nafoto) h += `<div class="s" style="font-weight:600;margin-bottom:4px">Na-foto (na uitvoering)</div><div style="display:flex;gap:10px;margin-bottom:12px">${a.foto ? `<figure style="margin:0"><img src="${esc(WPI.fotoSrc(a.foto))}" alt="Foto vóór uitvoering" style="height:110px;border-radius:10px"><figcaption class="s">voor</figcaption></figure>` : ""}<figure style="margin:0"><img src="${esc(WPI.fotoSrc(a.nafoto))}" alt="Na-foto na uitvoering" style="height:110px;border-radius:10px"><figcaption class="s">na</figcaption></figure></div>`;
        // Rolbewust: iedereen ziet alleen zijn eigen volgende stap. Uitvoeren en klaar melden = alleen de
        // actiehouder; toetsen en afronden = alleen de toetser (nooit dezelfde persoon). De toetser, het hoofd
        // en de coördinatoren krijgen de knoppen van de actiehouder dus niet (zie ook zetStatus/naFoto).
        // De uitleg per rol ("Jij bent de actiehouder/toetser …") staat in de kop van het venster (verrijkActie).
        if (a.status === "Open" || a.status === "In uitvoering") {
          if (isHouder && !isToetser && a.status === "Open") h += `<button class="btn primary"${act("zetStatus", a.id, "In uitvoering", "Uitvoering gestart")}>${svg("play", 18)} Start uitvoering</button>
            <div class="alklaar"><div class="alk-t">Al klaar? Meld het meteen</div><button class="btn ghost"${act("naFoto", a.id)}>${svg("cam", 18)} Klaar · na-foto maken</button>
            <button class="btn ghost"${act("zetStatus", a.id, "Klaar voor toetsing", "Klaar voor toetsing gemeld (zonder na-foto)")}>Klaar voor toetsing, zonder foto</button></div>`;
          else if (isHouder && !isToetser) h += `<button class="btn primary"${act("naFoto", a.id)}>${svg("cam", 18)} Klaar · na-foto maken</button>
            <button class="btn ghost" style="width:100%;margin-top:10px"${act("zetStatus", a.id, "Klaar voor toetsing", "Klaar voor toetsing gemeld (zonder na-foto)")}>Klaar voor toetsing, zonder foto</button>`;
        }
        if (a.status === "Klaar voor toetsing") {
          if (isToetser && !isHouder) h += `<button class="btn primary"${act("akkoord", a.id)}>${svg("check", 18)} Akkoord na toetsing · afronden</button>
            <textarea id="ai-reden" class="fin" rows="2" style="margin-top:12px" placeholder="Reden bij niet akkoord" aria-label="Reden bij niet akkoord"></textarea><div id="ai-fout" class="fout" role="alert"></div>
            <button class="btn danger" style="width:100%;margin-top:8px"${act("nietAkkoord", a.id)}>Niet akkoord · terug naar actiehouder</button>`;
          else h += `<div class="hint">Wacht op toetsing door <b>${esc(naam(a.toetser))}</b>. Alleen de toetser kan afronden.</div>`;
        }
        if (staf() && (a.status === "Open" || a.status === "In uitvoering" || a.status === "Klaar voor toetsing")) {
          h += `<details style="margin-top:14px"><summary class="s" style="cursor:pointer;font-weight:600">Plandatum wijzigen</summary>
            <div style="display:flex;gap:8px;margin-top:8px"><input type="date" id="ai-plan2" class="fin" style="flex:1" aria-label="Nieuwe plandatum" value="${/^\d{4}-\d{2}-\d{2}$/.test(a.plandatum || "") ? a.plandatum : ""}"><button class="btn ghost sm"${act("wijzigPlan", a.id)}>Opslaan</button></div></details>`;
        }
      }
      h += `<div class="s" style="font-weight:700;margin:18px 0 4px">Verloop</div><div class="tijdlijn">${(a.log || []).slice().reverse().map((l) => `<div><span>${new Date(l.t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> ${esc(l.wie)} · ${l.bron === "server" ? '<b class="dchip" title="Vastgelegd door de server, niet door een persoon getypt">automatisch</b> ' : ""}${esc(l.wat)}</div>`).join("")}</div>`;
      this.openModal(kort(a.tekst || "Actie", 60), a.demo ? "Voorbeeldactie (fictief)" : "", h);
    },
    async bewaarActie(a, wat) {
      a.log = (a.log || []).concat([{ t: new Date().toISOString(), wie: this.user.full_name, wat }]);
      try { await DB.put("acties", a); } catch (e) { alert("Opslaan mislukt op dit toestel."); }
      this.checkMeldingen();
    },
    // foutmelding in een formulier (modal): tekst in #ai-fout (role=alert, wordt voorgelezen), het veld krijgt
    // aria-invalid + aria-describedby naar de melding en de focus, zodat je meteen kunt verbeteren (WCAG 3.3.1, 4.1.3)
    fout(t, veld) {
      const f = $("ai-fout"); tril([40, 40, 40]); if (!f) return;
      const bak = $("mod") || document;
      bak.querySelectorAll('[aria-invalid="true"]').forEach((e) => {
        e.removeAttribute("aria-invalid");
        const d = (e.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && x !== "ai-fout");
        if (d.length) e.setAttribute("aria-describedby", d.join(" ")); else e.removeAttribute("aria-describedby");
      });
      if (!f.hasAttribute("role")) f.setAttribute("role", "alert");
      // dezelfde melding nog eens: eerst leegmaken, anders leest de schermlezer hem niet opnieuw voor
      if (f.textContent === t) { f.textContent = ""; setTimeout(() => { f.textContent = t; }, 80); } else f.textContent = t;
      const e = veld && $(veld);
      if (e) {
        e.setAttribute("aria-invalid", "true");
        const d = (e.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (!d.includes("ai-fout")) e.setAttribute("aria-describedby", d.concat(["ai-fout"]).join(" "));
        try { e.focus(); } catch (x) {}
      }
    },
    async stelIn(id) {
      const a = this.acties.find((x) => x.id === id); if (!a) return;
      const tekst = $("ai-tekst").value.trim(), houder = $("ai-houder").value, toetser = $("ai-toetser").value, plan = $("ai-plan").value;
      if (!tekst) return this.fout("Vul de actietekst in.", "ai-tekst");
      if (!houder || !toetser) return this.fout("Kies een actiehouder én een toetser.", houder ? "ai-toetser" : "ai-houder");
      if (houder === toetser) return this.fout("De toetser mag niet de actiehouder zijn.", "ai-toetser");
      if (nietKiesbaar("houder", houder)) return this.fout(nietKiesbaar("houder", houder), "ai-houder");
      if (nietKiesbaar("toetser", toetser)) return this.fout(nietKiesbaar("toetser", toetser), "ai-toetser");
      if (!plan) return this.fout("Kies een plandatum.", "ai-plan");
      const aangepast = tekst !== a.tekst; Object.assign(a, { tekst, houder, toetser, plandatum: plan, status: "Open" });
      await this.bewaarActie(a, `Ingesteld${aangepast ? " (tekst aangepast)" : ""}: actiehouder ${naam(houder)}, toetser ${naam(toetser)}, plandatum ${dagLabel(plan)}`);
      tril(30); this.closeModal(); this.route();
    },
    async vervalVoorstel(id) {
      const a = this.acties.find((x) => x.id === id), r = ($("ai-reden") || {}).value || "";
      if (!r.trim()) { const f = $("ai-reden"); if (f) { f.focus(); f.placeholder = "Reden is verplicht"; } return; }
      a.status = "Vervallen"; await this.bewaarActie(a, "Voorstel vervallen: " + r.trim()); this.closeModal(); this.route();
    },
    // uitvoeren en klaar melden mag alleen de actiehouder (en nooit als hij ook toetser is): zelfde regel als de knoppen
    magUitvoeren(a) { return !!(a && this.user && a.houder === this.user.id && a.toetser !== this.user.id && (a.status === "Open" || a.status === "In uitvoering")); },
    async zetStatus(id, st, wat) {
      const a = (this.acties || []).find((x) => x.id === id); if (!this.magUitvoeren(a) || !["In uitvoering", "Klaar voor toetsing"].includes(st)) return;
      a.status = st; await this.bewaarActie(a, wat); tril(25); this.closeModal(); this.route();
    },
    naFoto(id) {
      if (!this.magUitvoeren((this.acties || []).find((x) => x.id === id))) return;
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
      inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; const d = await fotoDataURL(f); const a = this.acties.find((x) => x.id === id); if (!d || !this.magUitvoeren(a)) return;
        a.nafoto = d; a.status = "Klaar voor toetsing"; await this.bewaarActie(a, "Klaar voor toetsing gemeld, met na-foto"); tril(25); this.closeModal(); this.route(); };
      inp.click();
    },
    async akkoord(id) {
      // alleen de toetser, en alleen na "Klaar voor toetsing": de keten Open → In uitvoering → Klaar voor toetsing
      // → Afgerond is niet over te slaan (zelfde regel als de knoppen in openActie)
      const a = (this.acties || []).find((x) => x.id === id); if (!a || a.toetser !== this.user.id || a.status !== "Klaar voor toetsing") return;
      if (a.houder === a.toetser) return this.fout("Toetser en actiehouder zijn dezelfde persoon; afronden kan niet.");
      a.status = "Afgerond"; await this.bewaarActie(a, "Getoetst en akkoord · afgerond"); tril([30, 50, 30]); this.closeModal(); this.route();
    },
    async nietAkkoord(id) {
      const a = (this.acties || []).find((x) => x.id === id), r = ($("ai-reden") || {}).value || ""; if (!a || a.toetser !== this.user.id || a.status !== "Klaar voor toetsing") return;
      if (!r.trim()) return this.fout("Geef een reden, zodat de actiehouder weet wat er nog moet gebeuren.", "ai-reden");
      a.status = "In uitvoering"; await this.bewaarActie(a, "Niet akkoord na toetsing: " + r.trim()); this.closeModal(); this.route();
    },
    async wijzigPlan(id) {
      const a = this.acties.find((x) => x.id === id), v = ($("ai-plan2") || {}).value; if (!a || !v) return;
      const oud = a.plandatum; a.plandatum = v; await this.bewaarActie(a, `Plandatum gewijzigd van ${dagLabel(oud)} naar ${dagLabel(v)}`); this.closeModal(); this.route();
    },
  });
})();
