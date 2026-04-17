//
// Airtable Automation Script
// Looks up a value of "Create project plan" in the linked record to Projecten and returns true or false.
//

// --- Configuration ---
// These are the settings you may need to change.

// 1. The name of the table that triggers the automation.
const TRIGGER_TABLE_NAME = 'Assets';

// 2. The name of the table you are linking to.
const PROJECTS_TABLE_NAME = 'Projecten';

// 3. The Field ID for the "Projecten" linked record field in your 'Assets' table.
//    (This has been updated from the schema you provided).
const PROJECTEN_LINK_FIELD_ID = 'fldoovxHB56BueBSV';

// 4. The Field ID for the "Create project plan" field in your 'Projecten' table.
//    (This was updated previously from the schema you provided).
const CREATE_PROJECT_PLAN_FIELD_ID = 'fld8xaZk25N980ewW';


// --- Script Logic (No changes needed below this line) ---

// Get the Record ID from the input variable
const inputConfig = input.config();
const triggerRecordId = inputConfig.recordId;

let returnValue = false;

if (!triggerRecordId) {
    throw new Error("The 'recordId' input variable is missing. Please check your automation setup.");
}

// Define the tables we'll be working with
const triggerTable = base.getTable(TRIGGER_TABLE_NAME);
const projectsTable = base.getTable(PROJECTS_TABLE_NAME);

// Fetch the record that triggered the automation using the Field ID
console.log(`Fetching trigger record: ${triggerRecordId}`);
const triggerRecord = await triggerTable.selectRecordAsync(triggerRecordId, {
    fields: [PROJECTEN_LINK_FIELD_ID],
});

if (!triggerRecord) {
    throw new Error(`Could not find the trigger record with ID: ${triggerRecordId} in the "${TRIGGER_TABLE_NAME}" table.`);
}

// Get the array of linked records from the "Projecten" field using its ID
const linkedProjects = triggerRecord.getCellValue(PROJECTEN_LINK_FIELD_ID);

// If no linked records are found, set the output to false and stop.
if (!linkedProjects || linkedProjects.length === 0) {
    console.log('No records found in the "Projecten" field. Returning false.');
    output.set('projectPlanValue', false);
    return;
}

// Get the ID of the *first* linked project.
const linkedProjectId = linkedProjects[0].id;
console.log(`Found linked project record ID: ${linkedProjectId}`);

// Fetch the project record from the "Projecten" table using its Field ID
const projectRecord = await projectsTable.selectRecordAsync(linkedProjectId, {
    fields: [CREATE_PROJECT_PLAN_FIELD_ID],
});

if (!projectRecord) {
    throw new Error(`Could not find the linked project record with ID: ${linkedProjectId} in the "${PROJECTS_TABLE_NAME}" table.`);
}

// Get the value from the "Create project plan" field using its ID
const projectPlanValue = projectRecord.getCellValue(CREATE_PROJECT_PLAN_FIELD_ID);
if(projectPlanValue == true) returnValue=true;
console.log(`Found value in "Create project plan" field: "${projectPlanValue}"`);

console.log(`Setting return value to: "${returnValue}"`);

// Set the output variable for the next automation steps
output.set('returnValue', returnValue);

console.log('Script finished successfully.');
