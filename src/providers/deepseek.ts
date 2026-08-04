import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { readAuthJson } from "../auth"

export type DeepseekBalance = {
  currency: string
  total: number
  granted: number
  toppedUp: number
}

export type DeepseekStatus = {
  isAvailable: boolean
  balances: DeepseekBalance[]
}

export type DeepseekError = {
  message: string
}

const DEEPSEEK_API = "https://api.deepseek.com/user/balance"
const FETCH_TIMEOUT_MS = 15_000

export async function resolveDeepseekKey(
  api: TuiPluginApi,
): Promise<string | undefined> {
  const env = process.env.DEEPSEEK_API_KEY
  if (env) return env
  const auth = await readAuthJson(api)
  return auth["deepseek"]?.key
}

export function parseBalance(data: unknown): DeepseekStatus | null {
  if (typeof data !== "object" || data === null) return null
  const d = data as Record<string, unknown>
  if (typeof d.is_available !== "boolean" && typeof d.is_available !== "number") {
    return null
  }
  const list = Array.isArray(d.balance_infos) ? d.balance_infos : []
  const balances: DeepseekBalance[] = []
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue
    const b = item as Record<string, unknown>
    const total = Number(b.total_balance)
    if (!Number.isFinite(total)) continue
    balances.push({
      currency: typeof b.currency === "string" ? b.currency : "CNY",
      total,
      granted: Number.isFinite(Number(b.granted_balance)) ? Number(b.granted_balance) : 0,
      toppedUp: Number.isFinite(Number(b.topped_up_balance)) ? Number(b.topped_up_balance) : 0,
    })
  }
  if (balances.length === 0) return null
  return { isAvailable: Boolean(d.is_available), balances }
}

export async function fetchDeepseekStatus(
  api: TuiPluginApi,
): Promise<DeepseekStatus | DeepseekError> {
  const key = await resolveDeepseekKey(api)
  if (!key) return { message: "missing API key" }
  let res: Response
  try {
    res = await fetch(DEEPSEEK_API, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    })
  } catch (err) {
    return { message: err instanceof Error ? err.message : String(err) }
  }
  if (!res.ok) return { message: `HTTP ${res.status}` }
  const data: unknown = await res.json().catch(() => null)
  const parsed = parseBalance(data)
  if (!parsed) return { message: "unexpected balance payload" }
  return parsed
}
