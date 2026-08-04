export type Lang = "zh" | "en"

export type Strings = {
  goPanelTitle: string
  deepseekPanelTitle: string
  rolling: string
  weekly: string
  monthly: string
  resetsIn: string
  totalBalance: string
  grantedBalance: string
  toppedUpBalance: string
  available: string
  unavailable: string
  loading: string
  api: string
  dashboard: string
  goAlert: (label: string, percent: number) => string
  deepseekAlert: (amount: string) => string
}

const zh: Strings = {
  goPanelTitle: "opencode go",
  deepseekPanelTitle: "DeepSeek",
  rolling: "滚动用量",
  weekly: "每周用量",
  monthly: "每月用量",
  resetsIn: "重置于",
  totalBalance: "总余额",
  grantedBalance: "赠送余额",
  toppedUpBalance: "充值余额",
  available: "可用",
  unavailable: "不可用",
  loading: "加载中…",
  api: "API",
  dashboard: "仪表盘",
  goAlert: (label, percent) => `${label} 已用 ${percent}%`,
  deepseekAlert: (amount) => `DeepSeek 余额低于 ${amount}`,
}

const en: Strings = {
  goPanelTitle: "opencode go",
  deepseekPanelTitle: "DeepSeek",
  rolling: "Rolling usage",
  weekly: "Weekly usage",
  monthly: "Monthly usage",
  resetsIn: "resets in",
  totalBalance: "Total balance",
  grantedBalance: "Granted",
  toppedUpBalance: "Topped up",
  available: "Available",
  unavailable: "Unavailable",
  loading: "Loading…",
  api: "API",
  dashboard: "Dashboard",
  goAlert: (label, percent) => `${label} used ${percent}%`,
  deepseekAlert: (amount) => `DeepSeek balance below ${amount}`,
}

export function detectLang(): Lang {
  const env = (process.env.OPENCODE_GO_USAGEBAR_LANG ?? "").toLowerCase()
  if (env.startsWith("zh")) return "zh"
  if (env === "en") return "en"
  const sys = `${process.env.LANG ?? ""} ${process.env.LC_ALL ?? ""}`
  if (/^zh/i.test(sys.trim())) return "zh"
  return "en"
}

export function getStrings(): Strings {
  return detectLang() === "zh" ? zh : en
}
