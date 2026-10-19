---
description: "实现 mise 远程任务缓存协议第 1 版的服务端或客户端。"
---

# 远程缓存协议 <Badge type="warning" text="实验性" />

本文规定 mise 与远程任务缓存之间的第 1 版协议，供实现缓存服务端或客户端的开发者参考。若要使用远程缓存，请参阅[远程任务缓存](/tasks/remote-cache.html)。参考服务端是 [`jdx/mr-boxington-cache`](https://github.com/jdx/mr-boxington-cache) 中的 `mbx-cache`。该项目独立于 mise 开发；本页是协议的权威定义。

::: warning 实验性功能
远程缓存处于实验阶段。只有设置 `experimental = true` 时，mise 客户端才会使用它。
:::

本规范中的小写关键词 `must`、`must not`、`should` 和 `may` 表示 RFC 2119 定义的要求级别。

第 1 版协议定义两种存储：按摘要寻址、用于保存 Blob 和目录对象的内容寻址存储（CAS），以及将操作摘要映射到输出和日志的操作结果存储。拆分后，客户端可以跨操作去重内容并并行或分段传输 Blob；服务端也能在发布缓存命中前验证所有被引用对象。协议不会暴露 mise 的本地缓存目录、清单或归档格式；客户端可用任意形式在本地保存条目。

## 术语

| 术语                  | 含义                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| 命名空间              | 不透明的授权与隔离范围，通常对应组织、仓库、分支、拉取请求或用户                                               |
| 操作                  | 对构建操作及所有影响其结果的输入所作的带类型规范描述                                                           |
| 操作结果              | 操作成功完成后发布的不可变记录                                                                                 |
| Blob                  | CAS 中未经解释的字节数据                                                                                        |
| 目录对象              | CAS 中描述文件、子目录和符号链接的规范 JSON                                                                     |
| 摘要                  | 算法、小写十六进制哈希，以及未压缩字节长度                                                                     |
| 提交                  | 验证操作结果引用的所有 CAS 对象后发布该操作结果                                                               |
| 已验证 CAS            | 服务端已根据摘要核验字节内容的 CAS 数据                                                                        |
| CAS 可见范围          | 某个请求的命名空间获准查看的 CAS 对象                                                                          |
| 读取范围              | 读取请求查询的单个命名空间                                                                                     |

## 传输与版本控制

第 1 版使用 HTTPS 和 HTTP 语义。携带授权凭据的请求必须使用 HTTPS；连接本地回环开发服务（`localhost`、`127.0.0.0/8` 和 `::1`）时除外。客户端可以连接未经身份验证的非回环 HTTP 服务，但必须先显示醒目警告。此模式既不提供机密性，也不验证服务端身份：链路上的攻击者可以替换操作结果及其内部一致的 CAS 对象图。实现可以使用 HTTP/1.1、HTTP/2 或 HTTP/3。

请求需携带以下标头：

| 标头                  | 值                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `mbx-cache-protocol`  | `1`                                                                                                         |
| `mbx-cache-namespace` | 操作所用的命名空间。服务端不得在 `GET /v1/capabilities` 和 `GET /v1/status` 请求中要求此标头。            |
| `Authorization`       | 部署使用 Bearer 或 OIDC token 时填写 `Bearer <token>`                                                       |

URL 前缀 `/v1` 表示协议主版本。兼容性扩展通过能力声明，不需要更改 URL 前缀。不兼容的线协议或完整性变更必须升级主版本；不得将第 1 版用作不兼容实现的别名。

除非协商出的能力明确允许，否则服务端不得发送未知 JSON 响应字段，客户端也不得发送未知请求字段。

## 端点

最后一列标明 mise 当前任务缓存客户端会调用哪些端点。

| 端点                                               | 用途                             | mise 客户端使用          |
| -------------------------------------------------- | -------------------------------- | ----------------------- |
| `GET /v1/capabilities`                             | 协议版本和功能                   | 否                      |
| `GET /v1/status`                                   | 健康检查                         | 否                      |
| `POST /v1/blobs:missing`                           | 查找服务端缺少的 Blob            | 否                      |
| `GET /v1/blobs/{algorithm}/{hash}/{size}`          | 读取 Blob                        | 是                      |
| `POST /v1/blobs:pack`                              | 在一个数据流中读取多个 Blob      | 否                      |
| `PUT /v1/blobs/{algorithm}/{hash}/{size}`          | 上传 Blob                        | 是                      |
| `POST /v1/uploads`                                 | 开始上传会话                     | 否                      |
| `GET /v1/action-results/{algorithm}/{hash}/{size}` | 读取操作结果                     | 是                      |
| `PUT /v1/action-results/{algorithm}/{hash}/{size}` | 提交操作结果                     | 是                      |

## 摘要

摘要的 JSON 表示形式为：

```json
{
  "algorithm": "blake3",
  "hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "size": 1234
}
```

协议第 1 版定义 `blake3` 和 `sha256`。服务端会声明支持的算法，且必须支持 BLAKE3。操作描述符和操作结果键始终使用 BLAKE3；服务端声明支持时，其他 CAS 对象可以使用 SHA-256。摘要始终针对精确的未压缩字节内容计算，并包含其长度。服务端必须拒绝格式错误的哈希、不支持的算法、负数大小，以及内容与声明摘要不符的对象。

摘要 URL 使用 `/v1/blobs/{algorithm}/{hash}/{size}` 形式。算法和哈希必须与 JSON 表示一致，`size` 必须是无符号十进制整数。

## 能力

`GET /v1/capabilities` 不需要命名空间，会返回协议版本和服务端限制：

```json
{
  "protocol": { "major": 1, "minor": 0 },
  "digest_algorithms": ["blake3", "sha256"],
  "compressors": ["identity", "zstd"],
  "action_kinds": {
    "task": { "action_schema": 1, "metadata_schema": 1 }
  },
  "features": {
    "batch": true,
    "blob_packs": true,
    "resumable_uploads": true,
    "delegated_transfers": true
  },
  "limits": {
    "max_batch_items": 1000,
    "max_inline_blob_bytes": 1048576,
    "max_blob_bytes": 107374182400,
    "max_pack_bytes": 107374182400
  }
}
```

每个 `action_kinds` 条目都会声明服务端为该类型验证的操作描述符和客户端元数据 schema 版本。除非服务端声明了该类型以及客户端实际实现的准确 schema 版本，否则客户端不得读取或发布非 `task` 操作。服务端必须拒绝未声明的类型和不支持的 schema 版本。兼容的协议扩展可以新增类型或 schema 版本，而无需更改主版本。

客户端必须遵守已声明的限制；缺少可选功能时，应回退到其他方式。遇到不支持的主版本时，服务端返回 `426 Upgrade Required`，并在 `mbx-cache-protocol` 中注明其支持的主版本。

`GET /v1/status` 是供运维使用的健康检查端点。请求成功表示 API 进程正在运行，但不能替代能力协商或授权检查。

## 规范对象

协议 JSON 对象使用 UTF-8；只要需要计算字节摘要，就必须采用 JSON 规范化方案（RFC 8785）。重复对象键、无效 UTF-8、非规范编码，以及声明的 schema 无法表示的值都必须被拒绝。本页示例为了便于阅读而添加缩进；规范化字节不含空白，且键按顺序排列。

### 操作描述符

操作描述符包含稳定的操作类型，以及所有声明为会影响结果的内容。操作 schema 第 1 版定义了 `task`：

```json
{
  "version": 1,
  "kind": "task",
  "task": "build",
  "phase": "normal",
  "run": ["cargo build --release"],
  "args": [],
  "shell": null,
  "outputs": ["target/release/widget"],
  "root": "crates/widget",
  "source_hash": "3efccd93f9ade4f470d8902c431ae261a20c8f38191becd8906d21c4aed4ba8a",
  "environment": { "PROFILE": "release" },
  "vars": {},
  "tools": ["core:rust@1.92.0"],
  "os": "linux",
  "arch": "x86_64"
}
```

| 字段              | JSON 类型        | 内容                                                                                                                                                        |
| ----------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`         | number           | `1`                                                                                                                                                         |
| `kind`            | string           | `task`                                                                                                                                                      |
| `task`            | string           | 任务名称                                                                                                                                                    |
| `phase`           | string           | `normal`；作为 `depends_post` 依赖运行时为 `post`                                                                                                            |
| `run`             | array            | 按声明顺序排列的任务 `run` 条目。脚本为字符串；任务引用为对象，例如 `{ "task": "lint" }` 或 `{ "tasks": ["a", "b"] }`                                  |
| `args`            | array of strings | 按顺序排列的任务参数                                                                                                                                         |
| `shell`           | string or null   | 任务指定的 Shell 覆盖值                                                                                                                                     |
| `outputs`         | array of strings | 按声明顺序排列的输出模式，包括 `!` 排除项                                                                                                                    |
| `root`            | string           | 相对于最外层配置根目录的任务目录；任务位于该根目录时为 `""`                                                                                                  |
| `source_hash`     | string           | 对源路径和内容计算的 64 字符小写十六进制 BLAKE3 摘要，不带算法前缀                                                                                           |
| `dependency_keys` | array of strings | 已缓存依赖项的缓存键，排序并去重；为空时省略                                                                                                                  |
| `environment`     | object           | 环境变量名到值的映射；未设置的变量对应 `null`                                                                                                                |
| `command_inputs`  | array of objects | 每个命令输入对应一个 `{ "command", "stdout_hash", "stderr_hash" }` 对象，按声明顺序排列；为空时省略                                                       |
| `vars`            | object           | mise 变量名到值的映射                                                                                                                                        |
| `tools`           | array of strings | 已解析工具的 `backend:name@version` 表示，按顺序排列                                                                                                         |
| `os`              | string           | 客户端操作系统，例如 `linux` 或 `macos`                                                                                                                      |
| `arch`            | string           | 客户端架构，例如 `x86_64` 或 `aarch64`                                                                                                                       |

版本字符串是不透明值，不会按语义排序。每种操作类型都定义自己的规范字段和可缓存规则；服务端可以拒绝未声明的类型。

操作描述符中不得包含密钥。mise 客户端会将任务 `env` 条目、`cache.env` 或 `task_config.global_env` 中列出的所有变量，以及任务可见的所有 mise 变量（配置级 `[vars]` 和任务 `vars`）的解析值原样写入描述符，并上传到远程 CAS。不会应用 `redactions` 或 `redact = true`。只有获准使用 `secrets` 的任务才会排除在缓存之外。对于任何会使用远程缓存的任务，请勿将密钥值放入这些字段；凭据应使用 `pass_through_env`。

`source_hash` 会绑定已声明的源路径和内容，但不会上传仅缓存操作不需要的任务输入。规范化后的描述符会存储在 CAS 中，其摘要就是操作摘要，也是操作结果 URL 的键。描述同一操作的两个客户端必须生成完全相同的规范化字节。

### 目录对象

目录对象的媒体类型为 `application/vnd.mise.cache-directory.v1+json`：

```json
{
  "version": 1,
  "directories": [
    {
      "name": "assets",
      "digest": { "algorithm": "blake3", "hash": "...", "size": 321 },
      "mode": 493
    }
  ],
  "files": [
    {
      "name": "widget",
      "digest": { "algorithm": "blake3", "hash": "...", "size": 123456 },
      "executable": true,
      "mode": 493
    }
  ],
  "symlinks": [{ "name": "current", "target": "widget", "mode": 511 }]
}
```

每类节点列表都按 `name` 的 UTF-8 字节排序。名称必须是单个路径组件，不得为空、为 `.` 或 `..`、包含斜杠或 NUL，也不得与其他节点重名。恢复时必须拒绝绝对符号链接目标，以及逃逸出已声明输出根目录的目标。

可移植元数据包括文件内容、目录结构、符号链接、可执行状态，以及 `mode` 中可移植的权限位。不恢复所有者、组、时间戳、设备、套接字、FIFO、平台 ACL 或扩展属性。硬链接可以恢复为彼此独立的文件。包含不支持对象的任务结果不符合远程缓存条件；协议不会静默改写该对象。

### 操作结果

操作结果响应和提交正文的媒体类型为
`application/vnd.mise.cache-action-result.v1+json`：

```json
{
  "version": 1,
  "action": { "algorithm": "blake3", "hash": "...", "size": 789 },
  "output_root": { "algorithm": "blake3", "hash": "...", "size": 456 },
  "metadata": { "algorithm": "blake3", "hash": "...", "size": 234 }
}
```

只有成功且符合缓存条件的操作执行结果才能发布。操作没有输出文件时会省略 `output_root`。`metadata` 指向规范化的 `application/vnd.mise.cache-client-metadata.v1+json`，其中包含带类型的客户端元数据。任务元数据包含输出根目录、捕获的日志、任务身份、预计恢复字节数和执行时长。元数据 schema 属于远程协议的一部分，与 mise 的本地缓存清单相互独立。

```json
{
  "version": 1,
  "kind": "task",
  "task_identity": "f8ad8c7267ce409520fd6d9d242a6341bbc62bd8ef817317f1f8e1128297daf6",
  "roots": ["target/release/widget"],
  "output": [{ "stream": "stdout", "line": "built widget" }],
  "restored_bytes": 123456,
  "execution_duration_ns": 900000000
}
```

`task_identity` 是由客户端定义的不透明摘要；服务端不得解释其含义。每种元数据类型都有带版本的 schema。任务根路径使用正斜杠，相对于任务工作目录，并且必须符合目录节点相同的路径安全规则。任务输出条目须保持原有顺序。

元数据的 `kind` 必须与所引用操作描述符的 `kind` 相同。即使两个对象各自都符合其 schema，服务端也必须在发布前拒绝类型不匹配的提交。

操作描述符以及从结果可达的所有对象都必须存在且通过验证，结果才能被读取。

保留期限、最后访问时间、配额统计、内部存储位置和服务端注释都不属于不可变操作结果。

## CAS 操作

### 查找缺失的 Blob

`POST /v1/blobs:missing` 接受 `application/vnd.mise.cache-digests.v1+json`：

```json
{ "digests": [{ "algorithm": "blake3", "hash": "...", "size": 1234 }] }
```

对于已验证的 CAS 中不存在的对象，返回其中的子集，状态为 `200 OK`：

```json
{ "missing": [{ "algorithm": "blake3", "hash": "...", "size": 1234 }] }
```

服务端不得泄露请求可读取的命名空间或 CAS 可见范围之外是否存在对象。

### 读取 Blob

`GET /v1/blobs/{algorithm}/{hash}/{size}` 会返回 `200 OK`；调用者无权读取对象时返回 `404 Not Found`。响应包含 `Content-Length`。客户端会根据 URL 中的摘要校验字节，因此服务端无需发送摘要标头。服务端可以支持 `Range`，也可以在协商后返回 `Content-Encoding: zstd`；URL 摘要始终描述未压缩字节。

声明支持委托传输的服务端可以返回 `307 Temporary Redirect`，重定向到短时有效的 HTTPS URL。该重定向只能授权访问所请求的不可变对象。客户端不得将缓存服务的 `Authorization` 标头转发给受委托的主机。

客户端必须先验证下载内容的完整未压缩摘要，再使用该内容。摘要不匹配时应视为缓存未命中，并显示完整性警告。

### 读取 Blob 数据包

声明支持 `features.blob_packs` 的服务端会接受 `POST /v1/blobs:pack`；请求体与 `blobs:missing` 使用相同的 `application/vnd.mise.cache-digests.v1+json`。声明的总大小不得超过 `limits.max_pack_bytes`，摘要数量不得超过 `limits.max_batch_items`。超过数量限制时，服务端返回 `400 Bad Request`；声明的总大小超过字节限制时，返回 `413 Content Too Large`。

成功响应使用 `application/vnd.mise.cache-blob-pack.v1`，并以 8 字节 ASCII 魔数 `MISEPK01` 开头。其余内容是按请求顺序排列的帧数据流：

| 字段      | 编码                                        |
| --------- | ------------------------------------------- |
| 算法      | 一个字节：`1` 表示 BLAKE3，`2` 表示 SHA-256 |
| 哈希值    | 原始的 32 字节摘要                          |
| 大小      | 无符号大端序 64 位字节长度                  |
| 内容      | 恰好为 `size` 个字节                        |

服务端还可以发送 `mbx-cache-pack-blobs`（帧数）和 `mbx-cache-pack-bytes`（所有帧内容大小之和）。如果发送了这些标头，它们和 `Content-Length` 必须与解码后的数据流相符；元数据不一致时，客户端会拒绝该数据包。

服务端会省略缺失或未授权的 Blob，且同一个 Blob 即使被请求多次也只发送一次。客户端会拒绝未请求或重复的帧，将每帧写入大小受限的临时存储，完整校验其摘要后才加入本地 CAS。未声明此能力、摘要超过已声明的数据包限制，或缺少预期 Blob 时，客户端会回退到逐个读取。数据包仅用于优化传输；其帧格式不会改变 CAS 身份或操作语义。

### 上传 Blob

小型 Blob 可以通过 `PUT /v1/blobs/{algorithm}/{hash}/{size}` 直接发送，并附带 `If-None-Match: *`。服务端返回：

- `201 Created`：验证并发布新内容后返回；
- `204 No Content`：相同且已验证的内容已经存在时返回；
- `400 Bad Request`：字节内容与摘要不匹配时返回；
- `412 Precondition Failed`：不可变前置条件不满足时返回；
- `413 Content Too Large`：超过已声明的限制时返回。

mise 客户端使用单次 `PUT` 上传每个 Blob，并将 `412` 响应按 `204` 处理。

大型或可续传的上传使用上传会话：

1. `POST /v1/uploads` 声明一个或多个摘要。
2. 服务端返回上传 ID、过期时间、偏移量，以及服务端或受委托的上传 URL。
3. 客户端分块上传；必要时从服务端确认的偏移量处续传。
4. `POST /v1/uploads/{id}/finalize` 验证完整内容，并将其发布到 CAS。

第 1 版尚未定义上传会话的请求和响应正文，mise 客户端也不使用上传会话。

受委托上传始终写入隔离的暂存键，而不是可读取的 CAS 键。因此，仅使用 S3 预签名上传并不足够：完成上传时必须在发布前验证所声明的摘要。过期或弃用的暂存对象会以异步方式删除。

## 操作结果端点

`GET /v1/action-results/{algorithm}/{hash}/{size}` 会返回已提交的操作结果；未找到时返回 `404 Not Found`。命名空间为该请求指定唯一读取范围。客户端配置了多个读取范围时，会按策略顺序逐一查询，而不是发送含义模糊的多命名空间请求。

`PUT /v1/action-results/{algorithm}/{hash}/{size}` 用于提交操作结果，必须携带 `If-None-Match: *`。服务端必须以原子方式执行以下步骤：

1. 授权对该命名空间的写入；
2. 验证 URL 摘要与结果及所存储的操作描述符相符；
3. 验证结果及其引用的元数据 schema；
4. 验证操作描述符和客户端元数据的类型一致；
5. 验证所有可达的目录对象和 Blob 对象；
6. 发布不可变映射。

响应为 `201 Created`；若已存在完全相同的已提交结果，则为 `204 No Content`；若操作键已对应其他结果，则为 `409 Conflict`；若缺少不可变前置条件或该条件不满足，则为 `412 Precondition Failed`。并发的有效写入者可以上传相同 CAS 数据，但只有一个操作结果提交能够成功。

普通缓存写入者没有删除权限。管理性删除使用单独授权的端点，并且必须先删除操作结果映射，之后才能回收不可达的 CAS 数据。客户端清理本地缓存并不意味着它有权删除共享远程数据。

<a id="authentication-and-namespace-policy"></a>

## 身份验证与命名空间策略

协议支持 Bearer token、OIDC 派生 token、mTLS 和可信反向代理身份。客户端如何发现身份验证机制属于部署配置，不属于 CAS 对象元数据。凭据必须限定权限范围，并在诊断信息中脱敏。

服务端会分别授权读取和写入。标准 CI 策略使用一个共享命名空间：受保护分支可以写入，拉取请求任务只能读取。服务端根据已验证的 OIDC 声明强制执行此策略，例如仓库、ref、事件和 workflow 身份。mise 客户端也会拒绝在 GitHub Actions 和 GitLab CI 的非受保护分支推送任务中写入，但这只是纵深防御；客户端提供的模式不能作为授权边界。

不可变存储无法阻止首个写入者污染缓存。因此，即使底层对象存储会拒绝覆盖，也必须使用基于 OIDC 的命名空间授权。可信与不可信任务共用同一个 bucket 凭据，不符合安全边界要求。

运维人员应签发短时有效、遵循最小权限原则的凭据，将每个凭据限制在所需命名空间内，避免把授权标头写入日志，并根据敏感程度和保留要求对存储对象加密或采取其他保护措施。缓存日志、输出和操作描述符可能包含敏感值；详见[缓存条目包含的内容](/tasks/remote-cache.html#what-an-entry-contains)。

## 失败与重试行为

- `401 Unauthorized` 表示缺少身份验证信息或凭据无效。
- `403 Forbidden` 表示该身份无权访问相应命名空间或执行相应操作。
- `404 Not Found` 表示缓存未命中，不得借此泄露无权访问的对象。
- `409 Conflict` 表示不可变操作结果发生冲突。
- `412 Precondition Failed` 表示缺少条件写入要求，或该要求未满足。
- `422 Unprocessable Content` 表示对象编码有效，但引用图无效。
- `426 Upgrade Required` 表示主版本不匹配。
- `429 Too Many Requests` 和 `5xx` 响应可以重试；应使用有上限的指数退避和随机抖动，并遵守 `Retry-After`。

第 1 版未定义错误响应正文；客户端根据状态码处理。

缓存不可用、对象格式错误、缺少被引用对象和完整性验证失败通常会降级为缓存未命中，让本地任务继续执行。身份验证、授权和完整性错误仍必须产生醒目警告；客户端不得把它们报告为普通缓存未命中。部署可以启用严格模式，让选定错误导致操作失败。

创建上传会话及其他可重试的 `POST` 操作可以发送幂等键。服务端必须限制保留这些键的时长，并将其限定到已验证身份和命名空间。第 1 版尚未规定幂等键所用的标头，mise 客户端也不会发送。

## 自托管存储要求

符合规范的自托管服务端可以使用文件系统、兼容 S3 的对象存储或其他 Blob 存储。客户端只与缓存服务通信，不会获得通用对象存储凭据。

使用 S3 的服务端应当：

- 在事务性元数据存储中记录操作元数据、授权信息、访问时间、引用关系和配额；
- 使用由摘要派生的不可变键存储 CAS 字节；
- 为受委托上传使用随机暂存键；
- 使用带条件的对象创建，并禁止普通账户覆盖或删除对象；
- 验证所有可达对象后才完成操作结果提交；
- 回收过期的暂存上传和不可达 CAS 对象；
- 支持短时有效的工作负载凭据和静态数据加密。

对象存储版本控制、保留锁和加密可以提供纵深防御，但不能替代应用层授权或摘要验证。

## 一致性

要检查服务端，请在 mise 仓库中针对临时命名空间运行 [`scripts/task-cache-remote-compat.sh`](https://github.com/jdx/mise/blob/main/scripts/task-cache-remote-compat.sh)：

```sh
MISE_TASK_CACHE_COMPAT_TOKEN=... scripts/task-cache-remote-compat.sh https://cache.example.com scratch-ns
```

URL 和命名空间也可以分别通过 `MISE_TASK_CACHE_COMPAT_URL` 与 `MISE_TASK_CACHE_COMPAT_NAMESPACE` 提供。token 为可选项。该脚本需要 `b3sum`、`curl`、`jq` 和 `sha256sum`，并会检查：

- `/v1/status` 和 `/v1/capabilities`（协议主版本 1、`sha256` 和 task schema 1）；
- 上传前后调用 `blobs:missing`；
- 使用 `sha256` 和 `blake3` 摘要进行带条件的 Blob 上传；
- 提交操作结果（`201`）、重复提交相同结果（`204`），并读取该结果；
- 下载 CAS 对象；服务端使用委托传输时，跟随 `307` 跳转到绝对 HTTPS URL；
- 命名空间隔离（从其他命名空间访问时返回 `403` 或 `404`）；
- 不带 `If-None-Match: *` 执行不可变写入时返回 `412`。

该脚本不会测试上传会话、Blob 数据包、摘要或损坏数据拒绝、冲突提交、读写独立授权、受委托传输的凭据隔离或重试行为。服务端必须依照本规范实现这些要求。

服务端可以在 `/v1` 之外实现管理、指标和健康检查 API，但这些 API 不得削弱第 1 版缓存协议的不变量。
