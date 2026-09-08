# Function Dependencies

The current repository snapshot does not maintain a semantic function dependency graph in human-authored documentation.

## What is known

- The `crmFunctions/` files are the authoritative source for individual Deluge functions.
- The local scripts treat those files as the unit of validation and sync.

## What remains unknown

- runtime-only trigger chains
- workflow/blueprint relationships not exported in source
- CRM-side caller relationships that are not represented in the repository

