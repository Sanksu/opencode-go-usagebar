import { describe, expect, test } from "bun:test"
import { parseModelSpec, providerOfModel } from "../src/model"

describe("parseModelSpec", () => {
  test("provider/model 拆分", () => {
    expect(parseModelSpec("opencode-go/deepseek-v4-flash")).toEqual({
      providerID: "opencode-go",
      id: "deepseek-v4-flash",
    })
  })
  test("无斜杠返回 null", () => {
    expect(parseModelSpec("deepseek-v4-flash")).toBeNull()
  })
  test("空字符串返回 null", () => {
    expect(parseModelSpec("")).toBeNull()
  })
  test("以斜杠开头返回 null", () => {
    expect(parseModelSpec("/model")).toBeNull()
  })
})

describe("providerOfModel", () => {
  test("opencode-go 命中", () => {
    expect(providerOfModel({ id: "deepseek-v4-flash", providerID: "opencode-go" })).toBe(
      "opencode-go",
    )
  })
  test("deepseek 命中", () => {
    expect(providerOfModel({ id: "deepseek-chat", providerID: "deepseek" })).toBe("deepseek")
  })
  test("未知 provider 返回 null", () => {
    expect(providerOfModel({ id: "x", providerID: "anthropic" })).toBeNull()
  })
  test("缺 providerID 返回 null", () => {
    expect(providerOfModel({ id: "x" })).toBeNull()
  })
  test("null 返回 null", () => {
    expect(providerOfModel(null)).toBeNull()
  })
})
