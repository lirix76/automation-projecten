// n8n-workflow: Assets Drive health check
// n8n-node: Build Slack digest
const groups = { OK: [], RESTORED: [], RESTORED_PARENT_TRASHED: [], RESTORE_FAILED: [], NOT_FOUND: [] };
for (const item of $input.all()) {
  const o = item.json.outcome;
  if (groups[o]) groups[o].push(item);
}
const { OK: ok, RESTORED: restored, RESTORED_PARENT_TRASHED: restoredParent,
        RESTORE_FAILED: restoreFailed, NOT_FOUND: notFound } = groups;

const date = new Date().toLocaleDateString('nl-NL', {
  day: 'numeric', month: 'long', year: 'numeric'
});

function line(item) {
  const { versieId, versieLabel, type, driveName, interfaceUrl } = item.json;
  const driveLabel = driveName ? ` — _${driveName}_` : '';
  // Lead with the version ID, linked to the Interface URL when present.
  // No URL → plain ID. No ID at all → fall back to the bold title.
  let handle;
  if (versieId) {
    handle = interfaceUrl ? `<${interfaceUrl}|${versieId}>` : versieId;
  } else {
    handle = `*${versieLabel}*`;
  }
  const titlePart = versieId && versieLabel ? ` — ${versieLabel}` : '';
  return `• ${handle}${titlePart} (${type})${driveLabel}`;
}

if (!restored.length && !restoredParent.length && !notFound.length && !restoreFailed.length) {
  return [{ json: { message: `*Drive health check — ${date}*\n✅ All ${ok.length} files OK` } }];
}

const parts = [`*Assets health check — ${date}*`, `✅ OK: ${ok.length}`];

if (restored.length) {
  parts.push(`\n♻️ *Restored (${restored.length})*`);
  restored.forEach(i => parts.push(line(i)));
}
if (restoredParent.length) {
  parts.push(`\n⚠️ *Restored — parent folder also trashed (${restoredParent.length})*`);
  restoredParent.forEach(i => parts.push(line(i)));
}
if (notFound.length) {
  parts.push(`\n🔴 *Not found (${notFound.length})*`);
  notFound.forEach(i => parts.push(line(i)));
}
if (restoreFailed.length) {
  parts.push(`\n❌ *Restore failed (${restoreFailed.length})*`);
  restoreFailed.forEach(i => {
    const err = i.json.error?.message || String(i.json.error ?? 'unknown error');
    parts.push(line(i) + `\n  _${err}_`);
  });
}

return [{ json: { message: parts.join('\n') } }];
