# Zoho CRM Technical Mirror

Daily, versioned mirror of the Deluge functions in one Zoho CRM system. CRM remains the runtime source of truth. This repository is the technical audit trail, backup and documentation evidence layer.

## Start here

For day-to-day consulting work, do **not** start by reading hundreds of `.ds` files.

1. **What changed?** Open [`docs/OVERVIEW.md`](docs/OVERVIEW.md) to see the current project summary and the main entry points.
2. **What should we improve next?** Open [`docs/TEST_AUTOMATION.md`](docs/TEST_AUTOMATION.md) to understand the validation flow and the test runner.
3. **What processes exist?** Inspect `crmFunctions/` and the generated documentation in `docs/` for the mirrored functions and helper scripts.
4. **How is a process implemented?** Use the Deluge source in `crmFunctions/*.ds` together with the local tooling in `scripts/`.
5. **What does the repo mean architecturally?** Use [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md) and [`docs/ZOHO_FUNCTIONS_TECHNICAL_REFERENCE.md`](docs/ZOHO_FUNCTIONS_TECHNICAL_REFERENCE.md).

## Core rules

- Treat the repo as one CRM system, not one process.
- Use `crmFunctions/*.ds` as the source of truth for code analysis.
- Keep workflow and blueprint orchestration out of scope unless supplied through project context.
- Keep test and validation functions in the snapshot, but classify them as test or technical context when the name makes that clear.
- Treat `util_*` as the authoritative utility convention.
- Treat filenames and function names as aligned identifiers unless the source says otherwise.
- Separate deterministic findings from semantic recommendations.

## Repository structure

```text
crmFunctions/*.ds                          raw function snapshot from CRM
config/                                     shared configuration and overrides
docs/                                       technical reference and overview
scripts/cli/                                local validation and execution helpers
scripts/test/                               end-to-end validation runner
scripts/zoho/                               push, pull, sync, and test probes
README.md                                   repository entry point
```

## Mental model

One repository represents **one CRM system**, not one business process. A CRM can contain many processes. Functions are classified across naming conventions, helper usage, likely CRM modules, and execution context.

The validation and sync scripts deliberately separate local checks from remote Zoho calls. That keeps repository state reproducible even when CRM-side execution or permissions differ.

## Setting up a new client org

1. Clone the repository.
2. Review the current documentation in `docs/`.
3. Configure local credentials if you need to run Zoho-linked commands.
4. Run the validation scripts before any push or sync action.
5. Keep environment-specific details outside of committed source files.

## Running locally

Requires Node 18+.

```bash
npm test
npm run validate:deluge -- crmFunctions/<file>.ds
npm run watch:deluge -- crmFunctions/<file>.ds
npm run test:e2e
```

## Sync behavior

- `scripts/zoho/push-zoho-function.js` pushes a single function.
- `scripts/zoho/push-automation-function.js` handles automation-linked functions.
- `scripts/zoho/pull-zoho-function.js` exports functions from Zoho.
- `scripts/zoho/sync-zoho-functions.js` compares local and remote function state.
- `scripts/zoho/test/` contains isolated probes that should stay separate from the stable push path.

