/*
================================================================================
Airtable Automation Script: Create or Delete Record Links
================================================================================
Purpose:
Based on an "action" input, this script will either create new links for an
asset or delete ALL existing links from the asset.

How to Use:
1.  Add a "Run a script" action.
2.  Set up input variables: `assetID`, `projectIDs`, and `action`.
3.  Update all names in the CONFIGURATION section to match your base.
================================================================================
*/

// --- CONFIGURATION ---
// TODO: Change these names to match your base configuration.
const ASSET_TABLE_NAME = "Assets";
const ASSET_ID_FIELD_NAME = "ID";
// This is the field in 'Assets' that links to the 'Projects' table.
const ASSET_LINK_FIELD_NAME = "Projecten";

const PROJECT_TABLE_NAME = "Projecten";
const PROJECT_ID_FIELD_NAME = "Project ID";
// -------------------


// --- SCRIPT LOGIC ---

// 1. Get Input Variables
const inputConfig = input.config();
const assetIDToFind = inputConfig.assetID;
let projectIDsInput = inputConfig.projectIDs;
const action = inputConfig.action; // Can be "create" or "delete"


// 2. Find the Asset Record
console.log(`Searching for an asset in "${ASSET_TABLE_NAME}"...`);
const assetTable = base.getTable(ASSET_TABLE_NAME);
const assetQuery = await assetTable.selectRecordsAsync({
    fields: [ASSET_ID_FIELD_NAME, ASSET_LINK_FIELD_NAME]
});
const foundAssetRecord = assetQuery.records.find(record =>
    record.getCellValueAsString(ASSET_ID_FIELD_NAME) === assetIDToFind
);


// 3. Perform Action: Create or Delete Links
if (foundAssetRecord) {
    console.log(`Found asset with ID: ${foundAssetRecord.id}`);
    const existingLinkedProjects = foundAssetRecord.getCellValue(ASSET_LINK_FIELD_NAME) || [];

    // --- ACTION LOGIC STARTS HERE ---

    if (action === 'create') {
        console.log("Action: CREATE links.");
        // Find the project records only if we are creating links.
        console.log(`Searching for projects in "${PROJECT_TABLE_NAME}"...`);
        const projectIDsToFind = Array.isArray(projectIDsInput) ? projectIDsInput : [projectIDsInput];
        const stringProjectIDs = projectIDsToFind.map(id => String(id).trim());
        const projectTable = base.getTable(PROJECT_TABLE_NAME);
        const projectQuery = await projectTable.selectRecordsAsync({
            fields: [PROJECT_ID_FIELD_NAME]
        });
        const foundProjectRecords = projectQuery.records.filter(record => {
            const cellValue = record.getCellValueAsString(PROJECT_ID_FIELD_NAME);
            return stringProjectIDs.includes(cellValue);
        });
        const foundProjectRecordIds = foundProjectRecords.map(record => record.id);

        if (foundProjectRecordIds.length > 0) {
            const existingLinkIds = existingLinkedProjects.map(link => link.id);
            const projectsToLink = foundProjectRecordIds.filter(id => !existingLinkIds.includes(id));

            if (projectsToLink.length > 0) {
                console.log(`Found ${projectsToLink.length} new project(s) to link. Updating record...`);
                const allLinks = [...existingLinkedProjects, ...projectsToLink.map(id => ({id}))];
                await assetTable.updateRecordAsync(foundAssetRecord.id, {
                    [ASSET_LINK_FIELD_NAME]: allLinks
                });
                console.log("Record updated successfully!");
            } else {
                console.log("All found projects are already linked. No update needed.");
            }
        } else {
            console.log("Warning: No matching project records were found to link.");
        }

    } else if (action === 'delete') {
        console.log("Action: DELETE all links.");
        // Check if there are any links to remove.
        if (existingLinkedProjects.length > 0) {
            console.log(`Removing all ${existingLinkedProjects.length} project link(s). Updating record...`);
            // Update the linked field with an empty array to clear it.
            await assetTable.updateRecordAsync(foundAssetRecord.id, {
                [ASSET_LINK_FIELD_NAME]: []
            });
            console.log("Record updated successfully!");
        } else {
            console.log("Asset has no linked projects. No update needed.");
        }

    } else {
        console.error(`Error: Invalid action "${action}". Must be "create" or "delete".`);
    }
    // --- ACTION LOGIC ENDS HERE ---

} else {
    // Handle case where the asset was not found.
    console.log(`Warning: No matching asset was found with ID "${assetIDToFind}".`);
}