---
description: "这些食谱结合了工具、环境变量和任务，用于特定工作流。"
---

# 食谱

这些食谱结合了工具、环境变量和任务，用于特定工作流。从最接近你的项目的食谱开始，然后调整其路径、版本和应用程序命令。每个食谱都会说明它所需的文件或工具。

| 工作流                                                         | 食谱                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| 配置并构建 CMake 项目                                          | [C++](/mise-cookbook/cpp.html)                          |
| 安装 mise 并在容器中共享工具                                  | [Docker](/mise-cookbook/docker.html)                    |
| 运行 npm 脚本或选择包管理器                                   | [Node.js](/mise-cookbook/nodejs.html)                   |
| 处理 requirements 文件、uv 项目或内联脚本                      | [Python](/mise-cookbook/python.html)                    |
| 运行 Rails 和 Bundler 命令                                    | [Ruby](/mise-cookbook/ruby.html)                        |
| 初始化、验证、规划和应用基础设施更改                           | [Terraform and OpenTofu](/mise-cookbook/terraform.html) |
| 突出显示任务脚本并配置嵌入式语言服务器                         | [Neovim](/mise-cookbook/neovim.html)                    |
| 创建你自己的项目脚手架                                        | [Presets](/mise-cookbook/presets.html)                  |
| 自定义提示并检查 Shell 集成                                   | [Shell tricks](/mise-cookbook/shell-tricks.html)        |

有关底层行为，请参阅[任务配置](/tasks/task-configuration.html)、[环境变量](/environments/)和[工具配置](/dev-tools/)。

## 贡献

在 [cookbook 讨论区](https://github.com/jdx/mise/discussions/3645)分享食谱。请包含前置条件、完整配置、运行命令和预期结果，以便其他读者能够复现该工作流。
