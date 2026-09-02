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

Auth header:

```http
Authorization: Zoho-oauthtoken <access_token>
```

Token refresh endpoint:

```http
POST https://accounts.zoho.eu/oauth/v2/token
```

## CRM Endpoints Used

Base function endpoints:

- `GET https://www.zohoapis.eu/crm/v8/settings/functions?page={page}&per_page=200`
- `GET https://www.zohoapis.eu/crm/v8/settings/functions/{id}`
- `GET https://www.zohoapis.eu/crm/v8/settings/functions/{id}/code`
- `POST https://www.zohoapis.eu/crm/v8/settings/functions`
- `PUT https://www.zohoapis.eu/crm/v8/settings/functions/{id}`

Automation endpoints:

- `GET https://www.zohoapis.eu/crm/v8/settings/modules`
- `GET https://www.zohoapis.eu/crm/v8/settings/automation/functions?module={module}&feature_type={feature_type}&per_page=200`
- `POST https://www.zohoapis.eu/crm/v8/settings/automation/functions`
- `PUT https://www.zohoapis.eu/crm/v8/settings/automation/functions/{id}`

Function execution endpoint used by the remote runner:

- `POST https://www.zohoapis.eu/crm/v2/functions/{function_api_name}/actions/execute?auth_type=oauth`

## Script Layout

- `scripts/cli/validate-deluge-file.js`
- `scripts/cli/watch-deluge-files.js`
- `scripts/cli/run-zoho.js`
- `scripts/cli-env.js`
- `scripts/zoho/push-zoho-function.js`
- `scripts/zoho/push-automation-function.js`
- `scripts/zoho/pull-zoho-function.js`
- `scripts/zoho/sync-zoho-functions.js`
- `scripts/zoho/test/push-zoho-function-test.js` `TEST`
- `scripts/zoho/test/push-zoho-function-restapi-test.js` `TEST`
- `scripts/zoho/test/push-zoho-function-commitmsg-test.js` `TEST`
- `zoho-crm-functions.js`
- `zoho-function-utils.js`
- `zoho-function-pull-utils.js`
- `config/function-commit-message.js`

### Folder roles

- `scripts/cli/` contains local developer tools for validation, file watching, and remote execution.
- `scripts/zoho/` contains the CRM push, pull, and sync entrypoints.
- `scripts/zoho/test/` contains isolated probes for metadata experiments and should stay separate from the stable push path.

## Main Behavior

### `push-zoho-function.js`

Pushes one local `.ds` file into Zoho CRM.

Behavior:

- reads `crmFunctions/<function-name>.ds`
- parses the Deluge signature from the file
- derives the CRM `api_name` from the signature name
- creates the CRM function if it does not exist
- updates the CRM function if it already exists
- sends the function source inline in the request payload
- uses the shared Zoho helper for auth, request formatting, and errors
- shares signature parsing and path resolution with the other push scripts through `zoho-function-utils.js`

Example:

```bash
node scripts/zoho/push-zoho-function.js "wf_leads_test_nha_2"
```

### `push-automation-function.js`

Creates or updates the base CRM function and then creates or updates the automation association.

Use this when the function must appear inside the module automation area.

Example:

```bash
node scripts/zoho/push-automation-function.js "wf_leads_test_nha_2" --module Leads --feature-type workflow
```

### `push-zoho-function-test.js`

Experimental push path for testing request metadata without changing the normal push flow.

Use this when you want to probe:

- `auth_type`
- `commit_message`

Current finding:

- the test probe did not produce a reliable, repeatable commit-message update behavior

Example:

```bash
node scripts/zoho/test/push-zoho-function-test.js "api_test_nha_2" --auth-type oauth --commit-message "TEST: api_test_nha_2"
```

### `push-zoho-function-restapi-test.js`

TEST probe for `rest_api_mode` behavior with OAuth-only payloads.

Use this when you want to inspect how Zoho reacts to:

- `rest_api_mode` inside the function metadata
- an additional `rest_api_mode` form field
- update/create replay with the same OAuth-only payload

Current finding:

- the probe did not reliably enable the visible REST API switches in CRM

Example:

```bash
node scripts/zoho/test/push-zoho-function-restapi-test.js "api_test_nha_2"
```

### `push-zoho-function-commitmsg-test.js`

TEST probe for update-only request shapes with commit message fields.

