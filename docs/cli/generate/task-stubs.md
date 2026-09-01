<!-- @由 usage-cli 根据用法规范生成 -->
# `mise generate task-stubs`

- **Usage:** `mise generate task-stubs [FLAGS]`
- **Effect:** modifies state
- **Source code:** [`src/cli/generate/task_stubs.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/task_stubs.rs)

生成用于运行 mise 任务的垫片

默认情况下，这将构建类似于 ./bin/&lt;task> 的垫片。这些垫片可以与 `mise generate install-script` 配合使用，这样项目贡献者无需将 mise 安装到系统中即可执行 mise 任务。
当父任务和嵌套任务同时存在时，父任务垫片将写入 `<parent>/_default`。

## 标志
- **`-d --dir <DIR>`** — 用于在其中创建任务垫片的目录

  **默认值：** `bin`
- **`-m --mise-bin <MISE_BIN>`** — 运行任务垫片时使用的 mise 二进制文件路径。

  使用 `--mise-bin=./bin/mise` 来使用通过 `mise generate install-script` 生成的 mise 二进制文件

  在 Windows 上，路径会按原样运行，因此该脚本需要在其旁边有自己的启动器：
使用 `mise generate install-script --write ./bin/mise --windows` 生成它。默认的 `mise` 是一个裸名称，会从 PATH 中解析，因此不需要额外内容。

  **默认值：** `mise`
- **`--windows-launcher <WINDOWS_LAUNCHER>`** — 要在每个垫片旁边写入、用于在 Windows 上启动的内容

  `cmd` 会写入 `<task>.cmd`。cmd.exe 会在 `%*` 展开之前重新解析整行，因此当从 PowerShell 调用启动器时，包含 `& ^ | " %VAR%` 的参数无法完整传递给任务。

  `exe` 则会写入原生的 `<task>.exe`，它从每个 shell 接收的参数都不会发生变化。它是 Windows 构建版本中附带的 mise-shim.exe 的副本，因此只能在 Windows 上生成，并且会为通常会提交到版本控制的目录中的每个任务增加约 220KB。

  **可选值：** `cmd`、`exe`

  **默认值：** `cmd`
- **`-h --help`** — 打印帮助

示例：

```
$ mise tasks add test -- echo 'running tests'
$ mise generate task-stubs
$ ./bin/test
running tests
```
