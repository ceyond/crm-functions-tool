# Zoho CRM Overview

This repository combines local Deluge authoring, validation, Zoho CRM function sync, and remote execution testing.

## What this project does

- writes and validates Deluge `.ds` files in `crmFunctions/`
- pushes Deluge functions to Zoho CRM
- pulls existing Zoho functions back into the repo
- validates source locally before any Zoho call
- runs selected functions remotely through the Zoho execute endpoint
- keeps isolated test probes separate from the stable push flow

## Main folders

- `crmFunctions/` local Deluge source files
- `scripts/cli/` local tooling for validate, watch, and remote run
- `scripts/zoho/` CRM push, pull, sync, and test probes
- `scripts/test/` end-to-end validation runner
- `docs/` technical reference and overview
- `config/` shared configuration and overrides

## Core scripts

### Local validation

- `npm run validate:deluge -- crmFunctions/<file>.ds`
- `npm run watch:deluge -- crmFunctions/<file>.ds`

### Remote execution

- `npm run run:zoho -- <function_name> '{"recordId":123}'`

### Zoho sync and push

- `npm run push:zoho -- <function_name>`
- `npm run push:automation -- <function_name>`
- `npm run pull:zoho -- <function_name>`
- `npm run sync:zoho -- [function_name]`

### Test probes

- `npm run push:zoho:test -- <function_name>`
- `npm run push:zoho:restapi-test -- <function_name>`
- `npm run push:zoho:commitmsg-test -- <function_name>`

### End-to-end suite

- `npm run test:e2e`

