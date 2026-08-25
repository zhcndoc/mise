<!-- @由 usage-cli 根据用法规范生成 -->
# `mise exec`

- **用法：** `mise exec [FLAGS] [TOOL@VERSION]… [-- COMMAND]…`
- **别名：** `x`
- **源代码：** [`src/cli/exec.rs`](https://github.com/jdx/mise/blob/main/src/cli/exec.rs)

使用已设置的工具执行命令

可用于避免修改 shell 会话，或使用 mise 已设置的工具运行临时命令。

工具将从 mise.toml 中加载，不过可以通过 &lt;RUNTIME> 参数进行覆盖  
请注意，只有指定的插件会被覆盖，因此如果一个 `mise.toml` 文件  
包含 "node 20"，但你运行 `mise exec python@3.11`；它仍然会加载 node@20。

“--” 用于将运行时与传递给子进程的命令分隔开。

## 参数
- **`[TOOL@VERSION]…`** — 要启动的工具，例如：node@20 python@3.10
- **`[-- COMMAND]…`** — 要执行的命令字符串（与 --command 相同）

## 标志
- **`-c --command <COMMAND>`** — 要执行的命令字符串
- **`-j --jobs <JOBS>`** — 并行运行的任务数
  小于 1 的值将按 1 处理
  [默认值：4]

  **环境变量：** `MISE_JOBS`
- **`--allow-env <VAR>`** — 允许传递指定的环境变量（对其他所有环境变量隐含启用 --deny-env）
  支持通配符，例如：--allow-env='MYAPP_*'
- **`--allow-net <HOST>`** — 允许访问指定主机的网络（对其他所有网络隐含启用 --deny-net）
  v1 中仅支持 macOS；在 Linux 上将回退为允许所有网络
- **`--allow-read <PATH>`** — 允许从指定路径读取（对其他所有路径隐含启用 --deny-read）
- **`--allow-write <PATH>`** — 允许写入指定路径（对其他所有路径隐含启用 --deny-write）
- **`--deny-all`** — 阻止读取、写入、网络访问和环境变量
- **`--deny-env`** — 阻止继承环境变量（仅传递 PATH、HOME、USER、SHELL、TERM、LANG）
- **`--deny-net`** — 阻止所有网络访问
- **`--deny-read`** — 阻止文件系统读取（系统库和工具目录仍可访问）
- **`--deny-write`** — 阻止所有文件系统写入
- **`--fresh-env`** — 绕过环境缓存并重新计算环境
- **`--no-deps`** — 跳过自动依赖准备
- **`--raw`** — 将后端安装命令的标准输入／标准输出／标准错误直接连接到终端，隐含启用 --jobs=1
- **`-h --help`** — 打印帮助

示例：

```
$ mise exec node@20 -- node ./app.js  # 使用 node-20.x 启动 app.js
$ mise x node@20 -- node ./app.js     # 更短的别名

# 将命令指定为字符串：
$ mise exec node@20 python@3.11 --command "node -v && python -V"

# 在不同目录中运行命令：
$ mise x -C /path/to/project node@20 -- node ./app.js
```
