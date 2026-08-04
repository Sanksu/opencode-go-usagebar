/** @jsxImportSource @opentui/solid */

import { TextAttributes } from "@opentui/core"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js"
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { ProviderId, ProviderStatus } from "./usage-types"
import { resolveProvider, type ModelRef } from "./model"
import { detectLang, getStrings, type Lang } from "./locale"
import {
  formatCountdown,
  formatCny,
  formatPercent,
  progressBar,
} from "./format"
import { fetchGoUsage, resetGoApiCircuit } from "./providers/go"
import { fetchDeepseekStatus } from "./providers/deepseek"

type UsageStore = {
  status: () => ProviderStatus | null
  error: () => string | null
  loading: () => boolean
  updatedAt: () => number | null
  activate: (provider: ProviderId | null) => void
}

const POLL_MS = Number(process.env.OPENCODE_GO_USAGEBAR_POLL_MS) || 600_000
const LOW_BALANCE_CNY = Number(process.env.OPENCODE_GO_USAGEBAR_LOW_BALANCE) || 10
const GO_ALERT_PCT = 90

function createUsageStore(api: TuiPluginApi): UsageStore {
  const [status, setStatus] = createSignal<ProviderStatus | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [updatedAt, setUpdatedAt] = createSignal<number | null>(null)

  let current: ProviderId | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let inFlight = false
  const alerted: Partial<Record<ProviderId, { go: Set<string>; deepseekLow: boolean }>> = {}

  async function refresh(opts?: { manual?: boolean }): Promise<void> {
    const p = current
    if (!p || inFlight) return
    inFlight = true
    setLoading(status() === null)
    try {
      const result = await fetchStatus(api, p, opts)
      if (p !== current) return
      if (result.status) {
        setStatus(result.status)
        setError(null)
        setUpdatedAt(Date.now())
        checkAlerts(p, result.status)
      } else {
        setError(result.error ?? "error")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      inFlight = false
      setLoading(false)
    }
  }

  function activate(next: ProviderId | null): void {
    if (next === current) return
    current = next
    setStatus(null)
    setError(null)
    setUpdatedAt(null)
    if (interval) clearInterval(interval)
    interval = null
    if (!next) return
    void refresh()
    interval = setInterval(() => void refresh(), POLL_MS)
  }

  function checkAlerts(p: ProviderId, st: ProviderStatus): void {
    const t = getStrings()
    const rec = (alerted[p] ??= { go: new Set<string>(), deepseekLow: false })
    if (st.kind === "windows") {
      for (const w of st.windows) {
        if (!rec.go.has(w.id) && w.usedPercent >= GO_ALERT_PCT) {
          rec.go.add(w.id)
          api.ui.toast({
            variant: "warning",
            title: "opencode go",
            message: t.goAlert(t[w.id], w.usedPercent),
          })
        }
      }
    } else {
      const total = st.balances[0]?.total ?? 0
      if (total >= LOW_BALANCE_CNY) {
        rec.deepseekLow = false
      } else if (!rec.deepseekLow) {
        rec.deepseekLow = true
        api.ui.toast({
          variant: "warning",
          title: "DeepSeek",
          message: t.deepseekAlert(formatCny(total)),
        })
      }
    }
  }

  return {
    status,
    error,
    loading,
    updatedAt,
    activate,
  }
}

async function fetchStatus(
  api: TuiPluginApi,
  p: ProviderId,
  opts?: { manual?: boolean },
): Promise<{ status: ProviderStatus | null; error: string | null }> {
  if (p === "opencode-go") {
    if (opts?.manual) resetGoApiCircuit()
    const res = await fetchGoUsage(api, opts)
    if ("windows" in res) {
      return {
        status: { provider: "opencode-go", kind: "windows", source: res.source, windows: res.windows },
        error: null,
      }
    }
    return { status: null, error: res.message }
  }
  const res = await fetchDeepseekStatus(api)
  if ("balances" in res) {
    return {
      status: {
        provider: "deepseek",
        kind: "balance",
        balances: res.balances,
        isAvailable: res.isAvailable,
      },
      error: null,
    }
  }
  return { status: null, error: res.message }
}

export const tui: TuiPlugin = async (api) => {
  const store = createUsageStore(api)

  api.slots.register({
    order: 350,
    slots: {
      sidebar_content: (_ctx, props) => (
        <UsageSidebar api={api} sessionId={props.session_id} store={store} />
      ),
    },
  })

  api.lifecycle.onDispose(() => store.activate(null))
}

type Theme = TuiPluginApi["theme"]["current"]
type ThemeColor = Exclude<keyof Theme, "thinkingOpacity">

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function UsageSidebar(props: {
  api: TuiPluginApi
  sessionId: string
  store: UsageStore
}) {
  const { api, store } = props
  const t = getStrings()
  const lang = detectLang()
  const theme = () => api.theme.current

  const [switchedModel, setSwitchedModel] = createSignal<ModelRef | null>(null)
  const [tick, setTick] = createSignal(Date.now())

  createEffect(() => {
    void props.sessionId
    setSwitchedModel(null)
  })

  onMount(() => {
    const off = api.event.on("session.next.model.switched", (e) => {
      if (e.properties.sessionID === props.sessionId) {
        setSwitchedModel(e.properties.model)
      }
    })
    onCleanup(off)

    const offUpdated = api.event.on("session.updated", (e) => {
      const info = (e.properties as { info?: { id?: string; model?: ModelRef } }).info
      if (info?.id === props.sessionId && info.model) {
        setSwitchedModel(info.model)
      }
    })
    onCleanup(offUpdated)

    const iv = setInterval(() => setTick(Date.now()), 1000)
    onCleanup(() => clearInterval(iv))
  })

  const provider = createMemo<ProviderId | null>(() =>
    resolveProvider(api, props.sessionId, switchedModel()),
  )

  createEffect(() => {
    store.activate(provider())
  })

  const st = () => store.status()
  const err = () => store.error()
  const loading = () => store.loading()
  const updatedAt = () => store.updatedAt()

  const sourceTag = createMemo(() => {
    const s = st()
    if (!s) return ""
    return s.kind === "windows" ? (s.source === "dashboard" ? t.dashboard : t.api) : t.api
  })

  return (
    <Show when={provider()}>
      <box
        width="100%"
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        paddingBottom={1}
        gap={1}
      >
        <Divider theme={theme()} />
        <box flexDirection="row" justifyContent="space-between">
          <box backgroundColor={theme().primary} paddingLeft={1} paddingRight={1}>
            <text fg={theme().selectedListItemText} attributes={TextAttributes.BOLD}>
              {provider() === "opencode-go" ? t.goPanelTitle : t.deepseekPanelTitle}
            </text>
          </box>
          <text fg={theme().textMuted}>{sourceTag()}</text>
        </box>

        <Show when={loading()}>
          <text fg={theme().textMuted}>{t.loading}</text>
        </Show>
        <Show when={err()}>
          <text fg={theme().error}>{err()}</text>
        </Show>

        <Switch>
          <Match when={st()?.kind === "windows"}>
            <GoUsageRows
              status={st() as Extract<ProviderStatus, { kind: "windows" }>}
              lang={lang}
              theme={theme()}
              tick={tick()}
              updatedAt={updatedAt()}
            />
          </Match>
          <Match when={st()?.kind === "balance"}>
            <BalanceRows
              status={st() as Extract<ProviderStatus, { kind: "balance" }>}
              theme={theme()}
            />
          </Match>
        </Switch>

        <Divider theme={theme()} />
      </box>
    </Show>
  )
}

function GoUsageRows(props: {
  status: Extract<ProviderStatus, { kind: "windows" }>
  lang: Lang
  theme: Theme
  tick: number
  updatedAt: number | null
}) {
  const t = getStrings()
  return (
    <For each={props.status.windows}>
      {(w) => {
        const remaining =
          w.resetInSec - (props.updatedAt ? (props.tick - props.updatedAt) / 1000 : 0)
        const color: ThemeColor = w.usedPercent >= GO_ALERT_PCT ? "warning" : "primary"
        return (
          <box width="100%" flexDirection="column" gap={0}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={props.theme.text}>{t[w.id]}</text>
              <text fg={props.theme.textMuted}>
                {formatPercent(w.usedPercent)} · {t.resetsIn} {formatCountdown(remaining, props.lang)}
              </text>
            </box>
            <text fg={props.theme[color]}>{progressBar(w.usedPercent, 20)}</text>
          </box>
        )
      }}
    </For>
  )
}

function BalanceRows(props: {
  status: Extract<ProviderStatus, { kind: "balance" }>
  theme: Theme
}) {
  const t = getStrings()
  const primary = props.status.balances[0]
  if (!primary) return null
  return (
    <box width="100%" flexDirection="column" gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.text}>{t.totalBalance}</text>
        <text fg={props.theme.text} attributes={TextAttributes.BOLD}>
          {formatCny(primary.total)}
        </text>
      </box>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>{t.grantedBalance}</text>
        <text fg={props.theme.textMuted}>{formatCny(primary.granted)}</text>
      </box>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>{t.toppedUpBalance}</text>
        <text fg={props.theme.textMuted}>{formatCny(primary.toppedUp)}</text>
      </box>
      <text fg={props.status.isAvailable ? props.theme.success : props.theme.error}>
        {props.status.isAvailable ? t.available : t.unavailable}
      </text>
    </box>
  )
}

// ---------------------------------------------------------------------------
// UI primitives
// ---------------------------------------------------------------------------

function Divider(props: { theme: Theme }) {
  return (
    <box
      border={["bottom"]}
      borderColor={props.theme.borderSubtle}
      height={1}
    />
  )
}
