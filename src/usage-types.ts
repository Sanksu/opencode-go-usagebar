import type { GoUsage } from "./providers/go"
import type { DeepseekStatus } from "./providers/deepseek"

export type ProviderId = "opencode-go" | "deepseek"

export type ProviderStatus =
  | {
      provider: "opencode-go"
      kind: "windows"
      source: GoUsage["source"]
      windows: GoUsage["windows"]
    }
  | {
      provider: "deepseek"
      kind: "balance"
      balances: DeepseekStatus["balances"]
      isAvailable: DeepseekStatus["isAvailable"]
    }

export function isProviderId(value: string | undefined): value is ProviderId {
  return value === "opencode-go" || value === "deepseek"
}
