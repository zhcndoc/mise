# Java

像 `sdkman` 一样，`mise` 可以在同一系统上管理多个版本的 Java。

> 以下是使用 mise 的 java 核心插件的说明。当没有安装名为“java”的 Git 插件时，会使用它。如果你想使用 [asdf-java](https://github.com/halcyon/asdf-java)，
> 那么请使用 `mise plugins install java GIT_URL`。

这部分代码位于 mise 仓库中的
[`./src/plugins/core/java.rs`](https://github.com/jdx/mise/blob/main/src/plugins/core/java.rs)。

## 用法

以下命令会安装最新版本的 openjdk-21.x（如果尚未安装某个版本的 openjdk-21.x），并将其设为全局默认版本：

```sh
mise use -g java@openjdk-21
mise use -g java@21         # openjdk 的其他简写形式
```

你也可以从其他厂商安装 jdk。要获取某个厂商的最新版本，只需使用该厂商前缀。

```sh
mise use -g java@temurin        # 来自 Temurin 的最新版本
mise use -g java@temurin-21
mise use -g java@zulu-21
mise use -g java@corretto-21
```

可使用 `mise ls-remote java` 查看可用版本。

::: warning
请注意，简写版本（如示例中的 `21`）默认使用 [`OpenJDK`](https://openjdk.org/) 作为供应商。默认供应商可以通过设置 [`java.shorthand_vendor`](../configuration/settings.md#java.shorthand_vendor) 来更改。OpenJDK 版本只会在 6 个月的周期内更新。超过这个短期后，将不再提供更新和安全补丁。这同样适用于 LTS 版本。

有关如何选择 JDK 的更多信息，请参见 <https://whichjdk.com>。
:::

## JAVA_HOME

mise 会自动将 `JAVA_HOME` 设置为当前激活的 Java 安装。这需要 [`mise activate`](/cli/activate)——仅使用 shim 不会设置像 `JAVA_HOME` 这样的环境变量。

如果在修改 `mise.toml` 后，`JAVA_HOME` 似乎仍停留在旧版本，请尝试：

```sh
cd . # 触发 mise hook-env 重新评估
echo $JAVA_HOME
```

如果使用在启动时读取 `JAVA_HOME` 的 IDE，在切换 Java 版本后，你可能需要重启它。对于非交互式环境（CI、脚本），请使用 `mise exec` 或 `mise run`，它们始终会设置完整的环境。

## macOS JAVA_HOME 集成

macOS 中的一些应用依赖 `/usr/libexec/java_home` 来查找已安装的 Java 运行时。

要将已安装的 Java 运行时与 macOS 集成，请为相应的
版本运行以下命令（例如 openjdk-21）。

```sh
sudo mkdir /Library/Java/JavaVirtualMachines/openjdk-21.jdk
sudo ln -s ~/.local/share/mise/installs/java/openjdk-21/Contents /Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents
```

> 注意：并非所有 Java SDK 发行版都支持此集成（例如 liberica）。

## `.java-version` 和 `.sdkmanrc` 文件支持

Java 核心插件支持惯用版本文件 `.java-version` 和 `.sdkmanrc`。参见 [惯用版本文件](/configuration.html#idiomatic-version-files)。

对于 `.sdkmanrc` 文件，mise 会尝试将供应商和版本映射为相应的版本字符串。例如，版本 `20.0.2-tem` 会映射为 `temurin-20.0.2`。由于 Azul 的 Zulu 版本命名，版本 `11.0.12-zulu` 会映射为主版本 `zulu-11`。

并非 [sdkman](https://sdkman.io/jdks) 中提供的所有供应商都受 mise 支持。
以下供应商不受支持：`bsg`（Bisheng）、`graal`（GraalVM）、`nik`（Liberica NIK）。

### 使用不受支持的版本

如果需要使用不受支持的 Java 版本，则需要一些手动操作：

1. 将不受支持的版本下载到某个目录（例如 `~/.sdkman/candidates/java/21.0.1-open`）
2. 为新版本创建符号链接：

```sh
ln -s ~/.sdkman/candidates/java/21.0.1-open ~/.local/share/mise/installs/java/21.0.1-open
```

3. 如果在 Mac 上：

```sh
mkdir ~/.local/share/mise/installs/java/21.0.1-open/Contents
mkdir ~/.local/share/mise/installs/java/21.0.1-open/Contents/MacOS

ln -s ~/.sdkman/candidates/java/21.0.1-open ~/.local/share/mise/installs/java/21.0.1-open/Contents/Home
cp ~/.local/share/mise/installs/java/21.0.1-open/lib/libjli.dylib ~/.local/share/mise/installs/java/21.0.1-open/Contents/MacOS/libjli.dylib
```

4. 别忘了确保缓存被阻止且有效，方法是确保 [mise 缓存](https://mise.jdx.dev/directories.html#cache-mise) 中存在一个与你的版本对应的**空**目录：
   例如：

```sh
$ ls -R $MISE_CACHE_DIR/java
21.0.1-open

mise/java/21.0.1-open:
```

## 工具选项

以下 [tool-options](/dev-tools/#tool-options) 适用于 `java` 后端。
这些选项放在 `mise.toml` 的 `[tools]` 部分中。

### `install_env`

为核心 `java` 后端运行的安装时命令设置环境变量：

```toml
[tools]
java = { version = "latest", install_env = { JAVA_TOOL_OPTIONS = "-Djava.net.useSystemProxies=true" } }
```

### `release_type`

`release_type` 选项允许您指定要安装的发布类型。支持以下值：

- `ga`（默认）：正式发布版
- `ea`：早期访问版

```toml
[tools]
"java" = { version = "openjdk-21", release_type = "ea" }
```

## Gradle 工具链检测

Gradle 可以自动检测由某些工具安装的工具链（参见 [toolchain | 自动检测](https://docs.gradle.org/current/userguide/toolchains.html#sec:auto_detection)）。

目前，`Gradle` 不支持自动检测由 `mise` 安装的 Java（参见 [gradle/issues/29508](https://github.com/gradle/gradle/issues/29508) 和 [gradle/issues/29355](https://github.com/gradle/gradle/issues/29355)）。一种变通方法是利用 `mise` 的安装布局与 [`asdf` 使用的布局](/ide-integration.html#sdk-selection-using-asdf-layout) [相似]。

```shell
mkdir -p ~/.asdf/installs/ && ln -s ~/.local/share/mise/installs/java ~/.asdf/installs/
```

否则，你也可以始终使用 [foojay-resolver-convention](https://plugins.gradle.org/plugin/org.gradle.toolchains.foojay-resolver-convention) 插件，让 Gradle 自动安装你的项目所需的 JDK。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="java" :level="3" />
