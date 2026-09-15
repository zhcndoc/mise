---
description: "使用任务让基础设施命令始终指向同一个工作目录。"
---

# Terraform 和 OpenTofu Cookbook

使用任务让基础设施命令始终指向同一个工作目录。
此配方假定存在一个包含配置的 `terraform/` 目录，并且环境中已经配置了所有
provider 凭据。

## 管理 `terraform`/`opentofu` 项目

Terraform 配置通常位于 `terraform/` 子目录中，这意味着需要运行类似
`terraform -chdir=terraform plan` 的命令。以下配置可以让你改为通过
`mise` 任务调用所有这些命令。

```toml [mise.toml]
[tools]
terraform = "1"

[tasks."terraform:init"]
description = "初始化 Terraform 工作目录"
run = "terraform -chdir=terraform init"

[tasks."terraform:plan"]
description = "Generates an execution plan for Terraform"
depends = ["terraform:init"]
run = "terraform -chdir=terraform plan"

[tasks."terraform:apply"]
description = "Applies the changes required to reach the desired state of the configuration"
depends = ["terraform:init"]
interactive = true
run = "terraform -chdir=terraform apply"

[tasks."terraform:destroy"]
description = "Destroy Terraform-managed infrastructure"
depends = ["terraform:init"]
interactive = true
run = "terraform -chdir=terraform destroy"

[tasks."terraform:validate"]
description = "Validates the Terraform files"
depends = ["terraform:init"]
run = "terraform -chdir=terraform validate"

[tasks."terraform:format"]
description = "格式化 Terraform 文件"
run = "terraform -chdir=terraform fmt"

[tasks."terraform:format-check"]
description = "Check formatting without changing files"
run = "terraform -chdir=terraform fmt -check"

[tasks."terraform:check"]
description = "Check formatting and validate the configuration"
depends = ["terraform:format-check", "terraform:validate"]
```

运行 `mise run terraform:check` 进行验证，然后运行 `mise run terraform:plan` 检查
建议的更改。`terraform:format` 是用于重写格式的独立任务。即使所选任务是检查任务，
初始化也可能下载 provider 并更新依赖锁定文件。

`terraform:apply` 和 `terraform:destroy` 会保留 Terraform 的确认提示；
`interactive = true` 让这些命令可以访问终端。此配方不会保存 plan 文件，因此
`apply` 会在请求批准前计算自己的 plan。

对于 OpenTofu，将工具声明替换为 `opentofu = "1"`，并将命令名称
`terraform` 替换为 `tofu`。`terraform/` 目录和任务名称可以保持不变，也可以重命名
以匹配你的项目。

如果你使用本地 dotenv 文件存储凭据，请显式添加
[`env._.file`](/environments/#env-file)。不要将明文凭据文件纳入版本控制；有关加密存储，
请参阅 [secrets](/environments/secrets/)。
