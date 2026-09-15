---
description: "使用 mise 选择 Node.js 和包管理器，然后运行项目声明的脚本和依赖项"
---

# Node.js Cookbook

使用 mise 选择 [Node.js](/lang/node.html) 和包管理器，然后运行项目声明的脚本和依赖项。

## 使用 Node.js 入门

要在目录中安装 Node.js，请运行：

```shell
mise use node
```

这将安装最新版本的 Node.js，并创建包含以下内容的 `mise.toml` 文件：

```toml
[tools]
node = "latest"
```

如果要改为全局安装 Node.js（例如 node v26），请运行：

```shell
mise use -g node@26
```

## 将 node modules 二进制文件添加到 PATH

安装 `package.json` 中列出的 Node.js 包时，通常需要使用 `npx` 或完整路径来运行其二进制文件。例如：

```shell
mise exec -- npm install --save-dev eslint
eslint --version # doesn't work
npx eslint --version # works
```

使用 `mise`，你可以将 node modules 二进制文件添加到 `PATH`，这样通过 npm 安装的 CLI 无需使用 `npx` 即可用。

```toml [mise.toml]
[env]
_.path = ['{{config_root}}/node_modules/.bin']
```

示例：

```shell
mise exec -- npm install --save-dev eslint
mise exec -- eslint --version # works without shell activation
```

启用 shell 激活后，`eslint --version` 也可以直接运行。

## 示例 Node.js 项目

此配方要求 `package.json` 包含 `start`、`lint`、`test` 和 `build` 脚本，并且包含一个已提交的 `package-lock.json`。将 ESLint、TypeScript 和测试运行器放在项目的 `devDependencies` 中，以便 npm 的 lockfile 与它们使用的包一起控制其版本。

```toml [mise.toml]
[tools]
node = "24"

[env]
NODE_ENV = { default = "development" }

[tasks.install]
description = "Install the locked npm dependency tree"
alias = "i"
run = "npm ci"

[tasks.start]
description = "Start the development server"
alias = "s"
run = "npm run start"

[tasks.lint]
description = "Run the project's lint script"
alias = "l"
run = "npm run lint"

[tasks.test]
description = "Run the project's tests"
alias = "t"
run = "npm test"

[tasks.build]
description = "构建项目"
alias = "b"
run = "npm run build"
```

克隆仓库后运行 `mise run install`，然后运行 `mise run test` 或 `mise run start`。npm 脚本已经将 `node_modules/.bin` 放入 `PATH`，因此这些任务不需要单独的路径指令。对于没有 lockfile 的新项目，请运行一次 `mise exec -- npm install`，并提交生成的 lockfile。

## 使用 `pnpm` 的示例

此示例使用 `pnpm` 作为包管理器。将以下字段合并到现有的 `package.json` 中，该文件还必须定义一个 `dev` 脚本：

```json [package.json]
{
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": "10.15.0"
    }
  }
}
```

当 `package.json`、`pnpm-lock.yaml` 和
`mise.toml` 均未发生更改，并且 `node_modules/.pnpm/lock.yaml` 存在且为最新版本时，将跳过安装任务。

```toml [mise.toml]
[tools]
node = '24'

[settings]
# Read the pnpm version from package.json
idiomatic_version_file_enable_tools = ['pnpm']

[env]
_.path = ['{{config_root}}/node_modules/.bin']

[tasks.pnpm-install]
description = '使用 pnpm 安装依赖项'
run = 'pnpm install'
sources = ['package.json', 'pnpm-lock.yaml', 'mise.toml']
outputs = ['node_modules/.pnpm/lock.yaml']

[tasks.dev]
description = '调用 `package.json` 中的 dev 脚本'
run = 'node --run dev'
depends = ['pnpm-install']
```

运行 `mise run dev`，在启动现有应用程序之前安装选定的工具并准备依赖项：

- `mise` 将安装正确版本的 Node.js
- `mise` 将安装 `package.json` 中声明的 `pnpm` 版本
- 在 `node --run dev` 之前，当其源或输出过期时，`pnpm install` 会运行

时间戳检查不会验证 `node_modules` 中的每个文件。如果依赖项缺失或损坏，请运行 `mise run --force pnpm-install`。

## 替代 Corepack

mise 无需 Corepack 即可安装和选择 npm、pnpm 和 Yarn。最简单的设置是在 `mise.toml` 中同时声明 Node.js 和包管理器：

```toml [mise.toml]
[tools]
node = '24'
pnpm = '10.15.0'
```

如果想让 `package.json` 作为包管理器版本来源，请启用其
[惯用版本文件](/configuration.html#idiomatic-version-files)支持：

```json [package.json]
{
  "packageManager": "pnpm@10.15.0+sha224.88208eb7c2e7de6ed534fa298248dee656723116995eda4b508fd0c9"
}
```

```toml [mise.toml]
[tools]
node = '24'

[settings]
idiomatic_version_file_enable_tools = ['pnpm']
```

运行 `mise install` 以安装声明的版本。启用 shell 激活后，mise 的 shims 还可以在首次调用时安装缺失的已配置包管理器。这使用了
[`not_found_auto_install`](/configuration/settings.html#not_found_auto_install)，该设置默认启用。

Corepack 风格的 `+sha1`、`+sha224`、`+sha256`、`+sha384` 和 `+sha512` 后缀会在安装前根据确切的包管理器制品进行验证。对于 npm、pnpm 和 Yarn Classic，这是 registry tarball；对于现代 Yarn，这是 Yarn 发布的 CLI 文件。如果没有校验和，mise 将使用包管理器首选的 registry 后端（通常是 Aqua）以及该后端的常规验证方式。

启用仓库可能声明的每个包管理器：

```toml [mise.toml]
[settings]
idiomatic_version_file_enable_tools = ['npm', 'pnpm', 'yarn']
```

与 Corepack 不同，当项目未声明包管理器版本时，mise 不会提供内置的“已知良好”包管理器版本。请改为在 `mise.toml`、`package.json` 或全局 mise 配置中配置版本。
