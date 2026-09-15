// n8n-workflow: Create Obsidian Task for Iris
// n8n-node: Build JSON
// test
const { title, priority, due_date, description, url, projects } = $input.first().json.body;

const priorityMap = { P1: 'highest', P2: 'high', P3: 'medium', P4: 'low' };
const priorityValue = priorityMap[priority] ?? null;

const now = new Date();
const ts = now.toISOString().slice(0, 19).replace(/:/g, '-');
const sanitized = (title
  .replace(/[/\\:*?"<>|]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 60)) || 'untitled-task';
const filename = `${sanitized}.md`;

const frontmatter = [
  '---',
  'completed: false',
  ...(priorityValue ? [`priority: ${priorityValue}`] : []),
  ...(due_date ? [`due_date: ${due_date}`] : []),
  ...(projects ? [`projects: "[[${projects}]]"`] : []),
  `dateCreated: ${now.toISOString()}`,
  'tags:',
  '  - task',
  '  - airtable',
  '---',
];

const bodyLines = [
  `[Open in Airtable](${url})`,
  ...(projects ? [`Project: ${projects}`] : []),
  '',
  ...(description ? ['## Omschrijving', '', description] : []),
];

const content = [...frontmatter, '', ...bodyLines, ''].join('\n');

return [{ json: { filename, content } }];

