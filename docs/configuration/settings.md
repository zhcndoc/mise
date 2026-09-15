---
description: "自定义 mise 安装工具、解析配置和运行任务的方式。"
---

# 设置

<script setup>
import Settings from '/components/settings.vue';
</script>

设置控制 mise 本身，例如安装并发数和任务输出。
应用程序环境变量属于 [`[env]`](/environments/)。

## 更改设置

默认情况下，settings 命令会将设置写入全局配置。使用 `--local` 将设置
写入项目选定的配置文件：

```sh
mise settings set jobs 4          # personal default
mise settings set --local jobs 2  # project setting
mise settings unset --local jobs  # remove the project override
```

对应的 TOML 为：

```toml
[settings]
jobs = 4
```

使用 `mise settings ls --all` 检查生效的设置，包括默认值。
`mise settings ls --json-extended` 会包含已配置值的来源信息。下面的设置参考中会列出
设置的类型、默认值以及可用时的环境变量。某些设置还具有全局 CLI 标志。

## 早期初始化

某些设置控制配置发现，并且会在 `mise.toml` 之前读取。这些设置
必须通过其环境变量进行设置，或者在支持的情况下，通过
[`.miserc.toml` 文件](/configuration/environments.html#setting-mise-env-in-miserc-toml)进行设置。
请遵循各个设置的说明；将早期设置放在 `[settings]` 下可能为时已晚，无法影响发现过程。

## 参考

<Settings :level="2" />
