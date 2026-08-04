import { join } from "node:path"
import { homedir } from "node:os"
import { readFile } from "node:fs/promises"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

export type AuthJson = Record<string, { key?: string }>

export async function readAuthJson(api: TuiPluginApi): Promise<AuthJson> {
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share")
  const candidates = [
    join(dataHome, "opencode", "auth.json"),
    join(api.state.path.state, "auth.json"),
    join(api.state.path.config, "auth.json"),
  ]
  for (const p of candidates) {
    try {
      const raw = await readFile(p, "utf8")
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as AuthJson
      }
    } catch {
      // try next candidate
    }
  }
  return {}
}
