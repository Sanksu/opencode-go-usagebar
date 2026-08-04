# opencode-go-usagebar

## 0.3.0

### Minor Changes

- 9c44801: Add manual refresh: click the panel title bar to re-fetch immediately, with a "last updated" timestamp shown in the header.

### Patch Changes

- 93ae1d6: Simplify provider error types: drop the discriminated `kind` field, errors are now a plain `{ message }`.

## 0.2.0

### Minor Changes

- 957f68d: Initial release: sidebar spend-status bar for opencode-go usage windows and DeepSeek balance.
