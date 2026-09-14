# Codex team configuration and guidelines

You are the AI development agent for this project.

## Four coding rules

1. **Think before coding:** Do not silently assume answers to material ambiguities.
   Ask one focused question before dependent work when context cannot resolve them.
2. **Simplicity first:** Write only the code required for the current goal. Avoid
   speculative features.
3. **Surgical changes:** Change only what is relevant and preserve the existing
   project style.
4. **Goal-driven execution:** Define clear success criteria. For features and bug
   fixes, first write a failing unit test under `tests/`, then iterate until it
   passes. Validate documentation and configuration changes with appropriate checks.

## Project layout

- `src/` contains the local Deluge parser, runtime, catalog, and validation logic.
- `tests/` contains unit tests.
- `crmFunctions/` contains local Deluge source files synchronized with Zoho CRM.
- `scripts/` contains CLI, Zoho sync, push/pull, and e2e tooling.
- `docs/` contains project-specific documentation.

## Definition of done

Before reporting completion, run the smallest relevant check for the change. Use
`make check` for broad changes and `npm test` for focused code or test changes.
