# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Airtable-based project management system ("Projecten" = Dutch for "Projects"). The primary data store is an Airtable base with 11 interconnected tables. Automation runs via n8n workflows. There is no traditional build/compile step.

## Workspace Layout

This project lives alongside sibling directories:

```
Projects/
  tools/        ← shared Python scripts and Claude slash commands
  Projecten/    ← this project
  ~/.claude/skills/
```

The VS Code workspace (`Projecten.code-workspace`) roots all three.

## Scripts

All scripts run from this project folder using the shared `tools/` venv:

```bash
# Sync Airtable schema to airtable-schema-project-planning.yaml
op run --env-file=.env.tpl -- ../tools/.venv/bin/python ../tools/sync-airtable-schema.py

# Sync n8n workflows to ./workflows/
../tools/.venv/bin/python ../tools/sync-n8n.py
```

Or use the Claude slash commands: `/sync-airtable-schemas-locally` and `/sync-n8n`.

**First-time setup** (in `tools/`):
```bash
cd ../tools && ./setup.sh
```

## Credentials

- `.env.tpl` — Airtable credentials, resolved via 1Password CLI (`op run --env-file=.env.tpl`). Contains only `op://` references (`AIRTABLE_API_KEY`) and the non-secret `AIRTABLE_BASE_ID` (`appopJMiQr8csSHhh`), so it's safe to commit — no separate `.env` copy needed. Requires the 1Password app unlocked and access to the referenced vault.
- `../tools/.env` — Shared n8n credentials (`N8N_API_KEY`, `N8N_DOMAIN`).

## Airtable Access

Use the `airtable-mcp` CLI (https://github.com/Airtable/airtable-mcp-cli), not the interactive `mcp__claude_ai_Airtable__*` MCP tools, for all Airtable reads/writes in this project. Invoke it via Bash with the token resolved from `.env.tpl`:

```bash
op run --env-file=.env.tpl -- bash -c 'AIRTABLE_TOKEN="$AIRTABLE_API_KEY" airtable-mcp <tool> [--flags]'
```

- `airtable-mcp tools` lists every available tool (same surface as the MCP server: `list-tables-for-base`, `get-table-schema`, `list-records-for-table`, `create-records-for-table`, `update-records-for-table`, etc.) — each has `--help`.
- This project's base ID is `$AIRTABLE_BASE_ID` from `.env.tpl` (`appopJMiQr8csSHhh`); pass it as `--baseId`.
- Requires the 1Password app unlocked and the `airtable-mcp` binary on `PATH` (installed by `tools/setup.sh`, see `../tools/CLAUDE.md`).

## Airtable Schema

`airtable-schema-project-planning.yaml` is auto-generated — do not edit by hand. Key tables (Dutch names):

- **Projecten** — top-level projects
- **Taken** — tasks linked to projects
- **Updates** — progress updates
- **Versies** — versions/milestones
- **Allocaties 2026** — resource allocation
- **Marketing campagne** — campaign records

## OpenSpec Workflow

Changes are managed through OpenSpec commands:

| Command | Purpose |
|---|---|
| `/opsx:explore` | Think through ideas and clarify requirements |
| `/opsx:propose` | Create a new change with proposal, design, and tasks |
| `/opsx:apply` | Implement tasks from an open change |
| `/opsx:archive` | Archive a completed change |

Active changes live in `openspec/changes/`. Archived changes move to `openspec/changes/archive/`.
