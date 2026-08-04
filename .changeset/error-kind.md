---
"opencode-go-usagebar": patch
---

Simplify provider error types: drop the discriminated `kind` field, errors are now a plain `{ message }`.
