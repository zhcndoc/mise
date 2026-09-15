---
description: "核心工具已将安装逻辑内置于 mise。"
---

# 核心工具

核心工具已将安装逻辑内置于 mise。它们不需要单独安装插件。它们的语言指南会说明平台支持、编译选项、虚拟环境以及其他特定于运行时的行为。

使用以下命令列出当前的核心条目：

```sh
mise registry -b core
```

## 语言指南

- [Bun](/lang/bun)
- [Deno](/lang/deno)
- [.NET](/lang/dotnet)
- [Elixir](/lang/elixir)
- [Erlang](/lang/erlang)
- [Go](/lang/go)
- [Java](/lang/java)
- [Node.js](/lang/node)
- [Python](/lang/python)
- [Ruby](/lang/ruby)
- [Rust](/lang/rust)
- [Swift](/lang/swift)
- [Zig](/lang/zig)

## 选择其他实现

安装具有相同名称的外部插件可以覆盖核心工具。仅在你需要该插件提供的行为时使用此方式；它也会改变安装和信任要求。请参阅[插件](/plugins.html)和[后端选择](/dev-tools/backends/)，了解 mise 如何选择实现。

要显式选择内置实现，请使用 `core:` 前缀，例如 `mise use core:python@3.14`。[注册表](/registry.html)涵盖核心集合之外的工具。
