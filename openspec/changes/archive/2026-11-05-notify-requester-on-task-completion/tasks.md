# Tasks

## 1. Spike: dynamische Slack-ontvanger

- [x] 1.1 Maak een tijdelijke test-automation (handmatige trigger of `recordMatchesConditions` op een testrecord) met `sendToSlack` via account `eaczxgyZO4OwxTrjk`, waarbij `slackConversationId` een `$ref` naar een Slack-ID uit een record is (Iris: `U03JDLH7U`). Klaar als Iris de DM ontvangt. Mislukt het, stop dan en pas design.md beslissing 4 aan (terugval op script).
- [x] 1.2 Leg de uitkomst (werkt ja/nee, van welke afzender de DM komt) vast in `docs/notes.md` en verwijder de test-automation. Klaar als de automation niet meer in `list-automations` staat.

## 2. Picoo users: Slack-ID's

- [x] 2.1 ~~Controle-view "In dienst zonder Slack-ID"~~ Geschrapt (Iris, 2026-11-05): na 2.2 heeft iedereen in dienst een geldig ID, en `Stuur afrondmelding` toont per taak of er een melding komt. Views aanmaken kan bovendien niet via de CLI.
- [x] 2.2 Schoon Slack-ID's op: newline weg bij Anika, Marthe's `D…`-ID vervangen door haar `U…`-user-ID, Liesbeth aanvullen als die in dienst is. Klaar als elk record met `Status dienstverband` = `in dienst` een `Slack`-waarde heeft die precies overeenkomt met `^U[A-Z0-9]+$`, gecontroleerd met `list-records-for-table`.

## 3. Aanvrager-veld op Taken

- [x] 3.1 `Taken.Aangevraagd door` staat op één record en filtert op `Status dienstverband` = `in dienst` (door Iris ingesteld in de UI, bevestigd met screenshot op 2026-11-05).

## 4. Meldlogica en automation

- [x] 4.1 Voeg lookup `Slack aanvrager` en formule `Stuur afrondmelding` toe aan `Taken` (design beslissing 2). Klaar als vier testrecords het juiste resultaat geven: wel melding (Done, andere aanvrager), geen aanvrager, eigen taak, aanvrager zonder Slack-ID.
- [x] 4.2 Maak de automation "Afrondmelding naar aanvrager" via de CLI: trigger `recordMatchesConditions` op `Stuur afrondmelding` = checked, actie `sendToSlack` met de berichttekst uit design beslissing 6 en `username` "Picoo taken", gevolgd door `updateRecord` op `systemMessages` (beslissing 7). Klaar als `get-automation` de configuratie zonder validatiefouten toont.
- [x] 4.3 Laat Iris de automation aanzetten en loop de scenario's uit `specs/task-completion-notification` door met testtaken (Done, Canceled, eigen taak, geen aanvrager, reopen → Done, Done → Canceled). Klaar als de ontvangen DM's en de `systemMessages`-regels exact overeenkomen met de verwachte uitkomst per scenario. Ruim de testtaken daarna op.

## 5. Afronding

- [x] 5.1 Sync het schema (`/sync-airtable-schemas-locally`) en de automations (`/sync-airtable-workflows-locally`). Klaar als de nieuwe velden en de automation in `scripts/airtable/` staan.
- [x] 5.2 Schrijf een `docs/notes.md`-entry met de nieuwe velden, de automation-ID, de bekende beperkingen (Done → Canceled, afzender Airtable-app, alleen bij ingevulde aanvrager) en een kort bericht voor het team dat `Aangevraagd door` ingevuld moet worden. Klaar als de entry er staat en Iris het teambericht heeft goedgekeurd.

## Workflow follow-up

- Overweeg een aparte change in iris-os zodat de meeting-assistent `Aangevraagd door` invult bij actiepunten.
- Archiveer de change met `/opsx:archive` als alles live is.
