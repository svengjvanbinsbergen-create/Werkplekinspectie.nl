/* Werkplekinspectie — js/koppel.js
   TRA-koppeling zonder AI (terugval en controle naast Claude): welke risicoregel past bij wat de inspecteur zag,
   welke taak bij wat de monteurs doen, en is dit een direct gevaar.
   Werkt met GEVAARZINNEN ("onder de hangende last", "hijsband rafelig", "geen valbeveiliging") die naar een
   gevarenbegrip wijzen; elk begrip herkent zijn eigen regels aan de risicozin uit de TRA. Losse algemene woorden
   ("onder", "monteur", "damwand", de productnaam) tellen niet mee: daardoor koppelde "onder de hangende
   damwandplank" eerder aan "damwand verschuift bij loskoppelen". Een losse woordovereenkomst geeft hooguit een
   ZWAKKE match: die bevestigt de inspecteur altijd met een tik op de regel zelf (zie js/inspectie.js).
   STERK alleen met een gevaarzin (≥ 2,5) bij de kern van de regel, geen algemeen onderwerp erboven en de tweede regel
   < 80% van de score; een voorwerp alleen ("strop", "elektricien") is geen gevaarzin. Het Voorstel is altijd een regel
   van de taak (een beter passend algemeen onderwerp komt apart terug als `alg`). Ook geen STERK als een ándere
   gevaarzin hard naar de tweede regel wijst (twee gevaren in één zin: de inspecteur kiest). Context telt: "de hijsband
   hangt over een scherpe rand" is een vallende last, geen persoon over de putrand (zie-patronen met een "niet"-context).
   Scheidbare werkwoorden ("ze zetten de compactvijzel aan", "ze draaien het microfilter proef") worden samengevoegd.
   Getest op 199 zinnen (tests/koppel.js); de meeste sets zijn na hun eerste meting gebruikt om bij te stellen, alleen
   blind6 niet. Eerste metingen op nieuwe zinnen staan eerlijk in de kop van die test (blind4-6: 89% in de top 3,
   3 foute sterke matches op 48).
   Alles blijft een Voorstel: de inspecteur kiest de regel en het oordeel (C/A/V/NVT).
   Zuivere functies op window.WPI.koppel (geen DOM), getest in tests/koppel.js. */
