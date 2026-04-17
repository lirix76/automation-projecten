/*
================================================================================
Airtable Automation Script: Call Webhook with Dynamic Action
================================================================================
Purpose:
This script dynamically determines the action ("create" or "delete") based
on whether project IDs are provided. If IDs exist, the action is "create".
If the project IDs field is empty, the action becomes "delete".

How to Use:
1.  Add a "Run a script" action to your Airtable Automation.
2.  Set up the input variables in the left panel: `projectIDs` and `assetID`.
3.  Ensure the WEBHOOK_URL below is correct.
================================================================================
*/

// --- CONFIGURATION ---
// IMPORTANT: Replace the placeholder URL with your actual webhook URL.
const WEBHOOK_URL = "https://hooks.airtable.com/workflows/v1/genericWebhook/appopJMiQr8csSHhh/wfltxt8QNlwFGg0qZ/wtrfwGvexbdCGJS7q";
// -------------------


// --- SCRIPT LOGIC ---

// 1. Get Input Variables
console.log("Retrieving input variables...");
const inputConfig = input.config();

const projectIDs = inputConfig.projectIDs;
const assetID = inputConfig.assetID;

console.log(`Received Asset ID: ${assetID}`);
console.log("Received Project IDs:", projectIDs);


// 2. Determine the Action
let action;
// Check if projectIDs is null, undefined, an empty string, or an empty array.
if (!projectIDs || projectIDs.length === 0) {
    action = "delete";
    console.log("No project IDs found. Setting action to 'delete'.");
} else {
    action = "create";
    console.log("Project IDs found. Setting action to 'create'.");
}


// 3. Prepare the Webhook Payload
const payload = {
    assetId: assetID,
    // Ensure projectIds is always an array in the payload, even if it was null.
    projectIds: projectIDs || [],
    action: action // Add the dynamically determined action
};


// 4. Call the Webhook using fetch()
console.log(`Sending action '${action}' to webhook...`);

await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
});

console.log("Webhook call successful. Data sent.");