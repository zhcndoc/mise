---
description: "观看 mise 使用 mise exec 运行一次性命令、安装全局工具，并在全局默认版本和项目 Node.js 版本之间切换。"
socialDescription: "观看 mise 运行一次性命令、安装全局工具并按项目切换 Node.js 版本。"
---

# 演示

此演示通过 `mise exec` 运行一次性命令，通过 `mise use --global` 安装全局工具，并在全局默认版本与项目版本之间切换 Node.js。视频于 2025 年 3 月录制，使用 Node.js 22 和 23；下方文字稿使用当前版本。

<video style="max-width: 100%; height: auto;" controls="controls" src="./tapes/demo.mp4" />

## 引导式记录 {#transcript}

下面的命令按照演示步骤改用当前版本，因此版本号和输出可能与视频不同。若要跟着操作，请先[安装 mise](/installing-mise.html)并打开 Bash shell。本演示会写入全局默认值；若不想改动常用的全局配置，可先让 mise 使用临时配置文件：

```sh
export MISE_GLOBAL_CONFIG_FILE="$(mktemp -d)/config.toml"
```

### 运行一个命令

```sh
mise exec node@26 -- node --version
mise exec terraform -- terraform version
```

`mise exec` 会安装尚未安装的工具，并仅在该命令运行期间使用它。它不会将工具加入当前 shell，也不会将工具写入 `mise.toml`；因此之后直接运行 `node --version` 时，会使用 `PATH` 上原本已有的 Node.js（如果存在）。

### 激活 mise 并设置全局默认版本 {#activate-and-set-a-global-default}

```sh
eval "$(mise activate bash)"
mise use --global node@lts
node --version
which node
```

每次 shell 显示提示符时，激活钩子都会更新 `PATH`，因此后续命令会使用所选 Node.js。`lts` 是一个版本请求，Node.js 后端会将它解析为当前长期支持版，因此所选版本会随时间变化。`which node` 会显示已安装的 Node.js 二进制文件本身，而不是 shim。

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

在此项目中，Node.js 26 会覆盖全局的 `lts` 请求。离开项目后，mise 会恢复全局版本；大多数 shell 会在执行 `cd` 时更新环境（详见[目录切换](/dev-tools/shims.html#hook-on-cd)）：

```sh
cd ..
node --version
mise ls --current
```

若要为新项目配置工具、环境变量和任务，请继续阅读[入门指南](/getting-started.html)。若要在已有项目中引入 mise，请参阅[在现有项目中使用 mise](/walkthrough.html)。
