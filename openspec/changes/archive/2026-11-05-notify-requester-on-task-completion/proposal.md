# Proposal

## Why

Wie een taak voor een collega aanmaakt, hoort nu niet wanneer die taak klaar is. Diegene moet zelf in Airtable gaan kijken. Een Slack-DM bij afronding of annulering sluit de lus zonder dat iemand hoeft te controleren.

Airtable kan niet zien wie een taak heeft aangemaakt: de meeste collega's loggen in met het gedeelde account `airtable@picoo.nl`. Daarom is het bestaande veld `Taken.Aangevraagd door` de enige bron voor "de aanvrager". Dat veld wordt nu bij ongeveer een kwart van de nieuwe taken ingevuld (65 van de 255 sinds augustus 2026), en kan nog naar oud-medewerkers wijzen. Deze change maakt het veld betrouwbaar genoeg om op te bouwen.

## What Changes

- Zet een taak met een aanvrager op `Done` of `Canceled`, dan krijgt de aanvrager een Slack-DM met de taaktitel, de nieuwe status, de uitvoerder en een link naar de taak.
- Geen melding als de aanvrager ook de uitvoerder is, als er geen aanvrager is, of als de aanvrager geen Slack-ID heeft.
- Wie de status wijzigt maakt niet uit. Ook de aanvrager zelf of een script (zoals de meeting-assistent) start de melding.
- `Aangevraagd door` bevat maximaal één persoon, en kan alleen kiezen uit mensen met `Picoo users.Status dienstverband` = `in dienst`. Beide veldinstellingen staan al in Airtable. Deze change legt ze vast als gedrag waarop de melding steunt.
- Dit gebeurt met native Airtable-automationacties (`sendToSlack`), zonder script.

## Capabilities

### New Capabilities
- `task-completion-notification`: de aanvrager van een taak krijgt een Slack-melding als de taak wordt afgerond of geannuleerd.
- `task-requester`: wie als aanvrager (`Aangevraagd door`) van een taak kan gelden: precies één persoon die op dit moment in dienst is.

### Modified Capabilities
<!-- Geen. task-assignee-split kopieert `Aangevraagd door` al naar split-kopieën; dat gedrag verandert niet. -->

## Impact

- **Airtable, tabel `Picoo users`**: geen schemawijziging. Slack-ID's opschonen: de newline bij Anika weghalen, Marthe heeft een DM-kanaal-ID (`D…`) in plaats van een user-ID, Liesbeth heeft geen ID.
- **Airtable, tabel `Taken`**: nieuw lookupveld met het Slack-ID van de aanvrager, en een nieuw formuleveld dat bepaalt of er een melding moet komen. `Aangevraagd door` is al goed ingesteld.
- **Airtable-automations**: één nieuwe automation (trigger plus `sendToSlack`, eventueel `updateRecord` voor `systemMessages`). Die gebruikt het bestaande Slack-account `eaczxgyZO4OwxTrjk`.
- **Slack**: de DM komt van de Airtable-app, niet van de Picoo-bot uit de Slack-channel-automation.
- **Gerelateerd**: `task-assignee-split` kopieert `Aangevraagd door` naar elke kopie. Een taak voor drie mensen geeft de aanvrager dus drie meldingen. Dat is zo bedoeld.
- `scripts/airtable/airtable-schema-projectmanagement.yaml` opnieuw syncen na de schemawijzigingen.
