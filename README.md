# Pencil Monorepo（pnpm）

本仓库使用 pnpm workspace 组织为 monorepo，主项目入口为 `packages/web`。

## 开发

```bash
pnpm install
pnpm --filter pencil start
```

## 需要用户单独配置的文件

由于体积/分发策略等原因，以下两个 Windows 相关的可执行文件可能不会随仓库一同分发，需用户自行准备并放置到指定路径（文件名需保持一致）：

- `packages/web/assets/bun-win32-x64.exe`
- `packages/web/mcp-server-windows-x64.exe`

如果缺少上述文件，涉及 Windows 侧 bun / MCP Server 的相关能力将无法正常工作。

https://api.pencil.dev    替换为： pencil-proxy://api.pencilai.dev
https://us.i.posthog.com   替换为： pencil-proxy://postai.com
https://908a8bdbc113924254b644219323ea6f@o4510271844122624.ingest.us.sentry.io   替换为： pencil-proxy://sentryai.com