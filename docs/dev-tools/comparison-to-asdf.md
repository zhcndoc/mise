# 与 asdf 的比较

mise 可以作为 asdf 的直接替代品使用。它支持与 asdf 相同的 `.tool-versions` 文件，这些文件可能是你在使用 asdf 时用过的，并且可以通过 [asdf 后端](/dev-tools/backends/asdf.html) 使用 asdf 插件。

不过，它不会复用现有的 asdf 目录
（因此你需要重新安装它们，或者将它们移动过去），而且 100% 兼容性并不是设计目标。
话虽如此，
如果你是从 asdf-bash（0.15 及以下）迁移过来的，mise 实际上
[比 asdf-go（0.16 及以上）拥有更少的破坏性变更](https://asdf-vm.com/guide/upgrading-to-v0-16.html)
，尽管 100% 兼容性并不是 mise 的设计目标。

从 asdf 过来的普通用户通常会发现，mise 只是一个更快、更易用的 asdf。

:::tip
请务必查看 [environments](/environments/) 和 [tasks](/tasks/)，它们
是 mise 的主要组成部分，而 asdf 中没有对应功能。
:::

## 从 asdf 迁移到 mise

如果你要从 asdf 迁移到 mise，请
查看 [#我如何从 asdf 迁移](/faq.html#how-do-i-migrate-from-asdf) 以获取指导。

## go 版 asdf（0.16+）

asdf 已经用 go 进行了重写。由于截至本文撰写时（2025-01-01）这还是个相当新的变化，
我会把 0.16+ 版本的 asdf（我称之为“asdf-go”，区别于“asdf-bash”）的信息保留在
这一节，而本文其余部分将适用于 asdf-bash（0.15 及以下）。

就性能而言，mise 仍然比 go 版 asdf 更快，不过差距已经
小得多了。asdf 的速度很可能已经足够快，以至于 asdf-go 和 mise 之间的开销差异
对你来说甚至都不一定能察觉——毕竟还有很多人仍在使用 asdf-bash，
并声称自己甚至感觉不到它有多慢（别问我是怎么知道的）：

![asdf vs mise exec 性能对比图](./asdf-mise-exec-perf.jpg)

不过，我认为仅凭性能还不足以成为切换的充分理由，尤其是现在有了 asdf-go 之后。它
算是一个理由，但只是次要理由。mise 更好的安全性、更好的开发体验，以及不依赖
shims，这些都比性能更重要。

考虑到他们费了这么大劲重写 asdf——这也说明他们希望继续
维护它（顺便说一句，他们这么做很棒）。这也意味着，如果他们解决了 asdf 的一些问题，
这里写的部分内容可能会过时。

## 供应链安全

asdf 插件并不安全。这个问题在 [SECURITY.md](https://github.com/jdx/mise/blob/main/SECURITY.md) 中有解释，但简要来说就是，asdf 插件涉及 shell 代码，而这些代码本质上可以在你的机器上执行几乎任何操作。这是危险的代码。更糟糕的是，asdf 插件很少由工具供应商编写（而你无论如何都需要信任供应商才能使用该工具），这意味着你使用的每一个 asdf 插件，都需要信任某个随机开发者不会失控，也不会被黑客入侵后向插件发布带有漏洞利用的变更。

mise 仍然在某些工具上使用 asdf 插件，但我们正在积极减少这一数量，同时把相关内容迁移到 [mise-plugins 组织](https://github.com/mise-plugins)。看起来 asdf 也有类似的模型，通过他们的 asdf-community 组织来管理，不过事实并非如此。asdf 在插件作者将插件迁入 [asdf-community](https://github.com/asdf-community) 时，会给予他们该插件的提交权限，我觉得这在某种程度上违背了最初设立专门组织的目的。到 2025 年底，我希望注册表中不再存在任何不归我所有的 asdf 插件。

当供应商提供额外的安全验证能力时，我也一直在采用这些步骤，例如在 node 安装中进行 gpg 验证，以及为 aqua 工具提供原生的 Cosign/SLSA/Minisign/GitHub 证明验证。

## 用户体验

![CleanShot 2024-01-28 at 12 36 20@2x](https://github.com/jdx/mise-docs/assets/216188/47f381d7-1566-4b78-9260-3b85a21dd6ec)

有些命令在 asdf 中是相同的，但其他命令已经改过了。asdf 中所有可行的事情，在 mise 中也都应该可行，但语法可能会略有不同。mise 的命令更宽容，
比如支持模糊匹配，例如：`mise install node@20`。而在 asdf 中，虽然你 _可以_ 运行
`asdf install node latest:20`，但你不能在 `.tool-versions` 文件或许多其他
地方使用 `latest:20`。
在 `mise` 中，你可以在任何地方使用模糊匹配。

如果插件还没有安装，asdf 需要几个步骤来安装一个新的运行时，例如：

```sh
asdf plugin add node
asdf install node latest:20
asdf local node latest:20
```

在 `mise` 中，这一切都可以通过单个步骤完成：安装插件、安装运行时，
并设置版本：

```sh
mise use node@20
```

如果你已经有一个现成的 `.tool-versions` 文件，或者 `.mise.toml`，你可以用单个命令
安装所有插件和运行时：

```sh
mise install
```

我发现 asdf 尤其僵硬，而且难学。它还会做出一些奇怪的决定，比如
有 `asdf list all` 却又有 `asdf latest --all`（为什么一个是标志位，另一个却是位置参数？）。
`mise` 大量使用别名，所以你不需要记住到底是 `mise plugin add node` 还是
`mise plugin install node`。如果我能猜到你的意思，我就会尽量让 mise 以正确的方式响应。

话虽如此，asdf 也有很多很棒的地方。它是目前最好的多运行时管理器，
而且它的插件系统让我印象非常深刻。作者做出的多数设计决定都非常好。
我真正只有两个抱怨：shims，以及它是用 Bash 写的。

## 性能

asdf 做出了一个（在我看来）不太好的设计决定：使用位于运行时调用和运行时本身之间的 shim。比如：当你调用 `node` 时，它会调用一个 asdf shim 文件 `~/.asdf/shims/node`，然后这个文件再调用 `asdf exec`，接着才调用正确版本的 node。

这些 shim 的性能很差，每次运行时调用都会额外增加大约 120ms。`mise activate` 不使用 shim，而是直接更新 `PATH`，因此在直接调用二进制文件时不会有任何开销。正是这些 shim 让我写了这个工具。需要注意的是，在本 README 顶部的演示 GIF 中，出于这个原因，调用 `node -v` 时实际上并没有使用 `mise`。其性能与不使用 mise 直接运行 node 完全相同。

我认为 asdf 不可能修复这些问题。asdf 的作者写过一篇很棒的关于[性能问题](https://stratus3d.com/blog/2022/08/11/asdf-performance/)的文章。asdf 是用 bash 编写的，这当然使它很难做到高性能，不过我认为真正的问题在于 shim 的设计。我不认为在不彻底重写的情况下能修复这一点。

mise 确实会在目录发生变化时调用一个内部命令 `mise hook-env`，但因为它是用 Rust 编写的，所以非常快——在我的机器上大约需要 10ms。如果没有变化，则为 4ms；如果是完整重新加载，则为 14ms。

总之：asdf 在调用运行时时会增加开销（约 120ms），而 mise 只会在提示符加载时增加少量开销（约 5ms）。

## Windows 支持

asdf 完全无法在 Windows 上运行。使用 mise 时，采用非 asdf 后端的工具可以支持 Windows。
当然，这意味着工具
供应商必须提供 Windows 二进制文件，但如果他们提供了，而且后端不是 asdf，那么该工具就应该
能在 Windows 上运行。

## 安全性

asdf 插件是不安全的。它们通常由与提供底层工具的供应商没有任何关联的个人编写。
在可能的情况下，mise 不使用 asdf 插件，而是使用 aqua 和 github 等后端，
这些后端不需要单独的插件。

Aqua 工具包含原生的 Cosign/SLSA/Minisign/GitHub 证明验证功能，并内置于 mise 中。
有关更多信息，请参见 [SECURITY](https://github.com/jdx/mise/blob/main/SECURITY.md)。

## 命令兼容性

在几乎所有地方，你都可以使用在 asdf 中可用的完全相同的语法，不过这大概不会
出现在帮助信息或 CLI 参考中。如果你来自 asdf，并且习惯那种工作方式，你几乎总是可以在 mise 中使用相同的语法，例如：

```sh
mise install node 20.0.0
mise local node 20.0.0
```

更新（2025-01-01）：asdf-go（0.16+）实际上已经完全移除了 `asdf global|local`，转而支持
`asdf set`，而我们无法支持这一点，因为我们已经有一个名为 `mise set` 的命令。mise 命令
对 asdf-go 0.16+ 的兼容性可能不会那么好。

不过并不建议这样做。你几乎总是希望修改配置文件并安装工具，因此
`mise use node@20` 可以省去一个额外命令。另外，命令中的 “@” 更受推荐，因为它允许
你一次安装多个工具：`mise use|install node@20 node@18`。此外，还有一些边缘
情况，
我们无法明确判断到底使用的是哪种语法——或者至少要做到这一点非常有挑战——因此我们默认采用 mise 风格。虽然这类情况并不多，但 asdf 兼容性是以“尽力而为”的方式实现的，目的是让从 asdf 迁移过来的用户在依赖肌肉记忆时感觉更熟悉。确保 asdf 语法在所有场景下都可用并不是设计目标。

## 额外的后端

mise 除了支持 asdf 插件之外，还支持其他后端。例如，你可以直接从 cargo 和 npm 安装 CLI：

```sh
mise use -g cargo:ripgrep@14
mise use -g npm:prettier@3
```
