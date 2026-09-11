# This file is safe to commit: every value below is an op://... reference,
# never the secret itself — only `op` resolving it produces the real value.
# No separate .env copy needed; run scripts directly against this file:
#   op run --env-file=.env.tpl -- ../tools/.venv/bin/python ../tools/sync-airtable-schema.py
# Requires the 1Password app unlocked and access to the referenced vault.

# n8n workflows
# N8N_SYNC_WORKFLOWS="Daily ERPNext Purchase Orders Sync to Airtable"

# Airtable
AIRTABLE_API_KEY="op://Employee/Airtable PAT - read schema/password"
#AIRTABLE_BASE_ID=appopJMiQr8csSHhh,app0zzPtwBSKpGFRZ #Projecten base and assets base
AIRTABLE_BASE_ID=appopJMiQr8csSHhh #Projecten base
