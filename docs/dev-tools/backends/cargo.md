# Cargo 后端

即使没有对应的 asdf 插件，你也可以直接从 [Cargo Crates](https://crates.io/) 安装包。

这部分代码位于 mise 仓库中的 [`./src/backend/cargo.rs`](https://github.com/jdx/mise/blob/main/src/backend/cargo.rs)。

## 依赖项

这依赖于已安装 `cargo`。你可以通过 [rustup](https://rustup.rs/) 将其安装到你的
系统中：

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

或者你也可以通过 mise 安装它：

```sh
mise use -g rust
```

## 用法

以下命令会安装 [eza](https://crates.io/crates/eza) 的最新版本，并将其设为 PATH 上的当前版本：

```sh
$ mise use -g cargo:eza
$ eza --version
eza - 现代、持续维护的 ls 替代品
v0.17.1 [+git]
https://github.com/eza-community/eza
```

版本将以以下格式写入 `~/.config/mise/config.toml`：

```toml
[tools]
"cargo:eza" = "latest"
```

### 使用 Git

你可以使用 `mise` 命令从 Git 仓库安装任意包。这允许你
安装特定的标签、分支或提交修订版：

```sh
# 安装特定标签
mise use cargo:https://github.com/username/demo@tag:<release_tag>

# 安装分支中的最新版本
mise use cargo:https://github.com/username/demo@branch:<branch_name>

# 安装特定提交修订版
mise use cargo:https://github.com/username/demo@rev:<commit_hash>
```

这将执行一个带有相应 Git 选项的 `cargo install` 命令。

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

Mise 会为每个已安装的 Cargo 版本记录生效的 `features`、`default-features`、`bin`、`crate` 和 `locked` 值。
更改其中任何选项都会重新安装相同版本，而不是重新使用使用不同选项构建或选择的二进制文件。
特性名称会被规范化，因此更改其顺序，或在字符串与数组之间切换，不会触发不必要的重新安装。

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

安装额外组件（作为 `cargo install --features` 传入）：

```toml
[tools]
"cargo:cargo-edit" = { version = "latest", features = "add" }
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

在构建 CLI 时使用 Cargo.lock（传入 `cargo install --locked`）。这是默认行为，
传入 `false` 可禁用：

```toml
[tools]
"cargo:https://github.com/username/demo" = { version = "latest", locked = false }
```

此选项不会导致 mise 跳过 `cargo-binstall`；当 cargo-binstall 报告没有可用的预构建构件时，
它会影响 mise 的 `cargo install` 回退流程。
