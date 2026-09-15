---
description: "查看 mise 切换工具版本、加载环境变量以及运行项目任务"
---

# 演示

以下演示展示了：

- 如何使用 `mise exec` 以工具的特定版本运行命令
- 如何使用 `mise` 安装许多其他工具，例如 `jq`、`terraform` 或 `go`
- 如何使用 `mise` 在同一系统上管理多个版本的 `node`

<video style="max-width: 100%; height: auto;" controls="controls" src="./tapes/demo.mp4" />

## 引导式记录 {#transcript}

以下内容遵循录制中的工作流程。下面的命令和版本请求在当前 mise 中仍然可用，但录制中的确切版本、路径和输出可能有所不同。要跟随操作，请[安装 mise](/installing-mise.html)并使用 Bash shell。本演示会更改全局工具默认值；如果不希望这些选择出现在正常配置中，请使用临时环境。

### 运行一个命令

```sh
mise exec node@26 -- node --version
mise exec terraform -- terraform version
```

`mise exec` 会安装缺失的工具，并使其可供子命令使用。它不会为调用该命令的 shell 选择工具，也不会将其保存到 `mise.toml` 中。后续直接运行的 `node --version` 会使用 shell 的 PATH 中原本已有的 Node.js（如果有）。

### 激活并选择全局默认值

```bash
eval "$(mise activate bash)"
mise use --global node@lts
node --version
which node
```

提示符更新后，激活会将选定的 Node.js 安装添加到 PATH 中。`lts` 是由 Node.js 后端解析的版本请求，因此其确切版本会随着时间变化。`which node` 会显示此 shell 选择的可执行文件；使用 PATH 激活时，通常就是实际安装的二进制文件。

添加其他全局工具并检查其选择：

```sh
mise use --global terraform jq go
terraform version
jq --version
go version
mise ls --current
```

### 在项目中覆盖默认值

```sh
mkdir myproj
cd myproj
mise use node@26 pnpm@10
node --version
pnpm --version
cat mise.toml
```

项目配置包含：

```toml
[tools]
node = "26"
pnpm = "10"
```

在此项目中，Node.js 26 会覆盖全局的 `lts` 请求。离开项目并等待下一个 shell 提示符，以恢复全局选择：

```sh
cd ..
node --version
mise ls --current
```

如果想创建第一个包含工具、环境变量和任务的项目，请继续阅读[入门指南](/getting-started.html)。有关配置覆盖和升级，请使用[操作指南](/walkthrough.html)。
