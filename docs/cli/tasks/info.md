<!-- @由 usage-cli 根据用法规范生成 -->
# `mise tasks info`

- **用法**：`mise tasks info [-J --json] <TASK>`
- **作用**：只读
- **源代码**：[`src/cli/tasks/info.rs`](https://github.com/jdx/mise/blob/main/src/cli/tasks/info.rs)

获取有关任务的信息。

## 参数

### `<TASK>`

要获取信息的任务名称

## 标志

### `-J --json`

以 JSON 格式输出

示例：

```
$ mise tasks info
名称: test
别名: t
描述: 测试应用程序
来源: ~/src/myproj/mise.toml

$ mise tasks info test --json
{
  "name": "test",
  "aliases": "t",
  "description": "测试应用程序",
  "source": "~/src/myproj/mise.toml",
  "config_sources": ["~/src/myproj/mise.toml"],
  "depends": [],
  "env": {},
  "dir": null,
  "hide": false,
  "raw": false,
  "sources": [],
  "outputs": [],
  "run": [
    "echo \"testing!\""
  ],
  "file": null,
  "usage_spec": {}
}
```
