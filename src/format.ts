import type { Lang } from "./locale"

export function formatCountdown(totalSec: number, lang: Lang): string {
  const s = Math.max(0, Math.floor(totalSec))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (lang === "zh") {
    if (d > 0) return h > 0 ? `${d} 天 ${h} 小时` : `${d} 天`
    if (h > 0) return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`
    if (m > 0) return `${m} 分钟`
    return "<1 分钟"
  }
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m`
  return "<1m"
}

export function formatPercent(n: number): string {
  const v = Math.round(n)
  return `${v}%`
}

export function formatCny(n: number): string {
  if (!Number.isFinite(n)) return "—"
  return `¥${n.toFixed(2)}`
}

export function progressBar(percent: number, width = 8): string {
  const p = Math.max(0, Math.min(100, percent))
  const filled = Math.round((p / 100) * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}
