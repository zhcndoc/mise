# direnv <Badge type="warning" text="已弃用" />

[direnv](https://direnv.net) 和 mise 都会根据目录管理环境变量。由于它们都会在各自的“hook”命令运行前后分析当前的环境变量，因此它们有时会彼此冲突。

::: warning
官方立场是不应将 direnv 与 mise 一起使用。由不兼容性引起的问题不被视为 bug，也不会接受用于提升 direnv 兼容性的 PR。
尽管这是官方立场，实际上在一些简单场景下，比如设置彼此无关的环境变量，mise 和 direnv 还是可以共存的。
任何涉及 PATH 的内容——而这正是人们使用这两个工具时的大多数用途——都会引发问题。
:::

如果你遇到问题，很可能与 PATH 的顺序有关。这意味着，只有当你试图同时用 direnv 和 mise 管理同一个工具时，这才会真正成为问题。例如，
你可能在 `.envrc` 中使用 `layout python`，但同时也在维护一个包含 python 的 `.tool-versions` 文件。

direnv 更常见的用法是设置一些任意的环境变量，或者把不相关的二进制文件添加到 PATH。在这些情况下，mise 不会干扰 direnv。

## direnv 中的 mise（在 `.envrc` 中使用 `use mise`）

::: warning
`use mise` 已被弃用，不再受支持。
:::

如果你确实遇到 `mise activate` 的问题，或者只是想以另一种方式使用 direnv，
这是一种更简单的设置，出问题的可能性更小——代价是功能会少一些。

如果你想将 direnv 的 `layout python` 与 mise 一起使用，可能需要这样做。否则会有
一些情况下 mise 会覆盖 direnv 的 PATH。`use mise` 可确保 direnv 始终拥有
控制权。

为此，先使用 `mise` 生成一个可在 `.envrc` 文件中使用的 `use_mise` 函数：

```sh
mise direnv activate > ~/.config/direnv/lib/use_mise.sh
```

然后在你的 `.envrc` 文件中添加以下内容：

```sh
use mise
```

现在，direnv 会调用 mise 来导出其环境变量。你需要确保将 `use_mise`
添加到所有使用 mise 的项目中（或者使用 direnv 的 `source_up` 从子目录加载它）。你也
可以将 `use mise` 添加到 `~/.config/direnv/direnvrc`。

注意，在这种方法下，direnv 通常不会知道要刷新 `.tool-versions` 文件，
除非它们与 `.envrc` 文件位于同一级别。出于这个原因，你大概率总是希望在
`.tool-versions` 旁边放一个 `.envrc` 文件。为了让这件事更容易管理，我建议你
干脆不要实际使用 `.tool-versions`，而是直接在 `.envrc` 中设置环境变量：

```sh
export MISE_NODE_VERSION=20.0.0
export MISE_PYTHON_VERSION=3.11
```

当然，如果你使用 `mise activate`，那么这些步骤就不是必需的，你可以像
没有使用 direnv 一样使用 mise。

如果你仍然遇到困难，也可以尝试使用 [shims 方法](dev-tools/shims.md)。

### 你需要 direnv 吗？

mise 能够在大多数使用场景中替代 direnv。这也是 mise 包含环境变量管理支持和
用于 python 的 [virtualenv](lang/python.md#automatic-virtualenv-activation)
支持的原因，这些都通过 `mise.toml` 来配置。
