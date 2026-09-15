// n8n-workflow: FAQ-sync
// n8n-node: Code in JavaScript
const records = $input.all();

records.sort((a, b) => {
  const catA = (a.json['Categorie Helpscout'] || []).map(c => c.name || c).join('');
  const catB = (b.json['Categorie Helpscout'] || []).map(c => c.name || c).join('');
  if (catA !== catB) return catA.localeCompare(catB);
  return (a.json.Vraag || '').localeCompare(b.json.Vraag || '');
});

const now = new Date().toISOString();
const count = records.length;

let text = `# Picoo Knowledge Base\n# Generated: ${now}\n# Articles: ${count}\n\n`;
text += '='.repeat(54) + '\n\n';

for (const record of records) {
  const vraag = record.json.Vraag || '';
  const keywords = (record.json.Keywords || []).map(k => k.name || k).join(', ');
  const answer = (record.json.answer || '').trim();

  text += `## ${vraag}\n`;
  text += `Keywords: ${keywords}\n\n`;
  text += `${answer}\n\n`;
  text += '--------------------------------------\n\n';
}

return [{ json: { faqContent: text } }];
