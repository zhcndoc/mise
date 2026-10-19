---
description: "在浏览器中编写 mise.toml：悬停查看键的说明，获取键和值的自动补全，并即时发现错误。"
---

# mise.toml 在线编辑器

```toml editor share
min_version = "2026.10.0"

[tools]
node = "24"
python = "3.13"
"github:cli/cli" = "latest"

[env]
NODE_ENV = "development"
_.path = ["./node_modules/.bin"]

[tasks.build]
description = "Build the app"
run = "npm run build"
depends = ["install"]

[tasks.install]
run = "npm install"
sources = ["package.json", "package-lock.json"]
outputs = ["node_modules/.package-lock.json"]

[settings]
experimental = true
```

悬停在任意键或值上，即可查看其作用、类型和可用值。按 <kbd>Ctrl</kbd>+<kbd>Space</kbd> 可触发自动补全；输入时会标记错误。[mise.toml 参考](/configuration/reference.html)列出了所有键。编辑在浏览器中进行。**复制链接**会将配置写入页面地址，方便分享；这也意味着打开链接的任何人，以及提供页面的文档服务器，都会收到该配置。请勿在其中填写密钥。

若要查看磁盘上某个文件中各键的作用，请运行
[`mise config explain`](/cli/config/explain.html).
