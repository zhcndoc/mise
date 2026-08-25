## `build`

- **Usage:** `build`
- **Aliases:** `b`

构建项目。

## `ci`

- 依赖：format、build、test

- **Usage:** `ci`

运行所有 CI 检查

## `clean`

- **Usage:** `clean`

清理构建产物。

## `docs`

- 依赖：docs:setup

- **Usage:** `docs`

启动文档开发服务器。

## `docs:build`

- 依赖：docs:setup

- **Usage:** `docs:build`

构建文档网站。

## `docs:demos`

- **Usage:** `docs:demos`

使用 vhs 创建录制内容。

## `docs:preview`

- 依赖：docs:build

- **Usage:** `docs:preview`

预览文档网站。

## `docs:release`

- 依赖：docs:build

- **Usage:** `docs:release`

将文档网站发布到生产环境或远程环境。

## `docs:setup`

- **Usage:** `docs:setup`

安装文档依赖。

## `fetch-gpg-keys`

- **Usage:** `fetch-gpg-keys`

获取用于签名或验证的 GPG 密钥。

## `flamegraph`

- **Usage:** `flamegraph`

生成用于性能分析的火焰图。

## `install-dev`

- **Usage:** `install-dev`

以调试模式安装当前项目。

## `lint`

- 依赖：lint:*

- **Usage:** `lint`

运行所有 lint 检查

## `lint-fix`

- **Usage:** `lint-fix`
- **Aliases:** `format`, `fix`

自动修复代码检查问题。

## `lint:hk`

- **Usage:** `lint:hk`

检查 HK 文件。

## `perf`

- **Usage:** `perf`

## `perf:cache-shim`

- **Usage:** `perf:cache-shim`

## `perf:record`

- **Usage:** `perf:record`

## `perf:task-cache`

- **Usage:** `perf:task-cache`

## `pre-commit`

- **Usage:** `pre-commit`

运行 pre-commit 钩子。

## `release-plz`

- **Usage:** `release-plz`

使用 release-plz 发布

## `render`

- 依赖：render:*

- **Usage:** `render`

运行所有渲染任务。

## `render:completions`

- 依赖：build

- **Usage:** `render:completions`

生成 Shell 补全命令。

## `render:help`

- 依赖：build

- **Usage:** `render:help`

渲染帮助文档。

## `render:llms`

- 依赖：render:usage、render:help

- **Usage:** `render:llms`

生成 docs/public/llms.txt（面向 AI 代理的文档索引）。

## `render:mangen`

- 依赖：render:usage

- **Usage:** `render:mangen`

生成 man 手册页。

## `render:schema`

- 依赖：docs:setup

- **Usage:** `render:schema`

渲染 JSON Schema。

## `render:usage`

- 依赖：build

- **Usage:** `render:usage`

生成用法文档。

## `show-output-on-failure`

- **Usage:** `show-output-on-failure`

文档生成失败时显示输出。

## `snapshots`

- **Usage:** `snapshots`

更新测试快照。

## `test`

- **Usage:** `test`
- **Aliases:** `t`

运行所有测试

## `test-tool-retry`

在上游版本发布后的一段宽限期内，重试失败的测试工具


- **Usage:** `test-tool-retry [--grace-period] [--check-only] <tools>…`

### 参数
- **`<tools>…`** — 要重试的失败工具

### 标志
- **`--grace-period`** — 忽略上游在不到 7 天前发布的工具所产生的失败
- **`--check-only`** — 跳过重试工具，仅检查宽限期（与 --grace-period 一起使用）

## `test:build-perf-workspace`

- **Usage:** `test:build-perf-workspace`

任务描述。

## `test:coverage`

- **Usage:** `test:coverage`

运行所有测试并生成覆盖率报告。

## `test:e2e`

- 依赖：build

- **Usage:** `test:e2e`
- **Aliases:** `e`, `e2e`

运行端到端测试。

## `test:perf`

- 依赖：test:build-perf-workspace

- **Usage:** `test:perf`

运行性能测试。

## `test:shuffle`

- **Usage:** `test:shuffle`

启用随机排序运行测试。

## `test:unit`

- **Usage:** `test:unit`

运行单元测试。
