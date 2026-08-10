## `build`

- **用法**: `build`
- **别名**: `b`

构建项目。

## `ci`

- 依赖：format、build、test

- **用法**：`ci`

运行所有 CI 检查

## `clean`

- **用法**：`clean`

清理构建产物。

## `docs`

- 依赖：docs:setup

- **用法**：`docs`

启动文档开发服务器。

## `docs:build`

- 依赖：docs:setup

- **用法**：`docs:build`

构建文档网站。

## `docs:demos`

- **用法**：`docs:demos`

使用 vhs 创建录制内容。

## `docs:preview`

- 依赖：docs:build

- **用法**：`docs:preview`

预览文档网站。

## `docs:release`

- 依赖：docs:build

- **用法**：`docs:release`

将文档网站发布到生产环境或远程环境。

## `docs:setup`

- **用法**：`docs:setup`

安装文档依赖。

## `fetch-gpg-keys`

- **用法**：`fetch-gpg-keys`

获取用于签名或验证的 GPG 密钥。

## `flamegraph`

- **用法**：`flamegraph`

生成用于性能分析的火焰图。

## `install-dev`

- **用法**：`install-dev`

以调试模式安装当前项目。

## `lint`

- 依赖：lint:*

- **用法**：`lint`

运行所有 lint 检查

## `lint-fix`

- **用法**: `lint-fix`
- **别名**: `format`、`fix`

自动修复代码检查问题。

## `lint:hk`

- **用法**：`lint:hk`

检查 HK 文件。

## `perf`

- **用法**：`perf`

## `perf:cache-shim`

- **用法**：`perf:cache-shim`

## `perf:record`

- **用法**: `perf:record`。

## `perf:task-cache`

- **用法**: `perf:task-cache`

## `pre-commit`

- **用法**：`pre-commit`

运行 pre-commit 钩子。

## `release-plz`

- **用法**：`release-plz`

使用 release-plz 发布

## `render`

- 依赖：render:*

- **用法**：`render`

运行所有渲染任务。

## `render:completions`

- 依赖：build

- **用法**：`render:completions`

生成 Shell 补全命令。

## `render:help`

- 依赖：build

- **用法**：`render:help`

渲染帮助文档。

## `render:llms`

- 依赖：render:usage、render:help

- **用法**：`render:llms`

生成 docs/public/llms.txt（面向 AI 代理的文档索引）。

## `render:mangen`

- 依赖：render:usage

- **用法**：`render:mangen`

生成 man 手册页。

## `render:schema`

- 依赖：docs:setup

- **用法**：`render:schema`

渲染 JSON Schema。

## `render:usage`

- 依赖：build

- **用法**：`render:usage`

生成用法文档。

## `show-output-on-failure`

- **用法**：`show-output-on-failure`

文档生成失败时显示输出。

## `snapshots`

- **用法**：`snapshots`

更新测试快照。

## `test`

- **用法**: `test`
- **别名**: `t`

运行所有测试

## `test-tool-retry`

在上游版本发布后的一段宽限期内，重试失败的测试工具


- **用法**：`test-tool-retry [--grace-period] [--check-only] <tools>…`

### 参数

#### `<tools>…`

要重试的失败工具

### 标志

#### `--grace-period`

忽略上游版本发布距今 &lt;7 天的工具所产生的失败

#### `--check-only`

跳过工具重试，仅检查宽限期（与 --grace-period 一起使用）

## `test:build-perf-workspace`

- **用法**：`test:build-perf-workspace`

任务描述。

## `test:coverage`

- **用法**: `test:coverage`

运行所有测试并生成覆盖率报告。

## `test:e2e`

- 依赖：build

- **用法**：`test:e2e`
- **别名**：`e`、`e2e`

运行端到端测试。

## `test:perf`

- 依赖：test:build-perf-workspace

- **用法**：`test:perf`

运行性能测试。

## `test:shuffle`

- **用法**: `test:shuffle`

启用随机排序运行测试。

## `test:unit`

- **用法**：`test:unit`

运行单元测试
