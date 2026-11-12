/* Werkplekinspectie — js/inspectie.js
   Inspectie: begeleid gesprek (stappen, inspreken, foto, voorstellen, monteurs, controle, handtekening, opslaan).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, fotoDataURL, toks, OW_KEYS, splitMaatregelen, kort, isoDag, tril, eigenWoorden } = window.WPI;
  Object.assign(window.App, {
    // ---------------- INSPECTIE: begeleid gesprek ----------------
    // De app stelt de vragen; de inspecteur spreekt in of typt en maakt foto's.
    // Koppeling aan een TRA-regel is altijd een Voorstel; het oordeel kiest alleen de inspecteur.
    startInspectie(code, project, titel, zeker, planId) {
      const lo = this.state.inspectie;
      if (lo && !zeker && (lo.waarnemingen.length || lo.taken.length)) {
        return this.openModal("Er loopt nog een inspectie", lo.titel + " · " + lo.waarnemingen.length + " waarneming(en)",
          `<button class="btn primary" onclick="App.closeModal();App.goIns()">Verder met de lopende inspectie</button>
           <button class="btn danger" style="margin-top:10px;width:100%" onclick='App.closeModal();App.startInspectie(${esc(JSON.stringify(code))},${esc(JSON.stringify(project))},${esc(JSON.stringify(titel))},true,${esc(JSON.stringify(planId || null))})'>Lopende weggooien en nieuw starten</button>`);
      }
      this.stopMic();
      this.state.inspectie = { code, project, titel, taak: null, taken: [], stap: "taak", taakTekst: "",
        waarnemingen: [], cur: null, voorstel: null, laatste: null, gesprek: "", positief: "", handtekening: null,
        keuzes: [], plan_id: planId || null, start: new Date().toISOString() };
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
    // ---- monteurs bij de inspectie (alleen naam; voor koppeling en filter, nooit voor een score per persoon) ----
    // tijdelijke nepnamen; de echte monteurslijst vult Sven later zelf in
    MONTEURS_DEMO: ["Henk Voorbeeld", "Pieter Proef", "Sander Test", "Kees Demo", "Ruben Fictief"],
    monteursLijst() { try { const l = JSON.parse(localStorage.getItem("wpi_monteurs") || "null"); if (Array.isArray(l) && l.length) return l; } catch (e) {} return this.MONTEURS_DEMO.slice(); },
    bewaarMonteursLijst(l) { try { localStorage.setItem("wpi_monteurs", JSON.stringify(l)); } catch (e) {} },
    togMonteur(n) { const ins = this.state.inspectie; ins.monteurs = ins.monteurs || []; ins.monteurs = ins.monteurs.includes(n) ? ins.monteurs.filter((x) => x !== n) : ins.monteurs.concat([n]); tril(15); this.route(); },
    voegMonteurToe() {
      const i = $("nieuwe-monteur"), n = (i && i.value || "").trim().replace(/\s+/g, " "); if (!n) return;
      const l = this.monteursLijst(); if (!l.includes(n)) { l.push(n); this.bewaarMonteursLijst(l); }
      const ins = this.state.inspectie; ins.monteurs = ins.monteurs || []; if (!ins.monteurs.includes(n)) ins.monteurs.push(n); this.route();
    },
    // voorbeeld-inspecties krijgen vaste fictieve namen, zodat het filter iets laat zien
    demoMonteurs(w) { const L = this.MONTEURS_DEMO, n = Math.min(w.monteurs || 2, 4); let h = 0; for (const c of w.nr) h = (h * 31 + c.charCodeAt(0)) % 997; return Array.from({ length: n }, (_, k) => L[(h + k * 3) % L.length]).filter((x, i, a) => a.indexOf(x) === i); },
    ins_monteurs(ins, v) {
      v.appendChild(el(this.insHead(ins, "Vast onderdeel", "Gesprek met de monteurs")));
      const gekozen = ins.monteurs || [], lijst = this.monteursLijst();
      v.appendChild(el(`<div class="q"><div class="qt">Wie waren er aan het werk?</div><div class="qs">Tik de monteurs aan die je hebt geïnspecteerd. Alleen de naam wordt vastgelegd.</div>
        <div class="chips">${lijst.map((n) => `<button class="chipb${gekozen.includes(n) ? " on" : ""}" onclick='App.togMonteur(${esc(JSON.stringify(n))})'>${gekozen.includes(n) ? "✓ " : ""}${esc(n)}</button>`).join("")}</div>
        <div style="display:flex;gap:8px;margin-top:12px"><input id="nieuwe-monteur" class="fin" placeholder="Andere naam toevoegen" style="flex:1" onkeydown="if(event.key==='Enter')App.voegMonteurToe()"><button class="btn ghost sm" onclick="App.voegMonteurToe()">${svg("plus", 16)} Toevoegen</button></div>
        ${gekozen.length ? `<div class="s" style="margin-top:10px;font-weight:700">${gekozen.length} monteur${gekozen.length === 1 ? "" : "s"} gekoppeld</div>` : ""}</div>`));
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
      if (!(ins.monteurs || []).length) p.push("Je hebt nog niet vastgelegd welke monteurs er aan het werk waren.");
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
        gesprek: ins.gesprek, positief: ins.positief, handtekening: ins.handtekening, keuzes: ins.keuzes || [], monteurs: (ins.monteurs || []).slice(),
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
      if (ins.plan_id) { await this.laadPlanning(); const pl = this.planning.find((x) => x.id === ins.plan_id); if (pl) { pl.status = "uitgevoerd"; pl.inspectie_id = rec.id; try { await DB.put("planning", pl); } catch (e) {} } }
      this.state.inspectie = null; this.bewaarConcept(true); tril([30, 50, 30]);
      const nv = nieuw.filter((a) => a.status === "Voorstel").length;
      this.openModal("Vastgelegd", "Veilig bewaard op dit toestel (cloud-opslag volgt met de backend).",
        `${nv ? `<div class="hint" style="margin-bottom:12px">${nv} actievoorstel${nv === 1 ? "" : "len"} klaargezet. Een coördinator stelt ze in onder <b>Acties › In te stellen</b>.</div>` : ""}
         <button class="btn primary" onclick="App.closeModal();location.hash='#/rapport/${rec.id}'">Bekijk rapport</button>
         <button class="btn ghost" style="margin-top:10px;width:100%" onclick="App.closeModal();App.go('inspecties')">Naar inspecties</button>`);
    },
  });
})();
