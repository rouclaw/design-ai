# apps/source 说明文档

本目录内容主要是 **PostHog（埋点/分析）SDK 的静态资源与扩展包**（含远程配置脚本、扩展入口、Surveys 问卷 UI 源码与编译产物）。整体并非业务代码，而更像是用于网页侧加载的第三方资源镜像。

## 目录结构概览

```
apps/source/
  us-assets.i.posthog.com/
    array/
      <token>/
        config.js
    src/
      entrypoints/
        exception-autocapture.ts
        surveys.ts
      extensions/
        surveys.tsx
        surveys/
          components/
          icons.tsx
          surveys-extension-utils.tsx
        utils/
          stylesheet-loader.ts
          surveys.tsx.ts
      utils/
        globals.ts
        index.ts
        logger.ts
        property-utils.ts
        regex-utils.ts
        survey-branching.ts
        survey-url-prefill.ts
        survey-utils.ts
      constants.ts
      posthog-exceptions.ts
      posthog-surveys-types.ts
      uuidv7.ts
    static/
      exception-autocapture.js?v=...
      surveys.js
```

## Remote Config：功能开关与运行时策略

位置：`us-assets.i.posthog.com/array/<token>/config.js`

主要逻辑：
- 以 IIFE（立即执行函数）的方式运行。
- 将远程配置写入 `window._POSTHOG_REMOTE_CONFIG[token]`，供主 SDK 在运行时读取与决策。
- 配置字段典型包含：
  - `analytics.endpoint`（例如 `/i/v0/e/`）
  - `autocaptureExceptions` / `errorTracking.*`
  - `sessionRecording`
  - `surveys`
  - `capturePerformance` 等

作用：
- 决定对应 token 项目下的某些扩展能力是否启用，以及使用哪些上报端点/策略。
- 即使目录内包含 Surveys/异常捕获代码，仍可能因 Remote Config 关闭而不生效。

## entrypoints：扩展入口（对主 SDK 暴露能力）

### exception-autocapture

文件：`us-assets.i.posthog.com/src/entrypoints/exception-autocapture.ts`

主要逻辑：
- 提供 3 个“包裹器（wrapper）”，将浏览器侧错误标准化为 ErrorTracking 属性后交给 `captureFn` 上报：
  - `wrapOnError`：劫持 `window.onerror`（全局 JS 错误）
  - `wrapUnhandledRejection`：劫持 `window.onunhandledrejection`（Promise 未处理拒绝）
  - `wrapConsoleError`：劫持 `console.error`（将 console.error 作为异常线索）
- 将这些函数挂载到：
  - `window.__PosthogExtensions__.errorWrappingFunctions`（新契约）
  - `window.posthogErrorWrappingFunctions`（兼容旧版本）

### surveys

文件：`us-assets.i.posthog.com/src/entrypoints/surveys.ts`

主要逻辑：
- 引入 `generateSurveys`，并挂载到：
  - `window.__PosthogExtensions__.generateSurveys`
  - `window.extendPostHogWithSurveys`（兼容旧版本）

## Surveys 扩展主体：拉取问卷、匹配条件、渲染 UI、上报事件

主文件：`us-assets.i.posthog.com/src/extensions/surveys.tsx`

### SurveyManager：展示调度与生命周期

核心职责：
- 获取并筛选“当前应激活”的 surveys：
  - 通过 `posthog.surveys.getSurveys(...)` 获取列表
  - 做 eligibility/条件匹配/事件或动作触发/feature flags 等过滤
- 周期性评估展示逻辑：
  - 只对 in-app surveys（Popover / Widget）进行展示控制
  - 按展示延迟排序建立队列
  - 控制同一时间只显示一个 Popover（通过内部 `_surveyInFocus`）
  - Widget 支持：
    - Tab 类型（常驻反馈入口）
    - Selector 类型（针对特定元素挂监听，点击触发显示）
  - 清理不再活跃的 selector listener，避免残留监听器

### generateSurveys：扩展启动入口

逻辑摘要：
- 保护：必须在浏览器环境（需要 `window/document`）才运行。
- 若配置 `disable_surveys_automatic_display`，则跳过自动展示逻辑。
- 兼容旧 SDK：若 `isSurveysEnabled` 为 `undefined`，视为启用。
- 初次强制拉取并评估，然后启动 1 秒 interval 周期性检查；页面隐藏时暂停，回到前台时立即评估并恢复。

### UI 渲染：Preact + Shadow DOM + CSS Variables

主要位置：
- 题型组件：`extensions/surveys/components/QuestionTypes.tsx`
  - 覆盖开放文本、链接题、评分题、单/多选等
  - 使用 `@posthog/core` 提供的校验与提示能力
- 样式与主题：
  - `extensions/surveys/surveys-extension-utils.tsx`
    - `defaultSurveyAppearance`
    - `addSurveyCSSVariablesToElement`：将颜色、字体、z-index、按钮样式等写入 CSS 变量，供 Shadow DOM 内样式消费
  - `extensions/utils/stylesheet-loader.ts`
    - `prepareStylesheet`：允许宿主通过 `prepare_external_dependency_stylesheet` 钩子处理 style 标签（例如注入 nonce、做样式改写等）

### 分支跳题 & URL 预填

- 分支跳题：`utils/survey-branching.ts`
  - 根据配置决定下一题 index 或结束（支持按单选/评分结果分支）
- URL 预填：`utils/survey-url-prefill.ts`
  - 支持 `?q0=...&q1=...&auto_submit=true` 的参数解析
  - 转换为 SDK 内部 responses
  - 计算从哪一题开始展示（可跳过已预填且允许跳过提交按钮的题目，并尊重 branching）

### 本地状态：seen / in-progress / abandoned

文件：`utils/survey-utils.ts`
- 维护 LocalStorage key 前缀与读写逻辑：
  - `seenSurvey_`、`inProgressSurvey_`、`abandonedSurvey_`
- 用于控制避免重复弹出、记录问卷进行中/放弃等状态。

## 公共支撑模块

- 全局环境保护：`utils/globals.ts`
  - 安全访问 `window/document/navigator`，避免 SSR/worker 环境直接引用导致崩溃
  - 定义 `window.__PosthogExtensions__` 作为主 SDK 与懒加载扩展间的契约
- 日志：`utils/logger.ts`
  - 仅在 debug 条件满足时输出到 console；critical 始终输出
- 异常属性构建：`posthog-exceptions.ts`
  - 通过 ErrorTracking coercers + stack parser 标准化异常
  - 支持 suppression rules、过滤扩展异常、过滤 SDK 自身异常等策略

## static：可直接投放到网页加载的编译产物

位置：`us-assets.i.posthog.com/static/`
- `exception-autocapture.js?v=...`：由异常自动捕获入口打包得到的浏览器产物
- `surveys.js`：由 surveys 入口/扩展打包得到的浏览器产物

