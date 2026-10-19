---
description: "查找社区发布的 mise 相关文章、播客和视频，以及作者开发的其他配套工具。"
---

# 外部资源

社区较早发布的 mise 文章可能使用了后来已变更的命令或选项；参考时请同时核对[配置](/configuration.html)和 [CLI 参考](/cli/)。

## 文章和教程

- 2026-03-02 - [Top 10 Features in Mise You're Not Using](https://jdx.dev/posts/2026-03-02-10-mise-features/)
- 2025-04-09 - [Keeping your Swift apps' sensitive data secret](https://tuist.dev/blog/2025/04/09/secrets)
- 2025-02-04 - [A Mise guide for Swift developers](https://tuist.dev/blog/2025/02/04/mise)
- 2025-01-12 - [Mise-En-Place: Simplifiez la Gestion de vos Environnements et Tâches](https://blog.stephane-robert.info/docs/outils/systeme/mise/) (in French)
- 2024-11-20 - [Migrating from nvm to mise](https://dev.to/hverlin/migrating-from-nvm-to-mise-4mfp)
- 2024-09-06 - [Replacing pyenv, nvm, direnv with Mise](https://arunmozhi.in/2024/09/06/replacing-pyenv-nvm-direnv-with-mise)
- 2024-06-27 - [Managing Development Tool Versions with mise](https://haril.dev/en/blog/2024/06/27/Easy-devtools-version-management-mise)
- 2024-04-13 - [Shims: How they work in mise-en-place](https://jdx.dev/posts/2024-04-13-shims-how-they-work-in-mise-en-place/)
- 2024-02-20 - [Can Mise replace Volta?](https://ricostacruz.com/posts/mise-vs-volta)
- 2024-01-14 - [Manage all your runtime versions with one tool (asdf, mise)](https://blog.andreyfadeev.com/p/manage-all-your-runtime-versions)

## 播客和视频

- 2025-01-26 - [devtools.fm：Jeff Dickey - Mise、Usage、Pitchfork 以及多语言工具的未来](https://www.devtools.fm/episode/129)
- 2024-04-07 - [Lalaluka 直播：Grroxy、Cook 和 jdx/mise](https://www.youtube.com/watch?v=zA1hjrLQiPw)

## 相关工具

以下工具由 mise 作者开发，可与 mise 配合使用：

- [aube](https://aube.sh/)：JavaScript 包管理器；mise 内嵌了它，用于通过 [npm 后端](/dev-tools/backends/npm.html)安装工具。
- [fnox](https://fnox.jdx.dev/)：存储和读取密钥；mise 可将它用作[密钥来源](/environments/secrets/fnox.html)。
- [hk](https://hk.jdx.dev/)：运行 Git hooks 和项目 lint 检查。
- [Mr Boxington](https://mr-boxington.jdx.dev/)：在多个检出目录和 CI 之间共享 Cargo 构建缓存。
- [pitchfork](https://pitchfork.jdx.dev/)：管理长期运行的开发进程。
- [usage](https://usage.jdx.dev/)：定义 CLI 参数、帮助信息和补全；mise 使用它实现[任务参数](/tasks/task-arguments.html)。

如需建议添加资源或更正链接，请参阅[贡献](/contributing.html)。
