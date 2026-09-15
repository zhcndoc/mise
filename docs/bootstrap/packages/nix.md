---
description: "将 Nix bootstrap 软件包安装到用户配置文件中，或将其导出为 NixOS 模块"
---

# Nix

`nix` bootstrap 软件包管理器会将软件包安装到当前用户的普通 Nix 配置文件中。在配置了 Nix 且 Nix 位于 `PATH` 中的 Linux 和 macOS 上均可使用，无论操作系统是否为 NixOS。

```toml
[bootstrap.packages]
"nix:ripgrep" = "latest"
"nix:jq" = "latest"
"nix:python3Packages.pip" = "latest"
```

```sh
mise bootstrap packages use nix:ripgrep
mise bootstrap packages apply --manager nix
mise bootstrap packages status --json
mise bootstrap packages upgrade --manager nix
```

`mise bootstrap` 也会应用这些软件包。它们属于用户的 Nix 配置文件，而不是项目的工具集，并使用普通 Nix 配置文件的 `PATH` 设置。mise 不会为它们创建 shim，也不会调用 sudo。

## 要求和源

使用 Nix 2.24 或更高版本，并在 Nix 配置中启用 `nix-command` 和 `flakes`。配置文件必须使用现代的 `nix profile` 格式。如果配置文件存在旧版 `nix-env` 配置文件错误，mise 会报告错误，但不会删除或迁移配置文件。

简写名称通过计算机的 `nixpkgs` registry 条目解析。若要选择其他源，请使用显式的 flake 引用和属性：

```toml
[bootstrap.packages]
"nix:my-packages#hello" = "latest"
"nix:path:/absolute/path/to/flake#hello" = "latest"
```

也支持固定 revision 的引用，例如
`nix:github:NixOS/nixpkgs/<revision>#ripgrep`：将 `<revision>` 替换为实际的 commit。不支持相对本地路径、任意 Nix 表达式和 `^output` 选择器。

`latest` 表示所选源提供的软件包。它不会锁定会变动的源。需要恢复相同的软件包选择时，请固定源 revision，或配置固定的 registry 条目。不支持类似 `nix:ripgrep@14` 的软件包版本固定；表格形式的版本固定会在安装和升级期间被报告并跳过。

mise 使用现有的 Nix registries、substituters 和 trusted keys。它不会安装 Nix、配置缓存、自行更新 flake lockfiles，也不会添加备用源。如果配置的缓存中没有某个软件包，Nix 可能会构建该软件包。

## 应用、状态和升级

应用操作是增量式的：它会安装缺失的源／属性组合，并保留配置文件中的其他条目。对同一个会变动的源重复执行应用操作不会更新已安装的软件包；请使用 `upgrade` 完成更新。升级操作只针对配置的配置文件条目中匹配的项目。固定 revision 的源会保持固定。

状态通过软件包的源和属性路径识别软件包，而不是通过在 `PATH` 中查找名称相似的可执行文件。其已安装版本字段包含 Nix store 路径，这些路径可以识别已安装的构件，而无需猜测版本。状态和 dry-run 不会初始化配置文件或获取软件包源。

删除声明不会卸载配置文件中的软件包。原生 Nix 的删除和回滚仍可通过 `nix profile` 使用；此管理器不支持 bootstrap pruning 和 `state = "absent"` 删除。

## 导出到 NixOS

当软件包应成为 NixOS 系统配置的一部分，而不是用户配置文件的一部分时，请使用导出功能。添加声明但不安装它们：

```sh
mise bootstrap packages use --no-install nix:ripgrep nix:jq
mise bootstrap packages export --format nix > packages.nix
```

生成的模块引用导入配置中的 `pkgs`：

```nix
{ pkgs, ... }:
{
  environment.systemPackages = [
    pkgs."jq"
    pkgs."ripgrep"
  ];
}
```

将 `packages.nix` 放在现有 NixOS 配置旁边，并将 `./packages.nix` 添加到其 `imports` 中。对于通过 Git 管理的配置，请将生成的文件加入仓库，以便 flake 求值时能够看到它。然后使用该配置的正常重建工作流，例如：

```sh
sudo nixos-rebuild switch --flake /path/to/system-config#hostname
```

导出本身不需要 Nix，也不会构建、安装或激活任何内容。它会读取当前 mise 平台和环境的合并声明，遵循管理器排除项，并省略 `state = "absent"` 条目。只有 `nix:` 简写属性路径会被导出。显式 flake 引用和版本固定会在输出任何内容之前失败，因为软件包集合、其固定版本以及 overlays 由使用该模块的配置负责。

删除声明后，请重新生成模块并执行重建。届时该软件包将不再由此模块提供；其他模块仍可能需要它。用户配置文件中的安装独立于生成的系统配置，切换 NixOS generation 不会回滚这些安装。

对于系统导出工作流，请使用 `--no-install` 并执行导出，而不要对这些相同的声明运行 `packages apply`：应用操作会将软件包安装到用户配置文件中。
