---
description: "浏览 mise 的所有版本、各版本的变更数和自 2026 年 9 月以来修复的问题，并了解版本号规则。"
socialDescription: "浏览 mise 的所有版本，并了解 mise 版本号的含义。"
editLink: false
---

# 版本发布

<script setup>
import Releases from '@jdxcode/docs-releases/Releases.vue';
import { data } from './releases.data';
</script>

mise 每周会发布数个版本。若要更新，请运行 `mise self-update`，或使用安装 mise 的包管理器；详见[更新 mise](/installing-mise.html#updating)。

## 版本时间线 {#timeline}

每个柱形代表一个版本，最旧的版本位于左侧。点击柱形或列表中的版本即可查看其说明。

<Releases :data="data" />

## 版本号 {#versioning}

mise 使用 `YEAR.MONTH.RELEASE` 格式的日历版本号，例如 `2026.9.1`。末尾数字从 0 开始，表示当月的发布序号，而非日期。

版本号不代表兼容性，因此不要将第一段数字视为 SemVer 主版本。新功能可能需要通过 `experimental = true` 等设置启用。即将移除的功能会输出弃用警告，并指出将其移除的 mise 版本；通常从开始警告到移除相隔 12 个月。[版本说明](https://github.com/jdx/mise/releases)会列出每项行为变更。若要为项目指定最低 mise 版本，请在其 `mise.toml` 中设置 [`min_version`](/configuration.html#minimum-mise-version)。

## 变更计数范围 {#counts}

每项变更对应[更新日志](https://github.com/jdx/mise/blob/main/CHANGELOG.md)中的一条记录，包括功能、修复、注册表新增工具或依赖更新。计数不包含“新贡献者”部分，也不包含 mise 随包附带的 aqua 注册表更新。