Use this when you want to inspect how Zoho reacts to:

- `PUT` updates only
- a static `commit_msg` or `commit_message` value inside `metadata.functions[0]`
- the normal function metadata payload without create behavior

Example:

```bash
node scripts/zoho/test/push-zoho-function-commitmsg-test.js "api_test_nha_2"
```

### `pull-zoho-function.js`

Exports functions from Zoho into `crmFunctions/`.

Examples:

```bash
node scripts/zoho/pull-zoho-function.js
node scripts/zoho/pull-zoho-function.js "api_test_nha"
```

### `sync-zoho-functions.js`

Compares local `.ds` files with the remote function list and pushes only changed files.

This uses `crm-sync-state.json` as a hash manifest.

## Function Payload Shape

The CRM function payload is sent as multipart `metadata`.

For Deluge functions, the important field is the inline source code:

```json
{
  "functions": [
    {
      "name": "my_new_function",
      "category": "Automation",
      "runtime": "Deluge 1.0",
      "_code": "void automation.my_new_function(String module, Int recordId)\\n{\\n    info \\"Hello\\";\\n}"
    }
  ]
}
```

Notes:

- `api_name` is derived from the Deluge signature and used when creating a function.
- `api_name` is not changed on update.
- The function name comes from the Deluge signature, not from the file name.
- The lowercased signature name is used as the CRM API name.
- The category is inferred from the prefix before the dot in the signature.
- The current project default is to keep the source inline in `_code` and let the helper layer handle the request transport.

Allowed categories:

- `Button`
- `Automation`
- `Schedule`
- `Related List`
- `Standalone`
- `Signals`
- `Validation Rule`

`Dynamic` is not used here.

## Update Behavior

Updates use the same function payload shape, but without attempting to change the API name.

Important current behavior:

- Deluge function updates are auto-published by Zoho.
- We tested optional `rest_api_mode` injection and the visible REST exposure state still did not change reliably.
- We also tested commit message handling, but the update behavior remained unreliable even when the value was embedded in the metadata payload.
- The current rest API probe script is intentionally separate from the normal push flow so we can test OAuth-only payload shapes without disturbing the stable create/update path.
- The REST exposure update probe confirmed that Zoho accepts the function update request, but the UI switches still remained off afterward.
- Commit message probing did not produce a stable, repeatable update behavior, so the earlier assumption that it belongs inside `metadata.functions[0]` should be treated as unconfirmed.

## Commit Message Policy

The project currently treats `commit_message` as an unresolved experimental field. It should not be considered supported until a repeatable request shape is proven.

The commit-message update probe stays isolated so we can continue verifying CRM behavior without touching the stable push path.

## Local Workflow

1. Edit the `.ds` file in `crmFunctions/`.
2. Validate the file with the local Deluge validator.
3. Push the file to Zoho with `push-zoho-function.js` or `push-automation-function.js`.
4. Use `push-zoho-function-test.js` only when you want to test request metadata behavior.
5. Use `push-zoho-function-restapi-test.js` only when you want to test OAuth-only REST exposure payload shapes.
6. Use `push-zoho-function-commitmsg-test.js` only when you want to test update-only commit message behavior.
7. Execute the function remotely with `run-zoho.js` if you need to test live CRM behavior.
8. Use `watch:deluge` if you want automatic re-validation while editing.

Example remote execution:

```bash
node scripts/cli/run-zoho.js wf_leads_test_nha_2 '{"recordId":321660000034826064}'
```

This calls the Zoho execute endpoint, not a local simulation.

## Current Split Between Validation and Execution

The project now has a clear separation:

- validation scripts check syntax, structure, and source references locally
- remote execution scripts call Zoho and run the deployed function in CRM

That split is intentional because local validation cannot fully replace Zoho's runtime behavior.

## Related Files

- `PUSH_FUNCTION_TO_CRM.md`
- `zoho-crm-functions.js`
- `scripts/zoho/push-zoho-function.js`
- `scripts/zoho/push-automation-function.js`
- `scripts/zoho/pull-zoho-function.js`
- `scripts/zoho/sync-zoho-functions.js`
- `scripts/zoho/test/push-zoho-function-test.js`
- `scripts/zoho/test/push-zoho-function-restapi-test.js`
- `scripts/zoho/test/push-zoho-function-commitmsg-test.js`
