<script setup>
import { VPTeamPage, VPTeamPageTitle, VPTeamPageSection, VPTeamMembers } from 'vitepress/theme'

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

Jeff Dickey 是 mise 背后的主要开发者。他承担了这个项目的大部分
开发工作。

<VPTeamMembers :members="members" />

## 顾问委员会

顾问委员会帮助就项目做出重要决策，例如：

- 路线图中应该包含哪些功能
- 何时应将功能从实验性转为稳定版
- 功能是否、何时以及如何被弃用

<VPTeamMembers :members="board" />

## 贡献者

mise 是一个开源项目，欢迎[贡献](https://github.com/jdx/mise/graphs/contributors)。
我们感谢那些为该项目贡献了自己劳动的人。
