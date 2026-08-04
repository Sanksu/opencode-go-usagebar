import { describe, expect, test } from "bun:test"
import { formatCountdown, formatPercent, formatCny, progressBar } from "../src/format"

describe("formatCountdown", () => {
  test("zh: 多天含小时", () => {
    expect(formatCountdown(2 * 86400 + 5 * 3600, "zh")).toBe("2 天 5 小时")
  })
  test("zh: 仅天数", () => {
    expect(formatCountdown(3 * 86400, "zh")).toBe("3 天")
  })
  test("zh: 小时含分钟", () => {
    expect(formatCountdown(2 * 3600 + 30 * 60, "zh")).toBe("2 小时 30 分钟")
  })
  test("zh: 仅分钟", () => {
    expect(formatCountdown(45 * 60, "zh")).toBe("45 分钟")
  })
  test("zh: 不足一分钟", () => {
    expect(formatCountdown(30, "zh")).toBe("<1 分钟")
  })
  test("zh: 负值钳制到不足一分钟", () => {
    expect(formatCountdown(-5, "zh")).toBe("<1 分钟")
  })
  test("en: 多天含小时", () => {
    expect(formatCountdown(2 * 86400 + 5 * 3600, "en")).toBe("2d 5h")
  })
  test("en: 小时含分钟", () => {
    expect(formatCountdown(2 * 3600 + 30 * 60, "en")).toBe("2h 30m")
  })
  test("en: 不足一分钟", () => {
    expect(formatCountdown(30, "en")).toBe("<1m")
  })
})

describe("formatPercent", () => {
  test("取整", () => {
    expect(formatPercent(87.6)).toBe("88%")
  })
  test("边界 0", () => {
    expect(formatPercent(0)).toBe("0%")
  })
  test("边界 100", () => {
    expect(formatPercent(100)).toBe("100%")
  })
})

describe("formatCny", () => {
  test("正常金额两位小数", () => {
    expect(formatCny(9.5)).toBe("¥9.50")
  })
  test("非有限数显示占位符", () => {
    expect(formatCny(Number.NaN)).toBe("—")
    expect(formatCny(Number.POSITIVE_INFINITY)).toBe("—")
  })
})

describe("progressBar", () => {
  test("0% 全空", () => {
    expect(progressBar(0, 10)).toBe("░".repeat(10))
  })
  test("100% 全满", () => {
    expect(progressBar(100, 10)).toBe("█".repeat(10))
  })
  test("50% 半满", () => {
    expect(progressBar(50, 10)).toBe("█".repeat(5) + "░".repeat(5))
  })
  test("超界钳制到 0-100", () => {
    expect(progressBar(-20, 4)).toBe("░░░░")
    expect(progressBar(120, 4)).toBe("████")
  })
  test("四舍五入填充", () => {
    expect(progressBar(45, 20)).toBe("█".repeat(9) + "░".repeat(11))
  })
})
