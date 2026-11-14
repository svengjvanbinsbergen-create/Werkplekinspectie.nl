/* Werkplekinspectie — js/inspecties.js
   Inspecties: overzicht van afgeronde inspecties en het rapport.
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, staf, naam, kort, dagLabel, stBadge, act, op, WAARDE } = window.WPI;
  // oordeel uit een (lokaal) record alleen als C/A/V/NVT in de HTML (anders leeg): nooit ruwe tekst in class of tekst
  const ov = (o) => ({ C: "C", A: "A", V: "V", NVT: "NVT" }[o] === o ? o : "");
  // direct gevaar en "Werk stilgelegd" (VCA-traceerbaarheid): alleen wat de inspecteur koos of meldde, als vaste tekst
  const gevaarVan = (w) => !!(w && (w.direct === true || (w.oordeel === "A" && w.actie && typeof w.actie.gevaar === "string" && w.actie.gevaar)));
  const stilVan = (w) => !!(w && w.actie && w.actie.terPlaatse === "maatregel" && w.actie.stilgelegd === true);
  // wat de inspecteur ter plaatse deed, in woorden voor het rapport
  function terPlaatseTekst(w) {
    const a = w.actie || {}, gv = gevaarVan(w);
    if (stilVan(w)) return "Direct gevaar: werk ter plaatse stilgelegd. De actie blijft open tot de oorzaak is opgelost en getoetst.";
    if (a.terPlaatse === "maatregel") return (gv ? "Direct gevaar: ter plaatse" : "Ter plaatse") + " een maatregel genomen; actie blijft open tot uitgevoerd en getoetst.";
    if (a.terPlaatse === "gecorrigeerd") return (gv ? "Direct gevaar: ter plaatse" : "Ter plaatse") + " direct gecorrigeerd; de inspecteur zag het herstel.";
    if (gv && a.terPlaatse === "niets") return "Direct gevaar: ter plaatse nog niets gedaan (keuze van de inspecteur).";
    return "";
  }
  // project in de rapportkop: een spontane inspectie heeft geen project (oude records: "spontaan")
  const projectTekst = (r) => { const p = typeof r.project === "string" ? r.project.trim() : ""; return p && p.toLowerCase() !== "spontaan" ? "Project " + p : r.plan_id ? "Project –" : "Spontane inspectie"; };
  const DATAIMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const OB = { C: "Conform", A: "Afwijking", V: "Verbeterpunt", NVT: "Niet van toepassing" };
  // waarnemingen van een record (oude records v1: alleen oordelen per regel)
  const waarnemingenVan = (r) => (r.versie >= 2 ? r.waarnemingen || [] : Object.entries(r.oordelen || {}).filter(([, o]) => o)
    .map(([rid, o]) => ({ regel_id: rid, oordeel: o, tekst: "", foto: (r.fotos || {})[rid] || null, maatregelen: [], actie: { tekst: "" } })));
  // rapportnummer: WPI-JJJJMMDD-CODE-XX-UUMM (dag en tijd van de start, product, initialen van de inspecteur), zoals
  // de voorbeelden (WPI-20261105-DAM-C2): te noemen en terug te vinden. Bij afronden vast in het record (r.nummer).
  const NUMMER = /^WPI-\d{8}-[A-Z0-9]{1,12}-[A-Z]{1,3}-\d{4}$/;
  const initialen = (n) => { const w = String(n || "").normalize("NFD").replace(/[^A-Za-z ]/g, "").trim().split(/\s+/).filter(Boolean); return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() : "X"; };
  function rapportNummer(r) {
    if (r && typeof r.nummer === "string" && NUMMER.test(r.nummer)) return r.nummer;
    let d = new Date(r && (r.start || r.opgeslagen) || Date.now()); if (isNaN(d)) d = new Date();
    const p = (n) => String(n).padStart(2, "0"), code = String((r && r.code) || "WPI").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "WPI";
    return "WPI-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + code + "-" + initialen(r && r.inspecteur) + "-" + p(d.getHours()) + p(d.getMinutes());
  }
  // dag, tijd van start tot afronden en de duur (r.start bestaat sinds de begeleide inspectie; oude records: alleen afgerond)
  function tijden(r) {
    const eind = new Date(r.opgeslagen), start = r.start ? new Date(r.start) : null, hm = (d) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    if (isNaN(eind)) return { dag: "–", tijd: "", afgerond: "–" };
    const afgerond = eind.toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    if (!start || isNaN(start) || start > eind) return { dag: eind.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), tijd: "afgerond om " + hm(eind), afgerond };
    const min = Math.max(0, Math.round((eind - start) / 60000)), duur = min < 60 ? min + " min" : Math.floor(min / 60) + " u " + String(min % 60).padStart(2, "0") + " min";
    const zelfde = start.toDateString() === eind.toDateString();
    return { dag: start.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + (zelfde ? "" : " – " + eind.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })),
      tijd: hm(start) + " gestart – " + hm(eind) + " afgerond (" + duur + ")", afgerond };
  }
  // % conform van de beoordeelde punten (C, A, V); NVT telt niet mee. Zelfde getal in de app en in de PDF.
  const scoreVan = (t) => { const b = t.C + t.A + t.V; return { pct: b ? Math.round(100 * t.C / b) : null, conform: t.C, beoordeeld: b }; };
  const scoreTekst = (s, t) => (s.beoordeeld ? s.conform + " van " + s.beoordeeld + " beoordeelde punten" + (t.NVT ? " · NVT telt niet mee" : "") : "Nog niets beoordeeld");
  const tijdNl = (t) => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
  // inspecteur van een record, met functie (bij afronden vastgelegd; oudere records: uit het team)
  const inspecteurVan = (r) => (r && (r.inspecteur || naam(r.inspecteur_id))) || "de inspecteur";
  function functieVan(r) {
    if (r && typeof r.inspecteur_functie === "string" && r.inspecteur_functie.trim()) return r.inspecteur_functie.trim().slice(0, 80);
    const u = r && (window.WPI.USERS || []).find((x) => (r.inspecteur_id ? x.id === r.inspecteur_id : x.full_name === r.inspecteur));
    return u && u.functie ? String(u.functie) : "";
  }
  // De actie bij een waarneming: bij afronden (alleen het record) of de actuele stand (Acties, met verloop).
  // Bewijs van afsluiten (VCA): bij elke afgeronde actie staat wie toetste en wanneer. Ter plaatse gecorrigeerd =
  // de ploeg herstelde het waar de inspecteur bij was; de inspecteur zag het herstel en is daarmee de toetser
  // (geen aparte actiehouder of plandatum). Nooit de tekst "nog niet ingesteld" bij een afgeronde actie.
  function actieStand(w, live, actueel, r) {
    const voorstel = String((w.actie && w.actie.tekst) || "").trim(), gecorr = !!(w.actie && w.actie.terPlaatse === "gecorrigeerd");
    const log = live && Array.isArray(live.log) ? live.log : [], laatst = log[log.length - 1];
    const lt = live ? String(live.tekst || "").trim() : "";
    const verloop = actueel && laatst ? "Laatste stap: " + String(laatst.wat || "").slice(0, 200) + " (" + String(laatst.wie || "") + ", " + tijdNl(laatst.t) + ")" : "";
    if (gecorr && (!live || live.status === "Afgerond")) {
      const e = log.find((l) => /gecorrigeerd/i.test(String(l.wat || ""))), wie = live && live.toetser ? naam(live.toetser) : inspecteurVan(r);
      const t = tijdNl(e ? e.t : r && r.opgeslagen);
      return { tekst: lt || voorstel, voorstel: lt && voorstel && lt !== voorstel ? voorstel : null, status: "Afgerond", ingesteld: false, gecorr: true,
        afgerond: "Afgerond ter plaatse · getoetst door " + wie + (t ? " op " + t : ""),
        uitvoering: "Hersteld door de ploeg ter plaatse; de inspecteur zag het herstel en is de toetser. Geen aparte actiehouder of plandatum.", verloop };
    }
    if (!actueel || !live) {
      return { tekst: voorstel, voorstel: null, status: "Voorstel", ingesteld: false,
        nogNietTekst: actueel ? "Deze actie staat (nog) niet op dit toestel; de actuele stand staat in de app."
          : "Bij afronden een voorstel van de inspecteur. Wie het uitvoert (actiehouder), wie toetst en wanneer (plandatum), wordt daarna in de app ingesteld.", verloop: "" };
    }
    const ingesteld = !!(live.houder && live.toetser && live.status !== "Voorstel");
    const verv = live.status === "Vervallen" ? (log.slice().reverse().find((l) => /^Voorstel vervallen/.test(String(l.wat || ""))) || laatst) : null;
    const akkoord = live.status === "Afgerond" ? log.slice().reverse().find((l) => /afgerond/i.test(String(l.wat || ""))) : null;
    return { tekst: lt || voorstel, voorstel: lt && voorstel && lt !== voorstel ? voorstel : null, status: live.status || "Voorstel", ingesteld,
      houder: ingesteld ? naam(live.houder) : "", toetser: ingesteld ? naam(live.toetser) : "", plandatum: live.plandatum ? dagLabel(live.plandatum) : "–",
      afgerond: live.status === "Afgerond" ? "Afgerond · getoetst door " + (live.toetser ? naam(live.toetser) : "–") + (akkoord ? " op " + tijdNl(akkoord.t) : "") : "",
      nogNietTekst: verv ? String(verv.wat || "Vervallen") : "Nog niet ingesteld: actiehouder, toetser en plandatum volgen in de app (Acties › In te stellen).",
      verloop };
  }
  Object.assign(window.App, {
    rapportNummer,
    // ---------------- RAPPORT ALS PDF (js/rapport.js, pas geladen als het nodig is) ----------------
    // dezelfde inhoud als het rapport in de app (view_rapport), als gegevens voor de PDF-schrijver
    // o.stand: "afronden" (bij het definitief afronden: de momentopname met de actievoorstellen van dat moment; zo gaat
    // hij naar de mailbox en het archief) of "actueel" (Deel als PDF: dezelfde momentopname, met de actuele stand van
    // de acties — actiehouder, toetser, plandatum, status en laatste stap — en de aanvullingen na afronden)
    async rapportModel(r, o = {}) {
      const ws = waarnemingenVan(r), actueel = o.stand !== "afronden";
      if (actueel) try { await this.laadActies(); } catch (e) {}
      const prioLab = { direct: "Direct", kort: "Kort · ±2 weken", planmatig: "Planmatig · ±8 weken" }, delen = String(r.titel || "").split(" · ");
      const telling = { C: 0, A: 0, V: 0, NVT: 0 }; ws.forEach((w) => { const o2 = ov(w.oordeel); if (o2) telling[o2]++; });
      // acties: altijd de stand bij afronden (hoort bij de ondertekende momentopname, in beide PDF's gelijk);
      // actiesActueel: alleen bij "Deel als PDF", in de bijlage NA de ondertekening (niet ondertekend)
      const acties = [], actiesActueel = [], wm = ws.map((w) => {
        const i = this.infoVoor(r.code, w.regel_id, w.buiten), o2 = ov(w.oordeel);
        const x = { ref: i.ref, titel: i.titel, oordeel: o2, tekst: typeof w.tekst === "string" ? w.tekst.trim() : "", maatregelen: Array.isArray(w.maatregelen) ? w.maatregelen.map(String) : [],
          gevaar: gevaarVan(w), stil: gevaarVan(w) && stilVan(w),
          fotos: this.fotoLijst(w).map((f) => (DATAIMG.test(f) ? f : "")) };   // "" = foto nog niet op dit toestel (storagepad)
        if ((o2 === "A" || o2 === "V") && w.actie) {
          const basis = { ref: i.ref, prio: prioLab[w.actie.prio] || "–", gevaar: gevaarVan(w), terPlaatse: terPlaatseTekst(w) };
          acties.push(Object.assign(actieStand(w, null, false, r), basis, { nr: acties.length + 1 }));
          if (actueel) { const live = (this.acties || []).find((a) => a.id === w.actie.actie_id); actiesActueel.push(Object.assign(actieStand(w, live, true, r), basis, { nr: acties.length })); }
          x.actieNr = acties.length; x.actieTekst = kort(String((w.actie && w.actie.tekst) || ""), 80);
        }
        return x;
      });
      const kz = r.keuzes || [], kc = (u) => kz.filter((k) => k.uitkomst === u).length, meer = (n, een, veel) => n + " " + (n === 1 ? een : veel);
      const tj = tijden(r), nu = new Date().toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      let aanv = [];
      if (actueel && this.aanvullingenVan) { try { aanv = await this.aanvullingenVan(r.id); } catch (e) { aanv = []; } }
      return { id: r.id, nummer: rapportNummer(r), titel: r.titel, object: delen[0] || r.titel || "", locatie: delen.slice(1).join(" · "), projectTekst: projectTekst(r),
        project: typeof r.project === "string" && r.project.trim() && r.project.trim().toLowerCase() !== "spontaan" ? r.project.trim() : "",
        datumTekst: tj.afgerond, dagTekst: tj.dag, tijdTekst: tj.tijd, afgerondTekst: tj.afgerond,
        stand: actueel ? "actueel" : "afronden", standMoment: nu,
        standTekst: actueel ? (DATAIMG.test(r.handtekening || "")
            ? "Deel 1 (ondertekend): de momentopname van " + tj.afgerond + ", precies zoals bij afronden; die ligt vast. Bijlage (na de ondertekening, niet ondertekend): de acties en de aanvullingen, actuele stand op " + nu + "."
            : "Deel 1 (niet ondertekend): de momentopname van " + tj.afgerond + ", precies zoals bij afronden; die ligt vast. Bijlage (na het afronden, ook niet ondertekend): de acties en de aanvullingen, actuele stand op " + nu + ".")
          : "Momentopname, definitief afgerond op " + tj.afgerond + ". De acties staan hier zoals ze bij afronden waren: voorstellen van de inspecteur (of ter plaatse hersteld en door de inspecteur getoetst). Wie de overige uitvoert, wie toetst en wanneer, wordt daarna in de app ingesteld. De actuele stand van de acties (en eventuele aanvullingen) deel je vanuit het rapport in de app met ‘Deel als PDF’.",
        inspecteur: inspecteurVan(r), inspecteurFunctie: functieVan(r), monteurs: (r.monteurs || []).map(String), taken: r.taken || [r.taak], telling, score: scoreVan(telling),
        waarnemingen: wm, acties, actiesActueel, gesprek: r.gesprek || "", positief: r.positief || "", handtekening: DATAIMG.test(r.handtekening || "") ? r.handtekening : null,
        nGevaar: ws.filter(gevaarVan).length, nStil: ws.filter((w) => gevaarVan(w) && stilVan(w)).length,
        openPunten: Array.isArray(r.open_punten) ? r.open_punten.map(String) : [],
        aanvullingen: aanv.map((x) => ({ kop: tijdNl(x.t) + " · " + x.wie + " · over: " + x.over + (x.wacht ? " · nog niet op de server" : ""), tekst: x.tekst,
          foto: typeof x.foto === "string" && x.foto ? (DATAIMG.test(x.foto) ? x.foto : "") : null })),   // "" = foto nog niet op dit toestel
        hulpTekst: kz.length ? `Hulp van de app bij deze inspectie: ${meer(kc("voorstel gebruikt"), "voorstel", "voorstellen")} gebruikt · ${kc("voorstel aangepast")} aangepast · ${kc("zelf gekozen") + kc("zelf geschreven")} keer zelf gekozen.` : "" };
    },
    // js/rapport.js één keer laden (eigen bestand, script-src 'self'; in de cache van de service worker voor offline)
    laadRapportModule() {
      if (window.WPI.rapportPdf) return Promise.resolve(window.WPI.rapportPdf);
      if (this._rapportLaden) return this._rapportLaden;
      this._rapportLaden = new Promise((ok, mis) => {
        const s = document.createElement("script"); s.src = "js/rapport.js"; s.async = true;
        s.onload = () => (window.WPI.rapportPdf ? ok(window.WPI.rapportPdf) : mis(new Error("De rapportmodule kon niet worden geladen.")));
        s.onerror = () => { this._rapportLaden = null; s.remove(); mis(new Error("De rapportmodule kon niet worden geladen (geen verbinding?).")); };
        document.head.appendChild(s);
      });
      return this._rapportLaden;
    },
    // record → PDF (Blob). stap(tekst, pct) meldt de voortgang ("Foto's verkleinen…", "Rapport opmaken…")
    // stand: "afronden" of "actueel" (zie rapportModel)
    async maakRapportPdf(r, stap, stand) {
      const mod = await this.laadRapportModule();
      return mod.maak(await this.rapportModel(r, { stand: stand || "actueel" }), { stap });
    },
    rapportBestandsnaam(r, stand) {
      const t = String(r.titel || "inspectie").split(" · ").slice(0, 2).join(" ").replace(/[^\p{L}\p{N} ._()-]+/gu, "").replace(/\s+/g, " ").trim().slice(0, 70);
      const extra = stand === "actueel" ? " acties per " + new Date().toISOString().slice(0, 10) : "";
      return (rapportNummer(r) + " " + t + extra).trim() + ".pdf";
    },
    // "Deel als PDF": het rapport met de ACTUELE stand van de acties (actiehouder, toetser, plandatum, status) en de
    // aanvullingen, opnieuw opgebouwd uit de vastgelegde momentopname op dit toestel. Staat de inspectie niet op dit
    // toestel, dan het bewaarde rapport van het afronden (App.rapportOphalen, js/sync.js), met die uitleg erbij.
    // Android: het deelmenu (Outlook, WhatsApp …); kan het toestel geen bestanden delen, dan downloaden.
    async deelRapport(id) {
      let r = null; try { r = await DB.get("inspecties", id); } catch (e) {}
      let pdf = null, origineel = false;
      try { if (r) pdf = await this.maakRapportPdf(r, null, "actueel"); } catch (e) { pdf = null; }
      if (!pdf) { try { pdf = this.rapportOphalen ? await this.rapportOphalen(id) : null; origineel = !!pdf; } catch (e) {} }
      if (!pdf) return this.openModal("Rapport niet beschikbaar", "Het rapport (PDF) kon niet worden opgehaald of gemaakt.", `<div class="s" style="margin-bottom:12px;line-height:1.45">${r ? "Probeer het zo nog eens." : "Deze inspectie staat (nog) niet op dit toestel. Synchroniseer en probeer het opnieuw."}</div><button class="btn primary"${act("closeModal")}>Sluiten</button>`);
      await this.deelPdf(pdf, this.rapportBestandsnaam(r || { id, titel: id }, origineel ? "afronden" : "actueel"), r);
      if (origineel) WPI.zeg("Dit is het rapport zoals het bij afronden werd gemaakt; de actuele stand van de acties staat in de app.");
    },
    // "Origineel bij afronden": precies het bestand dat bij het afronden is gemaakt en gemaild (onveranderd, voor audit)
    async origineelRapport(id) {
      let r = null; try { r = await DB.get("inspecties", id); } catch (e) {}
      let pdf = null; try { pdf = this.rapportOphalen ? await this.rapportOphalen(id) : null; } catch (e) {}
      if (!pdf) return this.openModal("Origineel niet gevonden", "Het rapport van het afronden staat niet op dit toestel en kon niet worden opgehaald.", `<div class="s" style="margin-bottom:12px;line-height:1.45">${WPI.sbActief && WPI.sbActief() ? "Controleer de verbinding en probeer het opnieuw." : "In deze voorbeeldversie bewaart alleen het toestel waarop is afgerond het origineel."} Met ‘Deel als PDF’ maak je het rapport met de actuele stand.</div><button class="btn primary"${act("closeModal")}>Sluiten</button>`);
      await this.deelPdf(pdf, this.rapportBestandsnaam(r || { id, titel: id }, "afronden").replace(/\.pdf$/, " origineel.pdf"), r);
    },
    async deelPdf(pdf, bestand, r) {
      let file = null; try { file = new File([pdf], bestand, { type: "application/pdf" }); } catch (e) {}
      if (file && navigator.share && navigator.canShare) {
        let kan = false; try { kan = navigator.canShare({ files: [file] }); } catch (e) {}
        if (kan) {
          try { await navigator.share({ files: [file], title: bestand.replace(/\.pdf$/, ""), text: "Werkplekinspectie-rapport" + (r ? ": " + r.titel : "") }); this._deelUitkomst = "gedeeld"; return; }
          catch (e) { if (e && e.name === "AbortError") { this._deelUitkomst = "afgebroken"; return; } }
        }
      }
      const url = URL.createObjectURL(file || pdf), a = document.createElement("a");
      a.href = url; a.download = bestand; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      this._deelUitkomst = "gedownload"; WPI.zeg("Rapport gedownload: " + bestand);
    },
    // ---------------- AANVULLINGEN (na afronden; de momentopname zelf verandert niet) ----------------
    // de inspecteur zelf, of het hoofd / de QHSE-manager (de server controleert dit altijd zelf: mag_aanvullen, 0010)
    magAanvullen(r) {
      const u = this.user; if (!u || !r) return false;
      const eigen = r.inspecteur_id ? r.inspecteur_id === u.id : r.inspecteur === u.full_name;
      return eigen || u.role === "hoofd" || u.role === "qhse";
    },
    // waar gaat de aanvulling over? Vaste keuzes plus elke waarneming (de tekst komt uit het record, niet uit de pagina)
    aanvulKeuzes(r) {
      const ws = waarnemingenVan(r);
      return ["Algemeen", "Monteurs", "Gesprek met de monteurs", "Wat ging opvallend goed", "Ondertekening"]
        .concat(ws.map((w, i) => { const x = this.infoVoor(r.code, w.regel_id, w.buiten); return "Waarneming " + (i + 1) + " · " + x.ref + " · [" + (ov(w.oordeel) || "–") + "]"; }));
    },
    // keuze: index in aanvulKeuzes (bijv. de waarneming zonder foto); metFoto: meteen de camera aanbieden
    async aanvullingVenster(id, keuze, metFoto) {
      let r = null; try { r = await DB.get("inspecties", id); } catch (e) {}
      if (!r || !this.magAanvullen(r)) return;
      const k = this.aanvulKeuzes(r), kz = Number.isInteger(keuze) && keuze >= 0 && keuze < k.length ? keuze : 0;
      this._aanvFoto = null;
      this.openModal(metFoto ? "Foto nasturen" : "Aanvulling toevoegen", r.titel,
        `<div class="afr-vast" role="note" style="margin-bottom:12px">${svg("doc", 20)}<span>De vastgelegde inspectie verandert niet. Je aanvulling komt onder het rapport, met je naam en de tijd, en kan daarna niet meer worden gewijzigd.</span></div>
         <label class="flab" for="av-over">Waar gaat het over?</label>
         <select id="av-over" class="fin">${k.map((t, i) => `<option value="${i}"${i === kz ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>
         <div class="flab" style="margin-top:10px" id="av-foto-lab">Foto (bewijs)</div>
         <div class="av-foto" id="av-foto" aria-labelledby="av-foto-lab"><button type="button" class="btn ghost sm"${act("aanvullingFotoKies")}>${svg("cam", 18)} Foto maken of kiezen</button><span class="s">Optioneel; de foto zoals je hem nu maakt, met naam en tijd van de aanvulling.</span></div>
         <label class="flab" for="av-tekst" style="margin-top:10px">Aanvulling of correctie</label>
         <textarea id="av-tekst" class="fin" rows="4" maxlength="2000" placeholder="${metFoto ? "Bijv. foto van de hijsband, gemaakt na de inspectie (de rafel is nog te zien)." : "Bijv. de monteur heet Henk Voorbeeldt (met t), niet Voorbeeld."}"></textarea>
         <div id="ai-fout" class="fout" role="alert"></div>
         <button class="btn primary" style="margin-top:12px"${act("aanvullingVastleggen", r.id)} data-laad="Vastleggen…">Aanvulling vastleggen</button>
         <button class="btn ghost" style="margin-top:10px;width:100%"${act("closeModal")}>Annuleren</button>`);
      if (metFoto) this.aanvullingFotoKies();
    },
    // foto bij een aanvulling: zelfde verkleinen en EXIF weghalen als in de inspectie (WPI.fotoDataURL), met de fotoring
    aanvullingFotoKies() {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
      inp.onchange = async () => {
        const f = inp.files && inp.files[0], doos = $("av-foto"); if (!f || !doos) return;
        doos.innerHTML = `<div class="fb-item fb-bezig"><div class="fb-beeld"><span class="fb-leeg">foto</span></div></div>`;
        const ring = WPI.laad ? WPI.laad.fotoRing(doos.querySelector(".fb-beeld"), { naam: "Foto bij de aanvulling" }) : null;
        if (ring) ring.zet(30);
        const d = await WPI.fotoDataURL(f);
        if (!$("av-foto")) return;
        if (!d) { if (ring) ring.fout("Geen foto"); this._aanvFoto = null; return; }
        if (ring) ring.klaar();
        this._aanvFoto = d;
        $("av-foto").innerHTML = `<img class="aanvfoto" src="${esc(d)}" alt="Gekozen foto voor de aanvulling"><span class="av-foto-knoppen"><button type="button" class="btn ghost sm"${act("aanvullingFotoKies")}>Andere foto</button><button type="button" class="btn ghost sm"${act("aanvullingFotoWeg")}>Weghalen</button></span>`;
      };
      inp.click();
    },
    aanvullingFotoWeg() {
      this._aanvFoto = null; const doos = $("av-foto");
      if (doos) doos.innerHTML = `<button type="button" class="btn ghost sm"${act("aanvullingFotoKies")}>${svg("cam", 18)} Foto maken of kiezen</button><span class="s">Optioneel.</span>`;
    },
    async aanvullingVastleggen(id) {
      let r = null; try { r = await DB.get("inspecties", id); } catch (e) {}
      if (!r || !this.magAanvullen(r)) return this.closeModal();
      const foto = this._aanvFoto && DATAIMG.test(this._aanvFoto) ? this._aanvFoto : null;
      let t = ($("av-tekst") || {}).value || ""; const i = +(($("av-over") || {}).value || 0), k = this.aanvulKeuzes(r);
      if (!t.trim() && foto) t = "Nagekomen foto (gemaakt na het afronden).";
      if (!t.trim()) return this.fout("Schrijf eerst wat je wilt aanvullen, of voeg een foto toe.", "av-tekst");
      let uit = null;
      try { uit = await this.aanvullingToevoegen(Object.assign({ inspectieId: id, over: k[i] || "Algemeen", tekst: t }, foto ? { foto } : {})); }
      catch (e) { return this.fout(String((e && e.message) || "Vastleggen lukte niet."), "av-tekst"); }
      this._aanvFoto = null;
      if (uit && uit.status === "geweigerd") return this.fout("De server weigerde de aanvulling: " + (uit.melding || "geen rechten") + ".", "av-tekst");
      const regel = uit.status === "wachtrij" ? "Staat in de wachtrij en gaat naar de server zodra er verbinding is." : uit.status === "demo" ? "Dit is een demo: de aanvulling staat alleen op dit toestel." : "Staat op de server.";
      this.openModal("Aanvulling vastgelegd", "Onder het rapport, met je naam en de tijd.", `<div class="afr-uitkomst" role="status"><div class="afr-status" id="afr-status">✓ Vastgelegd</div><div class="afr-regel">${esc(regel)}</div></div><button class="btn primary" style="margin-top:12px"${act("closeModal")}>Terug naar het rapport</button>`);
      const st = $("afr-status"); if (st && WPI.laad) WPI.laad.vinkje(st, { opnieuw: true });
      this.route();
    },
    // ---------------- INSPECTIES ----------------
    // filter per inspecteur (geen filter per monteur: monteurs blijven wel aan de inspectie gekoppeld en staan op de kaart)
    inspFilter: { insp: "" },
    zetInspFilter(k, waarde) { if (k !== "insp") return; this.inspFilter[k] = waarde; this.route(); },
    wisInspFilter() { this.inspFilter = { insp: "" }; this.route(); },
    // één lijst: eigen (op dit toestel) + voorbeeld-inspecties, met inspecteur en monteurs; nieuwste eerst
    // (ook gebruikt door Beheer: "Laatst bij inspecties")
    async inspRijen(mine) {
      let saved = []; try { saved = await DB.all(); } catch (e) {}
      return saved.filter((r) => !mine || r.inspecteur_id === this.user.id).map((r) => ({
        eigen: true, id: r.id, titel: r.titel, datum: (r.opgeslagen || "").slice(0, 10), inspecteur: r.inspecteur, inspecteur_id: r.inspecteur_id || null, monteurs: r.monteurs || [],
        sub: rapportNummer(r) + " · " + ((n) => n + (n === 1 ? " waarneming" : " waarnemingen"))(r.versie >= 2 ? r.waarnemingen.length : Object.values(r.oordelen || {}).filter(Boolean).length) + (r.handtekening ? " · ondertekend" : " · niet ondertekend") }))
        .concat(mine ? [] : (this.data.voorbeelddata.wpis || []).map((w) => ({ eigen: false, id: w.nr, titel: w.product + " · " + (w.locatie || ""), datum: w.datum, inspecteur: w.inspecteur, monteurs: this.demoMonteurs(w), sub: w.nr + " · " + (w.ingang || "") })))
        .sort((a, b) => b.datum.localeCompare(a.datum));
    },
    async view_inspecties() {
      const v = $("view"), mine = !WPI.mag("zietAlles"), f = this.inspFilter;   // iedereen in het team ziet alle inspecties
      const nr = this._routeNr;
      const rijen = await this.inspRijen(mine);
      if (nr !== this._routeNr) return;   // intussen opnieuw gerouteerd: niet dubbel tekenen
      const inspecteurs = [...new Set(rijen.map((r) => r.inspecteur))].sort();
      const lijst = rijen.filter((r) => !f.insp || r.inspecteur === f.insp);
      v.appendChild(el(`<div><div class="hi">${mine ? "Jouw inspecties" : "Alle inspecties"}</div><h1 class="groot">Inspecties</h1></div>`));
      const sel = (k, opts, lab) => `<select class="fin filtersel${f[k] ? " aan" : ""}" aria-label="${esc(lab)}"${op("change", "zetInspFilter", k, WAARDE)}><option value="">${lab}</option>${opts.map((o) => `<option${f[k] === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      if (!mine) v.appendChild(el(`<div class="filterbalk">${sel("insp", inspecteurs, "Alle inspecteurs")}
        ${f.insp ? `<button class="linkje"${act("wisInspFilter")}>Wis filter</button>` : ""}</div>`));
      v.appendChild(el(`<div class="s uitleg">${lijst.length} inspectie${lijst.length === 1 ? "" : "s"}${f.insp ? ` door ${esc(f.insp)}` : ""}. Eigen inspecties staan veilig op dit toestel; voorbeelden zijn fictief.</div>`));
      const pdfKnop = WPI.mag("beheer");   // staf (hoofd, QHSE-manager, beheerder): het bewaarde rapport direct openen/delen
      v.appendChild(el(lijst.length ? `<div class="ikaarten">${lijst.map((r) => `<div class="ikaart${r.eigen && pdfKnop ? " ik-staf" : ""}"${r.eigen && !pdfKnop ? ` style="cursor:pointer"${act("go", "rapport/" + r.id)}` : ""}>
          <div class="boven"><span class="dchip">${svg("cal", 14)}${dagLabel(r.datum)}</span>${r.eigen ? `<span class="badge b-done">op dit toestel</span>` : `<span class="s">voorbeeld</span>`}</div>
          <div class="titel">${r.eigen && pdfKnop ? `<button class="ik-open"${act("go", "rapport/" + r.id)}>${esc(r.titel)}</button>` : esc(r.titel)}</div><div class="s">${esc(r.sub)}</div>
          <div class="onder"><span class="sr-only">Inspecteur:</span>${WPI.inspLabel(r.inspecteur_id, r.inspecteur)}${r.eigen && pdfKnop ? `<button class="pdfknop"${act("deelRapport", r.id)} data-laad aria-label="Rapport (PDF) van ${esc(r.titel)}">${svg("doc", 16)} PDF</button>` : ""}</div>
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
          ${gevaarVan(w) ? `<div class="s"><b>Direct gevaar${stilVan(w) ? " · werk ter plaatse stilgelegd" : ""}</b></div>` : ""}
          ${typeof w.tekst === "string" && w.tekst ? `<div class="s">Waarneming: “${esc(w.tekst.trim())}”</div>` : ""}
          ${w.maatregelen && w.maatregelen.length ? `<div class="s">Maatregel gezien: ${esc(w.maatregelen.join("; "))}</div>` : ""}</span>
          <span class="badge b-${ov(w.oordeel) === "NVT" ? "N" : ov(w.oordeel)}">[${ov(w.oordeel)}] ${ob[ov(w.oordeel)] || ""}</span></div>`;
      }).join("");
      const acties = ws.filter((w) => (w.oordeel === "A" || w.oordeel === "V") && w.actie);
      await this.laadActies();
      if (rnr !== this._routeNr) return;   // intussen opnieuw gerouteerd: niet dubbel tekenen
      const aRows = acties.map((w, n) => {
        const i = this.infoVoor(r.code, w.regel_id, w.buiten), live = (this.acties || []).find((x) => x.id === w.actie.actie_id);
        const a = live || w.actie, st = actieStand(w, live, true, r);   // live status uit Acties; oude rapporten (v2) vallen terug op het record
        const houder = live ? (live.houder ? naam(live.houder) : "nog in te stellen") : a.houder || "–";
        const toetser = live ? (live.toetser ? naam(live.toetser) : "nog in te stellen") : a.toetser || "–";
        // ter plaatse gecorrigeerd: wie toetste en wanneer (de inspecteur zag het herstel); geen actiehouder of plandatum
        const wie = st.gecorr ? `<div class="s"><b>${esc(st.afgerond)}</b></div><div class="s">${esc(st.uitvoering)}</div>`
          : `<div class="s">Actiehouder: ${esc(houder)} · toetser: ${esc(toetser)}</div>${st.afgerond ? `<div class="s"><b>${esc(st.afgerond)}</b></div>` : ""}`;
        return `<div class="row" style="align-items:flex-start${live ? ";cursor:pointer" : ""}"${live ? `${act("openActie", live.id)}` : ""}><span class="grow"><span class="t">${n + 1}. ${esc(a.tekst || "(geen actietekst)")}</span>
          ${st.voorstel ? `<div class="s">Voorstel van de inspecteur bij afronden: ${esc(st.voorstel)}</div>` : ""}
          <div class="s">${esc(i.ref)}${st.gecorr ? "" : ` · dringendheid volgens inspecteur: ${prioLab[w.actie.prio] || "–"}${live ? " · plandatum " + dagLabel(live.plandatum) : a.termijn ? " · termijn " + esc(a.termijn) : ""}`}</div>
          ${wie}
          ${terPlaatseTekst(w) && !st.gecorr ? `<div class="s">${esc(terPlaatseTekst(w))}</div>` : ""}
          ${st.verloop ? `<div class="s">${esc(st.verloop)}</div>` : ""}</span>
          ${stBadge(st.gecorr ? "Afgerond" : live ? live.status : a.status || "Open")}</div>`;
      }).join("");
      const nGevaar = ws.filter(gevaarVan).length, nStil = ws.filter((w) => gevaarVan(w) && stilVan(w)).length;
      const kz = r.keuzes || [], kc = (u) => kz.filter((k) => k.uitkomst === u).length, meer = (n, een, veel) => n + " " + (n === 1 ? een : veel);
      let nr = 0; const kop = (t) => `<h2>${++nr}. ${t}</h2>`;   // doorlopend genummerd, ook als een sectie ontbreekt
      // alle foto's per waarneming (hoofdfoto + extraFotos, zie App.fotoLijst); oude records met alleen w.foto blijven werken
      const fotos = ws.flatMap((w) => { const l = this.fotoLijst(w); return l.map((f, i) => ({ w, f, i, n: l.length })); });
      v.appendChild(el(`<div class="noprint"><button class="btn ghost sm"${act("go", "inspecties")}>${svg("back", 16)} Terug</button></div>`));
      const tj = tijden(r), tel = { C: 0, A: 0, V: 0, NVT: 0 }; ws.forEach((w) => { const o = ov(w.oordeel); if (o) tel[o]++; });
      const sc = scoreVan(tel), open = Array.isArray(r.open_punten) ? r.open_punten : [], getekend = !!r.handtekening;
      let aanv = []; try { aanv = this.aanvullingenVan ? await this.aanvullingenVan(r.id) : []; } catch (e) {}
      if (rnr !== this._routeNr) return;
      const magAanv = this.magAanvullen(r);
      v.appendChild(el(`<div id="rap">
        <div class="kicker" style="margin-top:12px">WPI-rapport · momentopname · <span class="rapnr">${esc(rapportNummer(r))}</span></div>
        <h1 style="margin-bottom:6px">${esc(r.titel)}</h1>
        <div class="s rapkop">${esc(projectTekst(r))} · inspecteur ${WPI.inspLabel(r.inspecteur_id, r.inspecteur)}</div>
        <div class="s rapkop">${esc(tj.dag)} · ${esc(tj.tijd)}</div>
        ${getekend ? `<div class="rapvast">${svg("check", 16)}<span><b>Definitief afgerond · ondertekend · ligt vast.</b> Deze momentopname wordt niet meer gewijzigd; correcties kunnen alleen nog als aanvulling (onderaan dit rapport).</span></div>`
          : `<div class="rapvast niet" role="note"><span><b>Niet ondertekend.</b> De inspecteur heeft deze inspectie afgerond zonder handtekening. Hij ligt wel vast; correcties kunnen alleen nog als aanvulling (onderaan dit rapport).</span></div>`}
        ${open.length ? `<div class="card rapopen"><b>Afgerond met ${meer(open.length, "open herinnering", "open herinneringen")}</b>${open.map((x) => {
          // "Afwijking bij <ref> heeft geen foto.": de foto alsnog als aanvulling (bewijs met naam en tijd), bij die waarneming
          const m = magAanv && /^Afwijking bij (.+) heeft geen foto\.$/.exec(String(x)), wi = m ? ws.findIndex((w) => w.oordeel === "A" && !this.fotoLijst(w).length && this.infoVoor(r.code, w.regel_id, w.buiten).ref === m[1]) : -1;
          const al = wi >= 0 && aanv.some((y) => y.foto && y.over === this.aanvulKeuzes(r)[5 + wi]);   // al een foto nagestuurd bij die waarneming
          return `<div class="s">• ${esc(x)}</div>${al ? `<div class="s rapfotook">${svg("check", 14)} Foto nagestuurd als aanvulling (onderaan)</div>` : wi >= 0 ? `<button class="btn ghost sm noprint rapfotona"${act("aanvullingVenster", r.id, 5 + wi, true)}>${svg("cam", 16)} Foto toevoegen als aanvulling</button>` : ""}`;
        }).join("")}</div>` : ""}
        <div class="card rapscore"><div class="pct">${sc.pct == null ? "–" : sc.pct + "%"}</div><div class="grow"><div class="t">${sc.beoordeeld ? "conform" : "nog niets beoordeeld"}</div>${sc.beoordeeld ? `<div class="s">${esc(scoreTekst(sc, tel))}</div>` : ""}
          <div class="s">C ${tel.C} · A ${tel.A} · V ${tel.V} · NVT ${tel.NVT}</div></div></div>
        ${nGevaar ? `<div class="card" style="margin:0 0 14px;box-shadow:inset 6px 0 0 var(--red)"><b>Direct gevaar bij ${meer(nGevaar, "waarneming", "waarnemingen")}${nStil ? ` · werk ter plaatse stilgelegd bij ${nStil}` : ""}</b><div class="s" style="margin-top:4px">Zie Waarnemingen en Acties: wat de inspecteur ter plaatse deed staat bij de actie.</div></div>` : ""}
        ${kop("Getoetst tijdens bezoek")}<div class="card"><div class="s">${taken.map(esc).join(" · ")}</div>
          <div class="s" style="margin-top:6px">Monteurs: ${(r.monteurs || []).length ? (r.monteurs || []).map(esc).join(", ") : "niet vastgelegd"}</div></div>
        ${kop("Waarnemingen")}<div class="listcard">${wRows || '<div class="row"><span class="s">Geen</span></div>'}</div>
        ${acties.length ? `${kop("Acties")}<div class="listcard">${aRows}</div>` : ""}
        ${r.gesprek ? `${kop("Gesprek met de monteurs")}<div class="card" style="line-height:1.5">${esc(r.gesprek)}</div>` : ""}
        ${r.positief ? `${kop("Wat ging opvallend goed")}<div class="card" style="line-height:1.5">${esc(r.positief)}</div>` : ""}
        ${fotos.length ? `${kop("Foto's")}<div class="rapfotos" style="display:flex;gap:10px;flex-wrap:wrap">${fotos.map(({ w, f, i, n }) => `<figure style="margin:0"><img src="${esc(WPI.fotoSrc(f))}" alt="${esc(this.infoVoor(r.code, w.regel_id, w.buiten).ref)} · foto ${i + 1} van ${n}" style="width:180px;border-radius:12px"><figcaption class="s">${esc(this.infoVoor(r.code, w.regel_id, w.buiten).ref)}${n > 1 ? ` · foto ${i + 1}/${n}` : ""}</figcaption></figure>`).join("")}</div>` : ""}
        ${kop("Ondertekening")}
        <div class="card"><div class="s">Inspecteur: <b>${esc(inspecteurVan(r))}</b>${functieVan(r) ? " · " + esc(functieVan(r)) : ""}</div><div class="s">Definitief afgerond: ${esc(tj.afgerond)}</div>
          ${r.handtekening ? `<img src="${esc(WPI.fotoSrc(r.handtekening))}" alt="Handtekening van ${esc(r.inspecteur || "de inspecteur")}" style="height:90px;margin-top:8px">` : `<div class="s" style="margin-top:8px">Niet ondertekend</div>`}</div>
        ${kz.length ? `<div class="s" style="margin-top:14px;line-height:1.5">Hulp van de app bij deze inspectie: ${meer(kc("voorstel gebruikt"), "voorstel", "voorstellen")} gebruikt · ${kc("voorstel aangepast")} aangepast · ${kc("zelf gekozen") + kc("zelf geschreven")} keer zelf gekozen. Elk oordeel (C/A/V) is door de inspecteur zelf gegeven.</div>` : ""}
        ${kop("Aanvullingen na afronden")}
        <div class="listcard rapaanv">${aanv.length ? aanv.map((x) => `<div class="row" style="align-items:flex-start"><span class="grow"><span class="s"><b>${esc(new Date(x.t).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }))} · ${esc(x.wie)}</b> · over: ${esc(x.over)}${x.wacht ? ` · <span class="badge b-V">${x.fout ? "geweigerd" : "nog niet op de server"}</span>` : ""}</span>
            <div style="line-height:1.45;margin-top:2px">${esc(x.tekst)}</div>${x.foto && WPI.fotoSrc(x.foto) ? `<img class="aanvfoto" src="${esc(WPI.fotoSrc(x.foto))}" alt="Nagekomen foto · over: ${esc(x.over)}">` : ""}</span></div>`).join("") : `<div class="row"><span class="s">Geen aanvullingen. De momentopname staat zoals hij is vastgelegd.</span></div>`}</div>
        ${magAanv ? `<button class="btn ghost noprint" style="margin-top:10px;width:100%"${act("aanvullingVenster", r.id)}>${svg("plus", 18)} Aanvulling toevoegen</button>` : ""}
      </div>`));
      // het rapport als PDF-bestand delen (Android: deelmenu → Outlook, WhatsApp …) of downloaden; printen blijft kunnen
      v.appendChild(el(`<div class="rapknoppen noprint">
        <button class="btn primary"${act("deelRapport", r.id)} data-laad="PDF maken…">${svg("doc", 18)} Deel als PDF</button>
        <button class="btn ghost"${act("printen")}>${svg("list", 18)} Opslaan als PDF / printen</button>
        <div class="s rapknopuitleg">‘Deel als PDF’ geeft de actuele stand van de acties en de aanvullingen. <button class="linkje"${act("origineelRapport", r.id)} data-laad>Origineel bij afronden</button> is het onveranderde rapport dat toen is gemaakt en gemaild.</div></div>`));
    },
  });
})();
