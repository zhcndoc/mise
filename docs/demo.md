# 演示

以下演示展示了：

- 如何使用 `mise exec` 以某个特定版本的工具运行命令
- 如何使用 `mise` 安装许多其他工具，例如 `jq`、`terraform` 或 `go`
- 如何使用 `mise` 在同一系统上管理多个版本的 `node`

<video style="max-width: 100%; height: auto;" controls="controls" src="./tapes/demo.mp4" />

## 转录

`mise exec <tool> -- <command>` 允许你使用 mise 运行任意工具

```shell
mise exec node@26 -- node -v
# mise node@26.x.x ✓ installed
# v26.x.x
```

node 仅在 mise 环境中可用，而不是全局可用

```shell
node -v
# bash: node: command not found
```

---

这里还有另一个使用 `mise exec` 运行 terraform 的示例

```shell
mise exec terraform -- terraform -v
# mise terraform@1.11.3 ✓ installed
# Terraform v1.11.3
```

---

`mise exec` 非常适合运行一次性命令，不过激活 mise 可能会更方便。激活后，mise 会自动更新你的 `PATH`，将你已安装的工具包含进去，从而可以直接使用它们。

我们将先安装 node@lts，并将其设为全局默认版本

```shell
mise use --global node@lts
# v22.14.0
```

```shell
node -v
# v22.14.0
```

```shell
which node
# /root/.local/share/mise/installs/node/lts/bin/node
```

注意，这里返回的是实际 node 的路径，而不是 shim。

---

我们也可以使用 mise 安装其他工具。例如，我们将安装 terraform、jq 和 go

```shell
mise use -g terraform jq go
# mise jq@1.7.1 ✓ installed
# mise terraform@1.11.3 ✓ installed
# mise go@1.24.1 ✓ installed
# mise ~/.config/mise/config.toml tools: go@1.24.1, jq@1.7.1, terraform@1.11.3
```

```shell
terraform -v
# Terraform v1.11.3
```

```shell
jq --version
# jq-1.7
```

```shell
go version
# go version go1.24.1 linux/amd64
```

```shell
mise ls
# Tool       Version  Source                      Requested
# go         1.24.1   ~/.config/mise/config.toml  latest
# jq         1.7.1    ~/.config/mise/config.toml  latest
# node       22.14.0  ~/.config/mise/config.toml  lts
# terraform  1.11.3   ~/.config/mise/config.toml  latest
```

---

让我们进入一个项目目录，在那里我们将设置 node@26

```shell
cd myproj
mise use node@26 pnpm@10
# mise node@26.x.x ✓ installed
# mise pnpm@10.7.0 ✓ installed
```

```shell
node -v
# v26.x.x
pnpm -v
# 10.7.0
```

正如预期，`node -v` 现在是 v26.x

```shell
cat mise.toml
# [tools]
# node = "26"
# pnpm = "10"
```

我们将离开这个目录。node 版本将恢复为全局 LTS 版本

```shell
cd ..
node -v
# v22.14.0
```
