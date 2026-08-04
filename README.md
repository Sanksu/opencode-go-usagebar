# opencode-go-usagebar

> **English** | [中文](README.zh.md)

An opencode TUI sidebar plugin that shows the active provider's spend status directly. Supports **opencode-go** (usage windows) and **DeepSeek** (balance), auto-switching the panel based on the active session model.

## Features

- Displays usage/balance directly in the sidebar, no popups
- **opencode-go**: rolling / weekly / monthly usage windows (used percent + reset countdown + progress bar)
- **DeepSeek**: total / granted / topped-up balance
- Auto-follows the session model (tracks `session.model`; after a model switch, sending a message applies it)
- Polls every 10 minutes
- Manual refresh: click the panel title bar to re-fetch immediately, with a "last updated" timestamp shown in the header
- Alerts: any Go window ≥ 90% used; DeepSeek balance below threshold (re-alerts if balance drops again after recovering)

## Installation

Install from npm:

```bash
bun add opencode-go-usagebar
```

Then register the plugin in your project's `.opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-go-usagebar"]
}
```

The plugin entry is `package.json`'s `exports["./tui"]` (`src/tui.tsx`).

## Configuration

The plugin reads credentials from the following sources (highest priority first):

**opencode-go (dashboard)**

| Config | Source |
|--------|--------|
| `OPENCODE_GO_USAGEBAR_API_KEY` | environment variable |
| `workspaceId` / `authCookie` | `~/.config/opencode/opencode-go-usagebar.json` |

Dashboard scraping needs a sidecar config file:

```json
{
  "go": {
    "workspaceId": "your workspace id",
    "authCookie": "your login cookie"
  }
}
```

**DeepSeek**

| Config | Source |
|--------|--------|
| `DEEPSEEK_API_KEY` | environment variable |
| `deepseek.key` | opencode's `auth.json` |

### Credential security

- `authCookie` and API keys are sensitive credentials. The plugin only uses them to query the corresponding official service for usage/balance data, and never writes them to logs or sends them anywhere else.
- The `opencode-go-usagebar.json` sidecar file contains credentials — **do not commit it to git** (the repo's `.gitignore` excludes common credential files).
- Environment variables (`OPENCODE_GO_USAGEBAR_*`) are safer than the sidecar file; prefer them when possible.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_GO_USAGEBAR_POLL_MS` | `600000` | Poll interval (ms) |
| `OPENCODE_GO_USAGEBAR_LOW_BALANCE` | `10` | DeepSeek low-balance alert threshold (CNY) |
| `OPENCODE_GO_USAGEBAR_LANG` | auto-detect | UI language: `zh` / `en` |

## How it works

1. Resolve the provider from the active session model: `session.model.providerID` (`opencode-go` or `deepseek`), falling back to the configured default model.
2. The plugin activates the matching provider, fetches once immediately, then polls every 10 minutes.
3. **opencode-go**: fetches the dashboard page and parses the usage windows (`rollingUsage` / `weeklyUsage` / `monthlyUsage`).
4. **DeepSeek**: calls the official balance API.
5. Alerts are raised via toast when thresholds are crossed.

## Project structure

```
src/
├── tui.tsx             # Plugin entry (default export)
├── plugin.tsx          # Main logic: store, polling, alerts, sidebar UI
├── providers/
│   ├── go.ts           # opencode-go usage fetch (dashboard scraping)
│   └── deepseek.ts     # DeepSeek balance fetch
├── auth.ts             # auth.json reading
├── model.ts            # provider resolution
├── format.ts           # formatting helpers (percent, countdown, progress bar)
├── locale.ts           # zh/en strings
└── usage-types.ts      # type definitions
```

## Development

```bash
bun install         # install dependencies
bun run typecheck   # TypeScript type checking
bun test            # unit tests
```

For local debugging, reference this repo as a directory via `"plugin": [".."]` in `.opencode/tui.json`.

## Release

Versioning and publishing are managed by [changesets](https://github.com/changesets/changesets) + GitHub Actions:

1. After a change, run `bunx changeset` to record it (semver type).
2. After merging a PR, CI automatically creates a Version PR; merging that publishes to npm.

Publishing uses npm's OIDC trusted publishing (no long-lived token needed) and automatically creates a GitHub Release with provenance attestations. On the npm side, configure a trusted publisher in the package's Settings → Trusted publishing that matches the repo's `release.yml` workflow.

## License

MIT
