# Mise + Terraform/Opentofu 食谱

以下是一些使用 mise 管理 Terraform 项目的技巧。

## 管理 `terraform`/`opentofu` 项目

通常有必要将 terraform 配置放在一个 `terraform/` 子目录中。
这就需要使用 `terraform -chdir=terraform plan` 之类的语法来使用正确的
terraform 命令。下面的配置允许你通过 `mise` 调用所有这些命令，借助
`mise` 任务实现。

```toml [mise.toml]
[tools]
terraform = "1"

[tasks."terraform:init"]
description = "初始化 Terraform 工作目录"
run = "terraform -chdir=terraform init"

[tasks."terraform:plan"]
description = "生成 Terraform 的执行计划"
run = "terraform -chdir=terraform plan"

[tasks."terraform:apply"]
description = "应用更改以达到配置所需的状态"
run = "terraform -chdir=terraform apply"

[tasks."terraform:destroy"]
description = "销毁 Terraform 管理的基础设施"
run = "terraform -chdir=terraform destroy"

[tasks."terraform:validate"]
description = "验证 Terraform 文件"
run = "terraform -chdir=terraform validate"

[tasks."terraform:format"]
description = "格式化 Terraform 文件"
run = "terraform -chdir=terraform fmt"

[tasks."terraform:check"]
description = "检查 Terraform 文件"
depends = ["terraform:format", "terraform:validate"]

[env]
_.file = ".env"

```
