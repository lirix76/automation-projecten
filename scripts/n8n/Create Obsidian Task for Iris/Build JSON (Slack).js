// n8n-workflow: Create Obsidian Task for Iris
// n8n-node: Build JSON (Slack)

const messageData = $('Get a thread of messages posted to a channel').first().json;
const eventData = $('Webhook1').first().json.body.event;

const messageText = (messageData.text || '').trim();
const channelId = eventData.item?.channel ?? '';
const authorId = messageData.user ?? 'unknown';
const ts = eventData.item?.ts ?? '';

// Construct permalink using app.slack.com universal format
const tsForUrl = ts.replace('.', '');
const permalink = `https://app.slack.com/archives/${channelId}/p${tsForUrl}`;

// Strip Slack mrkdwn URL markup: <url|text> → text, <url> → (empty), plain URLs → (empty)
const strippedText = messageText
  .replace(/<https?:\/\/[^|>]+\|([^>]+)>/g, '$1')
  .replace(/<https?:\/\/[^>]+>/g, '')
  .replace(/https?:\/\/\S+/g, '')
  .replace(/\n/g, ' ')
  .trim();

const rawTitle = strippedText.length > 0
  ? strippedText.slice(0, 53).trim()
  : `Slack message in ${channelId}`;
const sanitized = (rawTitle
  .replace(/[/\\:*?"<>|]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 60)) || 'untitled-task';
const filename = `${sanitized}.md`;

const now = new Date();

const frontmatter = [
  '---',
  'completed: false',
  'priority: low',
  `created: ${now.toISOString()}`,
  'tags:',
  '  - task',
  '  - slack',
  '  - inbox',
  '---',
];

const bodyLines = [
  `[Open in Slack](${permalink})`,
  `Channel: ${channelId} · From: <@${authorId}>`,
  '',
  messageText.slice(0, 2000),
];

const content = [...frontmatter, '', ...bodyLines, ''].join('\n');

return [{ json: { filename, content } }];
