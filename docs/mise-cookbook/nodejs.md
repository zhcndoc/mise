# Mise + Node.js 食谱

以下是一些使用 mise 管理 [Node.js](/lang/node.html) 项目的技巧。

## 使用 Node.js 入门

要在某个目录中安装 Node.JS，你可以使用以下命令：

```shell
mise use node
```

这将安装最新版本的 Node.js，并创建一个包含以下内容的 `mise.toml` 文件：

```toml
node = "latest"
```

如果你想改为全局安装 Node.JS（例如，node v26），你可以使用以下命令：

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

此示例使用 `pnpm` 作为包管理器。如果锁文件没有更改，这将跳过安装依赖项。

```toml [mise.toml]
[tools]
node = '24'

[hooks]
# 启用 corepack 将安装 `package.json` 中指定的 `pnpm` 包管理器
# 另外，你也可以使用 mise 安装 `pnpm`
postinstall = 'npx corepack enable'

[settings]
# 必须启用此项才能使 hooks 生效
experimental = true

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

使用这套配置，在 NodeJS 项目中开始使用只需运行 `mise dev`：

- `mise` 将安装正确版本的 NodeJS
- `mise` 将启用 `corepack`
- `pnpm install` 将在 `node --run dev` 之前运行
