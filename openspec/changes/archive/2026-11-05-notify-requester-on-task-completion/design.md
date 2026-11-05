# Design

## Context

Zie proposal.md onder "Why" voor de motivatie. Wat de aanpak bepaalt:

- **Geen maker bekend.** De meeste collega's werken onder het gedeelde account `airtable@picoo.nl`. Een `createdBy`-veld zegt dus niets. Ook taken die de meeting-assistent of de split-automation aanmaakt staan op naam van een token of automation. `Aangevraagd door` is de enige bron.
- **Slack is al gekoppeld.** De base heeft het Slack-account `eaczxgyZO4OwxTrjk`. De native actie `sendToSlack` stuurt naar een kanaal of gebruiker via `slackConversationId`. Dat is een tekstslot dat tot 10 ontvangers gescheiden door komma's accepteert.
- **Slack-ID's staan in `Picoo users.Slack`** (multilineText). Data-afwijkingen: `'U9E22BVPA\n'` (Anika), `D09NUHJ3Y94` (Marthe, een DM-kanaal-ID), leeg (Liesbeth).
- `Taken.Status`-keuzes: `Todo`, `Blocked`, `In progress`, `Done`, `Canceled`.

## Goals / Non-Goals

**Goals:**
- Volledig native: geen `customScript`-node. Scriptnodes kunnen niet via MCP worden beheerd en een geplakt script is al eens corrupt geraakt (zie `docs/notes.md`, 2026-08-27).
- Alle beslislogica ("moet er een melding komen?") staat in één zichtbaar formuleveld op `Taken`, zodat je per record in de grid kunt zien waarom er wel of geen melding komt.

**Non-Goals:**
- Een creator-veld of het automatisch invullen van `Aangevraagd door`.
- De meeting-assistent (iris-os) laten invullen wie een actiepunt aanvroeg. Dat kan later als aparte change in iris-os.
- `Toewijzen aan` beperken tot medewerkers in dienst. Dat ligt voor de hand, maar valt buiten deze user story.
- Meldingen voor andere statuswijzigingen (Blocked e.d.).

## Decisions

### 1. Native `sendToSlack` in plaats van een script
Gekozen omdat de automation dan volledig te zien en te beheren is via de Airtable MCP/CLI, en omdat er geen script geplakt hoeft te worden.
*Alternatief:* een script met `chat.postMessage` en de bestaande `slackBotToken`-secret, zoals in `create-channel-invite-users.js`. Dat kan ID's trimmen, ontbrekende ID's loggen en vanuit de Picoo-bot posten. Het is afgewezen vanwege de beheerlast. De nadelen staan hieronder bij Risks.

### 2. Beslislogica in formuleveld `Stuur afrondmelding`
Nieuwe velden op `Taken`:
- `Slack aanvrager`: lookup van `Picoo users.Slack` via `Aangevraagd door`.
- `Stuur afrondmelding`: formule met een checkbox als resultaat, ongeveer zo:
  ```
  AND(
    OR({Status} = "Done", {Status} = "Canceled"),
    {Aangevraagd door},
    {Aangevraagd door} != {Toewijzen aan},
    {Slack aanvrager}
  )
  ```
De automation gebruikt `recordMatchesConditions` met `Stuur afrondmelding` is checked als trigger.
*Alternatief:* de voorwaarden direct in de trigger zetten. Dat gaat niet: de trigger kan twee linkvelden niet met elkaar vergelijken.

### 3. Eén automation voor Done en Canceled
Volgt uit de keuze van de gebruiker. Omdat de trigger alleen afgaat bij het *binnenkomen* in de voorwaarden, geeft Done → Canceled geen nieuwe melding. Dat is geaccepteerd (zie spec). Done → In progress → Done geeft wel een nieuwe melding, ook geaccepteerd.

### 4. Ontvanger dynamisch vanuit de lookup
`slackConversationId` krijgt een `$ref` naar `Slack aanvrager` uit de trigger. Of het slot een dynamische `U…`-ID accepteert in plaats van een ID uit `fetch_automation_input_data`, is **niet geverifieerd**. Taak 1 test dit eerst. Lukt het niet, dan is er geen native route om een DM naar een gebruiker te sturen die per record verschilt, en valt de keuze terug op het script uit beslissing 1.

### 5. `Aangevraagd door`: al ingesteld, alleen vastleggen
Het veld staat al op één record ("Allow linking to multiple records" uit) en filtert de keuze met de conditie `Status dienstverband` is `in dienst` (`Picoo users.fldy9Q2wpthmVgpEe`, singleSelect). Er komt geen apart `In dienst`-veld en geen view om de keuze te beperken. Een conditiefilter is beter dan een view-beperking, omdat het bestaande statusveld de enige bron blijft. Geen enkele taak had meer dan één aanvrager (gecontroleerd op 904 taken), dus de instelling kostte geen data.

### 6. Berichttekst
Slack mrkdwn, ongeveer zo:
```
<{Interface URL}|{Taak titel}> is op *{Status}* gezet. Uitvoerder: {Toewijzen aan}
```
De tekst zegt bewust "is op … gezet" en niet "X heeft afgerond", omdat niet bekend is wie de status wijzigde (zie spec: wie het doet maakt niet uit).

### 7. Logging in `systemMessages`
Een tweede actie, `updateRecord`, zet bovenaan `systemMessages` de regel `<datum> Afrondmelding (<Status>) gestuurd naar <aanvrager>`, gevolgd door de bestaande inhoud. Dat sluit aan bij de manier van loggen in `task-assignee-split`. Mislukt `sendToSlack`, dan stopt de run en komt er geen logregel. De fout staat dan in de run-historie van de automation.

## Risks / Trade-offs

- [Dynamische Slack-ontvanger werkt niet native] → Taak 1 is een spike met één testrecord, vóór al het andere werk. Faalt die, dan terug naar een script (ontwerp aanpassen).
- [Slack-ID met newline of `D…`-ID laat de actie falen] → Data opschonen in taak 2. Een native actie trimt niet.
- [Aanvrager zonder Slack-ID krijgt nooit een melding, zonder signaal] → Het formuleveld laat dat per record zien. Een aparte controle-view is geschrapt: bij de livegang had iedereen in dienst een geldig ID.
- [Vergelijking aanvrager ↔ uitvoerder gebeurt op naam, niet op record-ID] → Gaat mis bij twee mensen met dezelfde naam. Nu niet aan de orde. Gebeurt dat ooit, vergelijk dan via een `RECORD_ID()`-lookup.
- [Bulk op Done zetten (bijv. de meeting-assistent) geeft een reeks DM's tegelijk] → Geaccepteerd. Elk bericht hoort bij een taak.
- [De DM komt van de "Airtable"-app, niet van de Picoo-bot] → Geaccepteerd. `username` in de actie kan "Picoo taken" worden, zodat de afzender herkenbaar is.
- [Melding blijft uit omdat `Aangevraagd door` vaak leeg is] → Buiten technische scope: het team moet het veld gaan invullen. Communiceren bij de livegang.

## Migration Plan

1. Schemawijzigingen (lookup, formule) kunnen bestaande automations niet raken. Ze zijn alleen toevoegingen.
2. De automation gaat uit (draft) aan en wordt pas na de test handmatig aangezet.
3. Rollback: de automation uitzetten. De velden kunnen blijven staan.
