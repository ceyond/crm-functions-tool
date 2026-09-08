# Zoho CRM Architecture Map

This file shows how the repository pieces connect.

```mermaid
flowchart LR
  subgraph Local["Local workspace"]
    DS["crmFunctions/*.ds"]
    CLI_VALIDATE["scripts/cli/validate-deluge-file.js"]
    CLI_WATCH["scripts/cli/watch-deluge-files.js"]
    CLI_RUN["scripts/cli/run-zoho.js"]
    E2E["scripts/test/run-e2e-suite.js"]
    CONFIG["config/*"]
  end

  subgraph Zoho["Zoho CRM / Zoho Accounts"]
    AUTH["OAuth token refresh"]
    CRM_FUNCS["CRM function APIs"]
    CRM_AUTOMATION["Automation function APIs"]
    CRM_EXEC["Function execution endpoint"]
    PULL_API["Function export / code download"]
  end

  subgraph ScriptLayer["Zoho script layer"]
    PUSH["scripts/zoho/push-zoho-function.js"]
    PUSH_AUTO["scripts/zoho/push-automation-function.js"]
    PULL["scripts/zoho/pull-zoho-function.js"]
    SYNC["scripts/zoho/sync-zoho-functions.js"]
    TEST_PUSH["scripts/zoho/test/*.js"]
  end

  DS --> CLI_VALIDATE
  DS --> CLI_WATCH
  DS --> PUSH
  DS --> PUSH_AUTO
  DS --> SYNC

  CLI_RUN --> CRM_EXEC
  E2E --> CLI_VALIDATE
  E2E --> CLI_RUN
  E2E --> PULL
  E2E --> TEST_PUSH
  E2E --> PUSH
  E2E --> PUSH_AUTO
  E2E --> SYNC

  PUSH --> AUTH
  PUSH_AUTO --> AUTH
  PULL --> AUTH
  SYNC --> AUTH
  TEST_PUSH --> AUTH
  CLI_RUN --> AUTH

  AUTH --> CRM_FUNCS
  AUTH --> CRM_AUTOMATION
  AUTH --> CRM_EXEC
  CRM_FUNCS --> PULL_API
  PULL_API --> PULL

  SRC["Local scripts and docs"] --> CLI_VALIDATE
  SRC --> CLI_RUN
  SRC --> PUSH
  SRC --> PUSH_AUTO
  SRC --> PULL
  SRC --> SYNC

  CONFIG --> PUSH
  CONFIG --> PUSH_AUTO
  CONFIG --> TEST_PUSH
```

## Reading guide

- `crmFunctions/*.ds` are the source of truth for Deluge code.
- `scripts/cli/` handles local validation and remote execution.
- `scripts/zoho/` handles pushing, pulling, syncing, and targeted tests.
- `scripts/test/run-e2e-suite.js` orchestrates the high-level validation sequence.
- `config/` contains shared settings and overrides.

