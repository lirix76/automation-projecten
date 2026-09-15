// n8n-workflow: Airtable - Strapi sync - staging
// n8n-node: Code in JavaScript
// Get the input items from the previous node
const items = $input.all();

// Use flatMap to transform one incoming item into multiple outgoing items
return items.flatMap(item => {
  // Get the main JSON data from the current item
  const gameData = item.json;

  // Use destructuring to separate the translations string from the rest of the data.
  const { translations_json, ...baseGameData } = gameData;

  // --- CRITICAL CHANGE FOR UPSTREAM USAGE ---
  // If translations_json is missing, we must NOT delete the item yet.
  // It might be an item that needs to be DELETED by the Switch node later.
  // We pass it through 'as is' so the Switch node can decide.
  if (!translations_json) {
    return [{
      json: gameData,
      pairedItem: item.pairedItem
    }];
  }
  
  // Parse the string into a JavaScript array of translation objects.
  let translations = [];
  try {
    translations = JSON.parse(translations_json);
  } catch (error) {
    // If parsing fails, we still pass it through to avoid silent failures, 
    // or you can choose to log and skip.
    console.error(`Could not parse translations_json for item ID: ${baseGameData.id}.`);
    return [{
      json: gameData,
      pairedItem: item.pairedItem
    }];
  }

  // Create a new array of n8n items, one for each translation.
  return translations.map(translation => {
    // 1. Merge the base game data with the specific translation data
    const newJson = {
      ...baseGameData,
      ...translation
    };

    // 2. BUILD THE STRAPI PAYLOAD
    newJson.strapiPayload = {
      "data": {
        "worktitle": newJson.Werktitel,
        "title": newJson.title,
        "gameId": newJson['Game ID'],
        "airtableRecordId": newJson.RecordID,
        "locale": newJson.locale,
        "summaryShort": newJson.short_description,
        "summaryLong": newJson.long_description,
        "age": newJson['Leeftijd (geschikt vanaf)'],
        "targetGroup": newJson.Doelgroep,
        "attributes": newJson.Attributen,
        "urlManual": newJson['URL manual'],
        "urlIcon": newJson['URL icon'],
        "minPlayers": newJson['Min. aantal spelers'],
        "maxPlayers": newJson['Max. aantal spelers'],
        "tagId": newJson['Tag ID'],
        "freeToPlay": newJson.isFreeToPlayApi,
        "isBetaGame": newJson.isBetaGameApi,
        "gameParameters": newJson.gameParameters ? JSON.parse(newJson.gameParameters) : null
      }
    };

    return {
      json: newJson,
      pairedItem: item.pairedItem
    };
  });
});