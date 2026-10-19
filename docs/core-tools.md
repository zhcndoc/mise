---
description: "无需插件，使用 mise 内置安装器安装 Node.js、Python、Go、Java 等语言。"
---

# 核心工具概览

核心工具是安装器已内置于 mise 的语言，因此无需插件。每篇指南都会介绍平台支持情况、mise 如何安装该语言、版本文件以及语言专属选项。

```sh
mise use node@24 python@3.14
```

| Tool                        | Name in `mise.toml` | Version files (when [enabled](/dev-tools/versions.html#idiomatic-version-files)) |
| --------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| [Bun](/lang/bun.html)       | `bun`               | `.bun-version`, `package.json`                                                   |
| [Deno](/lang/deno.html)     | `deno`              | `.deno-version`, `package.json`                                                  |
| [.NET](/lang/dotnet.html)   | `dotnet`            | `global.json`                                                                    |
| [Elixir](/lang/elixir.html) | `elixir`            | `.exenv-version`                                                                 |
| [Erlang](/lang/erlang.html) | `erlang`            |                                                                                  |
| [Go](/lang/go.html)         | `go`                | `.go-version`, `go.mod`, `go.work`                                               |
| [Java](/lang/java.html)     | `java`              | `.java-version`, `.sdkmanrc`                                                     |
| [Node.js](/lang/node.html)  | `node`              | `.nvmrc`, `.node-version`, `package.json`                                        |
| [Python](/lang/python.html) | `python`            | `.python-version`, `.python-versions`                                            |
| [Ruby](/lang/ruby.html)     | `ruby`              | `.ruby-version`, `Gemfile`                                                       |
| [Rust](/lang/rust.html)     | `rust`              | `rust-toolchain.toml`                                                            |
| [Swift](/lang/swift.html)   | `swift`             | `.swift-version`                                                                 |
| [Zig](/lang/zig.html)       | `zig`               | `.zig-version`                                                                   |

`mise registry -b core` 会列出相同的工具集合，`dotnet-core` 是 `dotnet` 的另一个名称。其他工具请参阅[注册表](/registry.html)。

## 选择其他实现 {#selecting-another-implementation}

如果已安装与核心工具同名的插件，插件可能会优先于内置安装器。只有确实需要插件提供的行为时才使用它，因为这也会改变工具的安装方式以及你所信任的代码来源。请参阅[插件](/plugins.html)和[后端选择机制](/dev-tools/backends/#how-backend-selection-works)。

若要明确使用内置安装器，请在名称前加上 `core:`，例如 `mise use core:python@3.14`。即使已安装同名插件，也要让所有项目都使用内置安装器时，请添加[工具别名](/dev-tools/aliases.html)：

```toml [mise.toml]
[tool_alias]
python = "core:python"
```
