---
description: "通过 mise 安装 Temurin、Zulu、Corretto 等发行商提供的 JDK，并设置 JAVA_HOME。"
---

# Java

mise 会安装多个供应商发布的 JDK，并将 `JAVA_HOME` 设置为项目所选的版本。

## 快速开始

为当前项目选择 JDK 供应商和版本：

```sh
mise use java@temurin-25
mise exec -- java -version
mise exec -- javac -version
```

使用 `mise use -g java@temurin-25` 设置个人默认版本。在项目中指定供应商，可以明确记录所用的
发行版。

## 选择供应商和版本 {#choosing-a-version}

| 版本请求                 | 选择的版本                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `java@temurin-25`        | 最新的 Temurin 25 构建                                                                    |
| `java@temurin`           | 任意主版本中的最新 Temurin 构建                                                            |
| `java@zulu-21`           | 最新的 Zulu 21 构建；`corretto-21` 和其他供应商也采用相同写法                              |
| `java@temurin-jre-25`    | 最新的 Temurin 25 JRE，不含编译器                                                          |
| `java@oracle-graalvm-25` | 最新的 Oracle GraalVM JDK 25 构建                                                         |
| `java@25`                | [`java.shorthand_vendor`](/lang/java.html#java.shorthand_vendor) 对应的最新 25 版本         |
| `java@lts`               | `java.shorthand_vendor` 对应的当前 LTS 主版本（25）                                       |

未指定供应商的请求会使用 `java.shorthand_vendor`，其默认值为 `temurin`，因此 `java@21` 会解析为
最新的 Temurin 21 构建。将其设为 `openjdk` 可使用 jdk.java.net 发布的构建；这些构建只更新到
jdk.java.net 为该发行版发布的最后一个版本（此时 `java@21` 对应 21.0.2）。请在共享配置中指定
供应商，确保所有机器解析到相同的构建。

默认供应商变更后，已安装的 OpenJDK 构建仍可继续使用；直接运行 `mise lock` 会按新的默认设置再次
锁定该版本，因此其他尚未安装它的机器也会从锁文件安装相同的 OpenJDK 构建。如果本机没有该构建，
锁文件中记录的 `shorthand_vendor = "openjdk"` 项将不再匹配：`mise install --locked` 会失败，
而直接运行 `mise lock` 或 `mise install` 则会将该项替换为最新匹配的 Temurin 构建。若要保留原
有固定版本，请设置 `java.shorthand_vendor = "openjdk"`。`mise lock --bump java` 始终会更新到
最新匹配的 Temurin 构建。有些发行版（如 Java 12）没有 Temurin 构建，请指定供应商请求，例如
`openjdk-12`。

供应商名称还可以包含变体，例如 `temurin-jre`、`zulu-javafx`、`zulu-crac` 和
`liberica-nik-openjdk`。在 Alpine 等 musl 系统上，mise 会以常用名称列出供应商的 musl 构建。
完整列表有数千个条目，可按前缀筛选：

```sh
mise ls-remote java temurin-25
```

## 版本文件

mise 可以读取 `.java-version` 和 `.sdkmanrc`。为 Java 启用这些版本文件：

```sh
mise settings add idiomatic_version_file_enable_tools java
```

这会修改全局配置。添加 `--local` 可改为在项目的 `mise.toml` 中启用，让团队成员也获得相同的
行为。`mise.toml` 中的 Java 版本优先于这些文件。参见[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)。

`.java-version` 中不带供应商的版本号（例如 `21`）也会像其他请求一样使用
`java.shorthand_vendor`。

对于 `.sdkmanrc`，mise 会将 SDKMAN 的供应商标识映射为 mise 名称。例如，`21.0.9-tem` 会转换为
`temurin-21.0.9`，`21.0.9-amzn` 会转换为 `corretto-21.0.9`。由于 Azul 的版本号规则，
`11.0.12-zulu` 只会映射到主版本号 `zulu-11`。

mise 无法转换以下 SDKMAN 标识：`bisheng`（华为毕昇，旧标识为 `bsg`）、`graal`（Oracle
GraalVM）、`jbr`（JetBrains Runtime）和 `nik`（Liberica NIK）。请改为在 `mise.toml` 中填写
mise 名称，例如 `java = "oracle-graalvm-21"`、`java = "jetbrains-21"` 或
`java = "liberica-nik-openjdk21"`。mise 不提供毕昇。

## 使用其他位置已安装的 JDK {#using-unsupported-versions}

若要使用由 SDKMAN、软件包管理器或安装程序放到本机其他位置的 JDK，请将 mise 指向其主目录：

```toml [mise.toml]
[tools]
java = { path = "/path/to/jdk-home" }
```

该目录必须包含 `bin/java`；完整 JDK 还需包含 `bin/javac`。对于 macOS 的 `.jdk` 软件包，通常
应指向其 `Contents/Home` 目录。运行 `mise exec -- java -version` 进行检查。

也可以使用 [`mise link`](/cli/link.html) 为该安装注册一个名称，再通过 `mise use` 选择：

```sh
mise link java@local /path/to/jdk-home
mise use java@local
```

mise 会直接使用这些现有安装。之后仍由原安装工具负责更新。

## `JAVA_HOME`

对于通过 [`mise exec`](/cli/exec.html) 运行的命令、任务，以及已激活 mise 的 shell，mise 会将
`JAVA_HOME` 设置为所选 JDK。仅使用 [shims](/dev-tools/shims.html) 时，只有经过 shim 的
`java` 进程能读取它。shell、IDE 和直接读取 `JAVA_HOME` 的构建工具都无法获取该值。

如果 `JAVA_HOME` 仍指向旧版 JDK，请运行 `mise env | grep JAVA_HOME`。若 mise 显示的是新路径，
说明有其他设置覆盖了它，通常是 shell 启动文件中的 `JAVA_HOME` 导出语句，或仅使用 shims 的
配置。启动时读取 `JAVA_HOME` 的 IDE 需要在切换版本后重启。

## 在 macOS 中注册 JDK {#macos-java-home-integration}

某些 macOS 应用通过 `/usr/libexec/java_home` 查找 Java。如果所选 JDK 带有 `Contents` 软件包，
请按以下方式注册：

```sh
mise_java_home="$(mise where java)"
if test -d "$mise_java_home/Contents"; then
  sudo mkdir -p /Library/Java/JavaVirtualMachines/mise-java.jdk
  sudo ln -s "$mise_java_home/Contents" /Library/Java/JavaVirtualMachines/mise-java.jdk/Contents
fi
/usr/libexec/java_home -V
```

并非所有发行版都包含该软件包。仅当目标位置尚未注册时才运行创建链接的命令。该链接指向当前所选
安装，后续升级时不会自动更新。

## Gradle 工具链 {#gradle-toolchains-detection}

通过 mise 运行 Gradle，使其继承所选的 `JAVA_HOME`，然后列出 Gradle 检测到的 JDK 及其发现方式：

```sh
mise exec -- ./gradlew -q javaToolchains
```

这要求项目包含 Gradle Wrapper 且使用 JVM 构建。若要将所选 JDK 明确提供为工具链候选项，请添加：

```properties [gradle.properties]
org.gradle.java.installations.fromEnv=JAVA_HOME
```

若要指定多个 JDK，Gradle 也接受在 `org.gradle.java.installations.paths` 中填写以逗号分隔的
JDK 主目录列表。Gradle 不会递归搜索这些目录，因此请填写实际的 JDK 主目录，而不是 mise 的整个
`installs/java` 目录。参见 [Gradle 自定义工具链位置](https://docs.gradle.org/current/userguide/toolchains.html#sec:custom_loc)。

最终使用哪个候选项仍由构建中声明的工具链要求决定。修改工具链配置后，请先运行
`mise exec -- ./gradlew --stop` 停止正在运行的守护进程，再重新检查。

## mise 如何安装 Java

mise 会从 `mise-java.jdx.dev` 读取供应商构建目录，下载所选供应商的压缩包，并在目录提供校验和
时进行校验，随后运行 `java -version`。在 macOS 上，mise 会保留软件包的 `Contents` 目录，并
显示[在 macOS 中注册 JDK](#macos-java-home-integration)所需的命令。

如果已安装名为 `java` 的插件，它的优先级高于内置安装器。如果 mise 的行为与本文不符，请检查
[`mise plugins ls`](/cli/plugins/ls.html)，并参见[选择其他实现](/core-tools.html#selecting-another-implementation)。

## 工具选项

### `release_type`

用于选择正式发布版（`ga`，默认值）或早期访问版（`ea`）：

```toml [mise.toml]
[tools]
java = { version = "openjdk-28", release_type = "ea" }
```

`install_env` 和 `postinstall` 等通用选项的用法参见[工具选项](/dev-tools/#tool-options)。
`install_env` 会传递给 `java -version` 检查和 `postinstall` 命令，但不会用于下载过程。若要
通过代理下载，请在运行 mise 的环境中设置 `https_proxy`（参见[常见问题](/faq.html#how-do-i-use-mise-with-http-proxies)）。

## 设置

<script setup>
import Settings from '/components/settings.vue';
</script>
<Settings child="java" :level="3" />
