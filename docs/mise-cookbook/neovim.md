# Mise + Neovim 食谱

以下是一些使用 [Neovim](https://github.com/neovim/neovim) 改进 mise 工作流的小技巧。

## 语法高亮

### 运行命令

使用 [Treesitter](https://github.com/nvim-treesitter/nvim-treesitter) 为 mise 文件中运行命令里的代码启用语法高亮。
请看图片左侧的示例：

![运行命令语法高亮演示](./run-cmd-syntax-hl.png)

在你的 neovim 配置中，创建一个 `after/queries/toml/injections.scm` 文件，并加入以下查询：

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

为了只在 mise 文件上应用高亮，而不是所有 toml 文件，使用了 `is-mise?` 这个谓词。
如果你不在意这种区分，可以删除包含 `(#is-mise?)` 的行。
否则，也要确保在你的 neovim 配置中的某处创建这个谓词。

例如，使用 [`lazy.nvim`](https://github.com/folke/lazy.nvim)：

```lua
{
  "nvim-treesitter/nvim-treesitter",
  init = function()
    require("vim.treesitter.query").add_predicate("is-mise?", function(_, _, bufnr, _)
      local filepath = vim.api.nvim_buf_get_name(tonumber(bufnr) or 0)
      local filename = vim.fn.fnamemodify(filepath, ":t")
      return string.match(filename, ".*mise.*%.toml$") ~= nil
    end, { force = true, all = false })
  end,
},
```

这会将任何文件名中包含 `mise` 的 `toml` 文件视为 mise 文件。

### 文件任务中的 MISE 和 USAGE 注释

你也可以使用 Treesitter 为基于文件的任务中的 `"#MISE` 和 `#USAGE` 注释启用语法高亮。
请看图片左侧的示例：

![USAGE 规范语法高亮演示](./usage-spec-syntax-hl.png)

在你的 neovim 配置中，创建一个 `after/queries/bash/injections.scm` 文件，并加入以下查询：

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

对于所有使用 `#` 作为注释分隔符的语言，这些查询都可以直接使用。
由于 TS 注入是按语言区分的，你需要把相同的查询放到对应语言的查询文件中。
例如，把它们放到 `after/queries/python/injections.scm` 中，就可以让它们在 `bash` 之外也对 `Python` 生效。

对于使用 `//` 作为注释分隔符的语言，你需要对查询稍作修改：

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

这只有在 [TS 注入查询](#run-commands) 也已设置好的情况下才会生效。
