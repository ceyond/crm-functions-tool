# Project Architecture

The repository is centered on mirrored Deluge functions and the scripts that validate, push, pull, and sync them.

## System View

- Source of truth: `crmFunctions/*.ds`
- Local validation: `scripts/cli/`
- Remote execution and sync: `scripts/zoho/`
- End-to-end orchestration: `scripts/test/run-e2e-suite.js`
- Shared settings: `config/`

## Boundary Notes

- The repo documents the technical workflow around Zoho CRM functions.
- It does not attempt to describe unrelated business systems.
- Test probes are intentionally isolated from the stable push flow.

