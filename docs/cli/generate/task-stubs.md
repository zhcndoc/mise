<!-- @由 usage-cli 根据用法规范生成 -->
# `mise generate task-stubs`

- **用法**：`mise generate task-stubs [-d --dir <DIR>] [-m --mise-bin <MISE_BIN>]`
- **作用**：修改状态
- **源代码**：[`src/cli/generate/task_stubs.rs`](https://github.com/jdx/mise/blob/main/src/cli/generate/task_stubs.rs)

生成用于运行 mise 任务的 shim

默认情况下，这将生成类似于 ./bin/&lt;task> 的 shim。这些可以与 `mise generate bootstrap` 搭配使用，
这样项目的贡献者就可以在不将 mise 安装到系统中的情况下执行 mise 任务。

## 标志

### `-d --dir <DIR>`

用于在其中创建任务存根的目录

**默认：** `bin`

### `-m --mise-bin <MISE_BIN>`

运行任务存根时使用的 mise 可执行文件路径。

使用 `--mise-bin=./bin/mise` 可使用由 `mise generate bootstrap` 生成的 mise 可执行文件

**默认：** `mise`

示例：

```
$ mise tasks add test -- echo 'running tests'
$ mise generate task-stubs
$ ./bin/test
running tests
```
