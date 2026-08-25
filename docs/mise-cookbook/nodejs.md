# Mise + Node.js 食谱

以下是一些使用 mise 管理 [Node.js](/lang/node.html) 项目的技巧。

## 使用 Node.js 入门

要安装 Node.js，可以在目录中使用以下命令：

```shell
mise use node
```

这将安装最新版本的 Node.js，并创建一个包含以下内容的 `mise.toml` 文件：

```toml
node = "latest"
```

如果你想改为全局安装 Node.js（例如 node v26），可以使用以下命令：

```shell
mise use -g node@26
```

## 将 node modules 二进制文件添加到 PATH

在安装 `package.json` 中指定的 Node.js 包时，通常需要使用 `npx` 或二进制文件的完整路径。例如：

```shell
npm install --save eslint
eslint --version # 不起作用
npx eslint --version # 可用
```

借助 `mise`，你可以将 node modules 二进制文件添加到 `PATH`。这样，通过 npm 安装的 CLI 就可以不使用 `npx` 直接使用了。

```toml [mise.toml]
[env]
_.path = ['{{config_root}}/node_modules/.bin']
```

示例：

```shell
npm install --save eslint
eslint --version # 可用
```

## 示例 Node.js 项目

```toml [mise.toml]
min_version = "2024.9.5"

[env]
_.path = ['{{config_root}}/node_modules/.bin']

# 使用从当前目录派生的项目名称
PROJECT_NAME = "{{ config_root | basename }}"

# 设置 node 模块二进制文件的路径
BIN_PATH = "{{ config_root }}/node_modules/.bin"

NODE_ENV = "{{ env.NODE_ENV | default(value='development') }}"

[tools]
# 使用指定版本安装 Node.js
node = "{{ env['NODE_VERSION'] | default(value='lts') }}"

# 如有需要，安装一些全局 npm 包
"npm:typescript" = "latest"
"npm:eslint" = "latest"
"npm:jest" = "latest"

[tasks.install]
alias = "i"
description = "安装 npm 依赖"
run = "npm install"

[tasks.start]
alias = "s"
description = "启动开发服务器"
run = "npm run start"

[tasks.lint]
alias = "l"
description = "运行 ESLint"
run = "eslint src/"

[tasks.test]
description = "运行测试"
alias = "t"
run = "jest"

[tasks.build]
description = "构建项目"
alias = "b"
run = "npm run build"

[tasks.info]
description = "打印项目信息"
run = '''
echo "Project: $PROJECT_NAME"
echo "NODE_ENV: $NODE_ENV"
'''
```

## `pnpm` 示例

此示例使用 `pnpm` 作为包管理器。它要求在 `package.json` 中通过
`devEngines.packageManager` 固定 pnpm 版本：

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

通过此设置，在 Node.js 项目中开始使用只需运行 `mise dev`：

- `mise` 将安装正确版本的 Node.js
- `mise` 将安装 `package.json` 中声明的 `pnpm` 版本
- `pnpm install` 将在 `node --run dev` 之前运行

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
