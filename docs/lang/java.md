---
description: "像 sdkman 一样，mise 可以在同一系统上管理多个版本的 Java。"
---

# Java

像 `sdkman` 一样，`mise` 可以在同一系统上管理多个版本的 Java。

## 用法

为当前项目选择 JDK 供应商和版本：

```sh
mise use java@temurin-21
mise exec -- java -version
mise exec -- javac -version
```

使用 `mise use -g java@temurin-21` 设置个人默认版本。供应商前缀可以明确指定项目的发行版选择。

你也可以从其他供应商安装 JDK。要获取某个供应商的最新版本，请使用供应商前缀。

```sh
mise use java@temurin        # latest version from Temurin
mise use java@temurin-21
mise use java@zulu-21
mise use java@corretto-21
```

可使用 `mise ls-remote java` 查看可用版本。

::: info 供应商选择
未限定供应商的版本（例如 `java@21`）使用
[`java.shorthand_vendor`](/configuration/settings.html#java.shorthand_vendor)，
其默认值为 `openjdk`。不同供应商的发行版具有不同的更新和支持策略。当项目依赖特定发行版时，请使用带供应商限定的请求。
:::

这些说明使用 mise 内置的 java 支持。已安装的同名外部插件可能会改变行为；使用 `mise plugins ls` 检查是否存在覆盖。有关后端详情，请参阅[核心实现](https://github.com/jdx/mise/blob/main/src/plugins/core/java.rs)。

## JAVA_HOME

mise 会为通过 `mise exec` 运行的命令、任务以及已激活的 shell 设置 `JAVA_HOME`。[Shell 激活](/cli/activate.html)会直接更新父 shell；运行 shim 不会将 `JAVA_HOME` 导出回父 shell。

如果在修改 `mise.toml` 后，`JAVA_HOME` 似乎仍停留在旧版本，请尝试：

```sh
cd . # 触发 mise hook-env 重新评估
echo $JAVA_HOME
```

如果你使用的 IDE 会在启动时读取 `JAVA_HOME`，切换 Java 版本后可能需要重启 IDE。对于非交互式环境（CI、脚本），请使用 `mise exec` 或 `mise run`，它们始终会设置完整环境。

## macOS JAVA_HOME 集成

macOS 上的一些应用依赖 `/usr/libexec/java_home` 来查找已安装的 Java 运行时。

如果所选发行版包含 macOS `Contents` bundle，请将其注册到 macOS。首先检查为此目录选择的安装：

```sh
mise where java
```

然后，在 POSIX shell 中：

```sh
mise_java_home="$(mise where java)"
if test -d "$mise_java_home/Contents"; then
  sudo mkdir -p /Library/Java/JavaVirtualMachines/mise-java.jdk
  sudo ln -s "$mise_java_home/Contents" /Library/Java/JavaVirtualMachines/mise-java.jdk/Contents
fi
/usr/libexec/java_home -V
```

仅当 `Contents` 存在且目标尚未注册时，才运行链接命令。并非所有发行版都包含此 bundle。该链接指向所选安装；它不会自动跟随未来的升级。

## `.java-version` 和 `.sdkmanrc` 文件支持

显式启用对 `.java-version` 和 `.sdkmanrc` 的发现：

```sh
mise settings add idiomatic_version_file_enable_tools java
```

`mise.toml` 中冲突的 Java 声明具有更高优先级。请参阅[惯用版本文件](/configuration.html#idiomatic-version-files)。

对于 `.sdkmanrc` 文件，mise 会尝试将供应商和版本映射到适当的版本字符串。例如，版本 `20.0.2-tem` 会映射为 `temurin-20.0.2`。由于 Azul 的 Zulu 版本命名方式，版本 `11.0.12-zulu` 会映射为主版本 `zulu-11`。

并非 [sdkman](https://sdkman.io/jdks) 中提供的所有供应商都受 mise 支持。
以下供应商不受支持：`bsg`（Bisheng）、`graal`（GraalVM）、`nik`（Liberica NIK）。

### 使用不受支持的版本

对于已由 SDKMAN 或其他来源安装的 JDK，请将 mise 指向其主目录，而不是创建内部缓存条目或修改 JDK：

```toml [mise.toml]
[tools]
java = { path = "/path/to/jdk-home" }
```

该目录必须包含 `bin/java`，对于完整的 JDK，还必须包含 `bin/javac`。对于 macOS `.jdk` bundle，通常是其 `Contents/Home` 目录。使用 `mise exec -- java -version` 进行检查。

或者，使用
[`mise link`](/cli/link.html)将本地安装注册到某个名称下，然后使用 `mise use` 选择它：

```sh
mise link java@local /path/to/jdk-home
mise use java@local
```

mise 会直接使用此安装；更新仍由安装它的来源负责。

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

`release_type` 选项指定要安装的发行版类型。支持以下值：

- `ga`（默认）：正式发布版
- `ea`：早期访问版

```toml
[tools]
"java" = { version = "openjdk-21", release_type = "ea" }
```

## Gradle 工具链检测

通过 mise 运行 Gradle，使其继承所选的 `JAVA_HOME`：

```sh
mise exec -- ./gradlew -q javaToolchains
```

这要求项目具有 Gradle wrapper 和 JVM 构建配置。报告会显示 Gradle 检测到哪些 JDK，以及它是如何找到这些 JDK 的。

要将所选 JDK 作为显式工具链候选项公开，请添加：

```properties [gradle.properties]
org.gradle.java.installations.fromEnv=JAVA_HOME
```

对于多个 JDK，Gradle 还接受在 `org.gradle.java.installations.paths` 中以逗号分隔的安装目录列表。它不会递归搜索这些目录。请使用实际的 JDK 主目录，而不是 mise 的整个 `installs/java` 目录；请参阅 [Gradle 的自定义工具链位置](https://docs.gradle.org/current/userguide/toolchains.html#sec:custom_loc)。

构建的工具链要求仍会决定 Gradle 使用哪个候选项。更改工具链配置后，在再次检查之前，使用 `mise exec -- ./gradlew --stop` 停止现有 daemon。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="java" :level="3" />
