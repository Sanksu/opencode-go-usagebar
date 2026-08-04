# opencode-go-usagebar

一个 opencode TUI 侧边栏插件：直接显示当前 provider 的花费状态。支持 **opencode-go**（用量窗口）和 **DeepSeek**（余额），并根据会话当前模型自动切换面板。

## 功能

- 侧边栏直接展示用量/余额，无需点击弹窗
- **opencode-go**：滚动 / 每周 / 每月三个用量窗口（已用百分比 + 重置倒计时 + 进度条）
- **DeepSeek**：总余额、赠送余额、充值余额
- 自动跟随会话模型切换面板（跟随 `session.model`，模型切换后发消息即生效）
- 每 10 分钟轮询刷新
- 告警提醒：Go 窗口用量 ≥ 90%；DeepSeek 余额低于阈值（余额恢复后再次跌破会重新提醒）

## 安装

从 npm 安装：

```bash
bun add opencode-go-usagebar
```

然后在项目的 `.opencode/tui.json` 中注册插件：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-go-usagebar"]
}
```

插件入口为 `package.json` 的 `exports["./tui"]`（`src/tui.tsx`）。

## 配置

插件从以下来源读取凭据（优先级从高到低）：

**opencode-go（dashboard）**

| 配置 | 来源 |
|------|------|
| `OPENCODE_GO_USAGEBAR_API_KEY` | 环境变量 |
| `workspaceId` / `authCookie` | `~/.config/opencode/opencode-go-usagebar.json` |

dashboard 抓取需要 sidecar 配置文件：

```json
{
  "go": {
    "workspaceId": "你的 workspace id",
    "authCookie": "你的登录 cookie"
  }
}
```

**DeepSeek**

| 配置 | 来源 |
|------|------|
| `DEEPSEEK_API_KEY` | 环境变量 |
| `deepseek.key` | opencode 的 `auth.json` |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENCODE_GO_USAGEBAR_POLL_MS` | `600000` | 轮询间隔（毫秒） |
| `OPENCODE_GO_USAGEBAR_LOW_BALANCE` | `10` | DeepSeek 低余额告警阈值（CNY） |
| `OPENCODE_GO_USAGEBAR_LANG` | 自动检测 | 界面语言：`zh` / `en` |

## 工作原理

1. 按当前会话模型解析 provider：`session.model.providerID`（`opencode-go` 或 `deepseek`），未命中时回退配置默认模型
2. 插件激活对应 provider 并立即拉取一次，之后每 10 分钟轮询
3. **opencode-go**：请求 dashboard 页面并解析用量窗口（`rollingUsage` / `weeklyUsage` / `monthlyUsage`）
4. **DeepSeek**：调用官方余额 API
5. 达到阈值时通过 toast 提醒

## 项目结构

```
src/
├── tui.tsx             # 插件入口（默认导出）
├── plugin.tsx          # 主逻辑：store、轮询、告警、侧边栏 UI
├── providers/
│   ├── go.ts           # opencode-go 用量获取（dashboard 抓取）
│   └── deepseek.ts     # DeepSeek 余额获取
├── auth.ts             # auth.json 读取
├── model.ts            # provider 解析
├── format.ts           # 格式化工具（百分比、倒计时、进度条）
├── locale.ts           # 中英文案
└── usage-types.ts      # 类型定义
```

## 开发

```bash
bun install         # 安装依赖
bun run typecheck   # TypeScript 类型检查
bun test            # 单元测试
```

本地调试时，可通过 `.opencode/tui.json` 的 `"plugin": [".."]` 以目录方式引用本仓库。

## 发布

版本与发布由 [changesets](https://github.com/changesets/changesets) + GitHub Actions 管理：

1. 修改后运行 `bunx changeset` 记录变更（semver 类型）
2. 合并 PR 后，CI 自动创建 Version PR；合并 Version PR 后自动发布到 npm

发布需要仓库 Secrets 配置 `NPM_TOKEN`（npm access token）。

## License

MIT
