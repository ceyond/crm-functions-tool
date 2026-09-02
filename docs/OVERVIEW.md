# Zoho Demo Overview

This repository combines local Deluge authoring, validation, Zoho CRM function sync, and remote execution testing.

## What this project does

- writes and validates Deluge `.ds` files in `crmFunctions/`
- pushes Deluge functions to Zoho CRM
- pulls existing Zoho functions back into the repo
- validates source locally before any Zoho call
- runs selected functions remotely through the Zoho execute endpoint
- keeps experimental request-shape tests isolated from the stable push flow

## Main folders

- `crmFunctions/` local Deluge source files
- `scripts/cli/` local tooling for validate, watch, and remote run
- `scripts/zoho/` CRM push, pull, sync, and test probes
- `src/` parser, tokenizer, runtime, validator, intelligence
- `docs/` technical reference, progress log, and this overview
- `config/` shared configuration such as commit-message defaults

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

## Current technical state

- Validation and execution are separated.
- The local validator emits compact diagnostics with line-based references.
- Remote Zoho execution is wired to the documented execute endpoint.
- REST API exposure toggling is still unresolved and not reproducibly enabled by the test probes.
- Commit message handling is isolated in test-only probe scripts, but it did not produce a reliable update behavior in the tests.

## Best prompts for future work

Use these as stable task prompts when continuing:

1. `Validate this Deluge file locally and keep the output compact.`
2. `Push this function to Zoho without changing the stable flow.`
3. `Run the Zoho execute endpoint for this function with a test record.`
4. `Compare the local validation result with the Zoho runtime behavior.`
5. `Use the isolated test script to probe REST API exposure or commit-message payloads.`
6. `Update the documentation with what was confirmed, what failed, and what remains open.`
7. `Run the end-to-end suite and stop on the first failing step.`

## Authoritative docs

- Test automation: [`TEST_AUTOMATION.md`](./TEST_AUTOMATION.md)
- Visual architecture: [`ARCHITECTURE_MAP.md`](./ARCHITECTURE_MAP.md)
- Technical reference: [`ZOHO_FUNCTIONS_TECHNICAL_REFERENCE.md`](./ZOHO_FUNCTIONS_TECHNICAL_REFERENCE.md)
- Progress log: [`ZOHO_FUNCTIONS_PROGRESS_LOG.md`](./ZOHO_FUNCTIONS_PROGRESS_LOG.md)
