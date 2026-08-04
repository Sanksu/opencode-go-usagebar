import { join } from "node:path"
import { homedir } from "node:os"
import { readFile } from "node:fs/promises"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { readAuthJson } from "../auth"

export type GoWindowId = "rolling" | "weekly" | "monthly"

export type GoWindow = {
  id: GoWindowId
  capUsd: number
  usedPercent: number
  resetInSec: number
}

export type GoUsage = { source: "api" | "dashboard"; windows: GoWindow[] }

export type GoError = {
  message: string
}

export const GO_CAPS: Record<GoWindowId, number> = {
  rolling: 12,
  weekly: 30,
  monthly: 60,
}

const API_BASE = "https://opencode.ai/zen/go/v1"
const DASHBOARD_PREFIX = "https://opencode.ai/workspace/"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
const CIRCUIT_MS = 30 * 60 * 1000
const FETCH_TIMEOUT_MS = 15_000

const WINDOW_FIELDS: { field: string; id: GoWindowId }[] = [
  { field: "rollingUsage", id: "rolling" },
  { field: "weeklyUsage", id: "weekly" },
  { field: "monthlyUsage", id: "monthly" },
]

let apiDownUntil = 0

export function resetGoApiCircuit(): void {
  apiDownUntil = 0
}

type GoCredentials = {
  apiKey?: string
  workspaceId?: string
  authCookie?: string
}

async function resolveGoConfig(api: TuiPluginApi): Promise<GoCredentials> {
  const auth = await readAuthJson(api)
  let sidecar: { go?: { workspaceId?: string; authCookie?: string } } = {}
  try {
    const raw = await readFile(
      join(homedir(), ".config", "opencode", "opencode-go-usagebar.json"),
      "utf8",
    )
    sidecar = JSON.parse(raw) as typeof sidecar
  } catch {
    // sidecar absent or unreadable — rely on env
  }
  return {
    apiKey: process.env.OPENCODE_GO_USAGEBAR_API_KEY ?? auth["opencode-go"]?.key,
    workspaceId: process.env.OPENCODE_GO_USAGEBAR_WORKSPACE_ID ?? sidecar.go?.workspaceId,
    authCookie: process.env.OPENCODE_GO_USAGEBAR_AUTH_COOKIE ?? sidecar.go?.authCookie,
  }
}

export function parseWindowFromHtml(
  html: string,
  field: string,
): { usedPercent: number; resetInSec: number } | null {
  const rePctFirst = new RegExp(
    `${field}[^=]*=\\s*\\{[^}]*?usagePercent\\s*:\\s*(\\d+(?:\\.\\d+)?)[^}]*?resetInSec\\s*:\\s*(\\d+)`,
  )
  const reResetFirst = new RegExp(
    `${field}[^=]*=\\s*\\{[^}]*?resetInSec\\s*:\\s*(\\d+)[^}]*?usagePercent\\s*:\\s*(\\d+(?:\\.\\d+)?)`,
  )
  const m1 = html.match(rePctFirst)
  if (m1 && m1[1] !== undefined && m1[2] !== undefined) {
    return { usedPercent: Number(m1[1]), resetInSec: Number(m1[2]) }
  }
  const m2 = html.match(reResetFirst)
  if (m2 && m2[1] !== undefined && m2[2] !== undefined) {
    return { usedPercent: Number(m2[2]), resetInSec: Number(m2[1]) }
  }
  return null
}

export function parseApiUsage(data: unknown): GoWindow[] | null {
  if (typeof data !== "object" || data === null) return null
  const d = data as Record<string, unknown>
  const windows: GoWindow[] = []
  for (const { field, id } of WINDOW_FIELDS) {
    const w = d[field] ?? d[`${id}Usage`] ?? d[`${id}_usage`]
    if (typeof w !== "object" || w === null) continue
    const u = w as Record<string, unknown>
    const usedPercent = Number(u.usagePercent ?? u.usedPercent ?? u.usage_percent)
    const resetInSec = Number(u.resetInSec ?? u.reset_in_sec ?? u.reset_after_seconds)
    if (!Number.isFinite(usedPercent) || !Number.isFinite(resetInSec)) continue
    const cap = Number(u.capUsd ?? u.cap_usd ?? u.limitUsd)
    windows.push({
      id,
      capUsd: Number.isFinite(cap) && cap > 0 ? cap : GO_CAPS[id],
      usedPercent,
      resetInSec,
    })
  }
  return windows.length > 0 ? windows : null
}

export function isLoginPage(html: string): boolean {
  return !/usagePercent/.test(html) && /(\/login|sign.?in|login\?)/i.test(html)
}

async function fetchDashboard(creds: GoCredentials): Promise<GoUsage | GoError> {
  if (!creds.workspaceId || !creds.authCookie) {
    return { message: "dashboard not configured: set workspaceId and authCookie" }
  }
  const res = await fetch(
    `${DASHBOARD_PREFIX}${encodeURIComponent(creds.workspaceId)}/go`,
    {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        Cookie: `auth=${creds.authCookie}`,
      },
    },
  )
  if (!res.ok) return { message: `dashboard request failed (HTTP ${res.status})` }
  const html = await res.text()
  if (isLoginPage(html)) return { message: "dashboard session expired: update authCookie" }
  const windows: GoWindow[] = []
  for (const { field, id } of WINDOW_FIELDS) {
    const p = parseWindowFromHtml(html, field)
    if (p) {
      windows.push({ id, capUsd: GO_CAPS[id], usedPercent: p.usedPercent, resetInSec: p.resetInSec })
    }
  }
  if (windows.length === 0) {
    return { message: "dashboard parse failed: page structure may have changed" }
  }
  return { source: "dashboard", windows }
}

export async function fetchGoUsage(
  api: TuiPluginApi,
  opts?: { manual?: boolean },
): Promise<GoUsage | GoError> {
  const creds = await resolveGoConfig(api)
  const now = Date.now()
  if ((opts?.manual || now >= apiDownUntil) && creds.apiKey) {
    try {
      const res = await fetch(`${API_BASE}/usage`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${creds.apiKey}`, Accept: "application/json" },
      })
      if (res.ok) {
        const data: unknown = await res.json().catch(() => null)
        const windows = parseApiUsage(data)
        if (windows) return { source: "api", windows }
      } else {
        apiDownUntil = now + CIRCUIT_MS
      }
    } catch {
      apiDownUntil = now + CIRCUIT_MS
    }
  }
  try {
    return await fetchDashboard(creds)
  } catch (err) {
    return { message: err instanceof Error ? err.message : String(err) }
  }
}
