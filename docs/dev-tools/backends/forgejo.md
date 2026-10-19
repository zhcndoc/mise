---
description: "从 Codeberg 或其他 Forgejo 服务器的发行版资源安装预编译工具。"
---

# forgejo backend

The `forgejo` backend installs a tool from the release assets of a Forgejo
repository. It uses [Codeberg](https://codeberg.org) unless you set `api_url`
for another Forgejo or Gitea server. It shares its implementation with the
[github backend](/dev-tools/backends/github.html) and accepts the same
[tool options](/dev-tools/backends/github.html#tool-options); this page covers
what is different.

<a id="usage"></a>

## 用法

Forgejo Runner publishes Linux binaries on code.forgejo.org, not Codeberg, so
this example sets `api_url`. On Linux, install it in the current project and
run it:

```sh
mise use 'forgejo:forgejo/runner[api_url=https://code.forgejo.org/api/v1,bin=forgejo-runner]'
mise exec -- forgejo-runner --version
```

Quote the argument so the shell does not expand the brackets. This adds the
following entry to `mise.toml`. Add `-g` to `mise use` for a global tool.

```toml
[tools]
"forgejo:forgejo/runner" = { version = "latest", api_url = "https://code.forgejo.org/api/v1", bin = "forgejo-runner" }
```

This installs the runner executable; registering it with a server and running
it as a service are separate steps. For a repository on Codeberg, leave out
`api_url`.

## Differences from the github backend

| Behavior                                         | github                                                       | forgejo                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Default `api_url`                                | `https://api.github.com`                                     | `https://codeberg.org/api/v1`                                                          |
| Checksums found automatically                    | The digest GitHub reports, or a checksum file in the release | A checksum file in the release                                                         |
| GitHub artifact attestations and SLSA provenance | Checked                                                      | Not available; pin artifacts with `checksum` or [mise.lock](/dev-tools/mise-lock.html) |

Everything else works as on GitHub. Version listing reads the same number of
releases, and [`prerelease`](/dev-tools/backends/github.html#prerelease) uses
Forgejo's prerelease flag: `latest` resolves to the release Forgejo marks as
latest unless `prerelease = true` is set.

## 身份验证

Public repositories need no token. For a private repository, another server or
rate limits, set `MISE_FORGEJO_TOKEN` or another token source; see
[GitHub, GitLab, and Forgejo tokens](/dev-tools/github-tokens.html). Run
`mise token forgejo` to see which token mise uses.

## Other Forgejo servers

Set `api_url` to the server's API and provide a token for that host, for example
with `MISE_FORGEJO_ENTERPRISE_TOKEN`; see
[self-managed hosts](/dev-tools/github-tokens.html#github-enterprise). mise
downloads release assets through that server.

### `api_url` {#api-url}

The base URL of the Forgejo API. It defaults to `https://codeberg.org/api/v1`.

```toml
[tools]
"forgejo:user/repo" = { version = "latest", api_url = "https://forgejo.mycompany.com/api/v1" }
```

## Tool options

The `forgejo` backend accepts the
[github backend's tool options](/dev-tools/backends/github.html#tool-options)
for selecting assets, choosing versions, extracting files and verifying
downloads, with the differences listed above. The GitHub-only options
`github_attestations`, `slsa_signer_identity` and `slsa_signer_issuer` have no
effect here.

## 设置

The [`forgejo` settings](/configuration/settings.html#forgejo) choose the token
mise sends; see
[GitHub, GitLab, and Forgejo tokens](/dev-tools/github-tokens.html).
