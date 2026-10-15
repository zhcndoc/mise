---
description: "了解 mise-en-place 这个名称的含义、mise 的维护者，以及如何支持其开发。"
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://www.github.com/jdx.png',
    name: 'Jeff Dickey',
    title: 'BDFL',
    links: [
      { icon: 'github', link: 'https://github.com/jdx' },
      { icon: 'twitter', link: 'https://twitter.com/jdxcode' },
      { icon: 'mastodon', link: 'https://fosstodon.org/@jdx' }
    ]
  }
]
const board = [
  {
    avatar: 'https://www.github.com/booniepepper.png',
    name: 'Justin "J.R." Hill',
    links: [
      { icon: 'github', link: 'https://github.com/booniepepper' },
    ]
  },
  {
    avatar: 'https://www.github.com/pepicrft.png',
    name: 'Pedro Piñera Buendía',
    links: [
      { icon: 'github', link: 'https://github.com/pepicrft' },
    ]
  },
  {
    avatar: 'https://www.github.com/chadac.png',
    name: 'Chad Crawford',
    links: [
      { icon: 'github', link: 'https://github.com/chadac' },
    ]
  }
]
</script>

# 关于 mise

mise 的发音是“meez”。这个名字是法语 _mise-en-place_ 的缩写，指的是
在烹饪开始前摆好所有食材和器具的做法。

mise 从一个能在 shell、编辑器和 CI 中通用的 `mise.toml` 安装项目工具、设置环境变量并运行任务。借助
`mise bootstrap`，它还可以配置整台机器，包括软件包、点文件和服务。请参阅[入门指南](/getting-started.html)开始使用。

## 谁在维护 mise {#who-makes-mise}

[Jeff Dickey](https://jdx.dev/) 创建并维护 mise。

<VPTeamMembers :members="members" />

<a id="advisory-board"></a>

### 顾问委员会

顾问委员会帮助决定哪些功能进入路线图、功能何时从实验性变为稳定，以及功能是否、何时和如何弃用。

<VPTeamMembers :members="board" />

<a id="contributors"></a>

### 贡献者

请参阅[所有贡献者](https://github.com/jdx/mise/graphs/contributors)。如需帮助编写代码、文档或测试，请阅读[贡献指南](/contributing.html)。

## 支持 mise {#supporting-mise}

mise 是免费且采用 MIT 许可证的软件。赞助者支持 mise 及其他 jdx.dev 开源工具的开发，包括
[Entire](https://entire.io)、[Omacom Foundation](https://omarchy.org/patrons/) 等公司，以及 Patron 级别的个人赞助者。
如需成为赞助者，请参阅 [jdx.dev/sponsors](https://jdx.dev/sponsors.html)。

[`mise sponsors`](/cli/sponsors.html) 会列出赞助公司，[`mise patrons`](/cli/patrons.html) 会列出 Patron。
[Namespace](https://namespace.so) 为 mise 提供 CI 服务。

## 联系方式

如需提问、报告错误或联系 Jeff，请参阅[联系方式](/contact.html)。