(function () {
  "use strict";
  const WPI = window.WPI;
  // kleine letters, geen accenten, alleen letters/cijfers, met spaties eromheen (voor \b-patronen)
  // Spreektaal: "d'r uit" → "eruit", "er in" (zonder lidwoord erachter) → "erin".
  const norm = (s) => (" " + String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim() + " ").replace(/ d r /g, " er ").replace(/ er (uit|af|op) /g, " er$1 ")
    .replace(/ er in (?!(de|het|een|die|dat|deze)\b)/g, " erin ");
  // functies en personen ("de elektricien", "de monteur") zeggen niets over het gevaar: ze tellen niet als woord-
  // overeenkomst, en ELEKTRA herkent "elektr..." niet in een functienaam. Anders telde "elektricien" als elektrisch
  // gevaar (koppelde "geen hangslot op de hoofdschakelaar" aan "elektrisch gevaar" in plaats van het LOTOTO-slot).
  const PERSOON = /\b(elektricien\w*|elektromonteur\w*|elektrotechnic\w*|e monteur\w*|installateur\w*|monteur\w*|lasser\w*|uitvoerder\w*|voorman|ploegleider\w*|leerling\w*|stagiair\w*|gast|kerel|vent)\b/g;
  const ontPersoon = (s) => norm(s).replace(PERSOON, " ");
  // Scheidbare werkwoorden van de bouwplaats: "ze zetten de compactvijzel aan" → "aanzetten", "ze draaien het microfilter
  // proef" → "proefdraaien", "ze zetten de slibindikker veilig" → "veiligzetten", "ze hijsen het filter de put in" →
  // "inhijsen". Het partikel telt alleen aan het eind van het zinsdeel of vóór een voegwoord/voorzetsel ("uit de put" is
  // een voorzetsel, geen partikel). → { los: zin met het samengestelde werkwoord op de plek van het werkwoord (voor de
  // woordstammen), extra: " aanzetten …" (achter de genormaliseerde zin geplakt, voor de patronen) }.
  const WW = {}; ("zet:zetten zette:zetten zetten:zetten draai:draaien draait:draaien draaien:draaien schakel:schakelen schakelt:schakelen " +
    "schakelen:schakelen haal:halen haalt:halen halen:halen trek:trekken trekt:trekken trekken:trekken bouw:bouwen bouwt:bouwen bouwen:bouwen " +
    "sluit:sluiten sluiten:sluiten klem:klemmen klemt:klemmen klemmen:klemmen hang:hangen hangt:hangen hangen:hangen takel:takelen takelt:takelen " +
    "takelen:takelen hijs:hijsen hijst:hijsen hijsen:hijsen neem:nemen neemt:nemen nemen:nemen maak:maken maakt:maken maken:maken stel:stellen " +
    "stelt:stellen stellen:stellen til:tillen tilt:tillen tillen:tillen sla:slaan slaat:slaan slaan:slaan breek:breken breekt:breken breken:breken " +
    "laat:laten laten:laten start:starten starten:starten").split(" ").forEach((x) => { const [a, b] = x.split(":"); WW[a] = b; });
  const PARTIKEL = new Set("aan uit af in op proef test weg los vast veilig terug neer dicht open erin eruit eraf erop".split(" "));
  const NA = new Set("voor met bij om zodat en terwijl als want maar omdat toen nadat zonder tijdens door naar vanaf vandaag nu weer".split(" "));
  function scheid(tekst) {
    const extra = [], los = [];
    String(tekst || "").split(/[,.;:!?]+/).forEach((deel) => {
      const w = norm(deel).trim().split(" ").filter(Boolean);
      for (let i = 0; i < w.length; i++) {
        const inf = WW[w[i]]; if (!inf) continue;
        for (let j = i + 1; j < Math.min(w.length, i + 7); j++) {
          if (WW[w[j]]) break;
          if (PARTIKEL.has(w[j]) && (j === w.length - 1 || NA.has(w[j + 1]))) { const sam = w[j] + inf; extra.push(sam); w[i] = sam; w.splice(j, 1); break; }
        }
      }
      los.push(w.join(" "));
    });
    return { los: los.join(" , "), extra: extra.length ? " " + extra.join(" ") + " " : "" };
  }
  // tekst voor de patronen: genormaliseerd, plus de samengestelde werkwoorden
  const patroonTekst = (tekst) => norm(tekst) + scheid(tekst).extra.trimStart();

  // ---- gevarenbegrippen ----
  // regel: herkent het begrip in de risicozin van een TRA-regel (kop vóór de dubbele punt telt vol, de rest 0,7,
  //        de maatregelen 0,4). zie: [patroon, gewicht] op de waarneming; ≥ 2,5 = gevaarzin, lager = zwakke aanwijzing.
  // "de ketting staat nog op spanning": mechanische spanning (veer, spanner), geen elektriciteit
  const VEERSPANNING = /(ketting|veer|veren|spanner|spanmechanisme|band|kabel|staaldraad)\w* (\w+ ){0,4}(op|onder) (de )?spanning|(op|onder) spanning (\w+ ){0,3}(ketting|veer|spanner)/;
  // een hijsmiddel (geen persoon) ligt over/langs een rand: "de band hangt over de rand van de put" is geen valgevaar
  const HIJSMIDDEL_OVER = /(hijsband|band|strop|stroppen|ketting|kabel|sling|slang|touw)\w* ((?!(hij|zij|ze|iemand|collega|monteur|man|jongen|gast|gozer)\b)\w+ ){0,5}(hangt|hangen|hing|ligt|liggen|zit|loopt|schuurt) (\w+ )?(over|langs|buiten|om|tegen)\b/;
  const B = {
    LAST: { regel: /vallen van (de |het )?(last|reductor|indraaireductor)|vallen van last|ongecontroleerd vallen|onder (de |een )?hangende last|werken onder hangende|onjuist aanslaan|bezwijken hijsmiddel|vallen van schraper/,
      zie: [[/onder (de |een |die |het )?(hangende |zwevende )?last/, 3], [/\bhangende?\b|\bzwevende?\b/, 3], [/onder (de |een )?(kraan|haak|giek|plank|damwand\w*|vijzel)\b/, 2],
        // het hijsmiddel als voorwerp telt 2 (geen gevaarzin op zich); de toestand (rafelig, geen keuring) maakt het hard
        [/hijsband\w*|hijsstrop\w*|\bstrop(pen)?\b|hijsketting\w*|hijsmiddel\w*|hijsgereedschap|\bsjorband\w*|\bbanden\b/, 2],
        [/\brafel\w*|gerafeld|ingescheurd|gescheurd\w*|kapotte? (band|strop|ketting)|beschadigde? (band|strop|ketting|sluiting|haak)|afgekeurd\w*/, 3],
        [/aangeslagen|\baanslaan\b|aanslagpunt\w*|hijsoog\w*|hijspunt\w*|harpsluiting|\bharp\b|borglip|veiligheidsklep|haak zonder|zonder (borg|klep)/, 3],
        [/last (valt|viel|zakt|glijdt|schiet)|\bzwaartepunt|scheef (aan de kraan|gehangen|aangeslagen|aan de haak)|hangt scheef/, 3],
        // spreektaal: "hangen die pomp aan een verroeste ketting", "loopt pal onder dat ding door", "aan de haak"
        [/\bhang(t|en|end)\b.*\baan (een |de |die |dat |het |z n |zijn )?(\w+ )?(\w+ )?(ketting\w*|band\w*|strop\w*|haak|kraan\w*|hijs\w*|touw\w*|sling\w*)|aan de (kraan)?haak|aan de kraan (hangt|hangen|hing)/, 3],
        [/(verroest\w*|roestig\w*|kapotte?|oude?|gebroken|vervormde?) (hijs)?(ketting\w*|haak|harp|sluiting|schakel)|ketting\w* .*\b(verroest|roestig|roest|kapot|gebroken|uitgerekt)|(zonder|geen) (keur\w*|label|sticker|wll|swl)\b.*\b(ketting|band|strop|haak|hijs\w*)|(ketting\w*|band\w*|strop\w*|haak|hijs\w*) .*\b(zonder|geen) (keur\w*|label|sticker|wll|swl)|niet gekeurde? (ketting|band|strop|hijs\w*)/, 3],
        [/onderdoor|\bonder (dat|die|het|de|een) (\w+ )?(\w+ )?door\b|(pal|recht|vlak|net|precies) onder\b/, 2.5],
        // persoon ONDER iets dat hangt of gehesen wordt (ook spreektaal): "gozer staat onder de trommel die aan de kraan
        // bungelt", "hij staat onder de vijzel terwijl die omhoog gaat". Lichaamsdeel onder de last = beknelling (niet hier).
        [/^(?=.*\b(bungel\w*|hang(t|en|end|ende)|zweef\w*|zwevend\w*|aan de (kraan|haak|takel|ketting|strop|band)|omhoog|naar beneden|zakt|zakken|gehesen|hijs\w*|takel\w*|getakeld)\b).*?\b(?<w>(staat|staan|stond|stonden|zit|zitten|zat|loopt|lopen|liep|ligt|liggen|lag|werkt|werken|kruipt|kruipen|gozer|kerel|vent|iemand|man|collega|hij|ze) (\w+ ){0,3}(onder|eronder|eronderdoor)( (de|het|die|dat|een|zijn|z n))?( \w+)?)\b/, 3],
        [/\bbungel\w*|\bzweeft\b/, 2.5],
        // last boven iemands hoofd: "onderdeel hangt boven zijn kop"
        [/(hang(t|en)|hing|bungel\w*|zweef\w*|gaat|komt|draait) (\w+ ){0,3}boven (zijn|z n|het|hun|d r|ieders|de) (kop|hoofd|hoofden|koppen|mensen|ploeg)|boven (zijn|z n|hun) (kop|hoofd) (\w+ ){0,3}(hang\w*|bungel\w*|zweef\w*)/, 3],
        // hijsmiddel versleten, kraakt of over een scherpe rand: de klassieke oorzaak van een vallende last
        [/(door|af|uit)gesleten|\bversleten|\bgesleten|half door\b|\bkraakt\b|\bkraken\b|\bknapt\b|\bslijtage|\bbeschadigd\w*/, 3, /\b(rooster|tand|harken|zeefpaneel|zeefpanelen|kabel)\w* (\w+ ){0,2}(versleten|gesleten|beschadigd)/],
        [/(hijsband|band|strop|stroppen|ketting|sling|hijsketting|hijsstrop)\w* (\w+ ){0,6}(over|om|langs|tegen) (een |de |het )?(scherpe|scherp)|(scherpe|scherp) (rand|hoek|kant) (\w+ ){0,4}(band|strop|ketting|sling)/, 3],
        [/(hijsband|band|strop|ketting|haak|hijs\w*|takel)\w* (\w+ ){0,3}(is |zijn )?(niet|nooit) (gekeurd|getest)|(strop|band|ketting|haak|sluiting)\w* (\w+ ){0,4}(afglipp\w*|glipt|glippen|schiet (er )?af)|afglipp\w*|(eraf|er af) (glipp\w*|schiet|valt)/, 3],
        [/hijsgebied|hijspad/, 1.5], [/\bhang(t|en)\b|\blast\b|\bhijs(t|en)\b|\bketting\w*/, 1]] },
    GLIJ: { regel: /uit de (trog|buis) glijden/, zie: [[/(glij|glip|schuif|zak|schiet)\w* (\w+ )?(\w+ )?uit (de )?(trog|buis)|uit de (trog|buis) (glij|schuif|zak|schiet)\w*/, 3]] },
    SLINGER: { regel: /zwaaiend|zwaait|ongecontroleerd zwaaien|stuurlijn|onverwachte beweging van (de )?last|onverwachte beweging van last/,
      zie: [[/\bzwaai\w*|\bzwiep\w*|\bslinger(t|en|ende)?\b(?! (rond|op|over|door))|draait rond|\btolt\b|stuurlijn\w*|\bwind(kracht|stoot|vlaag|vlagen)?\b|\btouw(en)?\b|heen en weer/, 3],
        [/(geen|zonder) (stuur)?lijn(en)? (\w+ )?(eraan|aan)|(geen|zonder) (stuur)?lijnen\b/, 2.5],
        ] },
    BEGELEID: { regel: /begeleiden van de last|onveilige positie|lopen over gladde/,
      zie: [[/\bbegeleid\w*|hand(en)? aan de (last|plank|damwand\w*|vijzel|pomp)|(duwt|duwen|trekt|trekken|houdt|houden|stuurt|sturen|draait|draaien) (de |het |die |dat )?\w+ (met|bij|vast|weg|op z n plek|op zijn plek)\b/, 3],
        [/(duwt|duwen|trekt|trekken|houdt|houden|stuurt|sturen|pakt|pakken|zet|zetten|schuift|schuiven|draait|draaien|begeleidt)\b.*\bmet (de |zijn |z n |hun |blote )?hand(en)?\b/, 2.5], [/onveilige (plek|positie)|in de val ?zone|\bvalzone/, 2.5],
        [/(stuurt|sturen|stuurde|bijstuurt|bijsturen|begeleidt) (\w+ )?(de |het |die |dat )?(vijzel|last|plank|damwand|pomp|trog|trommel|filter|beluchter|brug|unit)\b/, 3],
        [/\bglad(de)?\b|\bglibber\w*|uitglij\w*|\bmodder\w*/, 2], [/\bachteruit\b/, 1]] },
    BEKNEL: { regel: /beknel\w*|pletten|klemzone|\bknel\w*|tussen de last/,
      zie: [[/\bvinger\w*|bekneld|beknel\w*|\bklem\w*|\bknel\w*|(hand|handen|voet|voeten|been|benen|arm|armen|vinger|vingers) (\w+ )?(tussen|onder|achter|in)\b|tussen (de )?(last|flens|flenzen|constructie|plank|planken|damwand\w*|wand|vijzel|trog)\b|\bplet\w*/, 3],
        [/\bhand(en)?\b/, 1]] },
    HOOGTE: { regel: /vallen van hoogte|\bval van\b|\bval (van|met)\b|vallen in|valgevaar|rand van|open gat|steiger|hoogwerker|ladder|werkbordes|uitglijden of vallen|vallen door/,
      zie: [[/(zonder|geen) (val\w*|harnas|leuning\w*|hekwerk|randbeveiliging|lijnlijn|vanglijn|reling)/, 3], [/valbeveiliging|\bharnas\w*|\bvanglijn|\blijnlijn|randbeveiliging|\bleuning\w*|hekwerk\w*|\breling\b/, 3],
        [/(aan|op|over|bij|langs|naast|richting|vlak bij) de (rand|putrand|kant|reling)\b|putrand|\brand van (de |het )?(put|bak|tank|kanaal|bassin|dek)/, 3, HIJSMIDDEL_OVER],
        [/open (gat|put|luik|mangat)|gat in (het |de )?(dek|rooster|vloer)|\b(luik|mangat|putdeksel|rooster)\b.*\b(staat|stond|ligt|is) (\w+ )?(open|eruit|weg|los)\b|rooster (ligt |is )?(eruit|weg|los)|(zonder|geen) hek\b/, 3],
        [/\bladder\w*|\bsteiger\w*|hoogwerker\w*|\bop hoogte\b|\bleunt\b/, 3],
        // "hij hangt half over de leuning" = valgevaar; "de band hangt over een scherpe rand" NIET (dan hangt er een hijsmiddel)
        [/(hangt|hangen|hing|buigt|buigen|reikt|reiken) (half |ver |helemaal |een stuk )?(over|buiten) (de |het |een )?(?!scherpe )(rand|reling|leuning|hek\w*|kant|putrand|balustrade|dek)|hangt (half |ver )?buiten/, 3, HIJSMIDDEL_OVER],
        [/(zonder|geen) (\w+ )?(hek\w*|leuning\w*|reling|lijn|lijnen|harnas|valbeveiliging|randbeveiliging|balustrade|vanglijn|lijnlijn)\b/, 3, /(stuur|geleide)lijn|(zonder|geen) (stuur)?lijn(en)? (\w+ )?(eraan|aan de (last|vijzel|plank|pomp|trommel))/],
        [/\bbuitenkant\b|\bbuitenrand\b/, 2], [/\bvalgevaar|(bijna|kan|kon) (er )?(in |eraf )?vallen|valt bijna/, 3],
        [/\bvallen\b|\bdiep\w*/, 1.2]] },
    WATER: { regel: /in (het )?water|bassin|\bkanaal\b|golfslag|boven water|\bdrijv/,
      zie: [[/reddingsvest\w*|zwemvest\w*|reddingsboei\w*|in het water|boven (het )?water|\bbassin\b|te water|\bdrijver\w*|\bponton\w*|golfslag/, 3]] },
    GAS: { regel: /besloten ruimte|\bgas(sen)?\b|h2s|ventilatie|toxisch|giftig|zuurstof|\bch4\b/,
      zie: [[/gasmeter\w*|gasmeting\w*|gasdetect\w*|\bgas\b|besloten|ventila\w*|\bh2s\b|zwavelwaterstof|rotte eieren|\bstank|mangatwacht\w*|\bmangat\b|ademlucht|zuurstof\w*|\bmethaan/, 3],
        [/(zit|zitten|staat|staan|werkt|werken|is|zijn|gaat|gaan|klimt|klimmen|daalt|dalen) (af )?(beneden |onder |diep |helemaal )?(in|onderin|onder in) (de |het )?(put|kanaal|inlaatkanaal|vijzelput|pompput|tank|trog|kelder|bak)\b/, 2.5],
        // het meetkastje/de gasmeter geeft alarm: "zijn meetkastje staat te piepen"
        [/\bpiep\w*|(meter|meetkast\w*|kastje|detector|meetapparaat)\b (\w+ ){0,3}(alarm|gaat af|loeit|slaat aan)|gasalarm/, 3],
        [/\bput\b|inlaatkanaal/, 1.2]] },
    ELEKTRA: { regel: /elektr\w*|spanning|elektrocutie|\bkabel/,
      zie: [[/\bspanning\w*(?! ?(vrij|zoeker|meter))|\bstroom\b|elektr(?!icien|o ?monteur|otechn)\w*|blanke? (draad|draden|kabel)|kabel\w* (ligt |is |zijn )?(bloot|kapot|beschadigd|open)|kapotte? kabel|aardlek|\bschok\b|losse (draad|draden|aders?|kabeleinden)|blanke? aders?|kabel\w* .*\b(doorgesneden|kapot|beschadigd|gescheurd|ligt in het water)\b/, 3, VEERSPANNING],
        [/open en bloot|(kabel|draad|draden|aders?)\w* (\w+ ){0,3}(bloot|open)\b|klemmenkast (\w+ ){0,3}open/, 3],
        [/schakelkast|klemmenkast|\bkast\b|\bkabel\w*|\bdraad\b|aansluit\w*/, 1.2]] },
    METEN: { regel: /spanningsvrij|spanningsmeter|geverifieerd|niet correct vrijgeschakeld|duspol/,
      zie: [[/\bduspol|spanningsvrij|spanningzoeker|spanningsmeter|\bmeten\b|\bgemeten\b|\bmeet\b/, 3]] },
    LOTOTO: { regel: /onverwacht\w* (inschakel|aanslaan|draai|opstart)|onmiddellijke activering|inschakelen tijdens|vrijgave/,
      zie: [[/kan (\w+ )?(zomaar |vanzelf |ineens |opeens )?(aan|aangaan|aangezet|starten|opstarten|inschakelen|aanslaan|aanspringen|gaan draaien|gaan lopen)\b|iedereen kan (hem |het )?(aanzetten|aan zetten|inschakelen)|onverwacht\w*|(zet|zette|zetten) (hem |het |de pomp |de installatie )?(weer )?aan\b|niet (afgeschakeld|uitgeschakeld|vrijgeschakeld|veiliggesteld)|\bslaat (\w+ )?aan\b|\b(ineens|opeens|plotseling|plots|zomaar|vanzelf)\b.*\b(aan|draai\w*|start\w*|loopt|lopen)\b/, 3],
        [/(aandrijving|motor|voeding)\w* (\w+ ){0,2}(nog )?(aangesloten|ingeschakeld|aan staat|onder spanning)|(nog )?(aangesloten|ingeschakeld) (\w+ ){0,2}(aandrijving|motor)/, 3],
        [/(geen|zonder) (hang)?slot|hoofdschakelaar|werkschakelaar|al (te |aan het )?(sleutel\w*|werk\w*|demonte\w*|losdraai\w*)/, 1.5],
        [/afgeschakeld|uitgeschakeld|schakelkast/, 1.2]] },
    SLOT: { regel: /\bslot\b|sloten|lototo|derden|niet vergrendeld/,
      zie: [[/(geen|zonder) (slot|sloten|hangslot|label|lototo|vergrendeling)|slot (ontbreekt|zit er niet|niet op|eraf)|\blototo|\bhangslot\w*|niet vergrendeld|vergrendel\w*|werkschakelaar|\bslot\b|\blabel\b/, 3], [/hoofdschakelaar|\bkast (staat |stond |is )?open/, 1.5]] },
    AUTO: { regel: /automatische bediening|niveauschakelaar|automatisch/,
      zie: [[/automatisch\w*|niveauschakelaar|\bvlotter\w*|\bniveau\b|tijdschakel\w*/, 3]] },
    DRAAI: { regel: /\bdraai\w*|rotatie|bewegende|grijpgevaar|gevarenzone|werkende/,
      zie: [[/\bdraai(t|en|ende)\b(?! rond| de vijzel in| in\b)|roter\w*|rotatie|bewegende delen|(laten|laat|liet) (\w+ )?(lopen|draaien|proefdraaien)|\bloopt (al|nog|weer)\b|\bgevarenzone|\blopende (ketting|band|vijzel|trommel|borstel|rotor)/, 3, /\bdraai\w* (en \w+ )?(\w+ ){0,3}aan de (kraan|haak)|aan de (kraan|haak) (\w+ ){0,3}(rond)?draai/],
        // iemand (of een hand) nog in/op/bij het werkende deel terwijl het aangezet wordt: "collega staat nog in de goot
        // bij de rotor als ze hem aanzetten", "er wordt aangezet terwijl iemand er bovenop staat"
        [/^(?=.*\b(aanzet\w*|aangezet|inschakel\w*|ingeschakeld|opstart\w*|proefdraai\w*|testdraai\w*|gaat (lopen|draaien)|gaan (lopen|draaien)|aan gaat|aangaat|start\w*)\b).*?\b(?<w>(staat|staan|stond|zit|zitten|zat|ligt|liggen|kruipt|hand|handen|arm|vingers?|voet|benen|poten|iemand|collega|monteur)\b( \w+){0,5})/, 3],
        [/(steekt|stak|steken|reikt|reiken|grijpt|grijpen|grijp|duwt) (\w+ ){0,3}(hand|arm|vingers?)? ?(\w+ )?(erin|naar binnen|ertussen|in de (trommel|vijzel|borstel|rotor|ketting|band|trog))|\b(hand|arm|vingers?) (\w+ ){0,2}(erin|naar binnen)\b/, 2.5],
        [/\brotor\w*|\bschoep\w*|\bwaaier\w*|\bborstel\w*/, 1.5]] },
    OPVIJZEL: { regel: /op de vijzel|werken op de vijzel|iemand op de|in de trog staat/,
      zie: [[/(staat|stond|staan|loopt|liep|zit|zat|werkt|klimt) (nog )?(\w+ )?(\w+ )?(op|in) de (vijzel|trog|trommel|put|vijzelput)\b/, 3], [/\b(boven ?op|erop) (\w+ ){0,2}(staat|staan|stond|zit|zitten|loopt)\b|(staat|staan|stond|zit|zitten|loopt) (\w+ ){0,3}(boven ?op|erop)\b/, 2.5]] },
    GEVZONE: { regel: /gevarenzone|iemand op de|in de put staat|persoon bevindt/,
      zie: [[/(staat|stond|staan|zit|zat|zitten|werkt|werken|is|zijn|loopt) (nog |er |al )?(nog )?(\w+ )?(\w+ )?(in|op|bij|onderin) (de |het )?(put|vijzelput|pompput|trog|vijzel|gevarenzone|trommel|kanaal|bak|goot|rotor|borstel|ketting|band)\b|nog (iemand|een persoon|persoon|mensen) (in|op|bij)\b/, 3]] },
    VSNAAR: { regel: /v snaar|\bsnaar/, zie: [[/\bv ?snaar\w*|\bsnaar\w*/, 3]] },
    AFSCHERM: { regel: /afgedekt|afscherm\w*|afdekking/,
      zie: [[/(zonder|geen) (afscherm\w*|afdek\w*|kap\b|beschermkap)|(afscherming|kap|beschermkap) (ontbreekt|is eraf|ligt eraf|eraf|weg|open)|niet afgedekt|(afscherming|kap|beschermkap|afdekking|hekje) (zit|zat|is|staat) (er )?(nog )?(niet|niet meer|nog niet) (op|aan|voor|gemonteerd|dicht)|(kap|afscherming|beschermkap|afdekking|deksel) (zit |is |ligt |staat )?(er )?(nog |al )?(af|eraf|weg|open)\b/, 3]] },
    NOODSTOP: { regel: /noodstop/, zie: [[/noodstop\w*/, 3]] },
    FYSIEK: { regel: /fysieke|werkhouding|zware objecten|overbelasting bij|geforceerde houding|\btillen|ongemakkelijke/,
      zie: [[/\btil(t|len)\b|\bopt(il|ill)\w*|\bsjouw\w*|\brug\b|gebukt|geknield|op (z n|zijn|hun) knieen|werkhouding|\bbukk\w*|\bkrom\w*|voorover|\bgebogen|(werkt|werken|boort|boren|sleutelt|sleutelen|draait|las\w*) (\w+ ){0,3}boven (zijn|z n|het) hoofd|\bdraagt\b|\bdragen\b/, 3], [/\bzwaar\b|\bzware\b|hele (dag|middag|ochtend|tijd)|uren (lang|achter elkaar)/, 1.2]] },
    BIO: { regel: /biologisch\w*|afvalwater|\bslib|agentia|\balgen\b/,
      zie: [[/\bslib\w*|afvalwater|rioolwater|\bpoep|\bsmerig|\bvies\w*|handen (niet )?(ge)?wass\w*|\beet\b|\beten\b|\bdrinkt\b|\broken\b|\brookt\b|\bspat\w*/, 3], [/blote handen|(zonder|geen) handschoen\w*/, 1.5]] },
    STOF: { regel: /\bstof\b|kwarts\w*|slijp\w*|boren|lasrook|dampen|vonken|gehoor\w*|metaaldeeltjes|betonstof/,
      zie: [[/\bstof\w*|stofmasker\w*|mondkap\w*|\bffp\w*|\bboort\b|\bboren\b|boorhamer|\bslijp\w*|\bvonk\w*|lasrook|\blawaai|oorkap\w*|oordop\w*|gehoorbescherm\w*|(geen|zonder) (veiligheids)?bril/, 3]] },
    KRAAN: { regel: /\bkraan\b|hijskraan|kraanbeweging|kraanopstelling/, zie: [[/\bkraan\w*|machinist/, 1]] },
    STABIEL: { regel: /instabiliteit|draagkracht|ondergrond|kantel\w*|omvallen/,
      zie: [[/\bstempel\w*|rijpla(at|ten)|draagkracht|ondergrond|zakt (weg|in)|wegzak\w*|\bkantel\w*|(slappe|zachte|natte|losse) grond|staat scheef|\binstabiel/, 3]] },
    OVERBELAST: { regel: /overbelasting kraan|kraancapaciteit|bezwijken hijsmiddel of kraanarm/,
      zie: [[/overbelast\w*|te zwaar voor de kraan|lastmoment|capaciteit|lastentabel|lastdiagram/, 3]] },
    KABELTRACE: { regel: /kabeltrace|ondergronds kabel/, zie: [[/kabeltrace|\bklic\b|kabels? in de grond|leidingen in de grond|ondergrondse? (kabel|leiding)\w*/, 3]] },
    AANRIJ: { regel: /aanrijding|kraanbeweging/, zie: [[/draaicirkel|\bzwenk\w*|achter de kraan|rijdt achteruit|aanrijd\w*|draaibereik|loopt (langs|achter|onder) de kraan/, 3]] },
    VERSCHUIF: { regel: /losgekoppeld|plotseling verschuiven|verschuiv\w*|ingezekerd|fixatie|terugzakken|stutten|omvallen|store rack|niet vergrendeld|onvoldoende fixatie/,
      zie: [[/losgekoppeld|loskoppel\w*|\bontkoppel\w*|niet (geborgd|gezekerd|ingezekerd|vastgezet|gestut|vergrendeld)|(geen|zonder) (borging|zekering|stempels?|stut\w*|wig\w*)|\bschuift\b|verschuif\w*|verschuift|kan (om)?vallen|\bomvallen|valt om|zakt (terug|weg)|terugzak\w*|\brack\b|\bstut\w*|\bfixatie/, 3],
        [/(nergens|niet|slecht|onvoldoende|nauwelijks) (mee |aan )?(geborgd|gezekerd|vastgezet|gestut|vastgemaakt)|niemand (heeft|had) (hem|het|ze|die|dat) (\w+ )?(gezekerd|geborgd|vastgezet|gestut)/, 3],
        [/bouten (zijn |zitten |liggen )?(al )?(los|eruit)|losmaken van de bouten/, 2]] },
    STRUIKEL: { regel: /struikel\w*|losliggende|rommel/,
      zie: [[/struikel\w*|kabels? (over|op|kris kras|door) (de |het )?(vloer|grond|pad|looppad|dek)|slingert? (rond|op de grond)|\brommel|\btroep\b|losliggend\w*|rondslinger\w*|ligt (van alles|overal)/, 3]] },
    BOTS: { regel: /\bbotsen|tegen de (geleiding|kanaalwand|putwand|vijzelwand|wand)/,
      zie: [[/\bbotst\w*|\bstoot\b|\bstoten\b|tegen de (wand|geleiding|kanaalwand|putwand|leuning)|schampt|raakt de (wand|geleiding)/, 3]] },
    CHEMIE: { regel: /chemisch\w*|cement\w*|epoxy|lijm|grouting|huidirritatie/,
      zie: [[/cement\w*|epoxy|\blijm\w*|mortel|grout\w*|chemisch\w*|bijtend|\bhuid\b|\bzuur\b|\bloog\b|\bspecie\b|betonspecie|\bnatte? beton|(handen|huid|armen) .*\bbeton\w*|\bbeton\w* .*\b(handen|huid)\b/, 3], [/blote handen|(zonder|geen) handschoen\w*/, 1.5]] },
    LASSEN: { regel: /\blas(sen|werk|rook)\b|\blassen/, zie: [[/\blas(sen|t|werk|apparaat)?\b/, 2]] },
    LASROOK: { regel: /lasrook|dampen/, zie: [[/lasrook|\brook\b|\bdamp\w*/, 3]] },
    BRAND: { regel: /brand\w*|explosie/, zie: [[/\bbrand\w*|blusser|explos\w*/, 3]] },
    SNIJ: { regel: /snijgevaar|scherpe/, zie: [[/\bscherp\w*|\bsnij\w*|\bbraam\b|\bbramen\b/, 3]] },
    VEER: { regel: /veerkracht|spanmechanisme/, zie: [[/\bveer\w*|spanmechanisme|\bspanner\w*/, 2.5],
        [/(ketting|veer|veren|spanner|spanmechanisme)\w* (\w+ ){0,4}(op|onder) (de )?spanning|(op|onder) spanning (\w+ ){0,3}(ketting|veer|spanner)|\b(staat|zit|staan) (nog )?strak\b|wegschiet\w*|(schiet|springt|klapt|zwiept) (\w+ )?(los|weg|terug)/, 3],
        [/(pal|recht|vlak|direct|precies) (er)?voor\b/, 1]] },
    PARTIJ: { regel: /twee partijen/, zie: [[/andere (aannemer|partij|ploeg)|twee (partijen|ploegen)|\bderden\b/, 2.5]] },
    AFZET: { regel: /afzet\w*|afgezet|hijsgebied|hijspad|afscherming van (het )?gevaar/,
      zie: [[/(niet|geen|zonder) (afgezet|afzetting|hekken|lint)|afzetting\w*|afgezet|\bhekken\b|\blint\b|voetganger\w*|\bpubliek|hijsgebied|hijspad/, 3]] },
    COMM: { regel: /visueel en auditief contact|aanwijzer|communicatie met machinist|contact tussen monteur en kraan/,
      zie: [[/oogcontact|\bportofoon\w*|machinist ziet|geen (contact|zicht)|\baanwijzer\w*|\bseinen\b|seingever|handsignal\w*/, 3]] },
    DOCS: { regel: /\blmra\b|werkvergunning|werkinstructie/,
      zie: [[/werkvergunning|vergunning|\btra\b|\blmra\w*|toolbox\w*|werkinstructie|instructie|tekening|\bwms\b|papieren/, 3]] },
    PBM: { regel: /\bpbm\b/, zie: [[/\bhelm\w*|handschoen\w*|veiligheidsbril|\bbril\b|veiligheidsschoen\w*|\bschoenen\b|hesje|\bvest\b|gehoorbescherm\w*|\bpbm\w*|oordop\w*|oorkap\w*|overall/, 3]] },
    GEREEDSCHAP: { regel: /arbeidsmiddel|slagmoersleutel|trilling/,
      zie: [[/keuring\w*|gekeurd|keuringssticker|\bsticker|verlengkabel|\bhaspel|gereedschap\w*|slijptol|boormachine|arbeidsmiddel\w*/, 3]] },
    NOOD: { regel: /noodvoorziening|ehbo/, zie: [[/brandblusser|\bblusser|\behbo\b|verbanddoos|vluchtweg\w*|nooduitgang|reddingsboei|oogdouche|\baed\b|noodplan/, 3]] },
    GEDRAG: { regel: /gedrag/, zie: [[/\bhaast\b|telefoon|\bbelt\b|\bbellen\b|\bgrap\w*|negeert|luistert niet|ruzie|\bafspraak\w*/, 3]] },
  };
  // algemene onderwerpen A t/m I (voorbeelddata): welke begrippen ze dekken. Ze tellen voor 0,7 mee, zodat een
  // passende regel van de taak bij gelijke aanwijzingen vóór het algemene onderwerp komt.
  const ALG = { A: ["DOCS"], B: ["LOTOTO", "SLOT", "METEN", "ELEKTRA", "AUTO"], C: ["PBM"], D: ["GEREEDSCHAP"], E: ["LAST", "SLINGER", "KRAAN", "STABIEL", "OVERBELAST", "COMM", "BEGELEID"],
    F: ["AFZET", "STRUIKEL"], G: ["BIO", "CHEMIE", "STOF"], H: ["NOOD", "BRAND"], I: ["GEDRAG", "COMM", "PARTIJ"] };
  // TWIJFEL: scoort de tweede regel ≥ 80% van de eerste, dan is het geen sterke match (één bevestigingstik)
  const ALG_F = 0.7, CAP = 5, STERK_MIN = 2.4, TWIJFEL = 0.8, CONFLICT = 0.6;
  // woorden die bijna overal staan of alleen het product/de persoon noemen: geen bewijs voor een bepaalde regel
  const GENERIEK = new Set(("monteur monteurs man mannen jongen jongens collega collegas ploeg onder boven bezig werkt werken gewoon beetje even " +
    "zie zag gezien kijk alles iemand niemand iets niets stuk deel onderdeel ding hele plank planken persoon").split(" "));

  // begrippen die een waarneming noemt: { c: { w, woorden: [...] } } (gewicht = som van de gevonden signalen, max CAP)
  function signalen(tekst) {
    const t = patroonTekst(tekst), uit = {};
    Object.keys(B).forEach((c) => {
      let w = 0, sterk = 0; const woorden = [];
      // [patroon, gewicht, niet]: "niet" = context waarin het patroon iets anders betekent (bv. "de band hangt over een
      // scherpe rand" is geen persoon die over de rand hangt)
      B[c].zie.forEach(([re, g, niet]) => { const m = t.match(re); if (m && !(niet && niet.test(t))) { w += g; sterk = Math.max(sterk, g); const wd = ((m.groups && m.groups.w) || m[0]).trim(); if (wd) woorden.push(wd); } });
      if (w) uit[c] = { w: Math.min(CAP, w), sterk, woorden };
    });
    return uit;
  }
  // risicozin opsplitsen: kop (vóór de eerste dubbele punt/puntkomma) en de rest (met de taakstap)
  function velden(r) {
    const risico = String(r.risico || ""), i = risico.search(/[:;]/);
    const kop = i > 0 && i < 90 ? risico.slice(0, i) : risico.slice(0, 90);
    return { kop: norm(kop), risico: norm(risico + " " + (r.taakstap || "")), mr: norm([].concat(r.maatregelen || []).join(" ")) };
  }
  // welke begrippen een regel draagt, met factor: kop 1, risicozin 0,7, maatregelen 0,4
  function begrippenVan(r) {
    const v = velden(r), uit = {};
    Object.keys(B).forEach((c) => { const re = B[c].regel; const f = re.test(v.kop) ? 1 : re.test(v.risico) ? 0.7 : re.test(v.mr) ? 0.4 : 0; if (f) uit[c] = f; });
    return uit;
  }
  const stammen = (s) => (WPI && WPI.toks ? WPI.toks(s) : norm(s).split(" ").filter((w) => w.length > 2).map((w) => w.slice(0, 6)));

  // ---- regels rangschikken ----
  // opt: { regels: [TRA-regels van de taak], alg: [{ ref, naam }], generiek: [extra algemene woorden, bv. productnaam] }
  // → { lijst: [{ id, s, woorden, harde, alg }], top, sterk, reden, enkel }
  function rangschik(tekst, opt) {
    opt = opt || {};
    const sig = signalen(tekst);
    const gen = new Set(stammen((opt.generiek || []).join(" ")).concat([...GENERIEK].map((w) => w.slice(0, 6))));
    const qTok = [...new Set(stammen(ontPersoon(tekst)))].filter((w) => !gen.has(w));
    const kand = (opt.regels || []).map((r) => ({ id: r.id, alg: false, b: begrippenVan(r), doc: new Set(stammen((r.risico || "") + " " + (r.taakstap || ""))) }))
      .concat((opt.alg || []).map((o) => { const b = {}; (ALG[o.ref] || []).forEach((c) => { b[c] = 1; }); return { id: "ALG-" + o.ref, alg: true, b, doc: new Set(stammen(o.naam || "")) }; }));
    const N = kand.length, df = {}, begrVan = {};
    kand.forEach((k) => { begrVan[k.id] = k.b; k.doc.forEach((w) => { df[w] = (df[w] || 0) + 1; }); });
    const lijst = kand.map((k) => {
      let s = 0, harde = false; const woorden = [], begr = [];
      Object.keys(sig).forEach((c) => {
        const f = k.b[c]; if (!f) return;
        // een algemeen onderwerp telt alleen zijn sterkste begrip (anders wint het van de regel door breedte)
        if (k.alg) s = Math.max(s, sig[c].w * f); else s += sig[c].w * f;
        begr.push(c);
        if (sig[c].sterk >= 2.5 && f >= 0.7) harde = true;
        sig[c].woorden.forEach((w) => { if (!woorden.includes(w)) woorden.push(w); });
      });
      let ts = 0; const tw = [];
      qTok.forEach((w) => { if (k.doc.has(w)) { ts += Math.min(1, 0.35 * Math.log((N + 1) / df[w])); tw.push(w); } });
      s += Math.min(1.5, ts);
      if (k.alg) s *= ALG_F;
      return { id: k.id, alg: k.alg, s: Math.round(s * 100) / 100, harde, woorden: netjes(woorden), tokens: tw, bewijs: woorden.length + tw.filter((w) => !woorden.some((x) => norm(x).includes(" " + w))).length, begr };
    }).filter((x) => x.s > 0.15).sort((a, b) => b.s - a.s || (a.alg - b.alg));
    // het Voorstel is altijd een regel van de TAAK; een algemeen onderwerp dat hoger scoort komt apart (alg)
    const taakLijst = lijst.filter((x) => !x.alg), top = taakLijst[0] || null, algTop = lijst.find((x) => x.alg);
    const alg = algTop && (!top || algTop.s > top.s) ? algTop.id : null;
    if (!top) return { lijst, top: null, sterk: false, reden: alg ? "algemeen" : "geen", enkel: "", alg };
    // twijfel: een andere regel van dezelfde taak scoort (bijna) even hoog
    const tweede = taakLijst[1];
    // of: een ANDERE gevaarzin (die de eerste regel niet heeft) wijst hard naar de tweede regel, en die zit niet ver
    // achter (≥ 60%). Dan noemde de inspecteur twee gevaren en kiest hij zelf (SCV: "hijsband niet gekeurd" tegenover
    // "hangt over … rand"); een kleine voorsprong is dan geen bewijs.
    const ander = !!(tweede && tweede.harde && tweede.s >= top.s * CONFLICT && tweede.begr.some((c) => !top.begr.includes(c) && sig[c].sterk >= 2.5 && (begrVan[tweede.id] || {})[c] >= 0.7));
    const twijfel = !!(tweede && (tweede.s >= top.s * TWIJFEL || ander));
    // STERK alleen met een gevaarzin (≥ 2,5) die bij de kern van de regel hoort, duidelijk boven de rest
    const sterk = !twijfel && !alg && top.s >= STERK_MIN && top.harde;
    const enkel = !sterk && top.bewijs <= 1 ? (top.woorden[0] || origineelWoord(tekst, top.tokens[0]) || "") : "";
    return { lijst, top: top.id, sterk, reden: sterk ? "gevaarzin" : alg ? "algemeen" : twijfel ? "twijfel" : top.bewijs <= 1 ? "een-woord" : "zwak", enkel, tweede: twijfel ? tweede.id : null, alg };
  }
  // "Waarom: je zei …" leesbaar houden: geen stukken die in een ander stuk zitten, geen lange patroonspannes (> 4 woorden)
  // als er een korter stuk van hetzelfde is; hoogstens 4
  function netjes(woorden) {
    const n = (w) => w.split(" ").length, uit = [];
    woorden.slice().sort((a, b) => n(a) - n(b)).forEach((w) => {
      const binnen = uit.filter((k) => (" " + w + " ").includes(" " + k + " "));
      if (binnen.length && n(w) > 4) return;                       // lange spanne: de kortere stukken zeggen het al
      binnen.forEach((k) => uit.splice(uit.indexOf(k), 1));        // korter stuk dat hierin zit: dit is preciezer
      if (!uit.includes(w)) uit.push(w);
    });
    return woorden.filter((w) => uit.includes(w)).slice(0, 4);
  }
  // het woord zoals de inspecteur het zei, bij een stam
  function origineelWoord(tekst, stam) {
    if (!stam) return "";
    const w = String(tekst || "").split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}-]/gu, "")).find((x) => stammen(x)[0] === stam);
    return w ? w.toLowerCase() : "";
  }

  // ---- taak voorstellen: werkwoorden van de bouwplaats naar de taken uit de TRA ----
  // taak: herkent het soort taak in de taaknaam; zie: [patroon, gewicht] in wat de inspecteur vertelt
  const TAAK = {
    VERWIJDER: { taak: /verwijder|demont|afbouw|uit water/, zie: [[/\beruit\b|uit (de |het )?(put|water|kanaal|trog|bassin|sleuf|grond|tank|buis)\b|\btrek(t|ken)\b|uit ?hal(en|t)|weg ?hal(en|t)|\bhal(en|t) .*\b(uit|weg)\b|demonte\w*|demontage|\bslop\w*|afbre\w*|\bloshal\w*|verwijder\w*|uitbouw\w*|\bbouw(en|t) .*\baf\b|\bnem(en|t) .*\bweg\b|\bweg ?nem\w*|\btakel(en|t) .*\b(eruit|uit|weg|eraf)\b|\beraf\b|\b(eruit|eraf|uit|weg|los|af)(halen|trekken|takelen|hijsen|nemen|bouwen|breken|tillen)\b|\b(hijs|takel|trek|haal|hal|til)\w* (\w+ ){0,4}uit (de|het|een)\b|\buit elkaar\b/, 3], [/\b(hijs|takel)\w* (\w+ ){0,3}(omhoog|naar boven)\b/, 2], [/\blosmak\w*|\bmaken .* los\b|\bafvoer\w*|\bde oude\b|\boude\b/, 1.5]] },
    // taaknaam: "monter"/"montage" niet in "Demonteren"/"Demontage", "installatie" alleen vooraan (niet "...-installatie")
    PLAATS: { taak: /plaats|(?<!de)monte|(?<!de)montage|^installatie|indraai|assemblage/, zie: [[/\berin\b|in de grond|\bsla(an|at)\b|\bhei(en|t)\b|intril\w*|\btrillen\b|plaats(en|t)\b|\bzet(ten)? (?!(de |het )?(spanning|stroom))\S+ .*\b(neer|in|op|vast)\b|(?<!de)monte(er|ren|ert)\w*|(?<!de)montage|inbouw\w*|installe\w*|neerzet\w*|inhijs\w*|afmonte\w*|assemble\w*|uitlijn\w*|\bstellen\b|indraai\w*|\bbouw(en|t) .*\bin\b|\binhang\w*|\bneerlat\w*|\b(laten|laat|liet|lieten) .*\bzakken\b|\bzakken in\b|\b(de|het) (put|kanaal|bassin|trog|tank|buis|water|goot) in\b|\b(in|erin|neer|vast|op)(hijsen|takelen|zetten|hangen|bouwen|draaien|slaan|klemmen|stellen)\b|\bin elkaar\b/, 3], [/\bzetten\b|\bhang(en|t)\b|\bde nieuwe\b|\bnieuwe\b/, 1.5]] },
    LOTOTO: { taak: /afschakel|lototo|veiligstel/, zie: [[/\blototo|\bslot(en)?\b|\bsloten\b|hangslot\w*|afschakel\w*|\buitschakel\w*|\bschakel(en|t) .* (af|uit)\b|vergrendel\w*|spannings(vrij|loos)|\bvrij ?schakel\w*|vrijgeschakeld|\bduspol|schakelkast|hoofdschakelaar|veiligstel\w*|\blabel\b|werkschakelaar|(stroom|spanning) (eraf|af|weg)\b|\buitzetten\b|\bveilig ?(zetten|gezet|stellen|gesteld|maken|gemaakt)\b|\b(af|uit|veilig)(schakelen|zetten|stellen|maken)\b|\bzet(ten)? (\w+ )?(\w+ )?uit\b(?! de| het)/, 3], [/\bkast\b/, 1.5]] },
    AFMONT: { taak: /afmonter/, zie: [[/afmonte\w*|afdek\w*|\bdicht ?(maken|gemaakt|doen)\b|\b(maken|maakt|doen) .*\bdicht\b|stuwkant/, 3]] },
    INSCHAKEL: { taak: /^inschakel/, zie: [[/\binschakel\w*|(spanning|stroom) (erop|terug|er weer op|aan|op)\b|\bweer aan\b|\baanzet\w*|\baan(sluiten|klemmen|schakelen)\b|(zet\w*|zette|brengen|breng\w*|gezet|gebracht) (\w+ ){0,4}onder (stroom|spanning)\b|kabel .*aansluit\w*|aansluiten van de (kabel|motor|voeding)|\baansluit\w*|\baanklem\w*|\bklem(men|t)\b.*\baan\b|\bsluit(en)? .*\baan\b|\bbekabel\w*|\bschakel(en|t) .*\b(in|aan)\b/, 3]] },
    INBEDRIJF: { taak: /inbedrijf/, zie: [[/proefdraai\w*|testdraai\w*|\b(proef|test)(draaien|zetten|starten)\b|\bdraai\w* (\w+ ){0,4}proef\b|voor het eerst (\w+ ){0,2}(draaien|lopen|aan|draait|loopt|starten)|\b(draai|laat|laten|zet|zetten)\w* (\w+ ){0,4}voor het eerst\b|\btest(en|draaien)?\b|inbedrijf\w*|in bedrijf|opstart\w*|draai(t|en) proef|eerste keer (draaien|lopen)|\boplever\w*|(laten|laat|liet) (\w+ )?(\w+ )?(lopen|draaien)\b|\bdraait (al|nu|weer)\b/, 3], [/\baanzet\w*|\b(aan|op)starten\b/, 2.5]] },
    KRAAN: { taak: /kraanopstelling/, zie: [[/kraan (wordt |werd )?(opgesteld|opgebouwd|neergezet|opgezet)|kraanopstelling|\bstempel\w*|rijpla(at|ten)|kraan staat|\bopstellen\b|draagkracht|ondergrond|\bklic\b/, 3], [/\bkraan\b/, 1]] },
    BETON: { taak: /beton/, zie: [[/\bbeton\w*|\bstort(en|t)?\b|trilnaald|verdicht\w*|bekisting|uithard\w*|\bafwerk\w*/, 3]] },
    WATER: { taak: /tewaterlating/, zie: [[/te water|in het water|\bdrijver\w*|\bplatform\b|verankering|\bponton|\bboot\b/, 3]] },
    LOSSEN: { taak: /aankomst|lossen/, zie: [[/\blossen\b|vrachtwagen|\baankomst|uitpak\w*|\bgeleverd\b/, 3]] },
    CONTROLE: { taak: /^controleren/, zie: [[/schoon (en droog )?opgeleverd|\bschoon\b|\bdroog\b|controleren of/, 2]] },
  };
  function taakSignalen(tekst) {
    const t = patroonTekst(tekst), uit = {};
    Object.keys(TAAK).forEach((c) => { let w = 0; const woorden = []; TAAK[c].zie.forEach(([re, g]) => { const m = t.match(re); if (m) { w = Math.max(w, g); woorden.push(m[0].trim()); } }); if (w) uit[c] = { w, woorden }; });
    return uit;
  }
  // → [{ id: taaknaam, s, woorden }] (beste eerst; alleen met aanwijzing)
  function taakRang(tekst, taken, regels, generiek) {
    const sig = taakSignalen(tekst);
    const gen = new Set(stammen((generiek || []).join(" ")).concat([...GENERIEK].map((w) => w.slice(0, 6))));
    // woordstammen van de zin met het samengestelde werkwoord ("aanzetten", niet "zetten" → plaatsen)
    const alleTok = [...new Set(stammen(ontPersoon(scheid(tekst).los)))], qTok = alleTok.filter((w) => !gen.has(w));
    const docs = taken.map((t) => ({ t, doc: new Set(stammen(t + " " + regels.filter((r) => r.taak === t).map((r) => (r.taakstap || "") + " " + (r.risico || "")).join(" "))), naam: new Set(stammen(t)) }));
    const N = docs.length || 1, df = {};
    docs.forEach((d) => d.doc.forEach((w) => { df[w] = (df[w] || 0) + 1; }));
    return docs.map((d) => {
      let s = 0; const woorden = [];
      Object.keys(sig).forEach((c) => { if (TAAK[c].taak.test(norm(d.t).trim())) { s += sig[c].w; sig[c].woorden.forEach((w) => { if (!woorden.includes(w)) woorden.push(w); }); } });
      let ts = 0; qTok.forEach((w) => { if (d.doc.has(w)) { ts += Math.min(1, 0.4 * Math.log((N + 1) / df[w])) * (d.naam.has(w) ? 2 : 1); } });
      // een algemeen woord (bv. de productnaam "stortmal") telt alleen als het in de táaknaam zelf staat
      alleTok.forEach((w) => { if (gen.has(w) && d.naam.has(w) && df[w] < N) ts += 0.3; });
      s += Math.min(2, ts);
      return { id: d.t, s: Math.round(s * 100) / 100, woorden };
    }).filter((x) => x.s >= 0.5).sort((a, b) => b.s - a.s);
  }

  // ---- direct gevaar: vallende of hangende last, val van hoogte of in water, gas, spanning, onverwacht inschakelen,
  //      iemand in de gevarenzone van een draaiende vijzel/trommel (meegesleurd of bekneld raken is dodelijk) ----
  const GEVAAR_REGEL = /vallen van (de |het )?(last|reductor|indraaireductor|schraper)|vallen van last|ongecontroleerd vallen|onder (de |een )?hangende last|werken onder hangende|vallen van hoogte|\bval van\b|\bvallen in\b|valgevaar|vallen door|uitglijden of vallen|besloten ruimte|gevaarlijke gassen|giftige gassen|elektrocutie|elektrisch gevaar|restspanning|onverwacht\w* (inschakel|draai|aanslaan|opstart|rotatie|roter|start)|onverwachte draaibeweging|onmiddellijke activering|plotseling inschakel|direct opstarten|terugzakken|instabiliteit kraan|kantelen van de (hijs)?kraan|omvallen van steiger|gevarenzone|ongewenst draaien|beknelling door (draaiende|bewegende)|draaiende (vijzel|trommel|delen|installatie)|draaiend trommelfilter|grijpgevaar door draaiende|bewegende (transportketting|ketting|delen)|werkende \w+|rest ?beweging|niet vergrendeld bij benaderen|veerkracht\w*|wegschiet\w*|in (het )?water vallen|te water raken|verdrink\w*|val van (de )?rand|val van ladder|bezwijken van (takel|strop|hijsmiddel)|plotseling verschuiven|vallen \w+ uit (store )?rack|uit de (trog|buis) glijden|omvallen (of instabiliteit )?van (de |het )?(steiger|hoogwerker|inlooptrommel)|omvallen of instabiliteit|onverwachte beweging van (de )?(ruimerbrug|loopwagen)/;
  const GEVAAR_ZIE = /onder (de |een |die )?(hangende |zwevende )?last|onder (een |de )?(hangende|zwevende)|(zonder|geen) (valbeveiliging|harnas|gasmeter|gasmeting|reddingsvest|zwemvest)|(?<!(ketting|veer|spanner)\w* (\w+ ){0,4})onder spanning|blanke? (draad|draden|aders?)|(geen|zonder) (hang)?slot op|(kruipt|kruipen|ligt|liggen|zit|zitten) (\w+ )?(eronder|onder de (vijzel|brug|last|trommel|pomp))|\bbungel\w*|gasalarm|meter (\w+ )?piept|staat te piepen/;
  // label (risicokop) als dit direct gevaar is, anders ""
  function directGevaar(risico, tekst) {
    const r = norm(risico), kop = String(risico || "").split(/[:;]/)[0].trim();
    if (GEVAAR_REGEL.test(r)) return kop.length > 70 ? kop.slice(0, 67).replace(/\s+\S*$/, "") + "…" : kop;
    const m = norm(tekst).match(GEVAAR_ZIE);
    return m ? "Je zag: " + m[0].trim() : "";
  }

  WPI.koppel = { norm, signalen, begrippenVan, rangschik, taakRang, directGevaar, BEGRIPPEN: B, ALG };
})();
