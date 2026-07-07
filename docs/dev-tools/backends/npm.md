# npm 后端

即使没有对应的 asdf 插件，你也可以直接从 [npmjs.org](https://npmjs.org/) 安装包。

相关代码位于 mise 仓库中的 [`./src/backend/npm.rs`](https://github.com/jdx/mise/blob/main/src/backend/npm.rs)。

## 依赖项

这依赖于已安装 `npm` 来解析包版本。
在默认的 `npm.package_manager = "auto"` 设置下，mise 在安装 npm 包时会在可用时使用
[`aube`](https://aube.jdx.dev/)，这类似于 pipx 后端在可用时使用 `uv` 的方式。
如果你使用 `aube`、`pnpm` 或 `bun` 作为包管理器，
那么也必须安装相应的包管理器。

npm 后端会在安装期间将 [`minimum_release_age`](/configuration/settings.html#minimum_release_age)
传递给传递依赖解析。这依赖于所配置的包管理器支持其原生的 release-age 标志：

- `aube` 使用其 `minimumReleaseAge` 设置
- `pnpm >= 10.16.0` 使用 `--config.minimumReleaseAge=<minutes>`
- `bun >= 1.3.0` 使用 `--minimum-release-age <seconds>`
- `npm >= 11.10.0` 使用 `--min-release-age=<days>`；`npm 6.9.0–11.9.x` 使用 `--before <timestamp>`（由于 `--min-release-age` 以天为粒度，子日级别的 `minimum_release_age` 窗口也会使用 `--before`）

如果你希望获得传递依赖保护，请安装并使用满足上述相应要求的包管理器版本。
较旧的版本在处理转发的参数时可能会失败。

下面是使用 mise 安装 `npm` 的方法：

```sh
mise use -g node
```

要安装 `aube`、`pnpm` 或 `bun`：

```sh
mise use -g aube
# 或
mise use -g pnpm
# 或
mise use -g bun
```

## 用法

以下命令会安装 [prettier](https://www.npmjs.com/package/prettier) 的最新版本
并将其设置为 PATH 上的当前生效版本：

```sh
$ mise use -g npm:prettier
$ prettier --version
3.1.0
```

版本将以以下格式设置在 `~/.config/mise/config.toml` 中：

```toml
[tools]
"npm:prettier" = "latest"
```

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置所列出的环境变量来配置这些内容。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="npm" :level="3" />

## 生命周期脚本

npm 后端一次只安装一个全局工具包。生命周期脚本是由包提供的命令，例如 `preinstall`、`install`、`postinstall` 和 `prepare`；允许它们就意味着允许所选包及其依赖在安装期间运行代码。

在默认的 `npm.package_manager = "auto"` 设置下，如果安装了 `aube`，mise 会通过 `aube` 进行安装。如果未安装 `aube`，mise 则通过 `npm` 进行安装。设置 `npm.package_manager = "aube"`、`"pnpm"`、`"bun"` 或 `"npm"` 会显式选择对应的包管理器。`allow_builds`、`aube_args`、`pnpm_args`、`bun_args` 和 `npm_args` 选项只影响实际使用的包管理器；一个包管理器的批准选项不会改变另一个包管理器的行为。

对于需要经过审核的依赖构建脚本的工具，请在 `aube`、`pnpm` 或 npm 11.16.0+ 中使用 `allow_builds`。

### `aube`

[`aube`](https://aube.jdx.dev/package-manager/lifecycle-scripts) 遵循 pnpm v11 的构建批准模型：除非明确加入允许列表，否则依赖生命周期脚本会被拒绝。对于经过审核的依赖构建，请使用 `allow_builds`：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

`allow_builds` 会作为每个包一个 `--allow-build=<pkg>` 标志传递给 `aube add --global`。
其他原始 aube 标志请使用 `aube_args`。
将 `allow_builds = true` 设置为传递 `--dangerously-allow-all-builds`，表示你明确接受每个依赖的构建脚本都可能运行。

### `pnpm`

[`pnpm`](https://pnpm.io/cli/add#--allow-build) 为依赖生命周期脚本使用构建批准设置。对于经过审核的依赖构建，请使用 `allow_builds`：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

`allow_builds` 会作为每个包一个 `--allow-build=<pkg>` 标志传递给 `pnpm add --global`。
`--allow-build` 于 pnpm v10.4.0 中添加，并受 pnpm v10.4.0+ 和 v11.x 支持。
将 `allow_builds = true` 设置为传递 `--dangerously-allow-all-builds`，表示你明确接受每个依赖的构建脚本都可能运行。

[`pnpm approve-builds`](https://pnpm.io/cli/approve-builds) 于 v10.1.0 中添加，但不建议从 postinstall 中运行 `approve-builds`。`pnpm approve-builds -g` 在 pnpm v10.4.0 到 v10.x 期间对全局包有效，并在 v11.0.0 中被移除；对于 pnpm v10.4.0+ 或 v11.x 的全局安装，请使用 `allow_builds = ["<pkg>"]`。

### `bun`

[`bun`](https://bun.sh/docs/pm/lifecycle) 默认不会执行任意依赖生命周期脚本。Bun 的项目安装控制包括 `trustedDependencies`、`bun add --trust` 和 `bun pm trust`，但 npm 后端的 Bun 路径是全局安装，不会写入按传递依赖划分的 `trustedDependencies` 允许列表。

mise 不会自动添加 Bun 的 [`--trust`](https://bun.sh/docs/pm/cli/add#trusted-dependencies) 标志。当你接受更广泛的安装期脚本信任时，可以通过 `bun_args` 显式传递它：

```toml
[tools]
"npm:some-tool" = { version = "latest", bun_args = "--trust" }
```

### `npm`

`npm` 通常默认运行生命周期脚本。mise 对于基于 npm 的安装，默认传递
[`--ignore-scripts=true`](https://docs.npmjs.com/cli/v11/using-npm/config/#ignore-scripts)。

在 npm 11.16.0+ 中，`allow_builds = ["<pkg>"]` 会作为
[`--allow-scripts=<pkg>`](https://docs.npmjs.com/cli/v11/using-npm/config/#allow-scripts) 传递，用于经过审核的全局安装。当使用 `allow_builds` 且 npm 支持 `--allow-scripts` 时，mise 不会传递 `--ignore-scripts=true`，因为 npm 的 `ignore-scripts` 设置优先于允许列表。

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

将 `allow_builds = true` 设置为传递
[`--dangerously-allow-all-scripts`](https://docs.npmjs.com/cli/v11/using-npm/config/#dangerously-allow-all-scripts)，表示你明确接受每个依赖的构建脚本都可能运行。

对于较旧的 npm 版本，mise 会保留 `--ignore-scripts=true`；当你接受安装图中的每个包都可以运行生命周期脚本时，请使用 `aube`/`pnpm`、升级 npm，或通过 `npm_args` 选择进入 npm 的默认脚本行为：

```toml
[tools]
"npm:some-tool" = { version = "latest", npm_args = "--ignore-scripts=false" }
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `npm` 后端。这些内容放在 `mise.toml` 的 `[tools]` 中。

### `allow_builds`

当 `settings.npm.package_manager = "aube"`、`"pnpm"` 或 npm 11.16.0+ 时，应批准其依赖生命周期构建脚本的包。请用此选项替代在 `aube_args`、`pnpm_args` 或 `npm_args` 中逐个写出特定于包管理器的批准标志。

例如，要允许一个已验证的依赖构建脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild"] }
```

对于多个已审核的依赖构建：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = ["esbuild", "sharp"] }
```

要允许安装时的所有依赖构建脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", allow_builds = true }
```

`allow_builds` 不会影响 `bun` 安装，因为 mise 的 Bun 路径是全局安装，不会为每个传递依赖写入 `trustedDependencies` 允许列表。对于 npm 安装，`allow_builds` 需要 npm 11.16.0+。

### `aube_args`

当 `settings.npm.package_manager = "aube"` 时，传递给 `aube add --global` 的额外参数。
这些是原样使用的用户提供参数。

例如，使用 aube 的仅追加报告模式安装 `npm`：

```toml
[tools]
"npm:npm" = {
  version = "latest",
  aube_args = "--reporter append-only",
}
```

### `pnpm_args`

当 `settings.npm.package_manager = "pnpm"` 时，传递给 `pnpm` 安装的额外参数。
这些是原样使用的用户提供参数。

例如，设置 pnpm 的日志级别：

```toml
[tools]
"npm:some-tool" = { version = "latest", pnpm_args = "--loglevel=warn" }
```

### `bun_args`

当 `settings.npm.package_manager = "bun"` 时，传递给 `bun` 安装的额外参数。
这些是原样使用的用户提供参数。mise 不会自动添加 `--trust`。

例如，传递 Bun 的广泛信任标志：

```toml
[tools]
"npm:some-tool" = { version = "latest", bun_args = "--trust" }
```

### `npm_args`

当 `settings.npm.package_manager = "npm"` 时，传递给 `npm` 安装的额外参数。
这些是原样使用的用户提供参数。例如，要启用 npm 生命周期脚本：

```toml
[tools]
"npm:some-tool" = { version = "latest", npm_args = "--ignore-scripts=false" }
```
