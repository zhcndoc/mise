<!-- 由 usage-cli 根据 usage 规范生成 -->
# `mise deps install`

- **用法：** `mise deps install [FLAGS] [PROVIDER]`
- **作用：** 修改状态
- **源代码：** [`src/cli/deps/install.rs`](https://github.com/jdx/mise/blob/main/src/cli/deps/install.rs)

安装所有项目依赖项

检查依赖锁文件是否比已安装的输出更新，
并在需要时运行安装命令。

## 参数
- **`[PROVIDER]`** — 要操作的 Provider（仅运行此 Provider，或与 --explain 一起使用）

## 标志
- **`--explain`** — 显示 Provider 是最新还是过时的原因（需要提供 Provider 参数）
- **`-f --force`** — 即使输出是最新的，也强制运行所有依赖项步骤
- **`-n --dry-run`** — 仅检查是否需要安装依赖项，不运行命令
- **`--list`** — 显示可用的依赖项 Provider
- **`--monorepo`** — 从每个 [monorepo].config_roots 配置根目录安装依赖项

  需要在 monorepo 根配置中设置 monorepo_root = true，并显式配置 [monorepo].config_roots。
  Provider 的命名形式类似于 //apps/api:uv。

  **环境变量：** `MISE_MONOREPO`
- **`--only <ONLY>`** — 仅运行指定的依赖项规则
- **`--skip <SKIP>`** — 跳过指定的依赖项规则
- **`-h --help`** — 打印帮助信息
