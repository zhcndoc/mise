---
description: "mise 由 Jeff Dickey 维护，并在社区的帮助下持续发展。"
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

# 团队

mise 由 Jeff Dickey 维护，并在社区的帮助下持续发展。如有问题、反馈和错误报告，请使用[联系](/contact.html)页面上的渠道。

<VPTeamMembers :members="members" />

## 顾问委员会

顾问委员会帮助对项目作出重要决策，例如：

- 哪些功能应列入路线图
- 何时应将功能从实验性转为稳定
- 是否弃用功能、何时弃用以及如何弃用

<VPTeamMembers :members="board" />

## 贡献者

mise 是一个开源项目。请查看[所有做出过贡献的人](https://github.com/jdx/mise/graphs/contributors)，并阅读[贡献指南](/contributing.html)，帮助改进代码、文档或测试。清晰的错误报告或对示例的更正也有助于改进项目。
