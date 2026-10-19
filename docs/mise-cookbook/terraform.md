---
description: "将针对子目录的 Terraform 或 OpenTofu 命令定义为 mise 任务：init、check、plan 和 apply。"
---

# Terraform 与 OpenTofu

为项目固定 Terraform 或 OpenTofu 版本，并将 init、validate、plan 和 apply 设为任务。本示例假定配置文件位于 `terraform/` 目录中，且 provider 凭据已设置在环境变量中。

## 从子目录运行 Terraform {#managing-terraform-opentofu-projects}

每个任务都会传入 `-chdir=terraform`，而 mise 总是从配置根目录运行任务，因此在项目的任意目录中都可以运行这些任务：

```toml [mise.toml]
[tools]
terraform = "1"

[tasks."terraform:init"]
description = "Initialize the working directory"
run = "terraform -chdir=terraform init"

[tasks."terraform:plan"]
description = "Show the execution plan"
depends = ["terraform:init"]
run = "terraform -chdir=terraform plan"

[tasks."terraform:apply"]
description = "Apply the planned changes"
depends = ["terraform:init"]
interactive = true
run = "terraform -chdir=terraform apply"

[tasks."terraform:destroy"]
description = "Destroy the managed infrastructure"
depends = ["terraform:init"]
interactive = true
run = "terraform -chdir=terraform destroy"

[tasks."terraform:validate"]
description = "Validate the configuration"
depends = ["terraform:init"]
run = "terraform -chdir=terraform validate"

[tasks."terraform:format"]
description = "Format the configuration files"
run = "terraform -chdir=terraform fmt"

[tasks."terraform:format-check"]
description = "Check formatting without changing files"
run = "terraform -chdir=terraform fmt -check"

[tasks."terraform:check"]
description = "Check formatting and validate the configuration"
depends = ["terraform:format-check", "terraform:validate"]
```

运行 `mise run terraform:check` 进行验证，然后运行 `mise run terraform:plan` 查看计划变更。`terraform:format` 任务会直接重写格式。任何依赖 `terraform:init` 的任务都可能下载 provider 并更新 `.terraform.lock.hcl`，即使你只运行检查任务也是如此。

`terraform:apply` 和 `terraform:destroy` 会保留 Terraform 的确认提示；[`interactive = true`](/tasks/task-configuration.html#interactive) 会将终端交给这些命令。本示例不会保存计划文件，因此 `apply` 会在请求确认前自行计算计划。

## 使用 OpenTofu {#use-opentofu}

将工具配置替换为 `opentofu = "1"`，并将命令 `terraform` 替换为 `tofu`。`terraform/` 目录和任务名称可以保持不变，也可以按项目需要重命名。

## 从 `.terraform-version` 读取版本 {#read-the-version-from-terraform-version}

如果项目已有 `.terraform-version`（tfenv）或 `.opentofu-version`（tofuenv）文件，可将它启用为[惯用版本文件](/dev-tools/versions.html#idiomatic-version-files)，而不必在 `[tools]` 中设置版本：

```toml [mise.toml]
[settings]
idiomatic_version_file_enable_tools = ["terraform"]
```

对于 `.opentofu-version`，请使用 `"opentofu"`。

## 从 dotenv 文件加载凭据 {#load-credentials-from-a-dotenv-file}

如果凭据保存在本地 dotenv 文件中，请使用 [`_.file`](/environments/#env-file) 加载。不要将明文凭据文件提交到版本控制；加密存储方式请参阅[密钥管理](/environments/secrets/)。
