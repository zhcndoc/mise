<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise generate bootstrap`

- **用法**: `mise generate bootstrap [FLAGS]`
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

示例：

```
mise generate bootstrap >./bin/mise
chmod +x ./bin/mise
./bin/mise install – 如果尚未安装，则自动将 mise 下载到 .mise
```
