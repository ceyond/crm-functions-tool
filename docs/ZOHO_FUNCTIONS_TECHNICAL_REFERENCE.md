# Zoho CRM Function Technical Reference

This document is the technical reference for the current Zoho CRM function workflow in this project.

## Scope

The project works with `.ds` Deluge files in `crmFunctions/` and synchronizes them with Zoho CRM functions.

Current supported flows:

- create or update a CRM function from a local `.ds` file
- export a CRM function from Zoho into a local `.ds` file
- push a single function
- push an automation-linked function
- sync changed files in bulk
- validate Deluge source locally
- execute a deployed Zoho function remotely

## Authentication

All Zoho requests use OAuth access tokens.

Required environment variables:

```bash
ZOHO_REFRESH_TOKEN=...
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
```

The helper code refreshes access tokens automatically. `ZOHO_ACCESS_TOKEN` is optional.

## Script Layout

- `scripts/cli/validate-deluge-file.js`
- `scripts/cli/watch-deluge-files.js`
- `scripts/cli/run-zoho.js`
- `scripts/cli-env.js`
- `scripts/zoho/push-zoho-function.js`
- `scripts/zoho/push-automation-function.js`
- `scripts/zoho/pull-zoho-function.js`
- `scripts/zoho/sync-zoho-functions.js`
- `scripts/zoho/test/push-zoho-function-test.js`
- `scripts/zoho/test/push-zoho-function-restapi-test.js`
- `scripts/zoho/test/push-zoho-function-commitmsg-test.js`

## Folder Roles

- `scripts/cli/` contains local developer tools for validation, file watching, and remote execution.
- `scripts/zoho/` contains the CRM push, pull, and sync entrypoints.
- `scripts/zoho/test/` contains isolated probes for metadata experiments and should stay separate from the stable push path.

