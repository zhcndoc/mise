---
description: "通过自托管缓存服务器，在 CI 和开发者机器之间共享任务缓存结果。"
---

# 远程任务缓存 <Badge type="warning" text="实验性" />

远程缓存可让 CI 作业和开发者机器复用彼此的任务结果。本地[制品缓存](/tasks/caching.html#enable-artifact-caching)未命中时，mise 会查询服务器；受信任的 CI 作业还会上传新结果。接入服务器前，请先确认任务的本地缓存正常工作。

::: warning 实验性功能
远程缓存属于制品缓存，需要设置 `experimental = true`。
:::

## 选择服务器

mise 通过 HTTPS 使用第 1 版[远程缓存协议](/tasks/remote-cache-protocol.html)。任何实现该协议的服务器都可以使用。

参考服务器是 Mr Boxington 的缓存服务器 `mbx-cache`，源码位于 [`jdx/mr-boxington-cache`](https://github.com/jdx/mr-boxington-cache)。它可以将数据块存储在文件系统或兼容 S3 的存储中，将元数据保存在内存或 PostgreSQL 中，并支持为静态令牌和 OIDC 身份按命名空间授予读写权限。仓库还提供 Docker Compose 文件和 Helm chart。目前尚无正式发布版本，请从仓库安装：

```sh
cargo install --git https://github.com/jdx/mr-boxington-cache
```

同一仓库曾以 `jdx/mise-cache` 名称发布 `mise-cache` 0.1 版本。这些版本预期接收 `mise-cache-*` 请求头，而 mise 发送的是 `mbx-cache-*`，因此会拒绝 mise 的请求。

## 配置 mise

将 mise 指向服务器，并选择一个命名空间：

```toml
[settings]
experimental = true
task.cache.remote_url = "https://cache.example.com/"
task.cache.remote_namespace = "acme/widgets"
```

- [`task.cache.remote_url`](/configuration/settings.html#task.cache.remote_url) 是服务器的基础 URL，mise 会在其后追加 `v1/...`。
- [`task.cache.remote_namespace`](/configuration/settings.html#task.cache.remote_namespace) 为必填项。服务器用它隔离缓存条目，并据此决定谁可以读写。它是一个标识符，例如仓库名称，不是秘密或凭据。
- [`task.cache.remote_mode`](/configuration/settings.html#task.cache.remote_mode) 用于限制 mise 如何使用服务器：`read-write`（默认值）、`read-only` 或 `write-only`。

这些设置可以写在项目的 `mise.toml` 中，但凭据不能；详见[凭据](#credentials)。

如果不同写入者不应影响彼此的缓存条目，或任务行为发生变化可能与采用其他策略写入的条目冲突，请使用不同的命名空间。

配置远程服务器后，查询会先检查本地缓存，再检查服务器。远程命中后，mise 会验证条目、将其复制到本地缓存，再从本地恢复。任务成功运行后，mise 会在本地保存结果；如果此次运行允许写入，也会上传结果。无法连接服务器时，mise 会发出警告并仅使用本地缓存继续运行。若只想在某次运行中跳过服务器，请使用[`mise run --task-cache local-only`](/cli/run.html)。

## 写入权限

mise 只会从构建受保护分支的 CI 作业上传结果。其他所有运行都可以从服务器读取，但不会写入：

| mise 的运行场景                                                                                                                                    | 可读取 | 可写入 |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| GitHub Actions 向受保护分支执行 `push`（`GITHUB_EVENT_NAME=push`、`GITHUB_REF_TYPE=branch`、`GITHUB_REF_PROTECTED=true`）                           | 是     | 是      |
| GitLab CI 向受保护分支执行 push 流水线（`CI_PIPELINE_SOURCE=push`、`CI_COMMIT_REF_PROTECTED=true`，且没有 `CI_COMMIT_TAG` 或合并请求 ID）             | 是     | 是      |
| 拉取请求、合并请求、标签、未受保护的分支、其他 CI 系统和本地运行                                                                                     | 是     | 否      |

设置 `remote_mode = "write-only"` 后，在只读场景中 mise 会完全停用远程缓存，而不是从中读取。

这项检查是纵深防御的一部分。服务器必须自行限制写入权限，因为任何能写入某个命名空间的人，都可以发布该命名空间读取者会恢复的缓存条目。[协议说明](/tasks/remote-cache-protocol.html#authentication-and-namespace-policy)列出了服务器必须执行的检查。校验和可检测数据损坏，HTTPS 可验证服务器身份，但校验和并不是生成该条目的作业签名。

为防止不受信任的作业发布条目：

- 为拉取请求作业提供只读凭据，或不提供任何凭据。
- 使用 `mise run --task-cache read-only` 运行这些作业。
- 将可信度较低的写入者放到单独的命名空间中。

## 凭据

提供 bearer token 后，mise 会在请求中发送该令牌。请在作业环境或全局配置中设置凭据；项目配置不能设置这些凭据项。

| 环境变量                               | 设置项                                                                                           | 作用                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `MISE_TASK_CACHE_REMOTE_TOKEN`         | [`task.cache.remote_token`](/configuration/settings.html#task.cache.remote_token)                 | 发送此 token                                                            |
| `MISE_TASK_CACHE_REMOTE_TOKEN_FILE`    | [`task.cache.remote_token_file`](/configuration/settings.html#task.cache.remote_token_file)       | 每次请求前重新从此文件读取 token                                         |
| `MISE_TASK_CACHE_REMOTE_OIDC_AUDIENCE` | [`task.cache.remote_oidc_audience`](/configuration/settings.html#task.cache.remote_oidc_audience) | 为此 audience 申请并刷新 GitHub Actions OIDC token                       |

如果同时设置多项，mise 会依次使用 token、token 文件和 OIDC。因此，紧急情况下可以通过静态 token 覆盖工作负载身份，而无需更改项目配置。token 文件适合存放轮换中的凭据，例如 Kubernetes 投射的服务账户令牌。GitHub Actions 以外的 CI 系统可以通过 `MISE_TASK_CACHE_REMOTE_TOKEN` 传递其签发的 OIDC token。

携带凭据的请求必须使用 HTTPS；目标为 `localhost`、`127.0.0.0/8` 或 `::1` 时除外。启用了缓存的任务若携带凭据，却使用指向其他主机的普通 `http://` URL，将会因 `remote cache URL must use HTTPS except for loopback development servers` 而失败。不携带凭据时可以使用普通 HTTP，但 mise 会警告缓存流量可能在传输过程中被读取或篡改。

### GitHub Actions OIDC

在 GitHub Actions 中，mise 可以自行申请并刷新短时有效的 OIDC token。请在工作流中授予身份令牌权限并设置 audience：

```yaml
permissions:
  contents: read
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      MISE_TASK_CACHE_REMOTE_OIDC_AUDIENCE: https://cache.example.com
    steps:
      - uses: actions/checkout@v7
      - uses: jdx/mise-action@v5
      - run: mise run test
```

mise 会将 token 保存在内存中，并在过期前刷新。请配置服务器信任 GitHub 的签发者（`https://token.actions.githubusercontent.com`）、接受相同的 audience，并允许工作流的身份声明（例如所属仓库）访问该命名空间。

未授予 `id-token: write` 时，启用了缓存的任务会因以下错误而失败：
``remote cache OIDC audience requires GitHub Actions OIDC; grant `id-token: write` or set MISE_TASK_CACHE_REMOTE_TOKEN``.

## 缓存条目包含的内容

命名空间中的所有读取者都可以读取其中缓存条目的全部内容。上传的条目包括：

- mise 用于计算缓存键的操作描述。它包含任务名称、`run` 条目、参数、Shell、输出模式、目录、源文件哈希、解析后的工具版本、操作系统和体系结构。它还会列出已缓存依赖项的缓存键，以及每个 `cache.command_inputs` 命令的文本和命令输出哈希。此外还包含任务自身 `env` 条目的值、`cache.env` 或 `task_config.global_env` 中列出的所有变量值，以及任务可以访问的所有 mise 变量值，包括 `[vars]` 和任务的 `vars`。
- 任务捕获的 stdout 和 stderr；mise 会先应用[脱敏规则](/environments/secrets/#redaction)。
- 每个已声明的输出文件。

源文件不会上传，只会上传其哈希值。

::: danger 操作描述中包含秘密信息
mise 会将变量值和命令输入文本原样写入操作描述，不会对它们应用 `redact = true` 或 `redactions`。不要将秘密放在已缓存任务的 `env`、`{ task = ... }` 运行条目的 `env`、`cache.env` 或 `task_config.global_env` 中列出的变量、`vars`，或命令输入中。请改为通过作业环境提供凭据；如果任务运行在环境沙箱中，请将对应变量列入 [`pass_through_env`](/tasks/caching.html#environment-variables-and-cache-keys)。
:::

日志脱敏只能捕获 mise 已知的值。任务仍可能打印未知凭据或将其写入输出文件，因此只有在日志和输出可安全地与命名空间中所有读取者共享时，才应缓存此类任务。

[`mise cache clear`](/cli/cache/clear.html) 只会清除本地条目。若要删除已上传的副本，请使用服务器的保留和删除控制功能。

## 在机器之间共享条目

只有所有[缓存键输入](/tasks/caching.html#what-goes-into-the-cache-key)都相同时，条目才会命中。因此：

- 机器必须运行相同的操作系统和体系结构。
- 解析出的工具版本必须相同。使用[锁文件](/dev-tools/mise-lock.html)可以确保版本一致。
- 源文件路径相对于最外层配置根目录，因此检出目录不同的机器也能共享条目。根目录之外的源文件会使用绝对路径作为缓存键的一部分，只有检出位置相同的机器才能共享。
- `cache.env` 中变量的值若在 CI 中不同（例如 `CI=true`），就会生成不同的缓存键。
