import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { ProviderId } from "./usage-types"
import { isProviderId } from "./usage-types"

export type ModelRef = { id: string; providerID?: string; variant?: string }

export function parseModelSpec(spec: string): ModelRef | null {
  const idx = spec.indexOf("/")
  if (idx <= 0) return null
  return { providerID: spec.slice(0, idx), id: spec.slice(idx + 1) }
}

export function providerOfModel(model: ModelRef | null | undefined): ProviderId | null {
  const pid = model?.providerID
  return isProviderId(pid) ? pid : null
}

export function resolveProvider(
  api: TuiPluginApi,
  sessionId: string,
  switched?: ModelRef | null,
): ProviderId | null {
  const fromEvent = providerOfModel(switched)
  if (fromEvent) return fromEvent
  const session = api.state.session.get(sessionId)
  const fromSession = providerOfModel(session?.model)
  if (fromSession) return fromSession
  return providerOfModel(parseModelSpec(api.state.config.model ?? ""))
}
