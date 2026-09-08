# Test Automation

This repository uses a single end-to-end runner to execute the CRM-oriented integration checks in a predictable order.

## Runner

- Script: [`scripts/test/run-e2e-suite.js`](../scripts/test/run-e2e-suite.js)
- npm entry: `npm run test:e2e`
- CLI alias: `npm run test:e2e:crm`

## Execution order

Default run:

1. Pull an existing Zoho function
2. Copy the pulled code into a temp file
3. Add a small local change
4. Validate the modified copy locally
5. Push the update back to Zoho
6. Create a new local Deluge function in a temp file
7. Validate the new file locally
8. Push the new function to Zoho
9. Push the automation association for the same function

The runner stops on the first failing step.

## Useful flags

- `--local-only` skips the remote Zoho execution and all later Zoho-dependent steps
- `--roundtrip-only` runs only the pull → edit → validate → push scenario
- `--create-only` runs only the local create → validate → push → automation scenario

