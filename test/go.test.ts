import { describe, expect, test } from "bun:test"
import {
  parseWindowFromHtml,
  parseApiUsage,
  isLoginPage,
  GO_CAPS,
} from "../src/providers/go"

describe("parseWindowFromHtml", () => {
  test("usagePercent 在前", () => {
    const html = `const rollingUsage = { usagePercent: 42.5, resetInSec: 3600 }`
    expect(parseWindowFromHtml(html, "rollingUsage")).toEqual({
      usedPercent: 42.5,
      resetInSec: 3600,
    })
  })
  test("resetInSec 在前", () => {
    const html = `const weeklyUsage = { resetInSec: 604800, usagePercent: 12 }`
    expect(parseWindowFromHtml(html, "weeklyUsage")).toEqual({
      usedPercent: 12,
      resetInSec: 604800,
    })
  })
  test("字段不存在返回 null", () => {
    const html = `const monthlyUsage = { usagePercent: 1, resetInSec: 2 }`
    expect(parseWindowFromHtml(html, "otherUsage")).toBeNull()
  })
  test("空 HTML 返回 null", () => {
    expect(parseWindowFromHtml("", "rollingUsage")).toBeNull()
  })
})

describe("parseApiUsage", () => {
  test("标准字段解析", () => {
    const data = {
      rollingUsage: { usagePercent: 10, resetInSec: 86400, capUsd: 12 },
      weeklyUsage: { usagePercent: 20, resetInSec: 604800, capUsd: 30 },
      monthlyUsage: { usagePercent: 30, resetInSec: 2592000, capUsd: 60 },
    }
    const windows = parseApiUsage(data)
    expect(windows).toHaveLength(3)
    expect(windows?.[0]).toEqual({ id: "rolling", capUsd: 12, usedPercent: 10, resetInSec: 86400 })
    expect(windows?.[1]).toEqual({ id: "weekly", capUsd: 30, usedPercent: 20, resetInSec: 604800 })
    expect(windows?.[2]).toEqual({ id: "monthly", capUsd: 60, usedPercent: 30, resetInSec: 2592000 })
  })
  test("缺失 cap 时回退 GO_CAPS", () => {
    const data = { rollingUsage: { usagePercent: 5, resetInSec: 100 } }
    const windows = parseApiUsage(data)
    expect(windows?.[0]?.capUsd).toBe(GO_CAPS.rolling)
  })
  test("非法 cap 回退 GO_CAPS", () => {
    const data = { rollingUsage: { usagePercent: 5, resetInSec: 100, capUsd: 0 } }
    expect(parseApiUsage(data)?.[0]?.capUsd).toBe(GO_CAPS.rolling)
  })
  test("无有效窗口返回 null", () => {
    expect(parseApiUsage({})).toBeNull()
    expect(parseApiUsage({ rollingUsage: { usagePercent: "x" } })).toBeNull()
  })
  test("非对象返回 null", () => {
    expect(parseApiUsage(null)).toBeNull()
    expect(parseApiUsage("nope")).toBeNull()
  })
})

describe("isLoginPage", () => {
  test("含 usagePercent 视为已登录", () => {
    expect(isLoginPage(`rollingUsage = { usagePercent: 1 }`)).toBe(false)
  })
  test("无 usagePercent 且含 login 链接判定登录页", () => {
    expect(isLoginPage(`<a href="/login">Sign in</a>`)).toBe(true)
  })
  test("无 usagePercent 且无 login 链接不算登录页", () => {
    expect(isLoginPage(`<html>nothing here</html>`)).toBe(false)
  })
})
