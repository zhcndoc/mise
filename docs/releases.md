---
description: "mise 每个版本的时间线，包含每个版本的变更数量和已解决问题数。"
editLink: false
---

# 版本发布

<script setup>
import Releases from '@jdxcode/docs-releases/Releases.vue';
import { data } from './releases.data';
</script>

mise 几乎每天都会发布一个版本。下面的每个柱条代表一个版本，最早的在左侧，高度表示该版本
[changelog](https://github.com/jdx/mise/blob/main/CHANGELOG.md) 中的变更数量。将鼠标悬停在柱条上或聚焦柱条
即可阅读其内容；点击柱条或列表中的任何版本，即可打开该版本的说明。这些说明是随版本在
[GitHub](https://github.com/jdx/mise/releases) 上发布的说明。

一次变更对应一条 changelog 条目：功能、修复、注册表新增、依赖项更新等。新贡献者致谢和 mise 所供应的
上游 Aqua 注册表更新不计入其中。

<Releases :data="data" />
