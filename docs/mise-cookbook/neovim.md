---
description: "高亮嵌入 mise.toml 中的脚本和文件任务中的元数据，然后通过 otter.nvim 添加语言服务器功能。"
---

# Neovim 使用手册

高亮嵌入 `mise.toml` 中的脚本和文件任务中的元数据，然后通过 otter.nvim 添加语言服务器功能。这些示例用于配置编辑器；不会改变 mise 执行任务的方式。

添加查询之前，请安装 `toml`、`bash` 以及你使用的任何注入语言的 Treesitter 解析器（例如用于 `#USAGE` 的 `kdl`）。通过你的 Neovim 配置启用 Treesitter 高亮。查询文件本身不会安装解析器或启动高亮；请参阅 [Neovim 的 Treesitter 文档](https://neovim.io/doc/user/treesitter.html)。

下面的路径均相对于 `stdpath("config")`，通常为 `~/.config/nvim`。Lua 插件声明假设你已经在使用 lazy.nvim。

## 语法高亮

### 运行命令

使用 [Treesitter](https://github.com/nvim-treesitter/nvim-treesitter) 为 mise 文件运行命令中的代码启用语法高亮。示例请见图片左侧：

![运行命令语法高亮演示](./run-cmd-syntax-hl.png)

在你的 Neovim 配置中，创建一个 `after/queries/toml/injections.scm` 文件，并加入以下查询：

```query
; 扩展

(pair
  (bare_key) @key (#eq? @key "run")
  (string) @injection.content @injection.language

  (#is-mise?)
  (#match? @injection.language "^['\"]{3}\n*#!(/\\w+)+/env\\s+\\w+") ; 使用 env 的多行 shebang
  (#gsub! @injection.language "^.*#!/.*/env%s+([^%s]+).*" "%1") ; 提取语言
  (#offset! @injection.content 0 3 0 -3) ; 去掉引号
)

(pair
  (bare_key) @key (#eq? @key "run")
  (string) @injection.content @injection.language

  (#is-mise?)
  (#match? @injection.language "^['\"]{3}\n*#!(/\\w+)+\s*\n") ; 多行 shebang
  (#gsub! @injection.language "^.*#!/.*/([^/%s]+).*" "%1") ; 提取语言
  (#offset! @injection.content 0 3 0 -3) ; 去掉引号
)

(pair
  (bare_key) @key (#eq? @key "run")
  (string) @injection.content

  (#is-mise?)
  (#match? @injection.content "^['\"]{3}\n*.*") ; 多行
  (#not-match? @injection.content "^['\"]{3}\n*#!") ; 无 shebang
  (#offset! @injection.content 0 3 0 -3) ; 去掉引号
  (#set! injection.language "bash") ; 默认为 bash
)

(pair
  (bare_key) @key (#eq? @key "run")
  (string) @injection.content

  (#is-mise?)
  (#not-match? @injection.content "^['\"]{3}") ; 非多行
  (#offset! @injection.content 0 1 0 -1) ; 去掉引号
  (#set! injection.language "bash") ; 默认为 bash
)
```

`is-mise?` 谓词会将高亮限制在 mise 文件中，而不是所有 TOML 文件中。如果你不需要这种区分，请删除包含 `(#is-mise?)` 的行。否则，请确保也在 Neovim 配置中的某处定义该谓词。

例如，使用 [`lazy.nvim`](https://github.com/folke/lazy.nvim)：

```lua
{
  "nvim-treesitter/nvim-treesitter",
  init = function()
    require("vim.treesitter.query").add_predicate("is-mise?", function(_, _, bufnr, _)
      local filepath = vim.fs.normalize(vim.api.nvim_buf_get_name(tonumber(bufnr) or 0))
      local filename = vim.fn.fnamemodify(filepath, ":t")
      return filename:match("^%.?mise.*%.toml$") ~= nil
        or filepath:match("/%.?mise/config%.toml$") ~= nil
        or filepath:match("/%.?mise/config%.local%.toml$") ~= nil
        or filepath:match("/%.?mise/config%.[^/]+%.toml$") ~= nil
        or filepath:match("/%.config/mise/mise%.toml$") ~= nil
        or filepath:match("/%.config/mise/mise%.local%.toml$") ~= nil
        or filepath:match("/%.?mise/conf%.d/[^/]+%.toml$") ~= nil
    end, { force = true, all = false })
  end,
},
```

此谓词可以识别以 mise 命名的文件以及 `.config/mise/config.toml` 之类的分组配置文件。如果你的项目使用自定义配置文件名，请相应调整该谓词。

shebang 查询会处理直接解释器路径和 `/usr/bin/env <name>`。提取出的名称必须与已安装的 Treesitter 语言匹配；`env -S uv run` 之类的包装器以及 `python3` 之类的带版本名称需要自定义映射或查询。Bash 回退只控制高亮；mise 实际使用的默认 shell 在 [TOML tasks](/tasks/toml-tasks.html#shell-shebang) 中有说明。

### 文件任务中的 MISE 和 USAGE 注释

你也可以使用 Treesitter 为文件任务中的 `#MISE` 和 `#USAGE` 注释启用语法高亮。示例请见图片左侧：

![USAGE 规范语法高亮演示](./usage-spec-syntax-hl.png)

在你的 Neovim 配置中，创建一个 `after/queries/bash/injections.scm` 文件，并加入以下查询：

```query
; 扩展

; ============================================================================
; #MISE 注释 - TOML 注入
; ============================================================================
; 此注入捕获以 "#MISE "、"#[MISE]" 或
; "# [MISE]" 开头的注释行，并将它们作为 TOML 代码块进行语法高亮。
;
; #MISE 格式
; (#offset!) 指令会从源码中跳过 "#MISE " 前缀（6 个字符）
((comment) @injection.content
  (#lua-match? @injection.content "^#MISE ")
  (#offset! @injection.content 0 6 0 1)
  (#set! injection.language "toml"))

; #[MISE] 格式
((comment) @injection.content
  (#lua-match? @injection.content "^#%[MISE%] ")
  (#offset! @injection.content 0 8 0 1)
  (#set! injection.language "toml"))

; # [MISE] 格式
((comment) @injection.content
  (#lua-match? @injection.content "^# %[MISE%] ")
  (#offset! @injection.content 0 9 0 1)
  (#set! injection.language "toml"))

; ============================================================================
; #USAGE 注释 - KDL 注入
; ============================================================================
; 此注入捕获以 "#USAGE "、"#[USAGE]" 或
; "# [USAGE]" 开头的连续注释行，并将它们作为一个单独的 KDL 代码块
; 进行语法高亮。
;
; #USAGE 格式
((comment) @injection.content
  (#lua-match? @injection.content "^#USAGE ")
  ; 将范围向右扩展一个字节，以包含末尾换行符。
  ; 参见 https://github.com/neovim/neovim/discussions/36669#discussioncomment-15054154
  (#offset! @injection.content 0 7 0 1)
  (#set! injection.combined)
  (#set! injection.language "kdl"))

; #[USAGE] 格式
((comment) @injection.content
  (#lua-match? @injection.content "^#%[USAGE%] ")
  (#offset! @injection.content 0 9 0 1)
  (#set! injection.combined)
  (#set! injection.language "kdl"))

; # [USAGE] 格式
((comment) @injection.content
  (#lua-match? @injection.content "^# %[USAGE%] ")
  (#offset! @injection.content 0 10 0 1)
  (#set! injection.combined)
  (#set! injection.language "kdl"))

; 注意：在 neovim >= 0.12 中，你可以使用多节点模式来代替
; 合并注入：
;
; ((comment)+ @injection.content
;   (#lua-match? @injection.content "^#USAGE ")
;   (#offset! @injection.content 0 7 0 1)
;   (#set! injection.language "kdl"))
;
; 这是更推荐的方式，因为合并注入有多个
; 限制：
; https://github.com/neovim/neovim/issues/32635
```

这些查询也可以用于其他将 `#` 注释表示为 `comment` 节点的语法。使用 `:InspectTree` 检查解析器中的节点名称。由于 Treesitter 注入是按语言分别处理的，因此你需要将相同的查询添加到每种语言的查询文件中。例如，将它们放入 `after/queries/python/injections.scm`，即可为 `Python`（以及 `bash`）启用这些查询。

对于使用 `//` 作为注释分隔符的语言，请对查询进行少量调整：

```query
((comment) @injection.content
  (#lua-match? @injection.content "^//MISE ")
  (#offset! @injection.content 0 7 0 1)
  (#set! injection.language "toml"))
((comment) @injection.content
  (#lua-match? @injection.content "^//%[MISE%] ")
  (#offset! @injection.content 0 9 0 1)
  (#set! injection.language "toml"))
((comment) @injection.content
  (#lua-match? @injection.content "^// %[MISE%] ")
  (#offset! @injection.content 0 10 0 1)
  (#set! injection.language "toml"))
((comment) @injection.content
  (#lua-match? @injection.content "^//USAGE ")
  (#offset! @injection.content 0 8 0 1)
  (#set! injection.combined)
  (#set! injection.language "kdl"))
((comment) @injection.content
  (#lua-match? @injection.content "^//%[USAGE%] ")
  (#offset! @injection.content 0 10 0 1)
  (#set! injection.combined)
  (#set! injection.language "kdl"))
((comment) @injection.content
  (#lua-match? @injection.content "^// %[USAGE%] ")
  (#offset! @injection.content 0 11 0 1)
  (#set! injection.combined)
  (#set! injection.language "kdl"))
```

## 为 run commands 中的嵌入语言启用 LSP

使用 [`otter.nvim`](https://github.com/jmbuhr/otter.nvim) 为你的 mise 文件中嵌入的代码启用 LSP 功能和代码补全。

同样使用 [`lazy.nvim`](https://github.com/folke/lazy.nvim)：

```lua
{
  "jmbuhr/otter.nvim",
  dependencies = {
    "nvim-treesitter/nvim-treesitter",
  },
  config = function()
    vim.api.nvim_create_autocmd({ "FileType" }, {
      pattern = { "toml" },
      group = vim.api.nvim_create_augroup("EmbedToml", {}),
      callback = function()
        require("otter").activate()
      end,
    })
  end,
},
```

这要求同时具备[injection queries](#run-commands)以及为每种嵌入语言配置好的语言服务器。otter.nvim 会创建嵌入缓冲区并转发请求；它不会安装语言服务器。请参阅 [otter.nvim 的设置指南](https://github.com/jmbuhr/otter.nvim#how-do-i-use-otternvim)。

## 故障排除

- 运行 `:checkhealth vim.treesitter` 检查解析器是否可用。
- 使用 `:InspectTree` 确认 TOML 的 `run` 值或文件任务注释是否匹配查询的节点类型。这些查询涵盖字符串形式的 `run` 值；任务数组和 `run_windows` 需要额外的模式。
- 如果谓词未知，请在打开文件之前加载 Lua 注册代码，或者删除 `(#is-mise?)`，以将查询应用于所有 TOML 文件。
- 如果高亮有效但 LSP 功能不起作用，请先确认同一个语言服务器在普通文件中可以正常工作，再调试嵌入缓冲区。
