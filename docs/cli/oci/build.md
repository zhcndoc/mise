<!-- 由 usage-cli 根据用法规范生成 -->
# `mise oci build`

- **Usage:** `mise oci build [FLAGS]`
- **Effect:** modifies state
- **Source code:** [`src/cli/oci/build.rs`](https://github.com/jdx/mise/blob/main/src/cli/oci/build.rs)

[实验性] 根据当前的 mise.toml 构建一个 OCI 镜像

每个工具版本都会成为各自独立的内容可寻址 OCI 层。提升某个
工具版本只会使该工具所在的层失效——其他工具、基础
镜像以及配置都会原样复用。输出目录符合 OCI image-layout 规范，
可被 `skopeo`、`crane` 或 `podman load` 使用。

需要 `mise settings experimental=true`（或 `MISE_EXPERIMENTAL=1`）。

## 标志
- **`--copy <HOST_PATH:IMAGE_PATH>`** — 将主机文件、目录或符号链接复制到镜像中（可重复，HOST:IMAGE）
- **`-o --output <OUTPUT>`** — OCI 镜像布局的输出目录

  **默认值：** `./mise-oci`
- **`--from <FROM>`** — 基础镜像引用（覆盖 [oci].from 和 oci.default_from 设置）
- **`--include-global`** — 同时包含全局／系统配置中的工具（默认：仅项目）

  默认情况下，`mise oci build` 只会打包项目 mise 配置中声明的工具（以及项目根目录及其以下的任何父级配置，例如单体仓库根目录配置）。`~/.config/mise/config.toml` 中的个人开发工具会被排除，因此不会被打包进项目镜像。传入 `--include-global` 可恢复旧的“合并所有已加载配置”行为。
- **`-t --tag <TAG>`** — 要记录在镜像索引中的标签（org.opencontainers.image.ref.name 注释）
- **`--mount-point <MOUNT_POINT>`** — 将工具安装放置在镜像中的位置（默认：/mise）
- **`--no-mise`** — 不要将当前运行的 mise 二进制文件嵌入 `/usr/local/bin/mise`
- **`--owner <UID[:GID]>`** — 为生成层中的每个 tar 条目分配的 UID[:GID]

  覆盖 [oci].user_id／[oci].group_id。默认为 0:0。如果省略 GID，则默认为 UID。这只影响文件所有权；[oci].user 控制镜像的 USER 指令。
- **`-h --help`** — 打印帮助

示例：

```
使用默认值构建（以 debian:bookworm-slim 为基础镜像）：
$ mise oci build

使用特定基础镜像和标签构建：
$ mise oci build --from ubuntu:24.04 --tag myorg/dev:latest -o ./img

使用 skopeo 检查结果：
$ skopeo inspect oci:./mise-oci

推送到注册表：
$ mise oci push --image-dir ./mise-oci ghcr.io/me/dev:latest
```

注意事项：

```
- 镜像只包含项目 mise 配置中的工具（以及项目根目录及其以下的任何配置）。`~/.config/mise/config.toml` 中的工具不会被包含；传入 --include-global
  也可将它们打包进去。
- v1 不支持 asdf 和 vfox 插件；请为每个工具使用不同的后端
  （core、aqua、ubi、github、cargo、npm、go、pipx、spm、http）。
- 默认情况下，宿主机上的 mise 二进制会嵌入到 `/usr/local/bin/mise`；请在与目标镜像相同的 OS/架构上构建（或传入 --no-mise）。
```
