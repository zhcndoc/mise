# 社交预览

文档构建会根据每个页面的标题和 mise 现有的 logo，以及一条简短副标题，为每个页面生成一张 1200×630 的 PNG 图片。主页使用产品宣传标题。图片通过 resvg 在本地渲染，并使用随附的采用 OFL 许可的 Space Grotesk 字体；无需渲染服务或系统字体。图片 URL 包含最终 PNG 字节内容的哈希值，因此标题、图稿、字体和渲染器发生变化时都会生成新的 URL。

每个 Markdown 页面都必须在 frontmatter 中提供非空字符串 `description`。缺失、为空或非字符串的描述会使文档构建失败，并显示页面路径。不会自动回退到页面正文或网站描述。CLI 生成会根据命令帮助写入此字段，CLI 索引使用专用摘要；不要手动编辑生成的 CLI 页面。VitePress 内置的 404 页面使用其内置描述，并继续标记为 noindex。

必需的 `description` 会提供 HTML、Open Graph、Twitter 和结构化元数据。当图片需要更短的编辑性副标题时，可设置可选的 `socialDescription`，例如：

```yaml
description: Install tools from signed release manifests with mise.
socialDescription: Signed releases and verified downloads.
```

副标题限制为大约 100 个字符和两行测量行。标题最多使用三行，必要时会缩小并截断。标题和副标题都拥有独立于 logo 和页脚的预留空间。即使提供了 `socialDescription`，空的页面摘要也会使构建失败。

`docs:build` 会测试文本换行和 PNG 渲染，然后检查构建后的 HTML，确认其 Open Graph／Twitter 元数据与每个页面标题和副标题所对应的预期图片相匹配。检查还涵盖描述一致性、规范 URL、图片类型和尺寸，以及错误页面的 noindex 指令。回归测试会拒绝图片错配和空 alt 文本。编辑 `social-images.mjs` 可调整颜色或布局。

## 将 showreel 用作 og:video

当构建生成 showreel（由文档部署运行的 `mise run docs:showreel`）时，主页会使用 Open Graph 的 `video.other` 类型，并将带有 `?v=` 内容哈希的 60 fps `showreel.mp4` 作为 `og:video`，使链接预览可以播放视频。X 会忽略 `og:video`，继续使用大图卡片。其他页面，以及未生成 showreel 的构建中的主页，都是没有视频标签的 `website`，因此 `og:type` 会在 `transformHead` 中按页面设置，而不是设置在全站 head 中。构建页面检查还要求主页播放器从部署后的视频和海报开始播放，播放器脚本切换到的文件必须是 120 fps 版本，并且只有在播放器存在时，“观看演示”才链接到 `/#showreel`。
