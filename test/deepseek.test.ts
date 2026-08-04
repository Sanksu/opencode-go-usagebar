import { describe, expect, test } from "bun:test"
import { parseBalance } from "../src/providers/deepseek"

describe("parseBalance", () => {
  test("标准响应解析", () => {
    const data = {
      is_available: true,
      balance_infos: [
        {
          currency: "CNY",
          total_balance: "123.45",
          granted_balance: "100.00",
          topped_up_balance: "23.45",
        },
      ],
    }
    expect(parseBalance(data)).toEqual({
      isAvailable: true,
      balances: [{ currency: "CNY", total: 123.45, granted: 100, toppedUp: 23.45 }],
    })
  })
  test("is_available 为数字 1 也接受", () => {
    const data = { is_available: 1, balance_infos: [{ total_balance: "5" }] }
    const r = parseBalance(data)
    expect(r?.isAvailable).toBe(true)
    expect(r?.balances).toHaveLength(1)
  })
  test("total_balance 缺失条目被跳过", () => {
    const data = {
      is_available: true,
      balance_infos: [
        { currency: "CNY", total_balance: "10" },
        { currency: "USD", total_balance: "abc" },
      ],
    }
    const r = parseBalance(data)
    expect(r?.balances).toHaveLength(1)
    expect(r?.balances[0]?.currency).toBe("CNY")
  })
  test("余额字段缺失回退 0", () => {
    const data = { is_available: true, balance_infos: [{ currency: "CNY", total_balance: "10" }] }
    const r = parseBalance(data)
    expect(r?.balances[0]).toEqual({ currency: "CNY", total: 10, granted: 0, toppedUp: 0 })
  })
  test("无有效余额返回 null", () => {
    expect(parseBalance({ is_available: true, balance_infos: [] })).toBeNull()
  })
  test("缺 is_available 返回 null", () => {
    expect(parseBalance({ balance_infos: [{ total_balance: "1" }] })).toBeNull()
  })
  test("非对象返回 null", () => {
    expect(parseBalance(null)).toBeNull()
    expect(parseBalance("x")).toBeNull()
  })
})
