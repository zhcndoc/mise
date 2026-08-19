<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate bootstrap`

- **用法**: `mise generate bootstrap [FLAGS]`
- **作用**: 修改状态
- **源代码**: [`src/cli/generate/bootstrap.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/bootstrap.rs)

生成一个用于下载并执行 mise 的脚本

这适用于贡献者可能尚未安装 mise 的项目。

## 标志

### `-l --localize`

将 mise 的内部目录（如 MISE_DATA_DIR 和 MISE_CACHE_DIR）隔离到项目中的 `.mise` 目录中

如果用户可能在项目外使用不同版本的 mise，则这是必要的。

### `-V --version <VERSION>`

指定要获取的 mise 版本

### `-w --write <WRITE>`

不将脚本输出到 stdout，而是写入文件并使其可执行

### `--localized-dir <LOCALIZED_DIR>`

用于放置本地化数据的目录

**默认：** `.mise`

### `--windows`

同时写入一个 Windows 启动器，即 `<WRITE>.cmd`

Windows 无法执行 `#!/usr/bin/env bash` 脚本，因此在 Windows 上克隆项目的贡献者如果没有此文件就没有可运行的内容。

在每台主机上都会生成，而不仅仅是在 Windows 上生成：该文件会被提交，并且在 Windows 上运行它的人并不是生成它的人。需要使用 `--write`，因为 stdout 无法承载两个文件。

示例：

```
$ mise generate bootstrap --write ./bin/mise
$ ./bin/mise install                                    # downloads mise to .mise if not already installed

# add a launcher for contributors who clone the project on Windows
$ mise generate bootstrap --write ./bin/mise --windows  # also writes bin/mise.cmd
$ .\bin\mise.cmd install
```
