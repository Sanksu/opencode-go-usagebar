import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"

const plugin: TuiPluginModule & { id: string } = {
  id: "oc.usage",
  async tui(api, options, meta) {
    const mod = (await import("./plugin.tsx")) as { tui: TuiPlugin }
    await mod.tui(api, options, meta)
  },
}

export default plugin
