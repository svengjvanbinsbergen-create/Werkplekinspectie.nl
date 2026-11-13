/* Werkplekinspectie — js/inspectie.js
   Inspectie: begeleid gesprek (stappen, inspreken, foto, voorstellen, monteurs, controle, handtekening, opslaan).
   Voegt methoden toe aan window.App (zie js/kern.js). */
(function () {
  "use strict";
  const { $, el, esc, svg, DB, fotoDataURL, toks, OW_KEYS, splitMaatregelen, kort, isoDag, tril, eigenWoorden, act, actSluit, op, WAARDE } = window.WPI;
  Object.assign(window.App, {
    // ---------------- INSPECTIE: begeleid gesprek ----------------
    // De app stelt de vragen; de inspecteur spreekt in of typt en maakt foto's.
    // Koppeling aan een TRA-regel is altijd een Voorstel; het oordeel kiest alleen de inspecteur.
    startInspectie(code, project, titel, zeker, planId) {
      const lo = this.state.inspectie;
      if (lo && !zeker && (lo.waarnemingen.length || lo.taken.length)) {
        // geen (server)tekst in een attribuut: de keuze wacht in App._nieuweStart (zie nieuwToch)
        this._nieuweStart = [code, project, titel, planId || null];
        return this.openModal("Er loopt nog een inspectie", lo.titel + " · " + lo.waarnemingen.length + " waarneming(en)",
          `<button class="btn primary"${actSluit("goIns")}>Verder met de lopende inspectie</button>
           <button class="btn danger" style="margin-top:10px;width:100%"${actSluit("nieuwToch")}>Lopende weggooien en nieuw starten</button>`);
      }
      this.stopMic();
      this.state.inspectie = { code, project, titel, taak: null, taken: [], stap: "taak", taakTekst: "",
        waarnemingen: [], cur: null, voorstel: null, laatste: null, gesprek: "", positief: "", handtekening: null,
        keuzes: [], plan_id: planId || null, start: new Date().toISOString() };
      this._opslag = null;
      this.goIns();
    },
    // "Lopende weggooien en nieuw starten": de bewaarde keuze uit startInspectie
    nieuwToch() { const a = this._nieuweStart || []; this._nieuweStart = null; if (a.length) this.startInspectie(a[0], a[1], a[2], true, a[3]); },
    // vastleggen wat de inspecteur met elk voorstel deed (bewijs: de mens beslist)
    logKeuze(soort, uitkomst, wat) { const ins = this.state.inspectie; if (!ins) return; (ins.keuzes = ins.keuzes || []).push({ soort, uitkomst, wat: String(wat || "").slice(0, 120), t: new Date().toISOString() }); },
    goIns() { if (location.hash === "#/inspectie") this.route(); else this.go("inspectie"); },
    stap(s) { this.stopMic(); const ins = this.state.inspectie; if (!ins) return; ins.stap = s; this.goIns(); window.scrollTo(0, 0); },
    nieuweWaarneming(onderwerp) {
      const ins = this.state.inspectie;
      ins.cur = { id: "w" + Date.now(), taak: ins.taak, tekst: "", foto: null, extraFotos: [], regel_id: null, onderwerp: onderwerp || null,
        buiten: false, direct: false, maatregelen: [], oordeel: null, vraag: "",
        actie: { tekst: "", herkomst: "", prio: null, terPlaatse: "niets" } };
      ins.voorstel = null; ins.stap = "zie";
    },
    kiesTaak(t) {
      const ins = this.state.inspectie; ins.taak = t; if (!ins.taken.includes(t)) ins.taken.push(t);
      this.logKeuze("taak", (this._taakVs || []).includes(t) ? "voorstel gebruikt" : "zelf gekozen", t);
      tril(20); this.nieuweWaarneming(); this.stap("zie");
    },
    // "Ja, volgende waarneming" / een algemeen onderwerp kiezen
    waarnemingOver(onderwerp) { this.nieuweWaarneming(onderwerp); this.stap("zie"); },
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
          k === "foto" ? !!(ins && ins.cur && this.fotoLijst(ins.cur).length) : !!this.veld(k).trim());
        b.disabled = !ok;
      });
    },
    invoer(key, ph) {
      return `<div class="inbox"><textarea id="f-${key}" placeholder="${esc(ph)}"${op("input", "setVeld", key, WAARDE)}>${esc(this.veld(key))}</textarea>
        <button class="mic${this.micKey === key ? " on" : ""}" data-mic="${key}" aria-label="Inspreken: ingedrukt houden of aantikken" title="Ingedrukt houden = praten, loslaten = klaar. Kort tikken = aan/uit.">${svg("mic", 24)}</button></div>
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

    // --- foto's bij de lopende waarneming (meerdere: bijv. overzicht + detail) ---
    // Recordformaat, achterwaarts verenigbaar: w.foto = de eerste (hoofd)foto, zoals altijd; w.extraFotos =
    // [{ foto }, …] de overige. Oude records (alleen w.foto) en alles wat alleen w.foto leest (rapport,
    // acties, sync-kolom foto_pad) blijven werken; sync.js zet elk fotoveld { foto } om naar een storagepad.
    MAX_FOTOS: 6,
    fotoLijst(w) {
      if (!w) return [];
      const extra = Array.isArray(w.extraFotos) ? w.extraFotos.map((x) => (x && typeof x === "object" ? x.foto : x)) : [];
      return [w.foto].concat(extra).filter((f) => typeof f === "string" && f);
    },
    zetFotos(w, lijst) { w.foto = lijst[0] || null; w.extraFotos = lijst.slice(1).map((foto) => ({ foto })); },
    addFoto() {
      const ins0 = this.state.inspectie; if (!ins0 || !ins0.cur || this.fotoLijst(ins0.cur).length >= this.MAX_FOTOS) return;
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.multiple = true;
      inp.onchange = async () => {
        const files = [...(inp.files || [])]; if (!files.length) return;
        const ins = this.state.inspectie; if (!ins || !ins.cur) return;
        const cur = ins.cur, lijst = this.fotoLijst(cur);
        for (const f of files.slice(0, Math.max(0, this.MAX_FOTOS - lijst.length))) {
          const d = await fotoDataURL(f);   // verkleind (max 1000 px, JPEG): opslag blijft klein
          if (d) lijst.push(d);
        }
        if (this.state.inspectie !== ins || ins.cur !== cur) return;
        this.zetFotos(cur, lijst); tril(15); this.route();
      };
      inp.click();
    },
    fotoWeg(i) {
      const ins = this.state.inspectie; if (!ins || !ins.cur) return;
      const lijst = this.fotoLijst(ins.cur), n = Number.isInteger(i) ? i : lijst.length - 1;
      if (n < 0 || n >= lijst.length) return;
      lijst.splice(n, 1); this.zetFotos(ins.cur, lijst); tril(15); this.route();
    },
    // kleine foto's naast de tekst ("Jij"-regel, vastgelegd-lijst); max = hoeveel er zichtbaar zijn
    fotoDuimen(w, max, h) {
      const l = this.fotoLijst(w).map((f) => WPI.fotoSrc(f)).filter(Boolean); if (!l.length) return "";
      const zicht = l.slice(0, max), rest = l.length - zicht.length;
      return `<span class="fduimen" style="--fh:${h || 52}px">${zicht.map((f, i) => `<img src="${esc(f)}" alt="Foto ${i + 1} van ${l.length}">`).join("")}${rest > 0 ? `<span class="fmeer">+${rest}</span>` : ""}</span>`;
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
    vsPick(actie, titel, sub, waarom) {   // actie = attributen van act(…)
      return `<button class="pick"${actie}><div class="t">${titel}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}${waarom ? `<div class="waarom">Waarom: ${waarom}</div>` : ""}<div class="gebruik">Gebruik dit ›</div></button>`;
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
        vs.map((t) => this.vsPick(act("kiesTaak", t), esc(t), regels.filter((r) => r.taak === t).length + " risicoregels in de TRA", this.waarom(ins.taakTekst, docVan(t)))).join("") : "";
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
    // rustige kop: één rij (terug · inspectie + opslag · weergave), dan de vraag; `rechts` = optionele knop naast de vraag
    insHead(ins, kicker, titel, rechts) {
      const n = ins.waarnemingen.length, a = ins.waarnemingen.filter((w) => w.oordeel === "A" || w.oordeel === "V").length;
      return `<div class="inshead"><div class="ih-rij">
        <button class="ih-rond"${act("terug")} aria-label="Terug" title="Terug">${svg("back", 22)}</button>
        <div class="ih-meta"><div class="ih-titel">${esc(ins.titel)}</div>
          <div class="ih-sub">${n} waarneming${n === 1 ? "" : "en"}${a ? " · " + a + " actievoorstel" + (a === 1 ? "" : "len") : ""}</div>
          <span id="opslag" class="opslag"></span></div>
        <button class="ih-rond"${act("openWeergave")} aria-label="Weergave: veldmodus en zonmodus" title="Weergave">${svg("sun", 22)}</button></div>
        <div class="kicker" style="margin-top:14px">${esc(kicker)}</div>
        <div class="ih-vraag"><h1>${esc(titel)}</h1>${rechts || ""}</div></div>`;
    },
    citaat(cur) {
      return `<div style="display:flex;gap:10px;align-items:flex-start"><span class="lbl jij">Jij</span>
        <div style="flex:1;font-size:16px;line-height:1.4">${cur.tekst.trim() ? "“" + esc(cur.tekst.trim()) + "”" : `<span class="s">(alleen ${this.fotoLijst(cur).length > 1 ? "foto's" : "een foto"})</span>`}</div>
        ${this.fotoDuimen(cur, 2, 52)}</div>`;
    },
    toastLaatste(ins) {
      const w = ins.waarnemingen.find((x) => x.id === ins.laatste); if (!w) return "";
      const info = this.regelInfo(w.regel_id, w.buiten);
      return `<div class="toast"><span>✓ Vastgelegd: ${esc(info.ref)} · [${w.oordeel}]${w.oordeel === "A" || w.oordeel === "V" ? " · actievoorstel genoteerd" : ""}</span>
        <button class="btn ghost sm"${act("ongedaan")}>Ongedaan maken</button></div>`;
    },

    ins_taak(ins, v) {
      const regels = this.data.kennisbank[ins.code].regels, taken = [...new Set(regels.map((r) => r.taak))];
      v.appendChild(el(this.insHead(ins, ins.taken.length ? "Volgende taak" : "Begeleide inspectie · momentopname", "Wat doen de monteurs nu?")));
      v.appendChild(el(`<div class="q"><div class="qs" style="margin-top:0">Vertel het in je eigen woorden. De app stelt de taak voor; jij bevestigt.</div>
        ${this.invoer("taak", "Bijv. ze halen de damwand eruit met de kraan")}
        <div id="taakvs"></div>
        <details style="margin-top:12px"><summary class="s" style="cursor:pointer;font-weight:600">Zelf kiezen uit alle taken (${taken.length})</summary>
          <div class="chips" style="margin-top:8px">${taken.map((t) => `<button class="chipb"${act("kiesTaak", t)}>${esc(t)}</button>`).join("")}</div></details></div>`));
      this.renderTaakVs();
    },
    // "Wat zie je?": vastleggen met stem of foto, één hand. Grote microfoon en camera onderin (duimzone).
    ins_zie(ins, v) {
      const cur = ins.cur; if (!cur) { this.nieuweWaarneming(); return this.ins_zie(ins, v); }
      const ow = cur.onderwerp ? this.onderwerpen().find((o) => o.ref === cur.onderwerp) : null;
      const gevaar = ow || cur.direct ? "" : `<button class="gevaarknop"${act("directGevaar")} aria-label="Direct gevaar: werk stilleggen">${svg("warn", 18)}<span>Direct gevaar</span></button>`;
      const aan = this.micKey === "zie", fotoOk = (f) => /^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+$/i.test(f || "");
      const fotos = this.fotoLijst(cur), nf = fotos.length, vol = nf >= this.MAX_FOTOS;
      v.appendChild(el(`<div class="ziewrap">
        ${this.insHead(ins, ow ? "Algemeen onderwerp · " + ow.naam : "Taak · " + ins.taak, "Wat zie je?", gevaar)}
        ${cur.direct ? `<div class="gevaarbalk" role="status">${svg("warn", 20)}<span>Direct gevaar · werk is stilgelegd</span></div>` : ""}
        <div class="q ziekaart">
          <div class="ziehint">${ow ? "Vertel wat je zag bij " + esc(ow.naam.toLowerCase()) + "." : "Alleen wat je nu ziet telt."} Praat, typ of maak een foto.</div>
          <textarea id="f-zie" class="ziebox" aria-label="Wat zie je?" placeholder="Bijv. de gasmeter hangt boven aan de ladder, niet bij de man in de put"${op("input", "setVeld", "zie", WAARDE)}>${esc(this.veld("zie"))}</textarea>
          <div class="partial" id="p-zie" aria-live="polite"></div>
          ${nf ? `<div class="fotoblok multi"><div class="fb-kop"><b>${nf === 1 ? "1 foto" : nf + " foto's"}</b><span class="s">${nf === 1 ? "Tip: maak ook een detail of overzicht" : vol ? "Maximaal " + this.MAX_FOTOS + " per waarneming" : "Horen bij deze waarneming"}</span></div>
            <div class="fb-rij">${fotos.map((f, i) => `<div class="fb-item">${fotoOk(f) ? `<img src="${esc(WPI.fotoSrc(f))}" alt="Foto ${i + 1} van ${nf} bij deze waarneming">` : `<span class="fb-leeg">foto</span>`}
              <button class="fotoweg"${act("fotoWeg", i)} aria-label="Foto ${i + 1} verwijderen">×</button></div>`).join("")}</div></div>` : ""}
        </div>
        <div class="dock">
          <div class="vangrij">
            <button class="micgroot${aan ? " on" : ""}" data-mic="zie" aria-label="Inspreken: houd vast en praat, of tik voor aan en uit">
              <span class="mg-ic">${svg("mic", 28)}</span>
              <span class="mg-t"><b class="m-uit">Inspreken</b><b class="m-aan">Luistert…</b><small class="m-uit">Houd vast en praat</small><small class="m-aan">Loslaten = klaar</small></span>
            </button>
            <button class="fotogroot"${act("addFoto")} aria-label="${nf ? "Extra foto maken" : "Foto maken"}"${vol ? " disabled" : ""}>${svg("cam", 28)}<span>${nf ? "Extra" : "Foto"}</span></button>
          </div>
          <button class="btn primary volgknop" data-need="zie,foto"${act("koppel")}>${ow ? "Volgende: beoordelen" : "Volgende: koppel aan de TRA"}</button>
          ${ins.waarnemingen.length && !ow ? `<button class="linkknop"${act("terug")}>Niets meer gezien bij deze taak</button>` : ""}
        </div></div>`));
    },
    fotoWeg() { const ins = this.state.inspectie; if (!ins || !ins.cur) return; ins.cur.foto = null; tril(15); this.route(); },
    gevaarStilgelegd() { this.state.inspectie.cur.direct = true; this.route(); },   // na "Werk is stilgelegd" (modal is al dicht)
    directGevaar() {
      this.openModal("Direct gevaar", "Eerst veiligheid, dan vastleggen.",
        `<div style="font-size:15px;line-height:1.5">1. Laat de monteurs het werk direct stilleggen.<br>2. Spreek in wat je zag en koppel het aan de TRA.<br>3. Het wordt een actie met prioriteit <b>Direct</b>; het oordeel kies jij.</div>
         <button class="btn primary" style="margin-top:16px"${actSluit("gevaarStilgelegd")}>Werk is stilgelegd</button>`);
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
    // "Klopt dit?": jouw woorden, het Voorstel en direct daaronder jouw oordeel, op één scherm.
    // Met je oordeel (C/A/V/NVT) bevestig je meteen de best passende koppeling (één tik; de kop boven de
    // knoppen zegt dat). Past een andere mogelijkheid beter: die aantikken ("Deze klopt"), dan het oordeel.
    // Niets is voorgekozen; de AI koppelt alleen voor en oordeelt nooit. Zelf kiezen en "buiten de TRA" eronder.
    ins_koppel(ins, v) {
      const cur = ins.cur, vs = ins.voorstel || { ids: [], bezig: true };
      const kand = this.kandidaten(ins), regels = this.regelsVanTaak(ins), ows = this.onderwerpen();
      const een = !vs.bezig && vs.ids.length >= 1;   // er is een (best passend) Voorstel om te bevestigen
      const pick = (id) => { const i = this.regelInfo(id), k = kand.find((x) => x.id === id), w = this.waarom(cur.tekst, k ? k.doc + " " + k.naam : i.titel, vs.bron);
        return `<button class="pick vpick een"${act("kiesRegel", id)}><span class="vp-top"><span class="vp-ref">${esc(i.ref)}</span>
          <span class="gebruik">${svg("check", 16, 3)}Ja, dit klopt</span></span>
          <span class="t">${esc(kort(i.titel, 120))}</span>${w ? `<span class="waarom">Waarom: ${w}</span>` : ""}</button>`; };
      const alt = (id) => { const i = this.regelInfo(id);
        return `<button class="pick vpick alt"${act("kiesRegel", id)}><span class="vp-ref">${esc(i.ref)}</span><span class="t">${esc(kort(i.titel, 90))}</span><span class="gebruik">Deze klopt</span></button>`; };
      const zelf = (id, ref, titel) => `<button class="zpick"${act("kiesRegel", id)}><span class="vp-ref">${esc(ref)}</span><span class="t">${esc(kort(titel, 90))}</span></button>`;
      const vraag = een ? "Klopt dit?" : "Waar hoort dit bij?";
      v.appendChild(el(`<div class="stapwrap kstap">
        ${this.insHead(ins, "Taak · " + ins.taak, vraag)}
        <div class="q jijkaart">${this.citaat(cur)}</div>
        <div class="q vskaart${vs.bezig ? " bezig" : ""}" aria-live="polite">
          ${vs.bezig ? `<div class="vskop"><span class="lbl vs">Voorstel</span><span class="s">Even koppelen aan de TRA…</span></div><div class="vpick-leeg" aria-hidden="true"></div>`
            : vs.ids.length ? `${this.vsKop("klopt dit?", vs.bron)}${pick(vs.ids[0])}${vs.vraag ? `<div class="doorvraag"><span class="lbl vs">Doorvraag</span> ${esc(vs.vraag)}</div>` : ""}
              ${vs.ids.length > 1 ? `<details class="vs-alt"><summary>Of past een andere regel beter? <span class="n">${vs.ids.length - 1}</span></summary>${vs.ids.slice(1).map(alt).join("")}</details>` : ""}`
            : `<div class="vskop"><span class="lbl vs">Voorstel</span><span class="s">· geen duidelijke regel gevonden</span></div><div class="vs-geen">Kies hieronder zelf uit de TRA, of leg het vast als buiten de TRA.</div>`}
        </div>
        ${this.oordeelBlok(cur, een ? "bevestig" : vs.bezig ? "bezig" : "wacht", een ? this.regelInfo(vs.ids[0]).ref : "")}
        <div class="kzelf">
          <details class="zelfkies"${!vs.bezig && !vs.ids.length ? " open" : ""}><summary>${een ? "Klopt niet? Zelf kiezen" : "Zelf kiezen uit de TRA"} <span class="n">${regels.length + ows.length}</span></summary>
            <div class="zlijst"><div class="zkop">Risico's van deze taak</div>${regels.map((r) => zelf(r.id, r.id, r.risico)).join("")}
            <div class="zkop">Algemene onderwerpen</div>${ows.map((o) => zelf("ALG-" + o.ref, "Algemeen " + o.ref, o.naam)).join("")}</div></details>
          <button class="linkknop"${act("buitenTRA")}>Staat niet in de TRA</button>
        </div></div>`));
    },
    // oordeelknoppen C/A/V (+ NVT), groot. modus: "oordeel" (koppeling staat), "bevestig" (één Voorstel: je
    // oordeel bevestigt het), "wacht"/"bezig" (nog geen koppeling: knoppen zichtbaar maar uit). Nooit voorgekozen.
    oordeelBlok(cur, modus, ref) {
      const O = { C: ["Conform", "In orde, zoals het hoort"], A: ["Afwijking", "Niet in orde, moet opgelost"], V: ["Verbeterpunt", "In orde, maar kan beter"] };
      const fn = modus === "bevestig" ? "bevestigOordeel" : "oordeel", uit = modus === "wacht" || modus === "bezig" ? " disabled" : "";
      const kop = modus === "bevestig" ? `Klopt het? Kies jouw oordeel <span>· dat bevestigt ${ref ? esc(ref) : "het voorstel"}</span>`
        : modus === "bezig" ? `Jouw oordeel <span>· zodra het voorstel er is</span>`
        : modus === "wacht" ? `Jouw oordeel <span>· kies eerst hieronder een regel</span>` : `Jouw oordeel <span>· alleen jij beslist</span>`;
      return `<section class="dock odock vlak${uit ? " uit" : ""}" aria-labelledby="oordeel-lab"><div class="otitel" id="oordeel-lab">${kop}</div>
        <div class="seg stapel" role="group" aria-labelledby="oordeel-lab">${["C", "A", "V"].map((o) => `<button class="t-${o}${cur.oordeel === o ? " on-" + o : ""}"${act(fn, o)} aria-pressed="${cur.oordeel === o}"${uit}><span class="l">${o}</span><span class="w">${O[o][0]}</span><span class="u">${O[o][1]}</span></button>`).join("")}</div>
        <button class="linkknop nvt"${act(fn, "NVT")}${uit}>Niet van toepassing</button></section>`;
    },
    // Voorstel + oordeel in één tik: de inspecteur bevestigt de (best passende) koppeling door zelf C/A/V/NVT te kiezen
    bevestigOordeel(o) {
      const ins = this.state.inspectie; if (!ins || ins.stap !== "koppel" || !ins.cur || !["C", "A", "V", "NVT"].includes(o)) return;
      const vs = ins.voorstel; if (!vs || vs.bezig || !Array.isArray(vs.ids) || !vs.ids.length) return;
      const cur = ins.cur, id = vs.ids[0];
      this.logKeuze("TRA-regel", "voorstel gebruikt", id);
      cur.regel_id = id; cur.buiten = false; cur.vraag = vs.vraag || ""; cur.maatregelen = [];
      this.oordeel(o);
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
    // "Hoe beoordeel je dit?": wat je zag en de (bevestigde) koppeling, direct daaronder de oordeelknoppen.
    // Geen lege ruimte tussen context en knoppen. Niets is voorgekozen: jij beslist.
    ins_oordeel(ins, v) {
      const cur = ins.cur, info = this.regelInfo(cur.regel_id, cur.buiten);
      let h = `<div class="q okaart">${this.citaat(cur)}
        <div class="koppelrij"><span class="vp-ref">${esc(info.ref)}</span><div class="t clamp3" title="${esc(info.titel)}">${esc(info.titel)}</div>
          ${cur.onderwerp ? "" : `<button class="wijzig"${act("wijzigKoppeling")} aria-label="Andere TRA-regel kiezen">Wijzig</button>`}</div>`;
      if (cur.direct) h += `<div class="gevaarbalk" role="status">${svg("warn", 20)}<span>Direct gevaar · werk is stilgelegd</span></div>`;
      if (cur.vraag) h += `<div class="doorvraag"><span class="lbl vs">Doorvraag</span> ${esc(cur.vraag)}</div>`;
      if (info.maatregelen.length) h += `<div class="otitel">Welke maatregel zag je? <span>(optioneel)</span></div>
        <div class="chips">${info.maatregelen.map((m, i) => `<button class="chipb${cur.maatregelen.includes(m) ? " on" : ""}"${act("togMaatregel", i)} aria-pressed="${cur.maatregelen.includes(m)}">${esc(m)}</button>`).join("")}</div>`;
      h += `</div>`;
      v.appendChild(el(`<div class="stapwrap ostap">${this.insHead(ins, cur.onderwerp ? "Algemeen onderwerp" : cur.buiten ? "Buiten de TRA" : "Taak · " + ins.taak, "Hoe beoordeel je dit?")}${h}
        ${this.oordeelBlok(cur, "oordeel")}</div>`));
    },
    wijzigKoppeling() { const ins = this.state.inspectie; if (ins && ins.voorstel && !ins.voorstel.bezig) this.stap("koppel"); else this.koppel(); },
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
    // "Wat moet er gebeuren?": wat (tekst) boven, twee korte keuzes als grote vlakken, hierna-strook met de toetsregel, vastleggen onderin (duimzone)
    ins_actie(ins, v) {
      const cur = ins.cur, info = this.regelInfo(cur.regel_id, cur.buiten), a = cur.actie;
      const gecorr = a.terPlaatse === "gecorrigeerd";
      const keus = (k, val, w, u) => `<button class="kvlak${a[k] === val ? " on" : ""}"${act("zetActie", k, val)} aria-pressed="${a[k] === val}"><span class="w">${w}</span>${u ? `<span class="u">${u}</span>` : ""}</button>`;
      const kop = a.bezig ? `<span class="lbl vs">Voorstel</span><span class="s">wordt gemaakt…</span>`
        : a.herkomst === "Voorstel" ? `<span class="lbl vs">Voorstel</span><span class="s">pas gerust aan</span>`
        : `<span class="arij-t">Actie</span>`;
      const uitleg = a.terPlaatse === "maatregel" ? "Een direct genomen maatregel maakt alleen het lopende werk veilig. De actie blijft open tot ze is uitgevoerd en getoetst."
        : gecorr ? "De ploeg heeft het ter plaatse opgelost en jij hebt het gezien. Het wordt vastgelegd als afgerond, met jou als toetser." : "";
      v.appendChild(el(`<div class="stapwrap">${this.insHead(ins, info.ref + " · " + (cur.oordeel === "A" ? "Afwijking" : "Verbeterpunt"), "Wat moet er gebeuren?")}
        <div class="q akaart2">${this.citaat(cur)}
          <div class="arij">${kop}<button class="wijzig arij-k" id="btn-av"${act("actieVoorstel")}${a.bezig ? " disabled" : ""}>${a.bezig ? "Even denken…" : a.tekst ? "Nieuw voorstel" : "Laat de app een actie voorstellen"}</button></div>
          ${a.herkomst === "Voorstel" && !a.bezig ? `<div class="waarom arij-w">Via ${esc(a.vsBron || "de app")}${a.vsWaarom ? " · waarom: " + esc(a.vsWaarom) : ""}</div>` : ""}
          ${this.invoer("actie", "Bijv. gasmeter altijd bij de man in de put; toolbox gasmeting")}
          <div class="otitel">Hoe dringend vind jij het?</div>
          <div class="kvlakken">${keus("prio", "direct", "Direct", "meteen")}${keus("prio", "kort", "Kort", "±2 weken")}${keus("prio", "planmatig", "Planmatig", "±8 weken")}</div>
          <div class="otitel">Ter plaatse</div>
          <div class="kvlakken">${keus("terPlaatse", "niets", "Niets gedaan")}${keus("terPlaatse", "maatregel", "Maatregel genomen")}${keus("terPlaatse", "gecorrigeerd", "Direct gecorrigeerd")}</div>
          ${uitleg ? `<div class="kvuitleg">${uitleg}</div>` : ""}
          <div class="hierna"><div class="hierna-t">Hierna</div>${gecorr
            ? this.actieStappen({ status: "Afgerond" }, { gecorr: true }) + `<div class="aw-regel">Jij zag het herstel: jij bent de toetser. Geen verdere instelling nodig.</div>`
            : this.actieStappen({ status: "Voorstel" }) + `<div class="aw-regel">Een coördinator kiest actiehouder, toetser en plandatum. <b>Afgerond pas na toetsing</b>; de toetser is nooit de actiehouder.</div>`}</div>
        </div>
        <div class="dock adock"><button class="btn primary volgknop" data-need="actie"${act("bevestigActie")}>${svg("check", 20)} Actievoorstel vastleggen</button></div></div>`));
    },
    // statusverloop van een actie: Instellen → Uitvoeren → Toetsen → Afgerond (wie bij elke stap)
    actieStappen(a, o) {
      o = o || {};
      const nm = (id, std) => { const u = id && (window.WPI.USERS || []).find((x) => x.id === id); return u ? (u.id === (this.user || {}).id ? "jij" : u.full_name.split(" ")[0]) : std; };
      const S = o.gecorr ? [["Gezien", "jij"], ["Hersteld", "ploeg"], ["Getoetst", "jij"], ["Afgerond", ""]]
        : [["Instellen", "coördinator"], ["Uitvoeren", nm(a.houder, "actiehouder")], ["Toetsen", nm(a.toetser, "toetser")], ["Afgerond", ""]];
      const nu = { "Voorstel": 0, "Open": 1, "In uitvoering": 1, "Klaar voor toetsing": 2, "Afgerond": 4 }[a.status];
      if (nu === undefined) return "";
      return `<ol class="aw-stap${o.gecorr ? " gecorr" : ""}" aria-label="Verloop van de actie">${S.map(([n, w], i) => {
        const st = i < nu || nu === 4 ? "klaar" : i === nu ? "nu" : "";
        return `<li class="${st}"${st === "nu" ? ' aria-current="step"' : ""}><span class="bol">${st === "klaar" ? svg("check", 14, 3) : i + 1}</span><span class="n">${n}</span>${w ? `<span class="w">${esc(w)}</span>` : ""}</li>`;
      }).join("")}</ol>`;
    },
    zetActie(k, val) { this.state.inspectie.cur.actie[k] = val; tril(15); const y = window.scrollY; this.route(); window.scrollTo(0, y); },
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
        <button class="btn primary"${act("waarnemingOver")}>${svg("mic", 18)} Ja, volgende waarneming</button>
        <button class="btn ghost" style="margin-top:10px;width:100%"${act("stap", "algemeen")}>Algemene onderwerpen nalopen</button>
        <button class="btn ghost" style="margin-top:10px;width:100%"${act("andereTaak")}>Andere taak toetsen</button>
        <button class="btn ghost" style="margin-top:10px;width:100%"${act("stap", "monteurs")}>Nee, naar het gesprek met de monteurs</button></div>`));
      if (ins.waarnemingen.length) v.appendChild(el(this.vastgelegdLijst(ins)));
    },
    ins_algemeen(ins, v) {
      v.appendChild(el(this.insHead(ins, "Geheugensteun · niet verplicht", "Algemene onderwerpen")));
      const t = this.toastLaatste(ins); if (t) v.appendChild(el(t));
      v.appendChild(el(`<div class="q"><div class="qs" style="margin-top:0">Leg alleen vast wat je zag. Tik op een onderwerp om er een waarneming bij te geven.</div>
        ${this.onderwerpen().map((o) => {
          const ws = ins.waarnemingen.filter((x) => x.regel_id === "ALG-" + o.ref);
          return `<button class="pick" style="background:#fff;box-shadow:inset 0 0 0 1px var(--line);display:flex;align-items:center;gap:12px"${act("waarnemingOver", o.ref)}>
            <span style="width:30px;height:30px;border-radius:8px;background:var(--mist);display:grid;place-items:center;font-weight:700;flex:none">${o.ref}</span>
            <span style="flex:1" class="t">${esc(o.naam)}</span>${ws.map((x) => `<span class="badge b-${x.oordeel === "NVT" ? "N" : x.oordeel}">[${x.oordeel}]</span>`).join(" ")}</button>`;
        }).join("")}
        <button class="btn primary" style="margin-top:14px"${act("stap", "meer")}>Klaar met de onderwerpen</button></div>`));
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
        <div class="chips">${lijst.map((n) => `<button class="chipb${gekozen.includes(n) ? " on" : ""}"${act("togMonteur", n)}>${gekozen.includes(n) ? "✓ " : ""}${esc(n)}</button>`).join("")}</div>
        <div style="display:flex;gap:8px;margin-top:12px"><input id="nieuwe-monteur" class="fin" placeholder="Andere naam toevoegen" style="flex:1"${op("enter", "voegMonteurToe")}><button class="btn ghost sm"${act("voegMonteurToe")}>${svg("plus", 16)} Toevoegen</button></div>
        ${gekozen.length ? `<div class="s" style="margin-top:10px;font-weight:700">${gekozen.length} monteur${gekozen.length === 1 ? "" : "s"} gekoppeld</div>` : ""}</div>`));
      v.appendChild(el(`<div class="q"><div class="qt">Wat heb je besproken en hoe reageerden ze?</div><div class="qs">Ideeën van de monteurs komen in het rapport.</div>
        ${this.invoer("gesprek", "Bijv. besproken dat de gasmeter bij de man hoort; monteurs stelden een clip aan het harnas voor")}</div>`));
      v.appendChild(el(`<div class="q"><div class="qt">Wat ging opvallend goed?</div><div class="qs">Elk rapport bevat ten minste één positieve bevinding.</div>
        ${this.invoer("positief", "Bijv. LOTOTO netjes toegepast: sloten van opdrachtgever en Noardling hingen erop")}
        <button class="btn primary" style="margin-top:14px"${act("stap", "klaar")}>Naar afronden</button></div>`));
    },
    vastgelegdLijst(ins) {
      return `<div class="vastgelegd"><h2>Vastgelegd</h2><div class="listcard">${ins.waarnemingen.map((w) => {
        const i = this.regelInfo(w.regel_id, w.buiten);
        return `<div class="row"><span class="grow"><span class="t">${esc(i.ref)} · ${esc(kort(i.titel, 60))}</span>
          <div class="s">${w.tekst.trim() ? "“" + esc(kort(w.tekst.trim(), 90)) + "”" : this.fotoLijst(w).length > 1 ? "foto's" : "foto"}${w.actie && w.actie.tekst ? " · actie: " + esc(kort(w.actie.tekst, 60)) : ""}</div></span>
          ${this.fotoDuimen(w, 1, 36)}
          <span class="badge b-${w.oordeel === "NVT" ? "N" : w.oordeel}">[${w.oordeel}]</span></div>`;
      }).join("")}</div></div>`;
    },
    // controle vóór ondertekenen: alleen herinneringen, je kunt altijd vastleggen
    controlePunten(ins) {
      const ws = ins.waarnemingen, p = [];
      if (!ws.length) p.push("Er is nog geen waarneming vastgelegd.");
      ws.filter((w) => w.oordeel === "A" && !this.fotoLijst(w).length).forEach((w) => p.push("Afwijking bij " + this.regelInfo(w.regel_id, w.buiten).ref + " heeft geen foto."));
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
          <button class="btn ghost sm"${act("clearSig")}>Wissen</button></div></div>`));
      v.appendChild(el(`<button class="btn primary" style="margin-top:16px"${act("bewaarInspectie")}>Inspectie vastleggen</button>`));
      v.appendChild(el(`<button class="btn ghost" style="margin-top:10px;width:100%"${act("go", "vandaag")}>Later afmaken (blijft bewaard)</button>`));
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
           <button class="btn ghost" style="margin-top:14px;width:100%"${act("closeModal")}>Terug om aan te vullen</button>
           <button class="btn primary" style="margin-top:10px"${actSluit("bewaarInspectie", true)}>Toch vastleggen</button>`);
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
          waarneming: (w.tekst || "").trim(), foto: w.foto || null, extraFotos: this.fotoLijst(w).slice(1).map((foto) => ({ foto })), oordeel: w.oordeel, tekst: w.actie.tekst, prio: w.actie.prio, terPlaatse: w.actie.terPlaatse,
          status: gecorr ? "Afgerond" : "Voorstel", houder: null, toetser: gecorr ? this.user.id : null, plandatum: gecorr ? isoDag(new Date()) : null,
          log: [{ t: nu, wie: rec.inspecteur, wat: gecorr ? "Ter plaatse gecorrigeerd en door de inspecteur gezien" : "Actievoorstel uit de inspectie" + (w.actie.herkomst === "Voorstel" ? " (tekst voorgesteld door de app)" : "") }] });
      });
      let ok = true;
      try { await DB.save(rec); for (const a of nieuw) await DB.put("acties", a); } catch (e) { ok = false; }
      if (!ok) return this.openModal("Niet opgeslagen", "Het toestel kon de inspectie niet bewaren. Je gegevens staan nog in de lopende inspectie.", `<button class="btn primary"${actSluit("bewaarInspectie", true)}>Opnieuw proberen</button>`);
      this.acties = null;
      if (ins.plan_id) { await this.laadPlanning(); const pl = this.planning.find((x) => x.id === ins.plan_id); if (pl) { pl.status = "uitgevoerd"; pl.inspectie_id = rec.id; try { await DB.put("planning", pl); } catch (e) {} } }
      this.state.inspectie = null; this.bewaarConcept(true); tril([30, 50, 30]);
      // direct weg van de afgeronde stap: ook als het venster met × sluit, staat het rapport in beeld
      // (replace: 'terug' leidt niet naar de verouderde 'Klopt dit?'-pagina)
      location.replace("#/rapport/" + rec.id);
      const nv = nieuw.filter((a) => a.status === "Voorstel").length;
      this.openModal("Vastgelegd", "Veilig bewaard op dit toestel (cloud-opslag volgt met de backend).",
        `${nv ? `<div class="hint" style="margin-bottom:12px">${nv} actievoorstel${nv === 1 ? "" : "len"} klaargezet. Een coördinator stelt ze in onder <b>Acties › In te stellen</b>.</div>` : ""}
         <button class="btn primary"${actSluit("go", "rapport/" + rec.id)}>Bekijk rapport</button>
         <button class="btn ghost" style="margin-top:10px;width:100%"${actSluit("go", "inspecties")}>Naar inspecties</button>`);
    },
    // Actievenster (Acties › openActie): na het tekenen rustiger ordenen. Alleen opmaak en volgorde;
    // knoppen, velden en hun acties (data-action) blijven dezelfde elementen. Lukt iets niet, dan blijft het venster zoals het was.
    verrijkActie(id) {
      const a = (this.acties || []).find((x) => x.id === id), mod = $("mod"), ov = $("ov");
      const kop = mod && mod.firstElementChild, titel = kop && kop.firstElementChild;
      if (!a || !titel || !this.user) return;
      const { USERS, stBadge, dagLabel, dagenTot } = window.WPI, me = this.user.id;
      const persoon = (pid) => { const u = USERS.find((x) => x.id === pid); return u ? `<span class="mini-av">${esc(u.full_name[0])}</span><span>${esc(u.full_name)}</span>${pid === me ? `<span class="jijtag">jij</span>` : ""}` : `<span class="leegw">nog niet gekozen</span>`; };
      const voorstel = a.status === "Voorstel", loopt = a.status === "Open" || a.status === "In uitvoering";
      const ow = a.oordeel === "A" ? "Afwijking" : a.oordeel === "V" ? "Verbeterpunt" : "Actie";
      mod.classList.add("actiemod"); if (ov) ov.classList.add("actie");
      titel.removeAttribute("style"); titel.className = "aw-kop";
      titel.innerHTML = `<div class="aw-kick"><span>${esc(a.handmatig ? "Actie" : "Actie · " + ow)}</span>${stBadge(a.status)}</div>
        <div class="aw-titel">${esc(voorstel ? "Instellen: wie en wanneer" : a.tekst || "Actie")}</div>`;
      const x = kop.querySelector("button"); if (x && !x.getAttribute("aria-label")) x.setAttribute("aria-label", "Sluiten");
      // wanneer: datum + rustige of warme (te laat / vandaag) aanduiding
      let wanneer = `<span class="leegw">nog niet gekozen</span>`;
      if (a.plandatum) {
        const d = dagenTot(a.plandatum);
        const tag = !loopt ? "" : d < 0 ? `<span class="dchip warm">${-d} dag${d === -1 ? "" : "en"} te laat</span>` : d === 0 ? `<span class="dchip warm">vandaag</span>`
          : `<span class="dchip">nog ${d} dag${d === 1 ? "" : "en"}</span>`;
        wanneer = `<span>${esc(dagLabel(a.plandatum))}</span>${tag}`;
      }
      // rolbewust, gelijk aan de knoppen in openActie: alleen de actiehouder voert uit en meldt klaar,
      // alleen de toetser toetst en rondt af; ieder ziet zijn eigen volgende stap
      const vn = (pid) => esc(WPI.naam(pid).split(" ")[0]), houder = a.houder === me && a.toetser !== me, toetser = a.toetser === me && a.houder !== me;
      const regel = a.status === "Afgerond" ? `Getoetst en afgerond door <b>${esc(a.toetser === me ? "jou" : WPI.naam(a.toetser))}</b>.`
        : a.status === "Vervallen" ? "Dit voorstel is vervallen; de reden staat in het verloop."
        : voorstel ? "Kies een actiehouder en een andere persoon als toetser. <b>Afgerond pas na toetsing</b>; de QHSE-manager is nooit actiehouder."
        : a.status === "Klaar voor toetsing" && toetser ? `<b>Jouw stap: toetsen.</b> Bekijk of het is opgelost. Akkoord rondt af; niet akkoord gaat terug naar ${vn(a.houder)}.`
        : a.status === "Klaar voor toetsing" && houder ? `<b>Jij hebt het klaar gemeld.</b> Nu toetst ${vn(a.toetser)}; alleen de toetser kan afronden.`
        : a.status === "Klaar voor toetsing" ? `<b>Wacht op toetsing</b> door ${esc(WPI.naam(a.toetser))}. Alleen de toetser kan afronden.`
        : houder ? `<b>Jouw stap: ${a.status === "Open" ? "uitvoeren" : "afmaken en klaar melden"}.</b> Daarna toetst ${vn(a.toetser)} en rondt af; jij kunt niet zelf afronden.`
        : toetser ? `<b>Jij bent de toetser.</b> Nu niets te doen: ${vn(a.houder)} voert uit en meldt het klaar, daarna toets jij.`
        : `<b>Wacht op uitvoering</b> door ${esc(WPI.naam(a.houder))}. Afgerond pas na toetsing door ${esc(WPI.naam(a.toetser))}.`;
      const P = window.WPI.PRIO[a.prio], prio = P ? `<span class="pchip p-${esc(a.prio)}"><span class="pbol" aria-hidden="true"></span>${esc(P.lab.split(" · ")[0])}</span>${P.lab.includes(" · ") ? `<span class="leegw">${esc(P.lab.split(" · ")[1])}</span>` : ""}` : `<span class="leegw">niet opgegeven</span>`;
      const blok = el(`<div class="aw-blok">${this.actieStappen(a)}<div class="aw-regel">${regel}</div>
        ${voorstel ? "" : `<dl class="aw-feiten"><div><dt>Actiehouder</dt><dd>${persoon(a.houder)}</dd></div><div><dt>Toetser</dt><dd>${persoon(a.toetser)}</dd></div><div><dt>Plandatum</dt><dd>${wanneer}</dd></div><div><dt>Prioriteit</dt><dd>${prio}</dd></div></dl>`}</div>`);
      const sub = kop.nextElementSibling; if (!sub) return;
      const herkomst = sub.nextElementSibling, wrij = herkomst && herkomst.nextElementSibling;
      sub.after(blok);
      if (herkomst && wrij && wrij.querySelector(".lbl.jij")) { wrij.classList.add("aw-waarn"); herkomst.classList.add("aw-herkomst"); wrij.after(herkomst); }
      if (!voorstel) { const oud = mod.querySelector(":scope > .card"); if (oud && oud.querySelector(".badge")) oud.remove(); }
      // belangrijkste knop vast onderin (duimzone), met de foutmelding er direct boven
      const hoofd = mod.querySelector(":scope > .btn.primary");
      if (hoofd) {
        const dock = el(`<div class="aw-dock"></div>`), fout = mod.querySelector(":scope > #ai-fout");
        if (fout) dock.appendChild(fout);
        hoofd.style.marginTop = ""; dock.appendChild(hoofd); mod.appendChild(dock);
      }
      const verloop = [...mod.querySelectorAll(":scope > .s")].find((n) => n.textContent.trim() === "Verloop"); if (verloop) verloop.classList.add("aw-vkop");
    },
  });
  // na alle modules (acties.js laadt later): openActie verrijken; een ander venster wist de actie-opmaak weer
  function koppelActieVenster() {
    const A = window.App, open0 = A.openActie, modal0 = A.openModal;
    if (!open0 || open0._verrijkt) return;
    A.openModal = function () { const m = $("mod"), o = $("ov"); if (m) m.classList.remove("actiemod"); if (o) o.classList.remove("actie"); return modal0.apply(this, arguments); };
    A.openActie = function (id) { const r = open0.apply(this, arguments); try { this.verrijkActie(id); } catch (e) { /* venster blijft zoals getekend */ } return r; };
    A.openActie._verrijkt = true;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", koppelActieVenster); else setTimeout(koppelActieVenster, 0);
})();
