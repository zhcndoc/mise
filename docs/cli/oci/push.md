<!-- 由 usage-cli 根据 usage spec 生成 -->
# `mise oci push`

- **用法：** `mise oci push [FLAGS] <REF>`
- **作用：** 修改状态
- **源代码：** [`src/cli/oci/push.rs`](https://github.com/jdx/mise/blob/main/src/cli/oci/push.rs)

[实验性] 构建 OCI 镜像并将其推送到镜像仓库

使用 mise 内置的镜像仓库客户端进行推送——无需
skopeo/crane/docker。如果未传入 `--image-dir`，则首先从当前的
mise.toml 全新构建。只会上传镜像仓库中尚不存在的 blob，因此重复推送
大部分未更改的工具集时，开销很低。

如果工具、版本、挂载点和文件所有者都与之前推送的镜像（或
`--cache-from`）匹配，则会复用工具层而无需重新构建——这些工具甚至无需
在本地安装。传入 `--no-cache` 可强制执行完整的本地重建。

凭据读取自 docker 和 podman 使用的相同位置：
`$REGISTRY_AUTH_FILE`、`$XDG_RUNTIME_DIR/containers/auth.json`、
`~/.config/containers/auth.json` 以及 `~/.docker/config.json`
（包括凭据助手）——因此只需执行 `docker login` / `podman login`
即可完成设置。

需要 `mise settings experimental=true`（或 `MISE_EXPERIMENTAL=1`）。

## 参数
- **`<REF>`** — 目标镜像仓库引用（例如 `ghcr.io/me/devenv:latest`）

## 标志
- **`--cache-from <REF>`** — 从此镜像复用未更改的工具层，而不是从目标引用复用

  必须位于与目标相同的仓库中。当每次推送都使用唯一标签时很有用（例如 CI 中的每次提交标签）：`--cache-from ghcr.io/me/dev:latest ghcr.io/me/dev:$SHA`。
- **`--from <FROM>`** — 构建所用的基础镜像（使用 --image-dir 时忽略）
- **`--image-dir <IMAGE_DIR>`** — 推送已构建的 OCI 镜像布局（跳过构建步骤）
- **`--include-global`** — 同时包含全局／系统配置中的工具（默认为仅项目）

  详情请参阅 `mise oci build --help`。
- **`--mount-point <MOUNT_POINT>`** — 覆盖镜像内的挂载点（使用 --image-dir 时忽略）
- **`--no-cache`** — 不从之前推送的镜像复用工具层
- **`--no-mise`** — 不嵌入 mise 二进制文件（使用 --image-dir 时忽略）
- **`--owner <UID[:GID]>`** — 构建时为每个 tar 条目分配的 UID[:GID]（与 --image-dir 冲突）

  覆盖 [oci].user_id / [oci].group_id。默认为 0:0。如果省略 GID，则默认为 UID。此选项只影响文件所有权；[oci].user 控制镜像的 USER 指令。
- **`--update-index`** — 将标签维护为多架构镜像索引

  按摘要推送此构建的 manifest，并将标签指向一个 OCI 镜像索引。该索引每个平台包含一个条目，同时保留其他架构已推送的条目。请从每个平台各运行器运行 `mise oci push --update-index`，以组装多架构标签。
- **`-h --help`** — 打印帮助

示例：

```
构建并推送到 GHCR：
$ mise oci push ghcr.io/me/devenv:latest

推送之前构建的镜像：
$ mise oci build -o ./img
$ mise oci push --image-dir ./img ghcr.io/me/devenv:v1
```

认证：

```
凭据的解析方式与 docker/podman 相同：
$REGISTRY_AUTH_FILE、$XDG_RUNTIME_DIR/containers/auth.json、
~/.config/containers/auth.json，然后是 ~/.docker/config.json
（包括内联认证信息和凭据助手）。使用以下任一命令登录：
$ docker login ghcr.io
$ podman login ghcr.io
```
