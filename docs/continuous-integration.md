---
description: "在 CI 和开发环境中使用相同的 mise.toml，以便两个环境选择相同的工具。"
---

# 持续集成

Use the same `mise.toml` in CI and development so both environments select the
same tools. Run commands with `mise exec` or [`mise run`](/tasks/) to load those
tools and the project's [environment variables](/environments/). CI does not
need shell activation.

提交一份[锁文件](/dev-tools/mise-lock.html)，并使用 `mise install --locked` 安装。这样每个作业都会安装相同的版本，mise 也会直接从 `mise.lock` 读取版本，而不必像在全新运行器上那样每次运行都获取各工具的可用版本列表。创建锁文件时，为每种运行器平台都添加条目：

```sh
mise lock --platform linux-x64,linux-arm64,macos-arm64
```

如果工具没有对应的锁文件条目，`--locked` 会直接失败，而不会查询其版本。对于会记录下载 URL 的后端，条目还必须包含当前平台对应的 URL；详见[严格锁文件模式](/dev-tools/mise-lock.html#strict-lockfile-mode)。如果流水线还需要控制 mise 自身的更新，请单独固定 mise 版本。

## GitHub Actions {#github-actions}

[mise-action](https://github.com/jdx/mise-action) installs mise and the tools
declared in the checked-out repository. By default it also caches the tools,
adds the shims directory to `PATH`, and exports the project's environment
variables to later steps:

```yaml
name: test
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: jdx/mise-action@v5
      - run: mise run test
```

::: warning
A restored tool cache is trusted as is: mise does not check installed files against
`mise.lock`. To cache downloads instead, which mise checks, see
[Cache downloads, not installs](#trusted-cache).
:::

The example assumes a `test` task in `mise.toml`, such as
`test = "npm ci && npm test"` under `[tasks]`. `mise exec -- npm test` works as
well.

When the repository has a `mise.lock`, the action runs `mise install --locked`
automatically. Use the `version` input to pin mise, and `working_directory` to
select a subproject. Keep tool versions in the repository config; the
`mise_toml` and `tool_versions` inputs are for workflows that supply their own
config. See the [action inputs](https://github.com/jdx/mise-action/blob/v5/action.yml)
for cache and token options.

The action gives mise the workflow's GitHub token while it installs tools, but
does not export it to later steps. If later steps install tools or hit GitHub
API rate limits, pass a token to them as shown in
[GitHub tokens](/dev-tools/github-tokens.html#ci-github-actions).

### Cache downloads, not installs {#trusted-cache}

With a `mise.lock`, cache the download store instead of the tools. mise hashes
each stored file against the checksum in the lockfile before it uses it, so a
poisoned or stale cache can't change what is installed, and the action's own
tool cache is turned off:

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: actions/cache@v6
    with:
      # Linux default; use the platform-specific path below on macOS/Windows.
      path: ~/.cache/mise/downloads-cas
      key: mise-downloads-${{ runner.os }}-${{ hashFiles('mise.lock') }}
  - uses: jdx/mise-action@v5
    with:
      cache: false
```

The path above is mise's default cache directory on Linux. On macOS, cache
`~/Library/Caches/mise/downloads-cas`. On Windows, use the runner's temp
directory context so GitHub Actions resolves the path before passing it to the
cache action: <code v-pre>${{ runner.temp }}\mise\downloads-cas</code>. If
`MISE_CACHE_DIR` is set, cache `downloads-cas` under that directory instead. See
[`mise directories`](/directories.html) for details.

Installs run `mise install --locked`, which only reuses a download that has a
checksum to check it against. Tools are unpacked on every run, so this is slower
than restoring installs, and tools compiled from source still compile. The store
holds up to [`download_cache_max_size`](/configuration/settings.html#download_cache_max_size)
(2 GiB by default). See
[`download_cache`](/configuration/settings.html#download_cache) and
[Restored caches and installed tools](/dev-tools/mise-lock.html#restored-caches).

To start a workflow, [`mise generate github-action`](/cli/generate/github-action.html)
prints one that runs `mise run ci` on pull requests, tags and pushes to the
current branch. Add `--write` to save it as `.github/workflows/ci.yml`, and
review the triggers and action versions before committing it:

```sh
mise generate github-action --write --task=ci
```

## GitLab CI {#gitlab-ci}

Both examples assume an amd64 runner (change the cache prefix for arm64), a
Node.js project with a `build` script in `package.json`, and a committed
`mise.lock`. Without a lockfile, drop `mise.lock` from the cache key and
`--locked` from the install. GitLab accepts at most two paths in
`cache:key:files` by default. Add any OS packages your tools need to
`before_script`, or build a CI image that has them.

### Use a committed wrapper {#use-a-committed-wrapper}

This job runs the [committed wrapper](#bootstrapping) on a Debian image. The
localized wrapper keeps mise's directories under `.mise/`, which the job
caches:

```yaml
build-job:
  stage: build
  image: debian:13-slim
  cache:
    key:
      prefix: mise-debian13-amd64
      files: [mise.toml, mise.lock]
    paths:
      - .mise/installs/
      - .mise/cache/
  before_script:
    - apt-get update && apt-get install -y --no-install-recommends curl ca-certificates tar
  script:
    - ./bin/mise install --locked
    - ./bin/mise exec -- npm ci
    - ./bin/mise exec -- npm run build
```

To start a new cache when you regenerate the wrapper for a newer mise, change
the prefix, for example to `mise-debian13-amd64-2026.10.4`.

### Use the official image {#use-the-official-image}

The [official `-debian` image](/mise-cookbook/docker.html#official-images)
already contains mise, `curl`, `git` and CA certificates, so a job can use it
directly, without a wrapper or an `ENTRYPOINT` override. Set the mise data and
cache directories inside the project so GitLab can cache them:

```yaml
build-job:
  stage: build
  image: ghcr.io/jdx/mise:2026.10.4-debian
  variables:
    MISE_DATA_DIR: $CI_PROJECT_DIR/.mise
    MISE_CACHE_DIR: $CI_PROJECT_DIR/.mise/cache
  cache:
    key:
      prefix: mise-image-amd64
      files: [mise.toml, mise.lock]
    paths:
      - .mise/installs/
      - .mise/cache/
  script:
    - mise install --locked
    - mise exec -- npm ci
    - mise exec -- npm run build
```

Replace the image's version with the mise release you want to pin.

## Other CI providers {#any-ci-provider}

On other providers, commit a wrapper script that downloads a pinned mise release
on first use, then call it for every mise command. The runner needs `bash`,
`curl`, CA certificates, `tar`, and either `sha256sum` or `shasum` to download,
verify and extract mise.

### Generate the wrapper {#bootstrapping}

Generate it locally with
[`mise generate install-script`](/cli/generate/install-script.html):

```sh
mise generate install-script --localize --write
```

This writes `bin/mise`. Commit it and add `.mise/` to `.gitignore`. The
localized wrapper keeps its mise binary, installed tools, cache and state under
`.mise/`, trusts the project's config files and ignores the user's global
config. Add `--windows` to also write `bin/mise.cmd` for Windows runners and
contributors; it requires `--write`.

Run the wrapper for both installing and running, so that both use those
directories. This example assumes a Node.js project with a committed
`package-lock.json` and a `test` script:

```sh
set -eu
./bin/mise install
./bin/mise exec -- npm ci
./bin/mise exec -- npm test
```

Use `./bin/mise install --locked` when the repository has a lockfile. On
Windows runners, run `.\bin\mise.cmd` instead.

The wrapper pins the mise release that `mise self-update` would select when you
generate it (the newest stable release older than
[`self_update.minimum_release_age`](/configuration/settings.html#self_update.minimum_release_age),
24h by default), or the release passed with `--version`. Regenerate and commit
the wrapper to move to a newer release, or set `MISE_VERSION` when running it.
`MISE_INSTALL_PATH` overrides where it keeps the binary. Without `--localize`,
the wrapper uses the normal mise directories and keeps its binary under the
data directory's `bootstrap/` subdirectory.

Wrappers generated by older mise versions keep the binary in the cache
directory, where `mise cache clear` or cache pruning deletes it; regenerate
them. A regenerated wrapper reuses an existing cache-directory binary of the
same version instead of downloading it again.

If jobs install tools from private GitHub repositories or hit API rate limits,
give mise a token; see [GitHub tokens](/dev-tools/github-tokens.html).

## Xcode Cloud {#xcode-cloud}

Use an Xcode Cloud
[post-clone script](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)
at `ci_scripts/ci_post_clone.sh` to install and run tools before the build.
Commit the [generated wrapper](#bootstrapping) at `bin/mise`. This example
assumes SwiftLint is declared in the repository's `mise.toml`:

```sh
#!/bin/sh
set -eu
cd "$CI_PRIMARY_REPOSITORY_PATH"
./bin/mise install
./bin/mise exec -- swiftlint lint
```

Make the script executable before committing it. Environment changes in this
script do not reach later build phases, so use `mise exec` in any other phase
that needs mise tools. For local Xcode builds, see
[Editors and IDEs](/ide-integration.html#xcode).

## Caching {#caching}

Cache installed tools to avoid downloading them on every job. Cache
`$MISE_DATA_DIR/installs` (by default `~/.local/share/mise/installs`) and
`$MISE_CACHE_DIR`; with a localized wrapper these are `.mise/installs` and
`.mise/cache`. Include the runner's OS and architecture, `mise.toml` and the
lockfile in the cache key, and use separate caches for jobs that use different
[config environments](/configuration/environments.html) or install options.

恢复缓存后仍要运行 `mise install`：它会安装缺少的工具，而且作业也必须能在空缓存下成功。当缓存版本列表的年龄超过工具的
[`minimum_release_age`](/configuration/settings.html#minimum_release_age) 减去 1 小时时（默认 23 小时，且至少为 1 小时；参阅[mise 何时刷新版本列表](/cache-behavior.html#version-list-refresh)），`mise install` 会将其视为过期并重新获取。因此，恢复缓存不像使用锁文件那样能避免版本查询。安装目录和元数据位置见[目录](/directories.html)。

## Trust and untrusted branches {#safe-mode}

When mise detects a CI environment, it trusts every config file without
prompting unless [paranoid mode](/paranoid.html) is on, so tasks, hooks and
`[env]` from the checked-out branch run normally. A job that reads branches you
did not write while holding secrets, such as a bot that resolves versions from
pull requests, should set `MISE_SAFE=1` so project config cannot run code or
inject environment variables:

```sh
MISE_SAFE=1 mise lock --bump --dry-run --json
```

Remove `--dry-run` when the bot should update `mise.lock`. Safe mode refuses
tasks, template `exec()` and plugin installation, ignores project environment
variables and settings, and skips hooks. Some backends need to run code and
cannot resolve versions in this mode. Operator-owned global config still
applies. See [Safe mode](/security.html#safe-mode) for the full list and the
backend restrictions.
