---
description: "通过 mise 安装 Deno，并从 mise.toml、.deno-version 或 package.json 选择版本。"
---

# Deno

mise installs [Deno](https://deno.com/) release binaries and selects a version
per project.

## Quick start

Install Deno for the current project and check the selected executable:

```sh
mise use deno@2
mise exec -- deno --version
```

`mise use` writes `deno = "2"` to `mise.toml`, which keeps the project on the
Deno 2 series. Use `mise use -g deno@2` for a personal default outside projects.

Update Deno with [`mise upgrade deno`](/cli/upgrade.html). `deno upgrade`
replaces the binary inside mise's install directory without changing the
version mise recorded.

## Choosing a version

`deno@2` selects the newest 2.x release, `deno@2.9.7` selects that release, and
`deno@latest` selects the newest release. List the available versions with
`mise ls-remote deno`. See [version requests](/dev-tools/versions.html) for the
full syntax.

<a id="version-files"></a>

## 版本文件

mise can read `.deno-version` and the `devEngines.runtime` field of
`package.json`. Enable them for Deno:

~~~sh
mise settings add idiomatic_version_file_enable_tools deno
~~~

This changes your global config. Add `--local` to enable it in the project's
`mise.toml` instead, so teammates get the same behavior. See
[idiomatic version files](/dev-tools/versions.html#idiomatic-version-files).

For example, this `package.json` selects Deno 2.9.7:

~~~json [package.json]
{
  "devEngines": {
    "runtime": { "name": "deno", "version": "2.9.7" }
  }
}
~~~

mise reads `devEngines.runtime` when its `name` is `deno`. The field can be an
object or an array; mise reads the first entry of an array. The `engines`
compatibility field is not used to select a version.

## Global scripts and `DENO_INSTALL_ROOT`

mise sets `DENO_INSTALL_ROOT` to `<install>/.deno` and puts `<install>/.deno/bin`
on `PATH`, where `<install>` is the selected Deno version's install directory.
Scripts installed with `deno install -g` therefore belong to one Deno version
and are not on `PATH` after you switch versions. To share them across versions,
set the root and add its `bin` directory to `PATH`:

```toml [mise.toml]
[env]
DENO_INSTALL_ROOT = "{{env.HOME}}/.deno"
_.path = ["{{env.HOME}}/.deno/bin"]
```

A `DENO_INSTALL_ROOT` set in `[env]` takes precedence over the one mise sets.

## How mise installs Deno

mise 会从[版本服务器](/configuration/settings.html#use_versions_host)读取 Deno 版本；关闭 `use_versions_host` 时则从 `deno.com/versions.json` 读取。它会从 `dl.deno.land` 下载适用于当前平台的发行归档，并运行 `deno -V` 检查。在 Linux 上，mise 会安装 Deno 发布的 glibc 构建。归档会与同目录发布的 `.sha256sum` 文件核对；[`mise lock`](/cli/lock.html) 会按平台记录该校验和。如果无法获取该文件或其中没有校验和，安装会失败；只有从未发布校验和的版本才会在警告后跳过验证并安装。

An installed plugin named `deno` takes precedence over the built-in
installer. If mise behaves differently from this page, check
[`mise plugins ls`](/cli/plugins/ls.html) and see
[selecting another implementation](/core-tools.html#selecting-another-implementation).

## Tool options

Deno has no Deno-specific options. Generic options such as `install_env`,
`postinstall` and `os` work as described in
[tool options](/dev-tools/#tool-options). `install_env` reaches the `deno -V`
check and `postinstall` commands, not the download. To download through a
proxy, set `https_proxy` in the environment that runs mise (see the
[FAQ](/faq.html#how-do-i-use-mise-with-http-proxies)).
