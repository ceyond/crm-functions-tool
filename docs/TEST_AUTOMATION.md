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

Note:

- the roundtrip scenario is meant to prove pull → edit → validate → push for an existing CRM function
- the create scenario is meant to prove local create → validate → push → automation exposure for a new CRM function
- the local-only scenario is meant to prove local create → validate without any remote CRM call
- in restricted environments, the runner can stop at the first Zoho call even when the endpoint itself is healthy
- for a local-only pass, use `npm run test:e2e -- --local-only`
- for only the pull/edit/push workflow, use `npm run test:e2e -- --roundtrip-only`
- for only the local-create/push/automation workflow, use `npm run test:e2e -- --create-only`

Naming note:

- functions created by the suite are auto-numbered and sanitized, using a safe pattern like `TestSuite_NHA_<xx>`
- the counter starts at `01` and increments on each suite-created function
- custom create seeds are normalized before the numeric suffix is added

## Logging

Every run appends a timestamped entry to:

- [`TEST_AUTOMATION_RUNS.md`](./TEST_AUTOMATION_RUNS.md)

Each entry records:

- the exact command that was run
- the exit status
- the ordered step results
- per-step request data
- per-step parsed endpoint response data
- whether the run covered roundtrip, create, or local-only mode
- timestamps are written in Vienna local time

Legacy note:

- older entries in `TEST_AUTOMATION_RUNS.md` may still use the previous compact format

## Useful flags

- `--local-only` skips the remote Zoho execution and all later Zoho-dependent steps
- `--roundtrip-only` runs only the pull → edit → validate → push scenario
- `--create-only` runs only the local create → validate → push → automation scenario
