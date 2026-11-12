# W14-ai-data — AI-aanbieder en data

Webscherm 1440 × 2343 px. Accentkleur alleen nog voor AI-voorstellen (hier niet gebruikt). Geen prijzen verzonnen; kosten pas na gemeten verbruik.

Nagezocht op 12-11-2026; alleen dit staat als feit in het scherm:
- Anthropic, Data residency (platform.claude.com/docs/en/manage-claude/data-residency): workspace geo bepaalt opslag; “Currently, "us" is the only available workspace geo”; voor inferentie alleen “us” en “global” (global is standaard). Geen EU-optie. Ook bij het door Anthropic beheerde aanbod op AWS en Google Cloud is de workspace geo “us”.
- Anthropic, Commercial Terms: klant in de EER contracteert met Anthropic Ireland, Limited; de DPA is “incorporated into these Terms by reference”; geen training op klantinhoud.
- Anthropic, DPA: standaardcontractbepalingen module 2 en 3 (Iers recht); importeur is de Anthropic-entiteit die de overeenkomst sloot; subverwerkers via openbare lijst, 15 dagen bezwaar; wissen binnen 30 dagen na einde. De DPA noemt het EU-VS Data Privacy Framework niet; een DPF-certificering van Anthropic heb ik niet gevonden, daarom “controleren”.
- Claude op Google Vertex AI (Anthropic-docs): multi-region “eu” en regionale endpoints zoals europe-west1; regionaal alleen Claude Sonnet 4.6 en ouder; multi-region en regionaal 10% duurder. Amazon Bedrock (AWS-aankondiging, voor Claude 3.7 Sonnet): cross-region inference in Ierland, Parijs, Frankfurt en Stockholm; per model te controleren.
- OpenRouter, In-Region Routing: eu.openrouter.ai, Business- of Enterprise-plan; geen terugval als er geen EU-endpoint is; account-, factuur-, authenticatie-, beveiligings- en misbruikgegevens kunnen in de VS staan.
- DeepSeek, privacybeleid (laatste update 10-02-2026): “we directly collect, process and store your Personal Data in People's Republic of China.”
- AVG art. 46 lid 2 onder c (standaardbepalingen), art. 49 (uitzonderingen voor specifieke situaties).

## Hoe configureert de klant dit
- Aanbieder kiezen uit vier routes: Claude via Anthropic (opslag VS), Claude via de EU-regio van een cloudplatform, DeepSeek via OpenRouter met een vastgezette host, of een EU-gehost open model. Per route staan regio, doorgifte en beperkingen.
- Bij de actieve aanbieder: regio (“VS (opslag) · inferentie global/us · doorgifte zeker”), contractpartij, overeenkomst (van toepassing via de Commercial Terms), grondslag doorgifte (art. 45–49: SCC module 2/3 plus transfer impact assessment; DPF controleren) en training/wissen, elk met status.
- Status “in gebruik onder voorbehoud” zolang de DPIA (art. 35 AVG) niet af is; de DPIA is een taak met eigenaar, termijn, adviseur en zeven stappen, waaronder TIA en instemming van de ondernemingsraad (WOR art. 27).
- Grondslag verwerking kiezen (gerechtvaardigd belang, VCA als bedrijfsbelang; of wettelijke verplichting via Arbowet art. 5 en 8), per functie een aanbieder, bewaartermijnen en maandlimiet.
- Namen vervangen door rollen: herkenning uit kop en gebruikerslijst, controle door de inspecteur vóór verzenden en opslaan; belofte “zo veel mogelijk”.

## Uitbreidingen
- Aanbieder per groep (bijvoorbeeld S&M DE op een EU-route) in plaats van één voor de hele organisatie.
- Twee aanbieders naast elkaar draaien op dezelfde proefgesprekken en de verschillen tonen.
- Export van het AI-logboek voor audit of inzageverzoek.
- Eigen sleutel (API-key) of eigen cloudcontract van de klant, zodat de overeenkomst rechtstreeks loopt.

## Verbeteringen
- De bronregels automatisch op “te controleren” zetten als de aanbieder zijn voorwaarden of residency-docs wijzigt.
- Bij een EU-route per functie tonen welke modellen daar beschikbaar zijn, vóór de wissel.
- Een rekenvoorbeeld voor kosten op basis van de proefgesprekken.
