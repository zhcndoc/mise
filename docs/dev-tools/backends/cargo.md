---
description: "从 crates.io 或 Git 安装 Rust 命令行工具，可使用二进制文件或 Cargo 构建。"
---

# Cargo 后端

`cargo` 后端从 [crates.io](https://crates.io/)
或 Git 仓库安装 Rust 命令行应用。它可以通过 cargo-binstall 使用已发布的二进制文件，也可以使用 Cargo 构建
crate。应用依赖项应写入你的 `Cargo.toml`。

这部分代码位于 mise 仓库中的 [`./src/backend/cargo.rs`](https://github.com/jdx/mise/blob/main/src/backend/cargo.rs)。

## 依赖项

为源码构建安装 Rust/Cargo。同时还必须提供可用的链接器以及 crate
所需的任何原生库。预构建安装可以避免编译步骤；有关 cargo-binstall 的选择和回退，请参阅[设置](#设置)。

## 用法

在当前项目中同时声明 Rust 和 eza：

```sh
mise use rust@stable cargo:eza
mise exec -- eza --version
```

这会在 `mise.toml` 中记录这两个工具：

```toml
[tools]
rust = "stable"
"cargo:eza" = "latest"
```

为 `mise use` 添加 `-g` 以进行全局配置。运行
`mise ls-remote cargo:eza` 来选择一个发行版，或使用
`mise use cargo:eza@VERSION` 固定版本，将 `VERSION` 替换为列出的发行版。

### 使用 Git

你也可以从 Git 仓库安装软件包。这使你可以
安装特定的标签、分支或提交修订。替换下面的仓库和大写占位符；为完整的工具参数加上引号：

```sh
# 安装特定标签
mise use 'cargo:https://github.com/username/demo@tag:TAG'

# 安装分支中的最新版本
mise use 'cargo:https://github.com/username/demo@branch:BRANCH'

# 安装特定提交修订
mise use 'cargo:https://github.com/username/demo@rev:COMMIT'
```

这会使用相应的 Git 选项运行 `cargo install`。

## 设置

使用 `mise settings set [VARIABLE]=[VALUE]` 或通过设置所列的环境变量来配置这些项。

某些 Cargo 设置只有在 mise 运行 `cargo install` 时才有意义。如果 `cargo-binstall`
安装的是预编译二进制文件，那么 Cargo 的构建设置和 `cargo install` 行为不会影响该
工件。当你需要让 Cargo 设置控制安装时，请将 `cargo.binstall = false`。

当 mise 使用外部 `cargo-binstall` 时，它会禁用 cargo-binstall 的 `compile` 策略。如果
cargo-binstall 报告没有可用的预编译工件（退出代码为 94），mise 会自行运行
`cargo install`。其他 cargo-binstall 错误不会触发此回退。当
`cargo.binstall_only = true` 时，没有显式 Git 源的 Cargo 工具必须由 cargo-binstall
安装：mise 不会回退到 `cargo install`，而需要 `cargo install` 的选项会产生错误。显式
Git 源不受影响，因为它们始终使用 `cargo install --git`，也永远不符合 cargo-binstall
的使用条件。

默认情况下，mise 会禁用外部 `cargo-binstall` 使用第三方
[cargo-quickinstall](https://github.com/cargo-bins/cargo-quickinstall) 工件主机。这与 crate
作者的 GitHub 发布内容以及 `package.metadata.binstall` 中声明的工件相互独立。结合始终
禁用的 compile 策略，外部 cargo-binstall 的默认标志为
`--disable-strategies compile,quick-install`。设置 `cargo.binstall_quickinstall = true` 可
启用 quick-install；此时 mise 会传递 `--disable-strategies compile`。此设置不会影响 mise
原生的 `cargo.binstall_native` 路径，该路径不使用 quickinstall。设置 `cargo.binstall = false`
可完全禁用 binstall。

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="cargo" :level="3" />

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `cargo` 后端——这些内容
应写入 `mise.toml` 中的 `[tools]`。

当 `cargo-binstall` 可用时，mise 会将其用于注册表安装，除非某个工具选项需要
`cargo install` 从源码构建。

对于不会跳过 `cargo-binstall` 的选项，mise 会禁用 cargo-binstall 的编译策略，并且仅当
cargo-binstall 以代码 94 退出、报告没有可用的预构建构件时，才自行运行 `cargo install`。

mise 会将生效的 `features`、`default-features`、`bin`、`crate` 和 `locked` 值与
每个已安装的 Cargo 版本一起记录。更改其中任何选项都会重新安装相同版本，而不是
重复使用使用不同选项构建或选择的二进制文件。特性名称会被标准化，因此更改其顺序
或在字符串与数组之间切换不会触发不必要的重新安装。

| 选项                       | `cargo-binstall` 行为                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `features`                 | 跳过 `cargo-binstall`；需要 `cargo install --features`。                                      |
| `default-features = false` | 跳过 `cargo-binstall`；需要 `cargo install --no-default-features`。                          |
| `bin`                      | 透传给 `cargo-binstall`；不会跳过它。                                                        |
| `crate`                    | 在适用时不会跳过 `cargo-binstall`。Git 安装始终使用 `cargo install`。                         |
| `locked`                   | 透传给 `cargo-binstall`；不会跳过它。                                                        |

### `install_env`

为 `cargo install` 或 `cargo-binstall` 命令设置环境变量：

```toml
[tools]
"cargo:eza" = { version = "latest", install_env = { CARGO_NET_GIT_FETCH_WITH_CLI = "true" } }
```

### `features`

启用 crate 特性（作为 `cargo install --features` 传入）：

```toml
[tools]
"cargo:sqlx-cli" = { version = "latest", features = ["postgres", "rustls"] }
```

此选项需要 `cargo install`；当它被设置时，mise 会跳过 `cargo-binstall`。

### `default-features`

禁用默认特性（作为 `cargo install --no-default-features` 传入）：

```toml
[tools]
"cargo:cargo-edit" = { version = "latest", default-features = false }
```

将其设置为 `false` 需要 `cargo install`；在这种情况下，mise 会跳过 `cargo-binstall`。

### `bin`

在有多个可用时，选择要安装的 CLI bin 名称（作为 `cargo install --bin` 传入）：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "tag:v1.0.0", bin = "demo" }
```

`cargo-binstall` 支持此选项，因此不会导致 mise 跳过 `cargo-binstall`。

### `crate`

在有多个可用时，选择要安装的 crate 名称（作为
`cargo install --git=<repo> <crate>` 传入）：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "tag:v1.0.0", crate = "demo" }
```

在适用时，此选项不会导致 mise 跳过 `cargo-binstall`。Git 安装本来就使用
`cargo install`。

### `locked`

构建 CLI 时使用 Cargo.lock（传入 `cargo install --locked`）。这是默认设置；
传入 `false` 可将其禁用：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "tag:v1.0.0", locked = false }
```

此选项不会导致 mise 跳过 `cargo-binstall`；当 cargo-binstall 报告没有可用的预构建工件时，
它会影响 mise 的 `cargo install` 回退行为。

## 故障排除

- **编译或链接器失败：**检查第一个 Cargo 错误以及 crate 的原生构建要求。选择特性会强制进行源码构建。
- **找不到可执行文件：**软件包必须发布一个二进制目标；从工作区中选择时使用 `bin` 或 `crate`。
- **意外的预构建二进制文件：**检查 binstall 设置。当你需要使用 Cargo 的配置进行本地构建时，设置 `cargo.binstall = false`。

`locked` 工具选项在构建时使用 crate 的 `Cargo.lock`。它与
[mise.lock](/dev-tools/mise-lock.html) 分开，后者记录由 mise 安装的 CLI 版本。
