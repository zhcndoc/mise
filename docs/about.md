---
description: "使用 mise（读作“meez”）管理开发环境。"
socialDescription: "使用 mise（读作“meez”）管理开发环境。"
---

# 关于

mise（读作“meez”）是 _mise-en-place_ 的简称，可帮助你设置开发环境并在其中工作。这个名称源自法国烹饪中在烹饪前准备食材和器具的做法。在项目中，`mise.toml` 起着类似的作用：它记录了开始工作所需的工具、环境和命令。

## mise 管理的内容

- **[开发工具](/dev-tools/)：** 安装运行时和命令行工具，按项目选择版本，并与团队和 CI 共享这些选择。
- **[环境变量](/environments/)：** 定义项目配置，加载 dotenv 文件或密钥，并激活 Python virtualenv 等环境。
- **[任务](/tasks/)：** 为构建、测试、代码检查和其他命令提供名称、依赖项和参数。
- **[机器配置](/bootstrap.html)：** 声明软件包、文件、服务和其他主机配置，使其与项目的工具安装相互独立。

你可以独立采用这些功能。从管理一个工具或一个任务开始即可；不需要一次性迁移所有现有脚本和配置。

## 从哪里开始

首先按照[入门指南](/getting-started.html)完成初始设置，然后通过[操作演示](/walkthrough.html)在项目中进行实践。[术语表](/glossary.html)解释了 backend、shim 和 task 等术语。当命令或 shell 环境未按预期运行时，请参阅[故障排除](/troubleshooting.html)。

## 联系方式

mise 由 [Jeff Dickey](https://jdx.dev/) 创建，并与其[贡献者](/team.html)共同开发。我们的目标是让不同语言之间的开发更加轻松且一致。欢迎提出问题、报告错误和提供建议；请参阅[联系](/contact.html)了解适合的开始方式。
