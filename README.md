# Project Setup Instructions

Use this guide to onboard a new consultant to this Zoho Deluge toolset and get the project ready for local development, validation, and CRM integration.

## 1. Clone and open the project

1. Clone the repository.
2. Open the project folder in your editor.
3. Install dependencies if the project uses any external packages:

```bash
npm install
```

## 2. Set the project owner name

The project uses a shared commit-message helper in `config/function-commit-message.js`.

Update the author name so generated messages reflect the new consultant instead of the previous owner.

Example:

```js
const AUTHOR_NAME = "Your Name";
```

This value is used when building commit messages for Zoho push helpers.

Also make sure the Zoho connection used for this project is created with the required OAuth scope:

```json
"scope": "ZohoCRM.functions.execute.CREATE ZohoCRM.functions.execute.READ ZohoCRM.settings.ALL"
```

Without those scopes, the push, pull, and execute flows may fail.

## 3. Create or update the `.env` file

Add the Zoho credentials required for OAuth token refresh.

Required variables:

```env
ZOHO_REFRESH_TOKEN=your_refresh_token_here
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
```

Optional variable:

```env
ZOHO_ACCESS_TOKEN=your_current_access_token_here
```

Notes:

- `ZOHO_REFRESH_TOKEN` is the main long-lived credential.
- `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` are required for token refresh.
- `ZOHO_ACCESS_TOKEN` can be used for a short-lived session, but the code prefers refresh flow when available.

The OAuth app or connected token must include this scope set:

```json
"scope": "ZohoCRM.functions.execute.CREATE ZohoCRM.functions.execute.READ ZohoCRM.settings.ALL"
```

If the token was created without these scopes, generate a new authorized token before testing or pushing.

## 4. Keep secrets out of version control

Make sure `.env` and token cache files stay local.

The repository already ignores `.zoho-cache/`, which is where refreshed access tokens may be stored.

Do not commit:

- `.env`
- `.zoho-cache/access-token.json`
- any exported credentials or private OAuth values

## 5. Verify the local validation flow

Run the built-in tests and Deluge validation before pushing anything to Zoho.

```bash
npm test
```

Useful validation commands:

```bash
npm run validate:deluge -- crmFunctions/<file>.ds
npm run watch:deluge -- crmFunctions/<file>.ds
```

## 6. Connect to Zoho CRM

Once the `.env` file is populated, the helper scripts can obtain or refresh access tokens automatically.

The core auth flow is implemented in `zoho-crm-functions.js` and expects:

- Zoho Accounts OAuth credentials
- permission to call the CRM API
- access to the configured Zoho region endpoints

If a consultant works in a different Zoho region, the API and Accounts domains in `zoho-crm-functions.js` may need to be adjusted.

## 7. Push, pull, and sync functions

Common commands:

```bash
npm run push:zoho -- <function_name>
npm run pull:zoho -- <function_name>
npm run sync:zoho -- [function_name]
```

Other helper scripts:

```bash
npm run push:automation -- <function_name>
npm run run:zoho -- <function_name> '{"recordId":123}'
```

Test probes:

```bash
npm run push:zoho:test -- <function_name>
npm run push:zoho:restapi-test -- <function_name>
npm run push:zoho:commitmsg-test -- <function_name>
```

## 8. Understand the project structure

- `crmFunctions/` contains Deluge source files.
- `src/` contains the parser, tokenizer, runtime, validator, and related logic.
- `scripts/cli/` contains local validation and execution helpers.
- `scripts/zoho/` contains push, pull, sync, and test-probe scripts.
- `docs/` contains the technical reference and overview.
- `config/` contains shared settings like the commit-message builder.

## 9. Check for personalization before handing off

Before handing the project to another consultant or developer, verify:

- the author name in `config/function-commit-message.js`
- any absolute local paths in tests or fixtures
- any cached token files left on disk
- any account-specific Zoho function names in examples or docs

## 10. Recommended first run

For a fresh consultant, the safest order is:

1. Update the author name.
2. Fill in `.env`.
3. Run `npm test`.
4. Validate a single `.ds` file.
5. Push a non-production test function to Zoho.

If the consultant needs to work across multiple CRM instances, keep the Zoho credentials and function names environment-specific rather than hardcoding them.
# Setup Notes

- Keep `.env` out of Git. It contains local Zoho credentials and should remain untracked.
- If you need to share the setup, create a separate `.env.example` file with placeholder values instead of real secrets.
