// ============================================================
// SCRIPT: Create Slack channel, invite users, send + pin welcome message
// TRIGGER: Automation on table "Projecten" (tblNDZDbjxejZDmnQ)
//          Input variable "recordId" must be mapped to the
//          triggering record's Airtable record ID.
// TABLES:  Projecten (tblNDZDbjxejZDmnQ), Picoo users (tblBraAP1jnIZNyoU)
// DESCRIPTION: Creates a Slack channel for the project, then invites
//              everyone linked via "Medewerkers", "Verantwoordelijk"
//              and "Teamleden" (resolved through Picoo users), posts a
//              welcome message with project links, and pins it.
// ============================================================

// -------------------------------------------------------------------------
// Field / table IDs
// -------------------------------------------------------------------------
const PROJECTEN_TABLE_ID = "tblNDZDbjxejZDmnQ";
const FIELD_SLACK_FROM_MEDEWERKERS = "fldCajroxijsQ2w2y"; // Slack ID (from Medewerkers)
const FIELD_SLACK_FROM_VERANTWOORDELIJK = "fldn3cJ1E6smFznXM"; // Slack ID (from Verantwoordelijk)
const FIELD_TEAMLEDEN = "fldI7witEWD8TyOi0"; // Teamleden (lookup -> linked Picoo users records)
const FIELD_SCRIPT_LOG = "fld0IowHqbNeloFqs"; // Script Log (single line text)

const PICOO_USERS_TABLE_ID = "tblBraAP1jnIZNyoU";
const FIELD_PICOO_USER_SLACK = "fldpwE3DXE2FTdwCO"; // Slack

// -------------------------------------------------------------------------
// Configuration - Set these in the "Input variables" of the script action
// -------------------------------------------------------------------------

const inputConfig = input.config();

// Slack Bot Token, stored as a secret.
const SLACK_TOKEN = await input.secret('slackBotToken');

// The triggering Projecten record - used to look up Medewerkers,
// Verantwoordelijk and Teamleden so their Slack IDs no longer need to be
// passed in manually.
const recordId = inputConfig.recordId;

// The name of the new Slack channel.
let channelName = inputConfig.channelName;

// (Optional) Links for the welcome message.
const projectInterfaceLink = inputConfig.projectInterfaceLink;
const projectDocumentLink = inputConfig.projectDocumentLink;

// Whether the channel should be private or public.
const IS_PRIVATE = false;

// -------------------------------------------------------------------------
// Script Logic - Do not edit below this line unless you are sure
// -------------------------------------------------------------------------

const CREATE_CHANNEL_ENDPOINT = 'https://slack.com/api/conversations.create';
const INVITE_USERS_ENDPOINT = 'https://slack.com/api/conversations.invite';
const POST_MESSAGE_ENDPOINT = 'https://slack.com/api/chat.postMessage';
const PIN_MESSAGE_ENDPOINT = 'https://slack.com/api/pins.add';

const projectenTable = base.getTable(PROJECTEN_TABLE_ID);

/**
 * Writes a status line to the "Script Log" field on the triggering record.
 * The field is single line text, so this overwrites rather than appends -
 * change to a prepend pattern if the field is converted to Long text.
 */
async function logScriptStatus(message) {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');
    await projectenTable.updateRecordAsync(recordId, {
        [FIELD_SCRIPT_LOG]: `${timestamp} - ${message}`
    });
}

/**
 * Collects the Slack IDs of Medewerkers, Verantwoordelijk and Teamleden
 * for the triggering record, resolving Teamleden through Picoo users
 * (Teamleden is a lookup of a linked-record field, so it returns record
 * references rather than Slack ID text).
 */
async function getSlackUserIds() {
    const record = await projectenTable.selectRecordAsync(recordId, {
        fields: [FIELD_SLACK_FROM_MEDEWERKERS, FIELD_SLACK_FROM_VERANTWOORDELIJK, FIELD_TEAMLEDEN]
    });

    const medewerkersSlack = record.getCellValue(FIELD_SLACK_FROM_MEDEWERKERS) || [];
    const verantwoordelijkSlack = record.getCellValue(FIELD_SLACK_FROM_VERANTWOORDELIJK) || [];
    // Teamleden looks up a linked-record field (Allocaties -> Medewerker), so
    // Airtable returns an array of arrays (one sub-array per Allocatie record,
    // possibly empty if that Allocatie has no Medewerker) - flatten and drop
    // any empty/null entries before use.
    const teamledenRaw = record.getCellValue(FIELD_TEAMLEDEN) || [];
    const teamledenLinks = teamledenRaw.flat().filter(Boolean);

    let teamledenSlack = [];
    if (teamledenLinks.length > 0) {
        const picooUsersTable = base.getTable(PICOO_USERS_TABLE_ID);
        const usersQuery = await picooUsersTable.selectRecordsAsync({ fields: [FIELD_PICOO_USER_SLACK] });
        const slackByUserId = new Map(
            usersQuery.records.map((r) => [r.id, r.getCellValue(FIELD_PICOO_USER_SLACK)])
        );
        // Unlike a regular link field, this lookup's cell value is an array
        // of plain record ID strings rather than {id, name} objects.
        teamledenSlack = teamledenLinks
            .map((link) => slackByUserId.get(typeof link === 'string' ? link : link.id))
            .filter(Boolean);
    }

    const allSlackIds = [...medewerkersSlack, ...verantwoordelijkSlack, ...teamledenSlack].filter(Boolean);
    return [...new Set(allSlackIds)];
}

