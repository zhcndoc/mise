# 从 rtx 迁移而来

`mise` 以前叫做 `rtx`。之所以更名，是为了避免与 Nvidia 的显卡系列混淆。这不是法律问题，只是普遍的混淆。人们第一次听说这个项目，或者看到它被提及时，不会意识到这是一个 CLI 工具。它在 Google 上不太容易搜索到，在 Twitter、Slack 搜索之类的地方也有些麻烦。这是对 `rtx` 最主要的抱怨，很多人也相当直言不讳地表示不喜欢这个名字，原因就是这个。`rtx` 本来只是一个我打算之后再改掉的临时名称，但我一直没抽出时间去做。其实这件事本该更早发生，那时用户还更少；我为没有更早改名而道歉，因为我知道在某个阶段这很可能是必须要做的。

要从 `rtx` 升级到 `mise`，只需安装 `mise`，它应该会自动迁移内部目录，将 `~/.local/share/rtx/installs/*` 移动到 `~/.local/share/mise/installs/*`
（跳过无法移动的 python 和 ruby），将 `~/.local/share/rtx/plugins` 移动到 `~/.local/share/mise/plugins`，
并将 `~/.config/rtx` 移动到 `~/.config/mise`（如果目标不存在）。Python 和 Ruby
的安装需要使用 `mise install` 重新安装。

`mise` 在一段时间内仍会继续读取 `.rtx.toml` 文件，但最终会被弃用，所以请将它们重命名为 `mise.toml`。`mise` 不会读取 `RTX_*`
环境变量，因此这些也需要改为 `MISE_*`。任何使用本地 `.rtx` 或
`.config/rtx` 目录的内容都需要迁移到 `.mise`/`.config/mise`。

如果这次迁移并不完全无缝，我表示歉意，但我认为改成一个更容易搜索、也能避免混淆的名字，对每个人都更好。我也为这次改动过于突然表示歉意——我只是实在想不出一种既能“缓慢推进”这个变更、又能保留 GitHub 仓库的方式。

使用 `rtx-action` GitHub action 的用户需要切换到 `mise-action`（并且还要将主版本提升到 v2）。

如果你在搭建基础设施，而用户的 shell rc 脚本里可能仍在调用 `rtx activate`，你可以创建一个符号链接 `ln -s /path/to/mise /path/to/rtx`，这样 `rtx activate` 仍然可以正常工作。

对于 <https://mise.run>，我们使用 `~/.local/bin/mise`
作为可执行文件的 PATH，而不是旧目录 `~/.local/share/rtx/bin/mise`
，以让整体更简洁一些。如果你愿意，仍然可以通过设置
`MISE_INSTALL_PATH` 来继续使用旧的方式。

如果你使用 shims，那么需要执行一次 `mise reshim` 来更新这些 shims。

顺便感谢你尝试我这个小小的 CLI 工具。我发现开发这个项目
让我获得了极大的满足感，而且看到别人成功使用它也很开心。我对构建开发者工具有着
极大的热情，而 `mise` 的这些想法，是我在十多年里一直思考如何构建这样一个工具的成果。

如果你对 `mise` 或者我管理这个项目的方式不满意，哪怕只是很小一点，
也请告诉我。如果你愿意，可以[私下联系我](/about#contact)。我当然
不会介意，而且我更希望你说出来，而不是沉默。否则我永远不会知道。
