---
description: "从适用于 Node.js、Python、Rails、C++、Bazel、Terraform 或 Docker 项目的 mise.toml 示例开始。"
---

# Cookbook 概览

每篇示例都提供一种项目或工作流所需的配置和命令。请选择最接近你需求的示例，再按项目情况调整版本、路径和命令。

| 示例                                                     | 配置内容                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [技巧与窍门](/tips-and-tricks.html)                    | 日常命令、脚本、配置和 shell 提示符的简短示例                                     |
| [Bazel](/mise-cookbook/bazel.html)                      | 根据项目的 `.bazelversion` 安装 Bazel，或使用 Bazelisk                             |
| [C++ 与 CMake](/mise-cookbook/cpp.html)                 | 使用 configure、build 和 clean 任务管理 CMake                                     |
| [Neovim](/mise-cookbook/neovim.html)                    | 为任务脚本提供语法高亮，并为嵌入代码配置语言服务器                                 |
| [Node.js](/mise-cookbook/nodejs.html)                   | 将 npm 脚本设为任务、使用 pnpm 或 aube，以及不依赖 Corepack 的包管理器             |
| [Python](/mise-cookbook/python.html)                    | `requirements.txt` 虚拟环境、uv 项目和 uv 脚本                                     |
| [Ruby on Rails](/mise-cookbook/ruby.html)               | 根据 `.ruby-version` 安装 Ruby，并配置 Bundler 和 Rails 任务                       |
| [脚手架任务](/mise-cookbook/presets.html)              | 创建可为新项目添加工具和任务的全局任务                                             |
| [Terraform 与 OpenTofu](/mise-cookbook/terraform.html) | 为子目录定义 init、validate、plan 和 apply 任务                                    |
| [Docker](/mise-cookbook/docker.html)                    | 在容器镜像中运行 mise，并在构建时安装工具                                          |

有些示例会通过 install 任务安装项目依赖。实验性的 [`mise deps`](/dev-tools/deps.html) 可以替代此任务，仅在清单或锁文件发生变化，或依赖产物缺失时运行包管理器。

有关示例中用到的功能，请参阅[任务配置](/tasks/task-configuration.html)、[环境变量](/environments/)和[开发工具](/dev-tools/)。

## 贡献示例 {#contributing}

你可以提交 pull request，在 `docs/mise-cookbook/` 下新增页面；也可以在 [cookbook 讨论区](https://github.com/jdx/mise/discussions/3645)分享示例。请注明前置条件、完整配置、运行命令和预期结果。
