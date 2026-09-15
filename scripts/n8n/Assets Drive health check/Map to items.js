// n8n-workflow: Assets Drive health check
// n8n-node: Map to items
const output = [];
const seen = new Set();

for (const item of $input.all()) {
  const { id, file_id_content, file_id_final } = item.json;
  const titleRaw = item.json['Titel (from Assets)'];
  const interfaceUrlRaw = item.json['Interface URL'];
  const versieIdRaw = item.json['ID'];

  const title = Array.isArray(titleRaw) ? titleRaw[0] : (titleRaw ?? '');
  const interfaceUrl = Array.isArray(interfaceUrlRaw) ? interfaceUrlRaw[0] : (interfaceUrlRaw ?? '');
  const versieId = `${Array.isArray(versieIdRaw) ? versieIdRaw[0] : (versieIdRaw ?? '')}`.trim();
  const versieLabel = `${title}`.trim();

  for (const [rawId, type] of [[file_id_content, 'content'], [file_id_final, 'final']]) {
    const fileId = rawId != null ? String(rawId).trim() : '';
    if (!fileId) continue;
    if (seen.has(fileId)) continue;
    seen.add(fileId);
    output.push({ json: { fileId, versieId, versieLabel, type, interfaceUrl } });
  }
}

return output;