// Open punten: Beheer (monteurs + doel % conform + team en rollen), rechten per rol (coördinator: alleen monteurs;
// QHSE-manager en beheerder: team en rollen, doel; Vandaag als overzicht), doellijn in trendgrafieken (standaard 85%),
// programma-voorstel per maand, meldingen voor gemiste inspecties. Draai: BASE=http://localhost:8370 node tests/beheer.js  (verwacht "errs []")
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8140';
const fouten = [];
const check = (ok, wat, extra) => { console.log((ok ? 'OK   ' : 'FOUT ') + wat + (extra !== undefined ? ' · ' + JSON.stringify(extra) : '')); if (!ok) fouten.push(wat); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const nieuw = async (vp) => {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-13T09:00:00'));   // vaste "vandaag": volgende maand = december 2026
    await p.goto(BASE + '/index.html'); await p.waitForTimeout(900);
    return { ctx, p };
  };
  const wacht = (p, ms) => p.waitForTimeout(ms || 350);
  const opslag = (p, k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
  const wijzig = (p, n) => p.locator('.bhrij', { hasText: n }).locator('button:has-text("Wijzig")').click();

  // ===== 1. Beheer op de telefoon =====
  {
    const { ctx, p } = await nieuw({ width: 390, height: 844 });
    // coördinator: Beheer alleen voor de monteurslijst (geen doel, geen team en rollen)
    await p.evaluate(() => App.login('u-coord1')); await wacht(p, 700);
    await p.evaluate(() => App.openAccount()); await wacht(p, 150);
    check(/Monteurs/.test(await p.locator('#mod button:has-text("Beheer")').innerText().catch(() => '')), 'coördinator: Beheer (Monteurs) in het accountmenu');
    await p.evaluate(() => { App.closeModal(); location.hash = '#/beheer'; }); await wacht(p, 500);
    check(await p.evaluate(() => location.hash) === '#/beheer' && await p.locator('#bh-monteurs').count() === 1 && !(await p.locator('#bh-doel').count()) && !(await p.locator('#bh-team').count()),
      'coördinator: monteurslijst, geen doel en geen team en rollen');
    // ook de acties zelf zijn afgeschermd (niet alleen het scherm): het doel wijzigt een coördinator niet
    await p.evaluate(() => { localStorage.setItem('wpi_doel_conform', '85'); document.body.insertAdjacentHTML('beforeend', '<input id="bh-doel-x" value="">');
      const i = document.getElementById('bh-doel-in'); if (i) i.value = ''; App.beheerDoel(); document.getElementById('bh-doel-x').remove(); });
    check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '85', 'coördinator: beheerDoel doet niets');
    // de oude rol inspecteur (bestaat niet meer; alleen nog in de database): niets in Beheer, ook niet via de console
    await p.evaluate(() => { App.user = { id: 'x-oud', full_name: 'Oude Rol', role: 'inspecteur', functie: '' };
      document.body.insertAdjacentHTML('beforeend', '<input id="bh-doel-in" value=""><input id="bh-nieuw" value="Indringer">');
      App.beheerDoel(); App.beheerToevoegen(); App.beheerActief(0, false);
      document.getElementById('bh-doel-in').remove(); document.getElementById('bh-nieuw').remove(); });
    check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '85' && !(await p.evaluate(() => App.monteursLijst().includes('Indringer')))
      && (await p.evaluate(() => App.monteursLijst().length)) === 5, 'oude rol inspecteur: beheerDoel/beheerToevoegen/beheerActief doen niets');
    await p.evaluate(() => localStorage.removeItem('wpi_doel_conform'));
    // QHSE-manager en beheerder: Beheer met team en rollen en het doel; Vandaag is een overzicht (geen "inspectie starten")
    for (const u of ['u-qhse', 'u-beheer']) {
      await p.evaluate((u) => App.login(u), u); await wacht(p, 700);
      check(/Overzicht van het team/.test(await p.locator('#view h1').innerText()) && !(await p.locator('.heroknop, button:has-text("Inspectie starten"), button:has-text("Inspectie inplannen")').count()),
        u + ': Vandaag = overzicht van het team, geen inspectie starten of inplannen');
      await p.evaluate(() => App.go('beheer')); await wacht(p, 500);
      const team = await p.locator('#bh-team').innerText().catch(() => '');
      check(await p.locator('#bh-doel').count() === 1 && /Team en rollen/.test(team) && (await p.locator('#bh-team .bhteamrij').count()) === 6, u + ': Beheer met doel en team en rollen (6 personen)', team.slice(0, 120));
      check(/Femke Fictief[\s\S]*Manager Projects/.test(team) && /QHSE-manager/.test(team) && /Beheerder/.test(team) && !/Inspecteur\b/.test(team), u + ': twee hoofden, QHSE-manager en beheerder; nergens de rol Inspecteur', team);
      check(await p.locator('#bh-team select').count() === 0 && /voorbeeldmodus/.test(await p.locator('#bh-team .bhuitnodig').evaluate((e) => e.textContent)), u + ': voorbeeldmodus: rollen alleen bekijken (uitleg bij uitnodigen)');
      await p.evaluate(() => App.go('inspectie')); await wacht(p, 400);
      check(await p.evaluate(() => location.hash) !== '#/inspectie', u + ': #/inspectie stuurt terug (inspecteert niet)');
      await p.evaluate(() => App.startInspectie('DAM', 'x', 't', true)); await wacht(p, 200);
      check(await p.evaluate(() => App.state.inspectie === null), u + ': startInspectie doet niets');
    }

    await p.evaluate(() => App.login('u-hoofd')); await wacht(p, 700);
    await p.evaluate(() => App.openAccount()); await wacht(p, 150);
    await p.click('#mod button:has-text("Beheer")'); await wacht(p, 500);
    check(await p.evaluate(() => location.hash) === '#/beheer' && await p.locator('h1:has-text("Beheer")').count() === 1, 'hoofd: Beheer via accountmenu');
    check(!/Alleen voor/.test(await p.locator('#view .hi').first().innerText()), 'vriendelijke kicker (geen "Alleen voor …")');
    const uitleg = await p.locator('.bhuitleg').allInnerTexts();
    check(uitleg.every((t) => t.length <= 80), 'korte uitleg (één regel per kaart)', uitleg);
    const demo = await p.evaluate(() => App.MONTEURS_DEMO.slice());
    check(JSON.stringify(await p.evaluate(() => App.monteursLijst())) === JSON.stringify(demo), 'startlijst = huidige lijst');
    check(await p.locator('#bh-monteurs .bhrij:not(.uit) button').count() === demo.length, 'één knop per naam (Wijzig)');
    // toevoegen met spaties
    await p.fill('#bh-nieuw', '   Jan   de  Vries  '); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    let lijst = await opslag(p, 'wpi_monteurs');
    check(lijst.includes('Jan de Vries') && lijst.length === demo.length + 1, 'toevoegen, spaties opgeschoond', lijst);
    // dubbel (hoofdletters/spaties) geweigerd
    await p.fill('#bh-nieuw', 'jan DE vries '); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    check(/staat al in de lijst/.test(await p.locator('#bh-fout').innerText()), 'dubbele naam (andere hoofdletters) geweigerd');
    check((await p.evaluate(() => App.monteursLijst())).length === demo.length + 1, 'geen dubbel opgeslagen');
    check(await p.inputValue('#bh-nieuw') === 'jan DE vries ', 'getypte naam blijft staan na fout');
    // accenten en letters als ø
    await p.fill('#bh-nieuw', 'Øyvind Ærø'); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    await p.fill('#bh-nieuw', 'oyvind  aero'); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    check(/staat al in de lijst/.test(await p.locator('#bh-fout').innerText()) && (await p.evaluate(() => App.monteursLijst())).filter((n) => /yvind/i.test(n)).length === 1, 'Øyvind Ærø en oyvind aero zijn dezelfde naam');
    await p.fill('#bh-nieuw', 'Jose Garcia'); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    await p.fill('#bh-nieuw', 'JOSÉ GARCÍA'); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    check(/staat al in de lijst/.test(await p.locator('#bh-fout').innerText()), 'accenten tellen niet mee');
    // bijna-dubbelen: punt aan het eind, zero-width spatie (plakken uit Teams/Outlook), streepje
    for (const bijna of ['Henk Voorbeeld.', 'Henk\u200BVoorbeeld', 'henk-voorbeeld', '\uFEFFHenk  Voorbeeld ']) {
      await p.fill('#bh-nieuw', bijna); await p.click('button:has-text("Toevoegen")'); await wacht(p);
      check(/“Henk Voorbeeld” staat al in de lijst/.test(await p.locator('#bh-fout').innerText()) && (await p.evaluate(() => App.monteursLijst())).filter((n) => /henk/i.test(n)).length === 1,
        'bijna-dubbel geweigerd: ' + JSON.stringify(bijna));
    }
    await p.fill('#bh-nieuw', '...'); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    check(/Vul een naam in/.test(await p.locator('#bh-fout').innerText()), 'naam met alleen leestekens geweigerd');
    // leeg geweigerd
    await p.fill('#bh-nieuw', '   '); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    check(/Vul een naam in/.test(await p.locator('#bh-fout').innerText()), 'lege naam geweigerd');
    // hernoemen (Wijzig → veld over de hele breedte, knoppen eronder)
    const i = await p.evaluate(() => App.monteursLijst().indexOf('Kees Demo'));
    await wijzig(p, 'Kees Demo'); await wacht(p);
    const maat = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { inp: r('#bh-hernoem').width, kaart: r('#bh-monteurs').width, inpBot: r('#bh-hernoem').bottom, knopTop: r('.bhbew .btn').top }; });
    check(maat.inp > maat.kaart * 0.8 && maat.knopTop >= maat.inpBot, 'telefoon: hernoemveld breed, knoppen eronder', maat);
    await p.screenshot({ path: 'bh-telefoon-wijzig.png', fullPage: true });
    await p.fill('#bh-hernoem', 'pieter proef'); await p.click('.bhrij.bewerk button:has-text("Opslaan")'); await wacht(p);
    check(/staat al in de lijst/.test(await p.locator('#bh-fout').innerText()), 'hernoemen naar bestaande naam geweigerd');
    await p.fill('#bh-hernoem', ' Kees  Voorbeeld '); await p.click('.bhrij.bewerk button:has-text("Opslaan")'); await wacht(p);
    lijst = await opslag(p, 'wpi_monteurs');
    check(lijst[i] === 'Kees Voorbeeld' && !lijst.includes('Kees Demo'), 'hernoemd op dezelfde plek', lijst);
    await p.screenshot({ path: 'bh-telefoon.png', fullPage: true });
    // op non-actief (via Wijzig) en weer terug
    await wijzig(p, 'Sander Test'); await wacht(p);
    await p.click('.bhrij.bewerk .bhlink'); await wacht(p);
    check(!(await p.evaluate(() => App.monteursLijst())).includes('Sander Test') && (await opslag(p, 'wpi_monteurs_inactief')).includes('Sander Test'), 'op non-actief: niet meer te kiezen');
    check(await p.locator('.bhrij.uit', { hasText: 'Sander Test' }).count() === 1, 'non-actief zichtbaar onder "Non-actief"');
    // hernoemen naar een non-actieve naam: duidelijke melding
    await wijzig(p, 'Kees Voorbeeld'); await wacht(p);
    await p.fill('#bh-hernoem', 'sander TEST'); await p.click('.bhrij.bewerk button:has-text("Opslaan")'); await wacht(p);
    check(/staat bij Non-actief/.test(await p.locator('#bh-fout').innerText()), 'hernoemen naar non-actieve naam: "staat bij Non-actief"', await p.locator('#bh-fout').innerText());
    await p.click('.bhrij.bewerk button:has-text("Annuleren")'); await wacht(p);
    // inspectie toont de actieve lijst
    await p.evaluate(() => { App.startInspectie('DAM', 'x', 't', true); App.state.inspectie.stap = 'monteurs'; App.route(); }); await wacht(p, 500);
    const chips = await p.locator('#view').innerText();
    check(chips.includes('Kees Voorbeeld') && chips.includes('Jan de Vries') && !chips.includes('Sander Test'), 'inspectie toont alleen actieve monteurs');
    // al gekozen namen die intussen op non-actief staan of hernoemd zijn, blijven als gekozen chip (uit te tikken);
    // een andere schrijfwijze ("henk voorbeeld" uit een oud concept) is de chip "Henk Voorbeeld"
    await p.evaluate(() => { App.state.inspectie.monteurs = ['Sander Test', 'Kees Demo', 'henk voorbeeld']; App.route(); }); await wacht(p);
    const aanChips = await p.locator('#view .chips .chipb.on').allInnerTexts();
    check(aanChips.length === 3 && ['Sander Test', 'Kees Demo', 'Henk Voorbeeld'].every((n) => aanChips.some((t) => t.includes(n))) && /3 monteurs gekoppeld/.test(await p.locator('#view').innerText())
      && await p.locator('#view .chips .chipb', { hasText: 'Henk Voorbeeld' }).count() === 1, 'inspectie: non-actieve, hernoemde en anders geschreven keuzes staan als gekozen chip', aanChips);
    await p.locator('#view .chips .chipb', { hasText: 'Henk Voorbeeld' }).click(); await wacht(p);
    check(JSON.stringify(await p.evaluate(() => App.state.inspectie.monteurs)) === '["Sander Test","Kees Demo"]', '"Henk Voorbeeld" uittikken haalt "henk voorbeeld" weg (geen dubbele persoon)', await p.evaluate(() => App.state.inspectie.monteurs));
    await p.locator('#view .chips .chipb', { hasText: 'Henk Voorbeeld' }).click(); await wacht(p);
    check(JSON.stringify(await p.evaluate(() => App.state.inspectie.monteurs)) === '["Sander Test","Kees Demo","Henk Voorbeeld"]', 'weer aantikken: één keer "Henk Voorbeeld"');
    await p.locator('#view .chips .chipb.on', { hasText: 'Sander Test' }).click(); await wacht(p);
    check(!(await p.evaluate(() => App.state.inspectie.monteurs)).includes('Sander Test') && await p.locator('#view .chips .chipb', { hasText: 'Sander Test' }).count() === 0, 'non-actieve naam uit te tikken (verdwijnt dan uit de keuze)');
    await p.evaluate(() => { App.state.inspectie.monteurs = []; App.route(); }); await wacht(p);
    // getypte naam in de inspectie → bestaande schrijfwijze
    await p.fill('#nieuwe-monteur', '  henk   voorbeeld '); await p.click('#view button:has-text("Toevoegen")'); await wacht(p);
    check(JSON.stringify(await p.evaluate(() => App.state.inspectie.monteurs)) === '["Henk Voorbeeld"]', 'inspectie: "  henk   voorbeeld " wordt "Henk Voorbeeld"', await p.evaluate(() => App.state.inspectie.monteurs));
    check(await p.locator('.chipb.on', { hasText: 'Henk Voorbeeld' }).count() === 1 && (await p.evaluate(() => App.monteursLijst())).filter((n) => /henk/i.test(n)).length === 1, 'chip "Henk Voorbeeld" staat aan, geen tweede schrijfwijze');
    await p.fill('#nieuwe-monteur', 'HENK VOORBEELD'); await p.click('#view button:has-text("Toevoegen")'); await wacht(p);
    check((await p.evaluate(() => App.state.inspectie.monteurs)).length === 1, 'nogmaals dezelfde naam: niet dubbel gekoppeld');
    // non-actieve naam getypt: weer actief onder de schrijfwijze uit Beheer
    await p.fill('#nieuwe-monteur', 'sander test'); await p.click('#view button:has-text("Toevoegen")'); await wacht(p);
    lijst = await opslag(p, 'wpi_monteurs');
    check(lijst.includes('Sander Test') && !lijst.includes('sander test') && !(await opslag(p, 'wpi_monteurs_inactief')).length
      && (await p.evaluate(() => App.state.inspectie.monteurs)).includes('Sander Test'), 'inspectie: non-actieve naam → "Sander Test" (niet "sander test")', lijst);
    await p.fill('#nieuwe-monteur', '  Nieuwe   Collega '); await p.click('#view button:has-text("Toevoegen")'); await wacht(p);
    check((await opslag(p, 'wpi_monteurs')).includes('Nieuwe Collega') && (await p.evaluate(() => App.state.inspectie.monteurs)).includes('Nieuwe Collega'), 'inspectie: nieuwe naam opgeschoond toegevoegd');
    // naam die al bestaat via bewaarMonteursLijst → geen dubbel
    await p.evaluate(() => { const l = App.monteursLijst(); l.push('JAN DE VRIES '); App.bewaarMonteursLijst(l); });
    check((await p.evaluate(() => App.monteursLijst())).filter((n) => /jan de vries/i.test(n)).length === 1, 'bewaren vanuit inspectie ontdubbelt');
    await p.evaluate(() => { App.state.inspectie = null; App.bewaarConcept(true); App.go('beheer'); }); await wacht(p, 500);
    // naam met apostrof (en een naam die op code lijkt) uit Beheer: in de inspectie gewoon aan te tikken, nooit code
    await p.fill('#bh-nieuw', "Jan d'Hondt"); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    await p.fill('#bh-nieuw', `Piet" onmouseover="window.__lek=1`); await p.click('button:has-text("Toevoegen")'); await wacht(p);
    await wijzig(p, 'Kees Voorbeeld'); await wacht(p);
    await p.fill('#bh-hernoem', "Kees 't Hart'); window.__lek=2;//"); await p.click('.bhrij.bewerk button:has-text("Opslaan")'); await wacht(p);
    check((await opslag(p, 'wpi_monteurs')).includes("Jan d'Hondt"), "Beheer: \"Jan d'Hondt\" opgeslagen");
    await p.evaluate(() => { App.startInspectie('DAM', 'x', 't', true); App.state.inspectie.stap = 'monteurs'; App.route(); }); await wacht(p, 500);
    const chipInfo = await p.evaluate(() => [...document.querySelectorAll('#view .chips .chipb')].map((b) => ({ t: b.textContent, attrs: [...b.attributes].map((a) => a.name) })));
    check(chipInfo.every((c) => c.attrs.every((a) => ['type', 'class', 'aria-pressed'].includes(a))), 'inspectie: monteurchips zonder onclick-attribuut of extra attributen', chipInfo.filter((c) => /'|"/.test(c.t)));
    for (const n of ["Jan d'Hondt", 'Piet" onmouseover="window.__lek=1', "Kees 't Hart'); window.__lek=2;//"]) {
      const chip = p.locator('#view .chips .chipb').filter({ hasText: n.slice(0, 8) });
      await chip.first().hover(); await chip.first().click(); await wacht(p);
      check((await p.evaluate(() => App.state.inspectie.monteurs || [])).includes(n), 'inspectie: chip "' + n + '" aan te tikken');
    }
    check(await p.evaluate(() => window.__lek === undefined) && !errs.length, 'geen code uitgevoerd vanuit een monteursnaam', errs);
    await p.locator('#view .chips .chipb', { hasText: "Jan d'Hondt" }).click(); await wacht(p);
    check(!(await p.evaluate(() => App.state.inspectie.monteurs)).includes("Jan d'Hondt") && await p.locator('#view .chips .chipb.on').count() === 2, 'chip weer uit te tikken');
    await p.evaluate(() => { App.state.inspectie = null; App.bewaarConcept(true); App.go('beheer'); }); await wacht(p, 500);
    await p.evaluate(() => { const l = App.monteursLijst().filter((n) => !/Hondt|Piet"|Kees 't/.test(n)).concat(['Kees Voorbeeld']); localStorage.setItem('wpi_monteurs', JSON.stringify(l)); App.route(); }); await wacht(p);
    // wijzigen blijft niet open staan na weg- en terugnavigeren
    await wijzig(p, 'Jan de Vries'); await wacht(p);
    check(await p.locator('#bh-hernoem').count() === 1, 'Wijzig opent het hernoemveld');
    await p.evaluate(() => App.go('planning')); await wacht(p, 500); await p.evaluate(() => App.go('beheer')); await wacht(p, 500);
    check(await p.locator('#bh-hernoem').count() === 0, 'terug in Beheer: wijzigen is gesloten');
    // Beheer in het accountmenu met het tandwiel (zelfde icoon als in de zijbalk)
    await p.evaluate(() => App.openAccount()); await wacht(p, 150);
    check(await p.locator('#mod button:has-text("Beheer") svg circle[r="3"]').count() === 1, 'accountmenu: Beheer met tandwiel');
    await p.evaluate(() => App.closeModal()); await wacht(p, 150);
    // non-actief → weer actief via Beheer
    await wijzig(p, 'Sander Test'); await wacht(p); await p.click('.bhrij.bewerk .bhlink'); await wacht(p);
    await p.locator('.bhrij', { hasText: 'Sander Test' }).locator('button:has-text("Weer actief")').click(); await wacht(p);
    check((await p.evaluate(() => App.monteursLijst())).includes('Sander Test') && !(await opslag(p, 'wpi_monteurs_inactief')).includes('Sander Test'), 'weer actief');
    // alles op non-actief: geen terugval naar de demo-namen
    await p.evaluate(() => { localStorage.setItem('wpi_monteurs_inactief', JSON.stringify(App.monteursLijst())); localStorage.setItem('wpi_monteurs', '[]'); });
    check((await p.evaluate(() => App.monteursLijst())).length === 0, 'alles non-actief → lege lijst (geen demo-terugval)');
    await p.evaluate(() => { localStorage.setItem('wpi_monteurs', localStorage.getItem('wpi_monteurs_inactief')); localStorage.setItem('wpi_monteurs_inactief', '[]'); App.route(); }); await wacht(p);
    // doel % conform
    await p.fill('#bh-doel-in', '150'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p);
    check(/tussen 1 en 100/.test(await p.locator('#bh-doel-fout').innerText()) && await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === null, 'doel 150 geweigerd');
    await p.fill('#bh-doel-in', '85'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p);
    check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '85' && /85% conform/.test(await p.locator('.bhstand').innerText()), 'doel 85% opgeslagen');
    // ongeldige invoer haalt het doel nooit stilletjes weg
    for (const fout of ['e', '8e', '--', 'abc', '85x', '%', '1.000', '1,000', ' 7 0 ', '0', '101', '+20']) {
      await p.fill('#bh-doel-in', fout); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 250);
      check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '85' && /Vul een getal tussen 1 en 100/.test(await p.locator('#bh-doel-fout').innerText())
        && await p.inputValue('#bh-doel-in') === fout && !(await p.locator('.toast').count()), 'doel blijft 85 bij "' + fout + '" (foutmelding, invoer blijft staan)');
    }
    await p.fill('#bh-doel-in', '80 %'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p);
    check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '80', '"80 %" wordt 80');
    // nooit stilletjes afronden; voorloopnullen en ",0" zijn wel gewoon een heel getal
    for (const fout of ['0.6', '0.4', '99.5', '85,5']) {
      await p.fill('#bh-doel-in', fout); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 250);
      check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '80' && /heel getal/.test(await p.locator('#bh-doel-fout').innerText()), 'doel "' + fout + '" geweigerd (geen afronding)');
    }
    for (const [in_, uit] of [['0085', '85'], ['085', '85'], ['85,0', '85'], ['70.00', '70'], ['100', '100'], ['1', '1']]) {
      await p.fill('#bh-doel-in', in_); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 250);
      check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === uit, 'doel "' + in_ + '" wordt ' + uit);
    }
    // foutmelding en stand niet tegen elkaar aan
    await p.evaluate(() => localStorage.removeItem('wpi_doel_conform')); await p.evaluate(() => App.route()); await wacht(p);
    await p.fill('#bh-doel-in', 'abc'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 250);
    const gat = await p.evaluate(() => { const f = document.getElementById('bh-doel-fout').getBoundingClientRect(), st = document.querySelector('.bhstand').getBoundingClientRect(); return Math.round(st.top - f.bottom); });
    check(gat >= 6, 'doelfout en "geen doel" met ruimte ertussen', gat);
    await p.screenshot({ path: 'bh-doelfout.png' });
    await p.fill('#bh-doel-in', '85'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p);
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'telefoon: geen horizontaal scrollen');
    const breed = await p.evaluate(() => [...document.querySelectorAll('#bh-monteurs .bhrij:not(.bewerk) .t')].every((t) => t.getBoundingClientRect().height < 26));
    check(breed, 'telefoon: namen op één regel');
    await p.screenshot({ path: 'bh-telefoon2.png', fullPage: true });
    await ctx.close();
  }

  // ===== 2. Doellijn in dashboard en kwartaalrapportage (web) =====
  {
    const { ctx, p } = await nieuw({ width: 1440, height: 900 });
    await p.evaluate(() => App.login('u-hoofd')); await wacht(p, 700);
    await p.evaluate(() => App.go('beheer')); await wacht(p, 400);
    check(await p.locator('#tabbar a.bhtab.on:has-text("Beheer")').count() === 1, 'web: Beheer in de zijbalk, actief');
    const br = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { view: r('#view').right, top: r('.topbar').right, grid: r('.bhgrid').right }; });
    check(Math.abs(br.view - br.top) < 3 && br.grid <= br.top + 1, 'web: Beheer even breed als topbalk en alertbalk', br);
    const alR = await p.evaluate(() => { const a = document.getElementById('alert'), r = (e) => e.getBoundingClientRect(); return { a: a.classList.contains('hidden') ? null : Math.round(r(a).right), grid: Math.round(r(document.querySelector('.bhgrid')).right), bel: Math.round(r(document.querySelector('.topbar')).right - parseFloat(getComputedStyle(document.querySelector('.topbar')).paddingRight) * (+getComputedStyle(document.documentElement).zoom || 1)) }; });
    check(alR.a !== null && Math.abs(alR.a - alR.grid) <= 1 && Math.abs(alR.a - alR.bel) <= 1, 'web Beheer: alertbalk, kaarten en bel op dezelfde rechterrand', alR);
    // op elke pagina eindigt de alertbalk bij de bel; Beheer is even breed als de Planning (bel en avatar verspringen niet)
    const randen = {};
    for (const pg of ['beheer', 'planning', 'acties', 'inspecties', 'kwartaal', 'dashboard', 'vandaag']) {
      await p.evaluate((pg) => App.go(pg), pg); await wacht(p, 450);
      randen[pg] = await p.evaluate(() => { const a = document.getElementById('alert'), t = document.querySelector('.topbar'), r = (e) => e.getBoundingClientRect();
        return { a: a.classList.contains('hidden') || !a.offsetWidth ? null : Math.round(r(a).right), bel: Math.round(r(t).right - parseFloat(getComputedStyle(t).paddingRight) * (+getComputedStyle(document.documentElement).zoom || 1)) }; });
    }
    check(Object.entries(randen).every(([pg, x]) => (pg === 'vandaag' || x.a !== null) && (x.a === null || Math.abs(x.a - x.bel) <= 1)), 'web: alertbalk eindigt op elke pagina bij de bel (ook Acties en Inspecties)', randen);
    check(randen.beheer.bel === randen.planning.bel && randen.planning.bel === randen.acties.bel && randen.acties.bel === randen.inspecties.bel && randen.inspecties.bel === randen.kwartaal.bel, 'web: bel op Beheer, Planning, Acties, Inspecties en Kwartaal op dezelfde plek', randen);
    await p.evaluate(() => App.go('beheer')); await wacht(p, 400);
    check(/alleen op dit toestel/.test(await p.locator('.bhdeel').innerText()), 'voorbeeldmodus: Beheer zegt eerlijk dat het alleen op dit toestel staat');
    await p.screenshot({ path: 'bh-web.png', fullPage: true });
    await p.evaluate(() => App.go('dashboard')); await wacht(p, 400);
    check(await p.locator('#tabbar a.bhtab:not(.on)').count() === 1, 'web: Beheer in de zijbalk (niet actief op dashboard)');
    // nooit ingesteld: de standaard van 85% (zoals instellingen.doel_conform op de server)
    check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === null && (await p.locator('.doellijn text').textContent().catch(() => '')).trim() === 'doel 85%', 'nooit ingesteld: standaard doel 85% in het dashboard');
    // bewust geen doel: niets
    await p.evaluate(() => { localStorage.setItem('wpi_doel_conform', ''); App.route(); }); await wacht(p, 400);
    check(await p.locator('.doellijn').count() === 0, 'geen doel: geen doellijn in dashboard');
    await p.evaluate(() => App.go('kwartaal')); await wacht(p, 500);
    check(await p.locator('.doellijn').count() === 0 && !/doel van \d+% conform/.test(await p.locator('.kwverhaal').innerText()), 'geen doel: niets in kwartaal');
    // doel 85% via Beheer
    await p.evaluate(() => App.go('beheer')); await wacht(p, 400);
    await p.fill('#bh-doel-in', '85'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p);
    check(await p.locator('.toast').evaluate((t) => t.getBoundingClientRect().right <= document.querySelector('.topbar').getBoundingClientRect().right + 1), 'web: melding niet breder dan de pagina');
    await p.evaluate(() => App.go('dashboard')); await wacht(p, 500);
    const dl = p.locator('.card:has-text("Hoeveel ziet er goed uit?") .doellijn');
    check(await dl.count() === 1 && (await dl.locator('text').textContent()).trim() === 'doel 85%' && await dl.locator('line').getAttribute('stroke-dasharray') !== null, 'dashboard: streepjeslijn "doel 85%"');
    check(+(await dl.locator('line').getAttribute('stroke-width')) < 2 && +(await dl.locator('line').getAttribute('stroke-opacity')) < 1, 'doellijn rustig (dun, licht)');
    // datalabels raken de doellijn niet
    const raak = async (sel) => p.evaluate((sel) => { const kaart = document.querySelector(sel), lijn = kaart.querySelector('.doellijn line'), yl = +lijn.getAttribute('y1');
      return [...kaart.querySelectorAll('text.pctlab')].filter((t) => { const bb = t.getBBox(); return yl >= bb.y - 2 && yl <= bb.y + bb.height + 2; }).map((t) => t.textContent); }, sel);
    let r = await raak('.card.grafiek.breed');
    check(r.length === 0, 'dashboard: geen %-label op de doellijn', r);
    check(/doel 85%/.test(await p.locator('.kpis .tile', { hasText: 'Conform' }).innerText()), 'dashboard: tegel Conform noemt het doel');
    // onder het doel is geen "te laat": nooit de warm-oranje stip (blush) op de tegel Conform, ook niet bij een hoog doel
    for (const d of ['85', '99']) {
      await p.evaluate((d) => { localStorage.setItem('wpi_doel_conform', d); App.route(); }, d); await wacht(p, 400);
      const kl = await p.locator('.kpis .tile', { hasText: 'Conform' }).getAttribute('class');
      check(!/blush/.test(kl) && /sage|mist/.test(kl), 'dashboard doel ' + d + '%: tegel Conform zonder warm oranje (' + kl + ')');
    }
    await p.evaluate(() => { localStorage.setItem('wpi_doel_conform', '85'); App.route(); }); await wacht(p, 400);
    await p.locator('.card:has-text("Hoeveel ziet er goed uit?")').screenshot({ path: 'bh-dash-doel.png' });
    await p.evaluate(() => App.go('kwartaal')); await wacht(p, 500);
    check(await p.locator('.kwgrid .doellijn').count() === 1, 'kwartaal: doellijn in de grafiek');
    for (const q of ['Q2 2026', 'Q3 2026', 'Q4 2026']) {
      await p.evaluate((q) => { App.kwartaal = q; App.route(); }, q); await wacht(p, 300);
      const t = await p.locator('.kwverhaal').innerText(), pct = await p.evaluate((q) => App.kwCijfers(q).pct, q);
      const verwacht = pct == null ? 'niet te zeggen' : pct >= 85 ? 'doel van 85% conform gehaald' : 'onder het doel van 85% conform';
      check(t.includes(verwacht) && (t.match(/\bdoel\b/g) || []).length === 1, 'kwartaal ' + q + ': "In het kort" noemt het doel één keer (' + verwacht + ')', t);
      check(/doel 85%/.test(await p.locator('.kwkpis .tile', { hasText: 'Conform' }).innerText()), 'kwartaal ' + q + ': tegel Conform noemt het doel');
      check(!/blush/.test(await p.locator('.kwkpis .tile', { hasText: 'Conform' }).getAttribute('class')), 'kwartaal ' + q + ': tegel Conform onder doel niet warm oranje');
      r = await raak('.kwgrid .card.grafiek.breed');
      check(r.length === 0, 'kwartaal ' + q + ': geen %-label op de doellijn', r);
    }
    await p.locator('.kwverhaal').screenshot({ path: 'bh-kw-kort.png' });
    await p.locator('.kwgrid .card.grafiek.breed').screenshot({ path: 'bh-kw-grafiek.png' });
    // leeg = geen doel
    await p.evaluate(() => App.go('beheer')); await wacht(p, 400);
    await p.fill('#bh-doel-in', ''); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p);
    await p.evaluate(() => App.go('dashboard')); await wacht(p, 500);
    check(await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '' && await p.locator('.doellijn').count() === 0, 'leeg = bewust geen doel meer (niet terug naar de standaard)');
    check(!/doel/.test(await p.locator('.kpis .tile', { hasText: 'Conform' }).innerText()), 'geen doel: tegel Conform zonder doel');
    await ctx.close();
  }

  // ===== 3. Programma-voorstel december =====
  {
    const { ctx, p } = await nieuw({ width: 390, height: 844 });
    await p.evaluate(() => App.login('u-qhse')); await wacht(p, 600);
    await p.evaluate(() => App.go('planning')); await wacht(p, 500);
    check(await p.locator('button:has-text("Voorstel programma")').count() === 0 && await p.locator('#pl-nieuwknop').count() === 0 && await p.locator('.pkaart .wijzig').count() === 0
      && /Inspectieprogramma van het team/.test(await p.locator('#view .hi').first().innerText()), 'QHSE-manager: ziet de hele planning, maar geen voorstel-knop, geen inplannen en geen wijzigen');
    await p.evaluate(() => App.login('u-coord1')); await wacht(p, 600);
    await p.evaluate(() => App.go('planning')); await wacht(p, 500);
    check(await p.locator('button:has-text("Voorstel programma december")').count() === 1, 'coördinator: knop "Voorstel programma december"');
    check(/4 inspecties uit de projectplanning/.test(await p.locator('.progrij').innerText()), 'rustige rij met aantal', await p.locator('.progrij').innerText());
    // een project is al ingepland in december → overslaan
    // via het gewone formulier, met kleine letters en spaties getypt (telefoontoetsenbord): "p26-436 " = P26-436
    await p.evaluate(() => App.planForm()); await wacht(p, 300);
    await p.selectOption('#pl-code', 'POM'); await p.fill('#pl-project', ' p26-436 '); await p.fill('#pl-datum', '2026-12-03');
    await p.click('#mod button:has-text("Inplannen")'); await wacht(p, 500);
    const voor = await p.evaluate(() => App.planning.length);
    await p.click('button:has-text("Voorstel programma december")'); await wacht(p, 1000);
    // kop zichtbaar onder de vaste alertbalk
    const kop = await p.evaluate(() => { const h = document.querySelector('#progvs h2').getBoundingClientRect(), k = document.getElementById('pl-nieuwknop').getBoundingClientRect(), a = document.getElementById('alert');
      return { h: h.top, a: a && !a.classList.contains('hidden') ? a.getBoundingClientRect().bottom : 0, at: a && !a.classList.contains('hidden') ? a.getBoundingClientRect().top : 0, kt: k.top, kb: k.bottom, kaart: document.querySelector('.vskaart').getBoundingClientRect().top, ih: innerHeight }; });
    check(kop.h >= kop.a && kop.kaart < kop.ih, 'kop "Voorstel programma december" en eerste kaart in beeld, niet onder de alertbalk', kop);
    check(kop.kt >= kop.a || kop.kb <= kop.at, 'knop "Inspectie inplannen" niet half onder de alertbalk', kop);
    check(!/VCA|7\.1/.test(await p.locator('#progvs').evaluate((e) => e.textContent)), 'voorstel zonder normverwijzing (ook niet achter "Waarom?")');
    const V = await p.evaluate(() => App.progVoorstel.items);
    check(V.length === 3 && JSON.stringify(V.map((x) => x.project).sort()) === JSON.stringify(['P26-156', 'P26-168', 'P26-446']), 'voorstel: lopende projecten > 1 maand in december, zonder al ingeplande', V.map((x) => x.project));
    check(await p.evaluate(() => App.planning.length) === voor, 'nog niets ingepland zonder bevestiging');
    check(await p.evaluate(() => App.planning.some((x) => x.project === 'P26-436' && x.datum === '2026-12-03')), 'formulier: "p26-436" bewaard als P26-436');
    // projectnummer met "(fictief)" en extra spaties: nummer in hoofdletters, rest zoals getypt
    await p.evaluate(() => App.planForm()); await wacht(p, 300);
    await p.selectOption('#pl-code', 'POM'); await p.fill('#pl-project', ' p26-436  (fictief) '); await p.fill('#pl-datum', '2027-03-02');
    await p.click('#mod button:has-text("Inplannen")'); await wacht(p, 500);
    const fic = await p.evaluate(() => App.planning.find((x) => x.datum === '2027-03-02'));
    check(fic && fic.project === 'P26-436 (fictief)' && /P26-436 \(fictief\)/.test(await p.locator('.pkaart:not(.vskaart)', { hasText: 'P26-436 (fictief)' }).first().innerText()), 'formulier: " p26-436  (fictief) " bewaard en getoond als "P26-436 (fictief)"', fic && fic.project);
    await p.evaluate(async (id) => { await App.verwijderPlan(id); }, fic.id); await wacht(p, 300);
    check(await p.evaluate(() => App.progGepland('P26-436', '2026-12', [{ project: ' p26-436 (fictief) ', datum: '2026-12-03' }]) && App.progGepland('p26-436', '2026-12') && !App.progGepland('P26-43', '2026-12')),
      'projectnummer vergelijken zonder verschil in hoofdletters (ook voor oude of gesynchroniseerde records)');
    check(V.every((x) => x.datum.startsWith('2026-12') && [1, 2, 3, 4, 5].includes(new Date(x.datum + 'T00:00').getDay()) && x.datum >= x.min && x.datum <= x.max), 'datums op werkdagen binnen de looptijd', V.map((x) => x.datum));
    check(new Set(V.map((x) => x.datum)).size === V.length, 'datums verspreid over de maand');
    check(JSON.stringify(V.map((x) => x.inspecteur)) === JSON.stringify(['u-coord1', 'u-coord2', 'u-coord1']), 'inspecteur om en om over de coördinatoren');
    const keuze = await p.locator('.vskaart').first().locator('.vsinsp option').allInnerTexts();
    check(keuze.length === 4 && !keuze.some((t) => /Gijs Gefingeerd|Hanna Hypothese/.test(t)), 'kiezer "Inspecteur": alleen de hoofden en coördinatoren (niet de QHSE-manager of beheerder)', keuze);
    check(V.every((x) => x.code), 'product gekoppeld aan de kennisbank', V.map((x) => x.product + '→' + x.code));
    const kaarten = p.locator('.vskaart');
    check(await kaarten.count() === 3 && await p.locator('#progvs .badge, #progvs .b-vs').count() === 0 && /Uit de projectplanning/.test(await p.locator('#progvs .vskicker').innerText())
      && (await p.locator('#progvs h2').innerText()).trim() === 'Voorstel programma december', '3 kaarten; kop zonder getal erachter ("december 3" leest als datum); "Voorstel" één keer in de kop, kicker "Uit de projectplanning", geen lila AI-label op elke kaart');
    check(await kaarten.nth(0).evaluate((k) => !/234, 219, 243|227, 219, 243|E3DBF3/i.test(getComputedStyle(k).boxShadow + getComputedStyle(k).backgroundColor)), 'voorstelkaart zonder lila rand (dat is de kleur van AI-voorstellen)');
    // uitleg: één rustige zin, regel achter "Waarom?", geen oranje blok, reden één keer per groep
    const uitleg = await p.locator('#progvs .vsuitleg').innerText();
    check(/We stellen 3 inspecties voor december voor/.test(uitleg) && !/TREND|WPI/.test(uitleg) && await p.locator('#progvs .hint').count() === 0, 'uitleg in één zin, zonder jargon of oranje blok', uitleg);
    check(await p.locator('#progvs details.vswaarom summary').count() === 1 && !(await p.locator('#progvs details.vswaarom p').isVisible()), 'regel achter "Waarom deze inspecties?"');
    check(await p.locator('#progvs .vsgroep').count() === 1 && /langer dan een maand/.test(await p.locator('#progvs .vsgroep').innerText()) && !/langer dan een maand/.test(await kaarten.nth(0).innerText()), 'reden één keer boven de groep, niet op elke kaart');
    // kaart: leesbare dag met weekdag en looptijd van het project
    const k0 = await kaarten.nth(0).innerText(), dag0 = await kaarten.nth(0).locator('.vsdatum option:checked').innerText();
    check(/Project loopt t\/m \d+ dec/.test(k0) && /^(ma|di|wo|do|vr) \d+ dec$/.test(dag0.trim()), 'kaart: "do 3 dec" en "Project loopt t/m … dec"', { k0, dag0 });
    check(await kaarten.nth(0).locator('.vsdatum option').evaluateAll((o) => o.every((x) => !/weekend|feestdag/.test(x.textContent))), 'dagkeuze: alleen werkdagen');
    await p.screenshot({ path: 'bh-voorstel.png', fullPage: true });
    // regel VCA 7.1 rechtstreeks: korte risicoprojecten en 1 op 4
    const sep = await p.evaluate(() => App.maakProgVoorstel('2026-09').map((x) => x.project + ' ' + x.reden));
    check(sep.some((x) => /P26-542 Kort project met hijsen, besloten ruimte, open water/.test(x)) && sep.some((x) => /P26-507 Loopt langer/.test(x)), 'september: kort risicoproject + lang project', sep);
    check(!sep.some((x) => /P26-304/.test(x)), 'september: kort project dat al een WPI had wordt overgeslagen');
    const metExtra = (extra, m) => p.evaluate(([extra, m]) => { const P = App.data.voorbeelddata.projecten; const bak = P.slice(); extra.forEach((x) => P.push(x)); const r = App.maakProgVoorstel(m); P.length = 0; bak.forEach((x) => P.push(x)); return r; }, [extra, m]);
    const juli = (await metExtra([{ project: 'X-1', product: 'Pompen', locatie: 'A', start: '2026-07-01', eind: '2026-07-03' }, { project: 'X-2', product: 'Pompen', locatie: 'A', start: '2026-07-02', eind: '2026-07-04' }, { project: 'X-3', product: 'Pompen', locatie: 'A', start: '2026-07-06', eind: '2026-07-08' }, { project: 'X-4', product: 'Pompen', locatie: 'A', start: '2026-07-07', eind: '2026-07-09' }, { project: 'X-5', product: 'Pompen', locatie: 'A', start: '2026-07-20', eind: '2026-07-21' }], '2026-07')).map((x) => x.project);
    check(juli.includes('X-1') && juli.includes('X-5') && !juli.some((x) => ['X-2', 'X-3', 'X-4'].includes(x)), 'overige korte projecten: één op de vier per kwartaal', juli);
    // nooit weekend of feestdag voorstellen
    const vrij = await metExtra([{ project: 'W-1', product: 'Pompen', locatie: 'A', start: '2026-12-05', eind: '2026-12-06', hijsen_mobiele_kraan: true },
      { project: 'W-2', product: 'Pompen', locatie: 'A', start: '2026-12-25', eind: '2026-12-27', open_water: true },
      { project: 'W-3', product: 'Pompen', locatie: 'A', start: '2026-12-24', eind: '2026-12-28', open_water: true }], '2026-12');
    const w = (nr) => vrij.find((x) => x.project === nr);
    check(w('W-1') && w('W-1').datum === '' && w('W-1').alleenVrij && JSON.stringify(w('W-1').opties) === '["2026-12-05","2026-12-06"]', 'alleen weekend: geen datum voorgesteld, zelf kiezen', w('W-1'));
    check(w('W-2') && w('W-2').datum === '' && w('W-2').alleenVrij, '25–27 dec: geen 1e kerstdag voorgesteld', w('W-2'));
    check(w('W-3') && ['2026-12-24', '2026-12-28'].includes(w('W-3').datum) && JSON.stringify(w('W-3').opties) === '["2026-12-24","2026-12-28"]', '24–28 dec: alleen do 24 of ma 28', w('W-3'));
    check(vrij.filter((x) => x.datum).every((x) => [1, 2, 3, 4, 5].includes(new Date(x.datum + 'T00:00').getDay()) && !['12-25', '12-26'].includes(x.datum.slice(5))), 'alle voorgestelde datums zijn werkdagen');
    // bewegende feestdagen 2026: tweede paasdag 6 apr, Hemelvaart 14 mei, tweede pinksterdag 25 mei; Koningsdag 27 apr
    const feest = await p.evaluate(() => ['2026-04-06', '2026-05-14', '2026-05-25', '2026-04-27', '2027-03-29', '2027-05-06', '2027-05-17', '2026-05-13', '2026-04-07'].map((d) => App.progVrij(d)));
    check(JSON.stringify(feest) === JSON.stringify(['feestdag', 'feestdag', 'feestdag', 'feestdag', 'feestdag', 'feestdag', 'feestdag', '', '']), 'Pasen, Hemelvaart en Pinksteren zijn geen voorgestelde werkdagen', feest);
    const mei = await metExtra([{ project: 'H-1', product: 'Pompen', locatie: 'A', start: '2027-05-06', eind: '2027-05-06', open_water: true }, { project: 'H-2', product: 'Pompen', locatie: 'A', start: '2027-05-05', eind: '2027-05-07', open_water: true }], '2027-05');
    check(mei.find((x) => x.project === 'H-1').alleenVrij && mei.find((x) => x.project === 'H-1').datum === '' && JSON.stringify(mei.find((x) => x.project === 'H-2').opties) === '["2027-05-05","2027-05-07"]', 'Hemelvaart 2027 niet voorgesteld', mei.map((x) => x.project + ' ' + x.datum + ' ' + x.opties));
    // aanpassen: dag + inspecteur op kaart 1, kaart 3 weghalen
    const eerste = kaarten.nth(0), vid0 = await eerste.getAttribute('data-vid');
    const andereDag = await eerste.locator('.vsdatum option').evaluateAll((o) => o[o.length - 1].value);
    await eerste.locator('.vsdatum').selectOption(andereDag);
    await eerste.locator('.vsinsp').selectOption('u-hoofd');
    const weg = await kaarten.nth(2).getAttribute('data-vid'), wegProj = V.find((x) => x.vid === weg).project;
    await kaarten.nth(2).locator('.vsweg').click(); await wacht(p);
    check(await p.locator('.vskaart').count() === 2, 'voorstel weghalen');
    check(await p.locator(`.vskaart[data-vid="${vid0}"] .vsinsp`).inputValue() === 'u-hoofd' && await p.locator(`.vskaart[data-vid="${vid0}"] .vsdatum`).inputValue() === andereDag, 'aanpassing blijft staan na weghalen andere kaart');
    // ongeldige datum (buiten de looptijd, bijv. via een oud formulier) wordt geweigerd
    await p.evaluate((vid) => App.progZet(vid, 'datum', '2027-01-05'), vid0);
    await p.click('button:has-text("Alles inplannen")'); await wacht(p, 400);
    check(/binnen de looptijd/.test(await p.locator('#prog-fout').innerText()) && await p.locator(`.vskaart.vsfout[data-vid="${vid0}"]`).count() === 1
      && await p.evaluate(() => App.planning.filter((x) => x.bron === 'programma').length) === 0, 'datum buiten de looptijd geweigerd, niets ingepland');
    await p.evaluate(([vid, d]) => App.progZet(vid, 'datum', d), [vid0, andereDag]);
    await p.click('button:has-text("Alles inplannen")'); await wacht(p, 600);
    const nieuwP = await p.evaluate(() => App.planning.filter((x) => x.bron === 'programma'));
    check(nieuwP.length === 2 && nieuwP.every((x) => x.status === 'gepland') && !nieuwP.some((x) => x.project === wegProj), 'Alles inplannen: 2 ingepland, weggehaalde niet', nieuwP.map((x) => x.project + ' ' + x.datum + ' ' + x.inspecteur));
    check(nieuwP.some((x) => x.datum === andereDag && x.inspecteur === 'u-hoofd'), 'aangepaste dag en inspecteur bewaard');
    check(nieuwP.every((x) => x.toelichting === ''), 'geen gegenereerde toelichting op de ingeplande inspecties', nieuwP.map((x) => x.toelichting));
    const pk = p.locator('.pkaart:not(.vskaart)', { hasText: nieuwP[0].project }).filter({ hasText: 'programma' });
    check(await pk.locator('.boven .s:has-text("programma")').count() === 1 && !/“|Inspectieprogramma|VCA/.test(await pk.innerText()), 'planningkaart: rustig label "programma", geen citaat', await pk.innerText());
    check(/2 inspecties ingepland voor december/.test(await p.locator('.toast').innerText()), 'bevestiging getoond');
    const db = await p.evaluate(async () => (await WPI.DB.getAll('planning')).filter((x) => x.bron === 'programma').length);
    check(db === 2, 'opgeslagen op het toestel (IndexedDB)');
    // weggehaald = "deze maand niet": het voorstel komt niet meteen terug, wel een rustige regel om terug te zetten
    check(/het weggehaalde voorstel komt deze maand niet terug/.test(await p.locator('.toast').innerText()), 'bevestiging zegt dat het weggehaalde voorstel wegblijft', await p.locator('.toast').innerText());
    check(await p.locator('button:has-text("Voorstel programma")').count() === 0 && /1 voorstel weggehaald/.test(await p.locator('.progweg').innerText())
      && JSON.stringify(await opslag(p, 'wpi_prog_weg')) === JSON.stringify({ '2026-12': [wegProj] }), 'weggehaald voorstel komt niet terug; rustige regel met Terugzetten', await p.locator('#view').innerText());
    await p.evaluate(() => App.route()); await wacht(p, 300);
    check(await p.locator('button:has-text("Voorstel programma")').count() === 0, 'ook na opnieuw openen van de Planning niet terug');
    // terugzetten: alleen het weggehaalde project blijft over
    await p.click('.progweg button:has-text("Terugzetten")'); await wacht(p, 500);
    const V2 = await p.evaluate(() => App.progVoorstel.items.map((x) => x.project));
    check(V2.length === 1 && V2[0] === wegProj, 'tweede voorstel slaat al ingeplande projecten over', V2);
    check(/We stellen één inspectie voor december voor/.test(await p.locator('#progvs .vsuitleg').innerText()), 'uitleg enkelvoud');
    await p.click('.progvs button:has-text("Annuleren")'); await wacht(p);
    check(await p.locator('.vskaart').count() === 0 && await p.evaluate(() => App.planning.filter((x) => x.bron === 'programma').length) === 2, 'annuleren plant niets in');
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'telefoon: geen horizontaal scrollen');
    // project dat alleen in het weekend loopt: eerst zelf een dag kiezen
    await p.evaluate(() => App.data.voorbeelddata.projecten.push({ project: 'W-9 (fictief)', product: 'Pompen', locatie: 'Gemaal Weekend', start: '2026-12-05', eind: '2026-12-06', hijsen_mobiele_kraan: true }));
    await p.click('button:has-text("Voorstel programma december")'); await wacht(p, 500);
    const wk = p.locator('.vskaart', { hasText: 'W-9' });
    check(/alleen op za 5 dec, zo 6 dec\. Kies zelf een dag/.test(await wk.innerText()) && await wk.locator('.vsdatum').inputValue() === '', 'weekendproject: melding, geen dag voorgekozen', await wk.innerText());
    check(await p.locator('.vsgroep').count() === 2, 'twee redenen → twee groepen');
    await p.click('button:has-text("Alles inplannen")'); await wacht(p, 300);
    check(await p.locator('.vskaart.vsfout', { hasText: 'W-9' }).count() === 1 && await p.evaluate(() => App.planning.filter((x) => x.bron === 'programma').length) === 2, 'zonder dag: niet ingepland, kaart gemarkeerd');
    check(/Kies nog een dag bij Pompen · W-9\./.test(await p.locator('#prog-fout').innerText()) && !/product/.test(await p.locator('#prog-fout').innerText()), 'foutmelding noemt wat er ontbreekt', await p.locator('#prog-fout').innerText());
    await wk.locator('.vsdatum').selectOption('2026-12-05');
    // dubbele tik in dezelfde tick: maar één keer inplannen
    const nVs = await p.evaluate(() => App.progVoorstel.items.length);
    await p.evaluate(() => Promise.all([App.progAllesInplannen(), App.progAllesInplannen()])); await wacht(p, 500);
    check(await p.evaluate(() => App.planning.filter((x) => x.bron === 'programma').length) === 2 + nVs, 'dubbele tik: geen dubbele inplanning', await p.evaluate(() => App.planning.filter((x) => x.bron === 'programma').map((x) => x.project)));
    check(await p.evaluate(() => App.planning.some((x) => x.project === 'W-9' && x.datum === '2026-12-05')), 'weekendproject op de gekozen dag ingepland');
    // alles ingepland: geen knop meer
    check(await p.locator('button:has-text("Voorstel programma")').count() === 0 && await p.locator('.progrij').count() === 0, 'niets meer voor te stellen: geen knop op de Planning');
    // web: alles weer weg en het voorstel opnieuw openen voor de schermafdruk
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.evaluate(async () => { App.data.voorbeelddata.projecten.pop(); for (const x of App.planning.filter((y) => y.bron === 'programma')) await WPI.DB.del('planning', x.id);
      App.planning = App.planning.filter((y) => y.bron !== 'programma'); App.route(); }); await wacht(p, 400);
    await p.click('button:has-text("Voorstel programma december")'); await wacht(p, 900);
    await p.screenshot({ path: 'bh-voorstel-web.png', fullPage: true });
    // voorstel en planninglijst in hetzelfde raster (kolommen lijnen uit) en de hele naam past in de keuzelijst
    for (const w of [1440, 1280, 1024, 390]) {
      await p.setViewportSize({ width: w, height: 800 }); await wacht(p, 300);
      const maat = await p.evaluate(() => { const c = document.createElement('canvas').getContext('2d');
        const krap = [...document.querySelectorAll('.vsinsp, .vsdatum')].filter((s) => { const cs = getComputedStyle(s); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
          return Math.max(...[...s.options].map((o) => c.measureText(o.text).width)) > s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 18; }).length;
        const kol = (g) => g ? getComputedStyle(g).gridTemplateColumns.split(' ').map((x) => Math.round(parseFloat(x))).join(' ') : '';
        const vs = document.querySelector('#progvs .pkaarten'), pl = [...document.querySelectorAll('.pkaarten')].find((g) => !g.closest('#progvs'));
        const r = (e) => e.getBoundingClientRect(), vk = document.querySelector('.vskaart'), pk = pl && pl.querySelector('.pkaart');
        return { vs: kol(vs), pl: kol(pl), vkL: Math.round(r(vk).left), vkW: Math.round(r(vk).width), pkL: pk ? Math.round(r(pk).left) : null, pkW: pk ? Math.round(r(pk).width) : null, krap, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
      // vanaf 1100px is de planninglijst één brede rij per inspectie (styles.css .plijst): dan lijnen de voorstelkaarten
      // links uit met de rijen en vult de lijst de volle breedte; smaller: hetzelfde raster als de voorstelkaarten
      if (w >= 1100) check(maat.pl.split(' ').length === 1 && maat.vkL === maat.pkL && maat.pkW >= maat.vkW && maat.krap === 0 && maat.sw <= maat.iw, w + 'px: planning als brede rijen, voorstelkaarten links in lijn, namen passen in de keuzelijst', maat);
      else check(maat.vs === maat.pl && maat.vkL === maat.pkL && maat.vkW === maat.pkW && maat.krap === 0 && maat.sw <= maat.iw, w + 'px: voorstelkaarten even breed en in lijn met de planningkaarten, namen passen in de keuzelijst', maat);
      if (w === 1440) {
        const al = await p.evaluate(() => { const a = document.getElementById('alert'), r = (e) => e.getBoundingClientRect(); return { a: a.classList.contains('hidden') ? null : Math.round(r(a).right), view: Math.round(r(document.getElementById('view')).right - parseFloat(getComputedStyle(document.getElementById('view')).paddingRight) * (+getComputedStyle(document.documentElement).zoom || 1)), bel: Math.round(r(document.querySelector('.topbar')).right - parseFloat(getComputedStyle(document.querySelector('.topbar')).paddingRight) * (+getComputedStyle(document.documentElement).zoom || 1)) }; });
        check(al.a === null || (Math.abs(al.a - al.view) <= 1 && Math.abs(al.a - al.bel) <= 1), 'web planning: alertbalk eindigt op dezelfde rechterrand als de inhoud en de bel', al);
      }
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await wacht(p, 300);
    // alles weghalen met ×: eerlijke lege toestand, geen "0" in de kop
    while (await p.locator('.vskaart .vsweg').count()) { await p.locator('.vskaart .vsweg').first().click(); await wacht(p, 200); }
    const leeg = await p.locator('#progvs').innerText();
    check(/Alle voorstellen weggehaald/.test(leeg) && /niets ingepland/.test(leeg) && !/staan al in de planning/.test(leeg) && !/december\s*0/.test(await p.locator('#progvs h2').innerText()), 'alles weggehaald: "Alle voorstellen weggehaald", niet "staan al in de planning"', leeg);
    check(/voorstellen weggehaald; komen deze maand niet terug/.test(leeg) && await p.locator('#progvs .progweg button:has-text("Terugzetten")').count() === 1, 'alles weggehaald: terugzetten mogelijk', leeg);
    await p.click('.progvs button:has-text("Sluiten")'); await wacht(p);
    check(await p.locator('button:has-text("Voorstel programma")').count() === 0 && /Voorstel programma december: \d+ voorstellen weggehaald/.test(await p.locator('.progweg').innerText()), 'gesloten: geen knop, wel de rustige regel');
    // terugzetten in het open voorstel zet de kaarten terug
    await p.click('.progweg button:has-text("Terugzetten")'); await wacht(p, 600);
    const nTerug = await p.locator('.vskaart').count();
    await p.locator('.vskaart .vsweg').first().click(); await wacht(p, 200);
    check(await p.locator('.vskaart').count() === nTerug - 1 && /1 voorstel weggehaald/.test(await p.locator('#progvs .progweg').innerText()), 'in het voorstel: "1 voorstel weggehaald"');
    await p.click('#progvs .progweg button:has-text("Terugzetten")'); await wacht(p, 400);
    check(await p.locator('.vskaart').count() === nTerug && await p.locator('.progweg').count() === 0 && (await opslag(p, 'wpi_prog_weg')) && !Object.keys(await opslag(p, 'wpi_prog_weg')).length, 'terugzetten in het open voorstel');
    await p.click('.progvs button:has-text("Annuleren")'); await wacht(p);
    // verouderd voorstel: intussen via het formulier ingepland → niet nog eens bij "Alles inplannen"
    await p.click('button:has-text("Voorstel programma december")'); await wacht(p, 600);
    const vsP = await p.evaluate(() => App.progVoorstel.items.map((x) => x.project)), dub = vsP[0];
    await p.evaluate(() => App.planForm()); await wacht(p, 300);
    await p.selectOption('#pl-code', 'POM'); await p.fill('#pl-project', dub); await p.fill('#pl-datum', '2026-12-09');
    await p.click('#mod button:has-text("Inplannen")'); await wacht(p, 500);
    check(await p.locator('.vskaart').count() === vsP.length - 1 && /intussen ingepland/.test(await p.locator('#progvs').innerText()), 'voorstel ververst: intussen ingepland project eruit, met uitleg', await p.locator('#progvs .vsal').innerText().catch(() => ''));
    // en ook als de planning buiten het scherm om verandert (ander tabblad): opnieuw controleren bij bevestigen
    const dub2 = vsP[1];
    await p.evaluate(async (nr) => { await WPI.DB.put('planning', { id: 'PL-ander-tab', status: 'gepland', code: 'POM', project: nr, datum: '2026-12-10', inspecteur: 'u-coord2', toelichting: '' }); }, dub2);
    await p.click('button:has-text("Alles inplannen")'); await wacht(p, 600);
    const tel = await p.evaluate(async ([a, b]) => { const all = (await WPI.DB.getAll('planning')).filter((x) => String(x.datum).startsWith('2026-12')); return [a, b].map((nr) => all.filter((x) => x.project === nr).length); }, [dub, dub2]);
    check(tel[0] === 1 && tel[1] === 1, 'Alles inplannen: geen tweede inspectie voor een project dat intussen is ingepland', tel);
    check(new RegExp(dub2 + ' stond al in de planning').test(await p.locator('.toast').innerText()), 'bevestiging noemt het overgeslagen project', await p.locator('.toast').innerText());
    // ---- één project = één voorstel per maand, ook als het twee keer in de projectplanning staat ----
    const dubbel = await metExtra([{ project: 'p26-156 (fictief)', product: 'Damwand', locatie: 'B', start: '2026-10-01', eind: '2027-02-01' },
      { project: 'Z-7 (fictief)', product: 'Pompen', locatie: 'A', start: '2026-10-01', eind: '2027-02-01' }, { project: 'z-7', product: 'Damwand', locatie: 'A', start: '2026-11-01', eind: '2027-01-15' },
      { project: 'R-1', product: 'Pompen', locatie: 'A', start: '2026-12-07', eind: '2026-12-09', open_water: true }, { project: 'r-1 (fictief)', product: 'Damwand', locatie: 'A', start: '2026-12-08', eind: '2026-12-10', open_water: true },
      { project: 'M-1', product: 'Pompen', locatie: 'A', start: '2026-12-14', eind: '2026-12-16', open_water: true }, { project: 'M-1', product: 'Damwand', locatie: 'A', start: '2026-11-02', eind: '2027-03-01' }], '2026-12');
    const tel2 = (nr) => dubbel.filter((x) => x.project === nr);
    check(['Z-7', 'R-1', 'M-1'].every((nr) => tel2(nr).length === 1) && tel2('M-1')[0].soort === 'lang' && new Set(dubbel.map((x) => x.project)).size === dubbel.length,
      'voorstel: elk projectnummer één keer (hoofdletters, "(fictief)", twee producten); lang gaat voor kort', dubbel.map((x) => x.project + ' ' + x.soort + ' ' + x.product));
    // de situatie van de review: P26-436 met een tweede product, niets van december ingepland → één kaart, één inspectie
    await p.evaluate(async () => { for (const x of (await WPI.DB.getAll('planning')).filter((y) => String(y.datum).startsWith('2026-12'))) await WPI.DB.del('planning', x.id);
      App.planning = App.planning.filter((y) => !String(y.datum).startsWith('2026-12')); localStorage.removeItem('wpi_prog_weg');
      App.data.voorbeelddata.projecten.push({ project: 'P26-436 (fictief)', product: 'Damwand', locatie: 'Gemaal Oost', start: '2026-10-01', eind: '2027-02-01' }); App.progVoorstel = null; App.route(); }); await wacht(p, 400);
    await p.click('button:has-text("Voorstel programma december")'); await wacht(p, 600);
    const nK = await p.locator('.vskaart').count();
    check(await p.locator('.vskaart', { hasText: 'P26-436' }).count() === 1 && await p.locator('#progvs .vsgroep').count() === 1, 'P26-436 twee keer in de projectplanning: één voorstelkaart', await p.locator('#progvs').innerText());
    // een oud voorstel (van vóór deze regel, of met verschillende schrijfwijzen) met hetzelfde project twee keer: maar één keer inplannen
    await p.evaluate(() => { const V = App.progVoorstel, x = V.items.find((y) => y.project === 'P26-436'); V.items.push(Object.assign({}, x, { vid: 'VS-oud', code: 'DAM', project: 'p26-436 (fictief)', datum: x.opties[x.opties.length - 1] })); App.route(); }); await wacht(p, 300);
    await p.click('button:has-text("Alles inplannen")'); await wacht(p, 600);
    const dec436 = await p.evaluate(async () => (await WPI.DB.getAll('planning')).filter((x) => App.progProjNr(x.project) === 'P26-436' && String(x.datum).startsWith('2026-12')).length);
    check(dec436 === 1, 'Alles inplannen: P26-436 maar één keer in december', dec436);
    check(new RegExp('^✓ ' + nK + ' inspecties ingepland voor december').test(await p.locator('.toast').innerText()), 'bevestiging telt alleen wat echt is ingepland', await p.locator('.toast').innerText());
    await ctx.close();
  }

  // ===== 4. Melding gemiste inspectie =====
  {
    const { ctx, p } = await nieuw({ width: 1280, height: 800 });
    // een hoofd dat zelf inspecteert (Manager Projects): een eigen gemiste inspectie van gisteren
    // (de gemiste demo-inspectie van een coördinator even naar later, zodat alleen de eigen telt; hieronder terug)
    await p.evaluate(() => App.login('u-hoofd2')); await wacht(p, 600);
    await p.evaluate(async () => { await App.laadPlanning(); const d6 = App.planning.find((y) => y.id === 'PL-demo6'); d6.datum = WPI.plusDagen(4); await WPI.DB.put('planning', d6);
      const x = { id: 'PL-gemist', status: 'gepland', code: 'SLI', project: 'P26-190', locatie: 'RWZI Zuid', datum: WPI.plusDagen(-1), inspecteur: 'u-hoofd2', toelichting: '' }; App.planning.push(x); await WPI.DB.put('planning', x); App.go('acties'); });
    await wacht(p, 600);
    let M = await p.evaluate(() => App.meldingen().filter((m) => m.soort === 'gemist').map((m) => m.id));
    check(JSON.stringify(M) === JSON.stringify(['PL-gemist:gemist:0']), 'inspecteur (hoofd): melding de dag erna', M);
    const nLaat = await p.evaluate(() => App.meldingen().filter((m) => m.soort === 'laat').length);
    check(await p.locator('#alert').innerText().then((t) => t.includes(nLaat + ' actie' + (nLaat === 1 ? '' : 's') + ' en 1 inspectie over datum')), 'alertbalk noemt beide', await p.locator('#alert').innerText());
    check(+(await p.locator('#belnr').textContent()) === (await p.evaluate(() => App.meldingen().length)), 'bel telt gemiste inspecties mee');
    // ritme: 1 dag → 0, 2 → 0, 3 → 1, 5 → 2
    const ritme = await p.evaluate(() => [-1, -2, -3, -4, -5].map((d) => { const x = App.planning.find((y) => y.id === 'PL-gemist'); x.datum = WPI.plusDagen(d); return App.meldingen().find((m) => m.plan === 'PL-gemist').id.split(':').pop(); }));
    check(JSON.stringify(ritme) === JSON.stringify(['0', '0', '1', '1', '2']), 'daarna elke 2 dagen een nieuwe melding', ritme);
    await p.evaluate(() => { App.planning.find((y) => y.id === 'PL-gemist').datum = WPI.plusDagen(-1); });
    // Vandaag (wie inspecteert): de eigen gemiste inspectie staat al bovenaan ("Nog te doen"); geen tweede tegel ervoor
    await p.evaluate(() => App.go('vandaag')); await wacht(p, 700);
    check(await p.locator('#mijnact .vknop.vgemist').count() === 0 && /Nog te doen/.test(await p.locator('.vplan .hero').innerText()) && /Slibindikker/.test(await p.locator('.vplan .hero').innerText()),
      'inspecteur Vandaag: eigen gemiste inspectie één keer bovenaan, geen extra tegel', await p.locator('#view').innerText());
    await p.screenshot({ path: 'bh-vandaag-gemist.png', fullPage: true });
    // meldingenlijst: één signaal per regel (stip = ongelezen), rustige pil onder de titel; "te laat" warm oranje
    await p.evaluate(() => App.openMeldingen()); await wacht(p);
    const rij = p.locator('#mod .row', { hasText: 'Inspectie nog niet gedaan' });
    const warm = await p.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--warm)'; d.style.color = 'var(--warm-ink)'; document.body.appendChild(d); const c = getComputedStyle(d); const r = [c.backgroundColor, c.color]; d.remove(); return r; });
    const pil = await rij.locator('.mpil').evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).color, e.textContent.trim()]);
    check(await rij.locator('.mpil').count() === 1 && pil[2] === 'te laat' && pil[0] === warm[0] && (([r, g, bl]) => r > g && g > bl && g > 60)(pil[1].match(/\d+/g).map(Number)) && await rij.locator('.badge').count() === 0, 'meldingen: gemiste inspectie = warm oranje pil "te laat" (niet de rode A-kleur)', { pil, warm });
    const rijen = await p.locator('#mod .row.mrij').evaluateAll((r) => r.map((x) => ({ stip: x.querySelectorAll('.mstip').length, pil: x.querySelectorAll('.mpil').length, badge: x.querySelectorAll('.badge').length, soort: x.className, pilKl: x.querySelector('.mpil').className, t: x.innerText })));
    check(rijen.every((r) => r.stip === 1 && r.pil === 1 && r.badge === 0) && rijen.every((r) => /week/.test(r.soort) ? !/laat/.test(r.pilKl) : /laat/.test(r.pilKl)), 'meldingen: elke regel één stip en één pil; "binnenkort" rustig, "te laat" warm', rijen);
    // de status staat alleen in de pil (geen "Te laat: …" of "Vandaag: …" ervoor); vandaag = "vandaag", niet "binnenkort"
    const pilVan = await p.evaluate(() => App.meldingen().filter((m) => m.actie).map((m) => [m.d, m.pil, m.titel, m.sysTitel]));
    check(pilVan.length && pilVan.every(([d, pil, t, st]) => !/^(Te laat|Vandaag|Morgen|Over \d+ dagen): /.test(t) && (d < 0 ? pil === 'te laat' && st === 'Te laat: ' + t : d === 0 ? pil === 'vandaag' && st === 'Vandaag: ' + t : d === 1 ? pil === 'morgen' : pil === 'over ' + d + ' dagen')),
      'meldingen: titel zonder statusvoorvoegsel, pil "te laat"/"vandaag"/"morgen"/"over n dagen"; toestelmelding houdt het voorvoegsel', pilVan);
    check(rijen.every((r) => !/^(Te laat|Vandaag|Morgen): /.test(r.t)), 'meldingen: geen dubbele status in de regel', rijen.map((r) => r.t));
    check(/jouw inspectie/.test(await rij.innerText()) && !rijen.some((r) => /inspecteur Inspecteur/.test(r.t)), 'meldingen: "jouw inspectie", nooit "inspecteur Inspecteur"', await rij.innerText());
    const regels = await rij.locator('.t').evaluate((t) => Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)));
    check(regels <= 2, 'meldingen: titel hooguit twee regels (pil staat eronder, niet ernaast)', regels);
    check(!/elke 2 dagen/.test(await p.locator('#mod .muted').first().innerText()) && /elke 2 dagen/.test(await p.locator('#mod .mritme').innerText()), 'ritme-uitleg onderaan in kleine letters');
    await p.screenshot({ path: 'bh-meldingen.png' });
    await rij.click(); await wacht(p, 500);
    check(await p.evaluate(() => location.hash) === '#/planning' && !(await p.evaluate(() => document.getElementById('ov').classList.contains('on'))), 'klik op melding opent Planning');
    check(await p.evaluate(() => App._set('wpi_gelezen').has('PL-gemist:gemist:0')), 'melding gemarkeerd als gelezen');
    // vandaag of toekomst: geen melding; uitgevoerd: geen melding
    check(await p.evaluate(() => { const x = App.planning.find((y) => y.id === 'PL-gemist'); x.datum = WPI.plusDagen(0); const a = App.meldingen().some((m) => m.plan); x.datum = WPI.plusDagen(-2); x.status = 'uitgevoerd'; const b = App.meldingen().some((m) => m.plan); x.status = 'gepland'; x.datum = WPI.plusDagen(-1); return !a && !b; }), 'geen melding voor vandaag of na uitvoeren');
    // QHSE-manager (plant niet, inspecteert niet): geen meldingen voor gemiste inspecties
    await p.evaluate(() => App.login('u-qhse')); await wacht(p, 600);
    check((await p.evaluate(() => App.meldingen().filter((m) => m.soort === 'gemist').length)) === 0, 'QHSE-manager: geen meldingen voor gemiste inspecties (plant niet)');
    // het andere hoofd ziet de gemiste inspectie van Manager Projects en die van de demo-planning
    await p.evaluate(async () => { const d6 = (App.planning || (await App.laadPlanning())).find((y) => y.id === 'PL-demo6'); d6.datum = WPI.plusDagen(-3); await WPI.DB.put('planning', d6); });
    await p.evaluate(() => App.login('u-hoofd')); await wacht(p, 600);
    await p.evaluate(() => App.go('acties')); await wacht(p, 500);
    M = await p.evaluate(() => App.meldingen().filter((m) => m.soort === 'gemist').map((m) => m.plan).sort());
    check(M.includes('PL-gemist') && M.includes('PL-demo6'), 'hoofd: meldingen voor alle gemiste inspecties', M);
    const tekst = await p.locator('#alert').innerText();
    check(new RegExp('\\d+ acties? en ' + M.length + ' inspecties over datum').test(tekst), 'hoofd: alertbalk', tekst);
    // beide over datum: de balk opent de meldingenlijst, waar acties én inspecties staan
    await p.click('#alert'); await wacht(p, 500);
    const ml = await p.locator('#mod').innerText();
    check(await p.evaluate(() => document.getElementById('ov').classList.contains('on')) && /Meldingen/.test(ml) && /Inspectie nog niet gedaan/.test(ml) && /\nte laat\n/.test(ml) && !/Te laat:|Vandaag:/.test(ml), 'alertbalk (acties en inspecties) opent de meldingenlijst met beide');
    check(/ingepland voor Femke Fictief/.test(ml) && !/inspecteur Inspecteur/i.test(ml) && !/rode balk/.test(ml), 'hoofd: "ingepland voor <naam>", geen "rode balk"', ml);
    await p.evaluate(() => App.closeModal()); await wacht(p, 200);
    await p.evaluate(() => App.go('vandaag')); await wacht(p, 700);
    check(new RegExp('^' + M.length + '\\s*Inspecties nog niet gedaan').test((await p.locator('#mijnact .vgemist').innerText()).trim()), 'hoofd Vandaag: tegel met ' + M.length + ' gemiste inspecties', await p.locator('#mijnact').innerText());
    check(await p.evaluate(() => { const t = document.querySelector('#mijnact .vgemist'), v = t.previousElementSibling; return !v || v.classList.contains('warm'); }), 'tegel staat direct na "Actie te laat"');
    await p.locator('#mijnact .vgemist').click(); await wacht(p, 500);
    check(await p.evaluate(() => location.hash) === '#/planning', 'tegel opent de Planning');
    await p.evaluate(() => App.login('u-coord2')); await wacht(p, 600);
    check((await p.evaluate(() => App.meldingen().filter((m) => m.soort === 'gemist').length)) === M.length, 'coördinator: ook alle gemiste inspecties');
    // alleen gemiste inspecties (geen acties te laat): balk opent de Planning
    await p.evaluate(async () => { for (const a of App.acties) { if (a.plandatum && WPI.dagenTot(a.plandatum) < 0) { a.plandatum = WPI.plusDagen(3); await WPI.DB.put('acties', a); } } App.go('acties'); });
    await wacht(p, 500);
    check(/^\d+ inspecties? over datum/.test((await p.locator('#alert .al-t').innerText()).trim()), 'alleen inspecties: tekst', await p.locator('#alert').innerText());
    await p.click('#alert'); await wacht(p, 500);
    check(await p.evaluate(() => location.hash) === '#/planning', 'alertbalk opent Planning bij alleen gemiste inspecties');
    await p.screenshot({ path: 'bh-planning-alert.png' });
    // geen gemiste inspecties: geen tegel
    await p.evaluate(async () => { for (const x of App.planning) if (x.status === 'gepland' && WPI.dagenTot(x.datum) < 0) { x.datum = WPI.plusDagen(2); await WPI.DB.put('planning', x); } App.go('vandaag'); }); await wacht(p, 700);
    check(await p.locator('#mijnact .vgemist').count() === 0, 'niets gemist: geen tegel op Vandaag');
    await ctx.close();
  }
  // ===== 5. Delen via de server: monteurs en doel op elk toestel (nagebootste Supabase in de pagina) =====
  {
    // kleine nabootsing van PostgREST voor public.monteurs, public.instellingen en rpc/monteur_aanmelden
    const stub = (p, srv) => p.evaluate((srv) => {
      window.__srv = srv; WPI.sbActief = () => true;
      const sl = (n) => App._monteurSleutel(n);
      WPI.sb = async (pad, opt = {}) => {
        const S = window.__srv, m = opt.method || 'GET', body = opt.body ? JSON.parse(opt.body) : null; S.log.push(m + ' ' + pad + (opt.body ? ' ' + opt.body : ''));
        if (S.offline) { const e = new Error('Geen verbinding'); e.status = 0; throw e; }
        if (S.weiger && m !== 'GET' && S.weiger.test(pad)) { const e = new Error('geweigerd'); e.status = 403; throw e; }
        if (pad.startsWith('/rest/v1/monteurs')) {
          if (m === 'GET') return S.monteurs.map((r) => Object.assign({}, r));
          if (m === 'POST') { const r = { id: 'm' + (S.monteurs.length + 1), naam: body.naam, actief: body.actief !== false }; if (S.monteurs.some((x) => sl(x.naam) === sl(r.naam))) { const e = new Error('dubbel'); e.status = 409; throw e; } S.monteurs.push(r); return [r]; }
          if (m === 'PATCH') { const id = decodeURIComponent(pad.split('id=eq.')[1]); Object.assign(S.monteurs.find((x) => x.id === id), body); return null; }
        }
        if (pad.startsWith('/rest/v1/instellingen')) {
          if (m === 'GET') return S.inst.slice();
          if (m === 'POST') { S.inst = S.inst.filter((x) => x.sleutel !== body.sleutel).concat([body]); return null; }
          if (m === 'DELETE') { const e = new Error('geen DELETE meer: geen doel = JSON null'); e.status = 400; throw e; }
        }
        if (pad === '/rest/v1/rpc/monteur_aanmelden') { const n = body.p_naam.trim().replace(/\s+/g, ' '); let r = S.monteurs.find((x) => sl(x.naam) === sl(n)); if (r) r.actief = true; else S.monteurs.push(r = { id: 'm' + (S.monteurs.length + 1), naam: n, actief: true }); return { naam: r.naam }; }
        throw Object.assign(new Error('onbekend ' + pad), { status: 404 });
      };
    }, srv);
    const srvVan = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__srv)));
    const { ctx, p } = await nieuw({ width: 390, height: 844 });
    // coördinator op een eigen telefoon (inspecteert): krijgt de lijst en het doel van de server
    await p.evaluate(() => App.login('u-coord2')); await wacht(p, 600);
    await stub(p, { monteurs: [{ id: 'm1', naam: 'Server Een', actief: true }, { id: 'm2', naam: 'Server Oud', actief: false }], inst: [{ sleutel: 'doel_conform', waarde: 90 }], log: [] });
    await p.evaluate(() => App.syncStart()); await wacht(p, 300);
    check(JSON.stringify(await p.evaluate(() => App.monteursLijst())) === '["Server Een"]' && JSON.stringify(await opslag(p, 'wpi_monteurs_inactief')) === '["Server Oud"]'
      && await p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '90', 'coördinator: monteurslijst en doel van de server overgenomen');
    // nieuwe naam tijdens de inspectie → ook op de server (rpc/monteur_aanmelden)
    await p.evaluate(() => { App.startInspectie('DAM', 'x', 't', true); App.state.inspectie.stap = 'monteurs'; App.route(); }); await wacht(p, 500);
    await p.fill('#nieuwe-monteur', ' Veld  Collega '); await p.click('#view button:has-text("Toevoegen")'); await wacht(p, 400);
    let srv = await srvVan(p);
    check(srv.monteurs.some((x) => x.naam === 'Veld Collega' && x.actief) && srv.log.some((l) => /rpc\/monteur_aanmelden/.test(l)), 'inspectie: nieuwe naam via monteur_aanmelden op de server', srv.log);
    await p.evaluate(() => { App.state.inspectie = null; App.bewaarConcept(true); });
    // hoofd: wijzigingen in Beheer gaan naar de server
    await p.evaluate(() => App.login('u-hoofd')); await wacht(p, 600);
    await p.evaluate(() => App.syncStart()); await p.evaluate(() => App.go('beheer')); await wacht(p, 500);
    check(/Gedeeld met het team/.test(await p.locator('.bhdeel').innerText()), 'Beheer: "Gedeeld met het team"');
    await p.fill('#bh-nieuw', 'Jan Server'); await p.click('button:has-text("Toevoegen")'); await wacht(p, 400);
    await wijzig(p, 'Server Een'); await wacht(p); await p.fill('#bh-hernoem', 'Server Twee'); await p.click('.bhrij.bewerk button:has-text("Opslaan")'); await wacht(p, 400);
    await wijzig(p, 'Veld Collega'); await wacht(p); await p.click('.bhrij.bewerk .bhlink'); await wacht(p, 400);
    await p.locator('.bhrij', { hasText: 'Server Oud' }).locator('button:has-text("Weer actief")').click(); await wacht(p, 400);
    await p.fill('#bh-doel-in', '75'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 400);
    srv = await srvVan(p);
    const st = (n) => (srv.monteurs.find((x) => x.naam === n) || {}).actief;
    check(st('Jan Server') === true && st('Server Twee') === true && !srv.monteurs.some((x) => x.naam === 'Server Een') && st('Veld Collega') === false && st('Server Oud') === true
      && srv.monteurs.length === 4 && JSON.stringify(srv.inst) === '[{"sleutel":"doel_conform","waarde":75}]', 'Beheer: toevoegen, hernoemen, non-actief, weer actief en doel staan op de server', srv);
    await p.fill('#bh-doel-in', ''); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 400);
    check(JSON.stringify((await srvVan(p)).inst) === '[{"sleutel":"doel_conform","waarde":null}]', 'doel leeg → op de server JSON null (bewust geen doel; geen rij = standaard 85)');
    // zonder verbinding: blijft in de wachtrij en gaat later alsnog
    await p.evaluate(() => { window.__srv.offline = true; }); await wacht(p, 100);
    await p.fill('#bh-nieuw', 'Offline Piet'); await p.click('button:has-text("Toevoegen")'); await wacht(p, 400);
    await p.fill('#bh-doel-in', '80'); await p.click('#bh-doel button:has-text("Opslaan")'); await wacht(p, 400);
    check(/Nog niet gedeeld/.test(await p.locator('.bhdeel').innerText()) && (await opslag(p, 'wpi_beheer_wachtrij')).length === 2 && (await p.evaluate(() => App.monteursLijst())).includes('Offline Piet'), 'offline: lokaal bewaard, "Nog niet gedeeld", in de wachtrij');
    await p.evaluate(() => { window.__srv.offline = false; window.dispatchEvent(new Event('online')); }); await wacht(p, 600);
    srv = await srvVan(p);
    check(srv.monteurs.some((x) => x.naam === 'Offline Piet') && JSON.stringify(srv.inst) === '[{"sleutel":"doel_conform","waarde":80}]' && !(await opslag(p, 'wpi_beheer_wachtrij')).length
      && /Gedeeld met het team/.test(await p.locator('.bhdeel').innerText()), 'weer online: wachtrij verstuurd', srv.inst);
    // de server weigert (bijv. geen tweestapsverificatie): melding, en de lijst toont weer de serverstand
    await p.evaluate(() => { window.__srv.weiger = /monteurs/; }); await wacht(p, 50);
    await wijzig(p, 'Jan Server'); await wacht(p); await p.click('.bhrij.bewerk .bhlink'); await wacht(p, 600);
    await p.evaluate(() => App.route()); await wacht(p, 300);
    check(/niet op de server bewaard/.test(await p.locator('.bhsyncfout').innerText()) && (await p.evaluate(() => App.monteursLijst())).includes('Jan Server'), 'geweigerd: melding in Beheer en de serverstand terug', await p.locator('#view').innerText());
    await p.click('.bhsyncfout button'); await wacht(p, 300);
    check(await p.locator('.bhsyncfout').count() === 0, 'melding weg te klikken');
    srv = await srvVan(p);
    await ctx.close();
    // een ander toestel (computer van de coördinator): ziet het doel in het dashboard en de lijst in de inspectie
    const t2 = await nieuw({ width: 1440, height: 900 });
    await t2.p.evaluate(() => App.login('u-coord1')); await wacht(t2.p, 600);
    srv.weiger = null; srv.log = []; await stub(t2.p, srv);
    await t2.p.evaluate(() => App.syncStart()); await wacht(t2.p, 300);
    await t2.p.evaluate(() => App.go('dashboard')); await wacht(t2.p, 600);
    const dl2 = t2.p.locator('.card:has-text("Hoeveel ziet er goed uit?") .doellijn text');
    check(await dl2.count() === 1 && (await dl2.textContent()).trim() === 'doel 80%', 'ander toestel: dashboard toont het doel van de server', await dl2.count());
    check(JSON.stringify((await t2.p.evaluate(() => App.monteursLijst())).slice().sort()) === JSON.stringify(srv.monteurs.filter((x) => x.actief).map((x) => x.naam).sort()), 'ander toestel: dezelfde monteurslijst', await t2.p.evaluate(() => App.monteursLijst()));
    // terwijl het dashboard open staat verandert het doel op de server: bij terugkomen in de app bijgewerkt
    await t2.p.evaluate(() => { window.__srv.inst = [{ sleutel: 'doel_conform', waarde: 70 }]; return App.beheerSync(true); }); await wacht(t2.p, 500);
    check((await t2.p.locator('.card:has-text("Hoeveel ziet er goed uit?") .doellijn text').textContent()).trim() === 'doel 70%', 'dashboard ververst met het nieuwe doel');
    // onbetrouwbare serverwaarden worden genegeerd
    await t2.p.evaluate(() => { window.__srv.inst = [{ sleutel: 'doel_conform', waarde: '<b>99</b>' }]; window.__srv.monteurs.push({ id: 'x', naam: '\u200B', actief: true }, { id: 'y', naam: { x: 1 }, actief: true }); return App.beheerSync(true); }); await wacht(t2.p, 400);
    check(await t2.p.evaluate(() => localStorage.getItem('wpi_doel_conform')) === '' && !(await t2.p.evaluate(() => App.monteursLijst())).some((n) => !n || typeof n !== 'string' || !n.trim()), 'ongeldig doel (= geen doel) of lege/rare naam van de server wordt niet overgenomen');
    // geen rij op de server: de standaard van 85
    await t2.p.evaluate(() => { window.__srv.inst = []; return App.beheerSync(true); }); await wacht(t2.p, 400);
    check(await t2.p.evaluate(() => localStorage.getItem('wpi_doel_conform') === null && App.doelConform() === 85), 'geen doel-rij op de server: standaard 85');
    await t2.ctx.close();
  }
  await b.close();
  console.log('fouten', fouten);
  console.log('errs', errs.concat(fouten));
})();