/**
 * Main function to orchestrate channel creation, user invites, and sending messages.
 */
async function main() {
    const slackUserIds = await getSlackUserIds();

    // Sanitize the channel name for Slack's rules.
    const sanitizedChannelName = channelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

    // --- 1. Create the Channel ---
    console.log(`Attempting to create channel: #${sanitizedChannelName}`);
    const newChannel = await createChannel(sanitizedChannelName);
    console.log(`Successfully created channel #${newChannel.name} (ID: ${newChannel.id})`);
    output.set('channelId', newChannel.id);
    output.set('channelName', newChannel.name);
    await logScriptStatus(`Channel #${newChannel.name} created (ID: ${newChannel.id})`);

    // --- 2. Invite Users (if any were found) ---
    if (slackUserIds.length > 0) {
        await inviteUsers(newChannel.id, slackUserIds.join(','));
    } else {
        console.log("No Slack user IDs found on the record, skipping invitation step.");
    }

    // --- 3. Post Welcome Message (if links are provided) ---
    if (projectInterfaceLink || projectDocumentLink) {
        await postWelcomeMessage(newChannel.id);
    } else {
        console.log("No links provided, skipping welcome message.");
    }

    await logScriptStatus('Script completed successfully');
}

/**
 * Creates a new Slack channel.
 * @param {string} name - The sanitized name for the channel.
 * @returns {Promise<object>} The channel object from the Slack API.
 */
async function createChannel(name) {
    const response = await fetch(CREATE_CHANNEL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SLACK_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ name, is_private: IS_PRIVATE })
    });
    const data = await response.json();
    if (!data.ok) {
        throw new Error(`Slack API error (conversations.create): ${data.error}`);
    }
    return data.channel;
}

/**
 * Invites users to a given channel.
 * @param {string} channelId - The ID of the channel to invite users to.
 * @param {string} userIds - A comma-separated string of user IDs.
 */
async function inviteUsers(channelId, userIds) {
    console.log(`Inviting users to channel ${channelId}...`);
    const response = await fetch(INVITE_USERS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SLACK_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ channel: channelId, users: userIds })
    });
    const data = await response.json();
    if (data.ok) {
        console.log('Successfully sent invitations.');
        output.set('invitationStatus', 'Success');
    } else {
        console.error(`Error inviting users: ${data.error}`, data.errors || '');
        output.set('invitationStatus', `Failure: ${data.error}`);
        if (data.errors) {
            output.set('invitationErrors', data.errors);
            // Slack returns ok:false with a per-user "errors" array when only
            // some invites fail (e.g. already_in_channel, invalid ID) - the
            // rest still succeed silently, so log the specifics here.
            const details = data.errors.map((e) => `${e.user || '?'}: ${e.error}`).join(', ');
            await logScriptStatus(`Invite partly failed (${data.error}) - ${details}`);
        } else {
            await logScriptStatus(`Invite failed: ${data.error}`);
        }
    }
}

/**
 * Posts a formatted welcome message with links to the channel and pins it.
 * @param {string} channelId - The ID of the channel to post the message in.
 */
async function postWelcomeMessage(channelId) {
    console.log(`Posting welcome message to channel ${channelId}...`);

    let welcomeText = "Welkom in dit kanaal! Hier zijn een paar handige links:";

    if (projectInterfaceLink) {
        welcomeText += `\n• <${projectInterfaceLink}|Project taken>`;
    }

    if (projectDocumentLink) {
        welcomeText += `\n• <${projectDocumentLink}|Project Document>`;
    }

    const messageResponse = await fetch(POST_MESSAGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SLACK_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
            channel: channelId,
            text: welcomeText
        })
    });

    const messageData = await messageResponse.json();

    if (messageData.ok) {
        console.log('Successfully posted welcome message.');
        output.set('messageStatus', 'Success');
        const messageTimestamp = messageData.ts;
        await pinMessageToChannel(channelId, messageTimestamp);
    } else {
        console.error(`Error posting message: ${messageData.error}`);
        output.set('messageStatus', `Failure: ${messageData.error}`);
    }
}

/**
 * Pins a message to a channel.
 * @param {string} channelId - The ID of the channel.
 * @param {string} timestamp - The timestamp of the message to pin.
 */
async function pinMessageToChannel(channelId, timestamp) {
    console.log(`Pinning message ${timestamp} to channel ${channelId}...`);
    const pinResponse = await fetch(PIN_MESSAGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SLACK_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ channel: channelId, timestamp: timestamp })
    });

    const pinData = await pinResponse.json();
    if (pinData.ok) {
        console.log('Successfully pinned message.');
        output.set('pinStatus', 'Success');
    } else {
        console.error(`Error pinning message: ${pinData.error}`);
        output.set('pinStatus', `Failure: ${pinData.error}`);
    }
}

// --- Script Execution ---
try {
    if (!SLACK_TOKEN) {
        throw new Error("Slack API token is missing. Please configure 'slackBotToken' as a secret in the automation.");
    }
    if (!recordId) {
        throw new Error("recordId is missing. Map the triggering record's Airtable record ID to the 'recordId' input variable.");
    }
    if (!channelName) {
        throw new Error("Channel name is missing. Please configure the 'channelName' input variable.");
    }
    await main();
} catch (error) {
    console.error('An unexpected error occurred:', error.message);
    try {
        if (recordId) {
            await logScriptStatus(`ERROR: ${error.message}`);
        }
    } catch (_) {}
    throw error;
}
