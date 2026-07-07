# Shim

将 `mise` 上下文（开发工具、环境变量）加载到你的 shell 中有几种方式：

- `mise activate`（也称为 [“mise PATH 激活”](#path-activation)），每次显示提示符时，`mise` 都会更新你的 `PATH` 和其他环境变量。
- [`mise activate --shims`](#mise-activate-shims)，使用 shim 来加载开发工具。
- 对于临时命令或任务，使用 [`mise x|exec`](/cli/exec) 或 [`mise r|run`](/cli/run)（参见 [“既不是 shims 也不是 PATH”](#neither-shims-nor-path)）。

本页将帮助你理解这些方法之间的区别，以及如何使用它们。特别是，它将帮助你决定在 shell 中应该使用 shims 还是 `mise activate`。

## `mise` 激活方法概览 {#overview}

### PATH 激活 {#path-activation}

Mise 的“PATH”激活方法会在每次显示提示符时更新环境变量。特别是，它会更新 `PATH` 环境变量，供你的 shell 用来搜索可运行的程序。

::: info
当你将 `echo 'eval "$(mise activate bash)"' >> ~/.bashrc` 这一行添加到 shell 的 rc 文件中时，使用的就是这种方法（在这个例子中是 bash）。
:::

例如，默认情况下，你的 `PATH` 变量可能如下所示：

```sh
echo $PATH
/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

如果使用 [`mise activate`](/cli/activate.html)，`mise` 会自动将所需工具添加到 `PATH` 中。

```sh
PATH="$HOME/.local/share/mise/installs/python/3.15.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
```

在这个例子中，python 的 `bin` 目录被添加到了 `PATH` 的开头，使其在当前 shell 会话中可用。
当启用像 `python = "3.15"` 或 `node = "26"` 这样的模糊版本时，这个路径可能会使用请求版本的符号链接，例如 `~/.local/share/mise/installs/python/3.15/bin`，而不是完全解析后的补丁版本。

虽然 `mise` 的 `PATH` 设计在大多数情况下都很有效，但在某些场景下，`shims` 更为合适。这种情况通常出现在你没有使用交互式 shell 时（例如在 IDE 或脚本中使用 `mise`）。

### Shims {#mise-activate-shims}

::: warning
`mise activate --shims` 不支持 `mise activate` 的所有功能。<br>
更多信息请参阅 [shims vs path](/dev-tools/shims.html#shims-vs-path)。
:::

使用 shims 时，`mise` 会将小型可执行文件（`shims`）放入一个包含在你的 `PATH` 中的目录。你可以把 `shims` 理解为指向 mise 二进制文件的符号链接，它们会拦截命令并加载相应的上下文。

```sh
ls -l ~/.local/share/mise/shims/node
# [...] ~/.local/share/mise/shims/node -> ~/.local/bin/mise
```

默认情况下，shim 目录位于 `~/.local/share/mise/shims`（在 Windows 上：`%LOCALAPPDATA%\mise\shims`）。在安装工具时（例如 `node`），`mise` 会在 `shims` 目录中为该工具提供的每个二进制文件添加一些条目（例如 `~/.local/share/mise/shims/node`）。

```sh
mise use -g node@20
npm install -g prettier@3.1.0

~/.local/share/mise/shims/node -v
# v20.0.0
~/.local/share/mise/shims/prettier -v
# 3.1.0
```

为了避免直接调用 `~/.local/share/mise/shims/node`，你可以将 `shims` 目录添加到你的 `PATH` 中。

```sh
export PATH="$HOME/.local/share/mise/shims:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
```

这样实际上会让所有开发工具在你当前的 shell 会话以及非交互式环境中都可用。

::: tip
[`mise activate --shims`](/cli/activate.html#shims) 是将 shims 目录添加到 PATH 的简写方式。
:::

## 如何将 mise shims 添加到 PATH

将 `shims` 添加到 `PATH` 的推荐方法是在你的某个 shell 初始化文件中调用 [`mise activate --shims`](/cli/activate.html#shims)。例如，你可以这样做：

::: code-group

```sh [bash]
# 请注意，bash 会从 ~/.profile 或 ~/.bash_profile 中读取，若后者存在
# 因此，你可能需要检查系统中定义的是哪个文件，并且只追加到已有文件中
echo 'eval "$(mise activate bash --shims)"' >> ~/.bash_profile # 这会为非交互式会话进行设置
echo 'eval "$(mise activate bash)"' >> ~/.bashrc       # 这会为交互式会话进行设置
```

```sh [zsh]
echo 'eval "$(mise activate zsh --shims)"' >> ~/.zprofile # 这会为非交互式会话进行设置
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc    # 这会为交互式会话进行设置
```

```sh [fish]
echo 'mise activate fish --shims | source' >> ~/.config/fish/config.fish
echo 'mise activate fish | source' >> ~/.config/fish/config.fish
```

:::

在此示例中，我们在非交互式 shell 配置文件（如 `.bash_profile` 或 `.zprofile`）中使用 [`mise activate --shims`](/cli/activate.html#shims)，并在交互式 shell 配置文件（如 `.bashrc` 或 `.zshrc`）中使用 `mise activate`

::: info
[`mise activate`](/cli/activate.html) 会将 shims 目录从 `PATH` 中移除，因此你可以放心地先在 shell 配置文件中调用 [`mise activate --shims`](/cli/activate.html#shims)，之后再在交互式会话中调用 `mise activate`。
:::

- 如果你愿意，也可以只使用 `shims`，不过这会带来一些[限制](/dev-tools/shims.html#shims-vs-path)。
- [`mise activate --shims`](/cli/activate.html#shims) 的另一种替代方案是使用 `export PATH="$HOME/.local/share/mise/shims:$PATH"`。如果在那一时刻 `mise` 还不可用，这会很有帮助。

### mise reshim

要强制让 `mise` 更新 `shims` 目录中的内容，你可以手动调用 `mise reshim`。

请注意，`mise` 已经会在工具安装/更新/移除时自动运行一次 reshim，所以在这些场景下你不需要使用它。对于大多数工具（例如 `npm`），默认情况下也会执行此操作。

`mise reshim` 只会创建/移除 shims。有些用户有时会把它当作一个“修复一下”的按钮，但它只在 `~/.local/share/mise/shims` 中缺少本该存在的内容时才有必要。

不要在 `mise` 目录中添加额外的可执行文件，`mise` 会在下一次 reshim 时将它们删除。

## Shims 与 PATH {#shims-vs-path}

当使用 shims **而不是** [PATH 激活](#path-activation) 时，会受到以下功能影响：

- 在 mise 中定义的 [环境变量](/environments/) 仅对 mise 工具可用
- 大多数 [hooks](/hooks.html) 不会触发
- unix 的 `which` 命令会指向 shim，从而遮蔽真实可执行文件的位置

一般来说，在 _交互式_ 场景中，推荐使用 PATH（`mise activate`）而不是 shims。

`activate` 的工作方式是：每次提示符显示时，mise-en-place 会判断应该设置哪些 PATH 和其他环境变量，并将它们导出。这也是它不适用于脚本等非交互式场景的原因。由于提示符不会显示，所以你必须手动调用 `mise hook-env` 来让 mise 更新环境变量。（不过也有例外，参见 [hook on `cd`](#hook-on-cd)）

### 环境变量与 shims

shims 的一个缺点是，环境变量只有在调用 shim 时才会被加载。这意味着如果你在 `mise.toml` 中设置了一个[环境变量](/environments/)，它只会在调用 shim 时生效。

下面的示例只适用于 `mise activate`：

```sh
$ mise set NODE_ENV=production
$ echo $NODE_ENV
production
```

但这个在两种情况下都可以工作：

```sh
$ mise set NODE_ENV=production
$ node -p process.env.NODE_ENV
production
```

此外，即使你不需要任何 mise 工具，也可以使用 [`mise x|exec`](/cli/exec.html) 和 [`mise r|run`](/cli/run.html) 来获取环境变量：

```sh
$ mise set NODE_ENV=production
$ mise x -- bash -c "echo \$NODE_ENV"
production
$ mise r some_task_that_uses_NODE_ENV
production
```

::: tip
一般来说，[任务](/tasks/) 是确保始终加载 mise 环境的好方法。
:::

### Hooks 与 shims

[hooks](/hooks.html) 中的 `cd`、`enter`、`exit` 和 `watch_files` 只有在使用 `mise activate` 时才会触发。不过 `preinstall` 和 `postinstall` 仍然可以与 shims 一起工作，因为它们不需要 shell 集成。

### `which`

`which` 是一个许多用户都觉得很有价值的命令。使用 shims 实际上会“破坏” `which`，使它显示 shim 的位置。一个解决方法是使用 `mise which`，它会显示真实位置。有些用户更喜欢运行 `which node` 后得到一个包含版本号的真实路径。例如：

```sh
$ which node
~/.mise/installs/node/20/bin/node
```

### 性能

说实话，使用 shims 和使用 `mise activate` 在性能上你大概率不会察觉到差异。

- 由于 `mise activate` 会在每次提示符显示时运行 mise，因此每次提示符出现时都会付出几毫秒的开销。无论你是否正在使用 mise 工具，每次运行任何命令时都会承担这部分代价。它确实有一些短路逻辑来提高速度，如果没有变化会更快，但除非你的环境非常复杂，否则帮助不大。
- shims 的性能表现基本相同，但它们是在 shim 被调用时运行。这使得某些情况更好，而某些情况更差。

如果你像这样在 bash 脚本中调用 shim：

```sh
for i in {1..500}; do
    node script.js
done
```

那么你每次在循环中调用它时都会付出 mise 的开销。然而，如果你做同样的事情，但在 shim 内部调用子进程（比如 node 再创建一个 node 子进程），你就不会再次付出新的开销。这是因为当 shim 被调用时，mise 会为所有工具设置好带有 PATH 的环境，而这些 PATH 条目会位于 shim 目录之前。

换句话说，从性能角度看，哪个更好完全取决于你如何调用 mise。实际上，大多数用户不会察觉到 `mise activate` 在终端上带来的几毫秒延迟。关于如何诊断性能问题，请参见 [故障排除：缓慢的 shell 提示符](/troubleshooting.html#slow-shell-prompts)。

这两者唯一的区别在于，使用 `hook-env` 时，如果你更改了目录，就需要再次调用它；而使用 shims 则不需要。`mise activate` 会自动移除 shims 目录，因此你无需担心 PATH 中的 shims 处理问题。

## 既不使用 shims 也不使用 PATH {#neither-shims-nor-path}

加载 mise 环境有很多种方式，而且都不需要二者之一，主要包括：
[`mise x|exec`](/cli/exec.html)、[`mise r|run`](/cli/run.html) 或 [`mise en`](/cli/en.html)。

这些方式都会在执行某些操作之前加载所有工具和环境变量。这可能
是理想的，因为你完全不需要修改 shell 的 rc 文件，而且环境始终是显式加载的。
有些人可能会觉得这是一种“干净”的工作方式。

明显的缺点是，每当想使用 `mise` 时，都需要在前面加上 `mise exec|run`。不过，你可以很容易地将它们别名为 `mx|mr`。

- 如果你更喜欢“精确”而不是“省事”，这就是你会偏好的方式。
- 又或者，如果你只是想在单个项目中使用 mise，因为你的团队就是这么用的，并且你倾向于
  不把它用来管理系统上的其他任何东西。为这种场景使用 shell 扩展就有点过度了。

## 对 `cd` 的钩子 {#hook-on-cd}

对于某些 shell（`bash`、`zsh`、`fish`、`xonsh`），`mise` 会挂钩到 `cd` 命令，而在其他 shell 中，它只会在提示符显示时运行。这依赖于 `zsh` 中的 `chpwd`、`bash` 中的 `PROMPT_COMMAND`、`fish` 中的 `fish_prompt` 以及 `xonsh` 中的 `on_chdir`。

这样做的好处是它不会运行得那么频繁，不过由于 `mise` 是用 Rust 编写的，执行 `mise` 的成本可以忽略不计（只有几毫秒）。

::: details 在一行中运行多个命令

如果你像下面这样在一行中运行一组命令：

```sh
cd ~
cd ~/src/proj1 && node -v && cd ~/src/proj2 && node -v
```

如果使用 `mise activate`，在没有 `cd` 钩子的 shell 中，即使目录已经切换，这也会使用 `~` 中的工具，而不是 `~/src/proj1` 或 `~/src/proj2` 中的工具。

这是因为，在这些 shell 中，`mise` 是在提示符即将显示之前运行的，而在其他 shell 中，它会挂钩到 `cd`。请注意，shims 对上面的内联示例始终都能正常工作。

:::

## 在 rc 文件中使用 mise

像 `.zshrc` 这样的 rc 文件比较特殊。它是一个脚本，但也只会在交互式会话中运行。如果你需要在 rc 文件中访问 mise 提供的工具，你有 2 种选择：

::: code-group

```sh [hook-env]
eval "$(mise activate zsh)"
eval "$(mise hook-env -s zsh)"
node some_script.js
```

```sh [shims]
eval "$(mise activate zsh --shims)" # 应该放在第一行
eval "$(mise activate zsh)"
node some_script.js
```

:::
