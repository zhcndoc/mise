---
layout: home
title: 开发工具、环境变量和任务，一条命令搞定
description: 用一个 mise.toml 安装项目工具、设置环境变量并运行任务，让 shell、编辑器和 CI 使用同一套配置。
socialDescription: 用一份 mise.toml 管理工具、环境变量和任务。

# The custom HomeHero renders the hero. These values supply the llms.txt header.
hero:
  name: mise-en-place
  tagline: 开发工具、环境变量和任务，一站式 CLI
---

<script setup>
import ProjectSwitchDiagram from "./.vitepress/theme/ProjectSwitchDiagram.vue";
import { data as showreel } from "./.vitepress/showreel.data";
</script>

<section class="landing-page" aria-label="mise 概览">
  <div class="landing-section landing-stations">
    <p class="landing-kicker"><span>01</span> 基础功能</p>
    <h2>从工具开始。按需添加。</h2>
    <div class="stations-grid">
      <a class="station pillar-tools" href="/dev-tools/">
        <p class="station-cmd">$ mise use node@24</p>
        <h3>开发工具</h3>
        <p>
          安装 1,000 多种工具，为每个项目指定版本，并在切换目录时自动切换。
        </p>
        <span class="card-link">阅读开发工具指南</span>
      </a>
      <a class="station pillar-env" href="/environments/">
        <p class="station-cmd">$ mise env</p>
        <h3>环境</h3>
        <p>
          进入项目目录时，从 <code>mise.toml</code>、.env 文件和密钥加载环境变量。
        </p>
        <span class="card-link">阅读环境变量指南</span>
      </a>
      <a class="station pillar-tasks" href="/tasks/">
        <p class="station-cmd">$ mise run test</p>
        <h3>任务</h3>
        <p>
          将构建、测试、检查和部署命令与所需工具及环境变量一起定义，并设置依赖关系和并行执行。
        </p>
        <span class="card-link">阅读任务指南</span>
      </a>
      <a class="station pillar-boot" href="/bootstrap.html">
        <p class="station-cmd">$ mise bootstrap</p>
        <h3>引导</h3>
        <p>
          配置整台机器：系统软件包、dotfiles、代码仓库、服务、macOS 默认设置和开发工具。
        </p>
        <span class="card-link">阅读机器初始化指南</span>
      </a>
    </div>
    <p class="landing-note version-files-note">已有 <code>.tool-versions</code>、<code>.nvmrc</code> 或 <code>.python-version</code> 文件？mise 可直接读取 <code>.tool-versions</code>；<a href="/dev-tools/versions.html#idiomatic-version-files">启用后也能读取其他文件</a>。</p>
  </div>

  <div class="landing-section landing-switch">
    <p class="landing-kicker"><span>02</span> 日常使用</p>
    <div class="landing-switch-grid">
      <div>
        <h2>切换目录。<em>一切随之而变。</em></h2>
        <p class="landing-lede">
          只需在 shell 中激活一次 mise。之后，进入项目时，其已安装的工具版本会加入你的 <code>PATH</code>，并加载项目的环境变量。离开项目后，mise 会为新目录恢复环境。
        </p>
        <ul class="landing-checklist">
          <li>支持 bash、zsh、fish、Nushell、PowerShell 等 <a href="/shell-setup.html">多种 shell 的激活方式</a></li>
          <li>为不会读取 shell 启动文件的编辑器和脚本提供 shims</li>
          <li>可在脚本和容器中使用 <code>mise exec</code>，也可在 CI 中使用 <a href="/continuous-integration.html">GitHub Action</a></li>
        </ul>
      </div>
      <ProjectSwitchDiagram />
    </div>
  </div>

  <div class="landing-section landing-machine">
    <p class="landing-kicker"><span>03</span> 新机器</p>
    <div class="landing-machine-grid">
      <figure class="bootstrap-diagram" aria-label="mise bootstrap 将一个配置应用于软件包、代码仓库、dotfiles 和服务">
        <div class="bootstrap-source">
          <span class="bootstrap-label">声明机器配置</span>
          <strong>mise.toml</strong>
          <code>[bootstrap.packages]<br>[bootstrap.repos]<br>[dotfiles]<br>[bootstrap.services]</code>
        </div>
        <div class="bootstrap-connector"><span aria-hidden="true">↓</span> <code>mise bootstrap</code></div>
        <div class="bootstrap-resources">
          <div><strong>软件包</strong><span>brew · apt · scoop · winget</span></div>
          <div><strong>代码仓库</strong><span>项目检出目录</span></div>
          <div><strong>Dotfiles</strong><span>跟踪 · 链接 · 模板</span></div>
          <div><strong>服务</strong><span>后台进程</span></div>
        </div>
        <figcaption>运行 <code>mise bootstrap --dry-run</code> 可在应用前预览变更。</figcaption>
      </figure>
      <div>
        <h2>为<em>整台机器</em>使用一个配置。</h2>
        <p class="landing-lede">
          声明机器需要的软件包、代码仓库、dotfiles 和服务，再用 <code>mise bootstrap</code> 应用配置。先运行
          <code>mise bootstrap --dry-run</code> 可预览变更。这些配置属于机器，而非某个项目，通常放在全局配置或自己的配置仓库中。
        </p>
        <ul class="landing-checklist">
          <li><a href="/bootstrap/packages/">管理软件包</a>，支持 apt、dnf、pacman、AUR、zypper、apk、nix、flatpak、snap、Homebrew formula 和 cask、macOS 应用直链下载、mas、scoop、winget 及包管理器插件</li>
          <li>就地跟踪 dotfiles，保留可回滚并在机器间同步的历史记录；也可将文件部署为符号链接、副本或模板，或按行和代码块编辑</li>
          <li>通过 SSH 管理远程主机：<code>mise bootstrap remote</code></li>
        </ul>
        <p class="landing-note">从存放 <code>mise.toml</code> 的仓库初始化新机器：</p>
        <div class="landing-inline-cmd"><code>mise bootstrap --from git@github.com:you/dotfiles.git</code></div>
        <p class="landing-note"><a href="/bootstrap.html">阅读机器初始化指南</a>或 <a href="/dotfiles.html">dotfiles 指南</a>。</p>
      </div>
    </div>
  </div>

  <div class="landing-pantry" aria-label="支持的工具">
    <div class="landing-pantry-inner">
      <div class="pantry-head">
        <p class="landing-kicker"><span>—</span> 工具注册表</p>
        <p class="pantry-stat">1,000+<small>种工具，涵盖 node 到 terraform</small></p>
      </div>
      <div class="landing-tools-list">
        <a href="https://mise-versions.jdx.dev/tools/node">node</a>
        <a href="https://mise-versions.jdx.dev/tools/python">python</a>
        <a href="https://mise-versions.jdx.dev/tools/ruby">ruby</a>
        <a href="https://mise-versions.jdx.dev/tools/go">go</a>
        <a href="https://mise-versions.jdx.dev/tools/rust">rust</a>
        <a href="https://mise-versions.jdx.dev/tools/java">java</a>
        <a href="https://mise-versions.jdx.dev/tools/deno">deno</a>
        <a href="https://mise-versions.jdx.dev/tools/bun">bun</a>
        <a href="https://mise-versions.jdx.dev/tools/terraform">terraform</a>
        <a href="https://mise-versions.jdx.dev/tools/kubectl">kubectl</a>
        <a href="https://mise-versions.jdx.dev/tools/zig">zig</a>
        <a href="https://mise-versions.jdx.dev/tools/swift">swift</a>
        <a href="https://mise-versions.jdx.dev/tools/php">php</a>
        <a href="https://mise-versions.jdx.dev/tools/elixir">elixir</a>
        <a href="https://mise-versions.jdx.dev/tools/erlang">erlang</a>
        <a href="https://mise-versions.jdx.dev/tools/dotnet">dotnet</a>
        <a href="https://mise-versions.jdx.dev/tools/pnpm">pnpm</a>
        <a href="https://mise-versions.jdx.dev/tools/uv">uv</a>
        <a href="https://mise-versions.jdx.dev/tools/awscli">awscli</a>
        <a href="https://mise-versions.jdx.dev/tools/gh">gh</a>
        <a href="https://mise-versions.jdx.dev/tools/jq">jq</a>
        <a href="https://mise-versions.jdx.dev/tools/ripgrep">ripgrep</a>
        <a class="more" href="/registry.html">浏览注册表</a>
      </div>
      <p class="pantry-backends">
        支持来自
        <a href="/dev-tools/backends/packslip.html">packslip</a>,
        <a href="/dev-tools/backends/aqua.html">aqua</a>,
        <a href="/dev-tools/backends/github.html">GitHub releases</a>,
        <a href="/dev-tools/backends/cargo.html">cargo</a>,
        <a href="/dev-tools/backends/npm.html">npm</a>,
        <a href="/dev-tools/backends/pypi.html">PyPI</a>,
        <a href="/dev-tools/backends/go.html">go</a>,
        <a href="/dev-tools/backends/gem.html">gem</a>,
        <a href="/dev-tools/backends/http.html">http</a>,
        <a href="/dev-tools/backends/vfox.html">vfox</a>，以及
        <a href="/dev-tools/backends/">更多后端</a>。
      </p>
    </div>
  </div>

  <div class="landing-section landing-recipe">
    <p class="landing-kicker"><span>04</span> 快速开始</p>
    <h2>运行你的第一个项目任务。</h2>
    <ol class="recipe">
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">第 1 步</span>
          <h3>安装 mise</h3>
          <p>在 macOS 或 Linux 上运行安装脚本。mise 会安装到 <code>~/.local/bin</code>；如果该目录不在 <code>PATH</code> 中，请在后两步中使用 <code>~/.local/bin/mise</code>。在 Windows 上运行 <code>winget install jdx.mise</code>。其他安装方式请参阅<a href="/installing-mise.html">安装 mise</a>。</p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> curl -fsSL https://mise.run | sh</div>
          <div><span class="prompt">$</span> ~/.local/bin/mise --version</div>
        </div>
      </li>
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">第 2 步</span>
          <h3>试用工具</h3>
          <p><code>mise exec</code> 会在需要时安装 Node.js 24，并使用它运行一条命令，不会改动 shell 或配置文件。</p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> mise exec node@24 -- node --version</div>
          <div>v24.x.x</div>
        </div>
      </li>
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">第 3 步</span>
          <h3>配置项目</h3>
          <p>这些命令会将 <code>[tools]</code>、<code>[env]</code> 和 <code>[tasks.hello]</code> 写入项目的 <code>mise.toml</code>。任务会使用项目指定的 Node.js 和 <code>NODE_ENV</code> 运行。提交 <code>mise.toml</code>，让团队成员和 CI 使用相同配置。</p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> mkdir my-project &amp;&amp; cd my-project</div>
          <div><span class="prompt">$</span> mise use node@24</div>
          <div><span class="dim">mise ~/my-project/mise.toml tools: node@24.x.x</span></div>
          <div><span class="prompt">$</span> mise set NODE_ENV=development</div>
          <div><span class="prompt">$</span> mise tasks add hello -- node -p process.env.NODE_ENV</div>
          <div><span class="prompt">$</span> mise run hello</div>
          <div><span class="dim">[hello] $ node -p process.env.NODE_ENV</span></div>
          <div>development</div>
        </div>
      </li>
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">第 4 步（可选）</span>
          <h3>在 shell 中激活 mise</h3>
          <p>激活后，进入项目时项目所需的工具和环境变量会自动载入 shell，因此无需 <code>mise exec</code> 也能运行 <code>node</code>。按所用 shell 运行一次对应命令，然后打开新的 shell。PowerShell、Nushell 等的设置方式请参阅 <a href="/shell-setup.html">shell 配置</a>。</p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="dim"># bash</span></div>
          <div><span class="prompt">$</span> echo 'eval "$(~/.local/bin/mise activate bash)"' &gt;&gt; ~/.bashrc</div>
          <div><span class="dim"># zsh</span></div>
          <div><span class="prompt">$</span> echo 'eval "$(~/.local/bin/mise activate zsh)"' &gt;&gt; "${ZDOTDIR:-$HOME}/.zshrc"</div>
          <div><span class="dim"># fish</span></div>
          <div><span class="prompt">$</span> mkdir -p ~/.config/fish</div>
          <div><span class="prompt">$</span> echo '~/.local/bin/mise activate fish | source' &gt;&gt; ~/.config/fish/config.fish</div>
        </div>
      </li>
    </ol>
  </div>

  <div class="landing-cta">
    <p class="landing-kicker"><span>—</span> 安装 mise</p>
    <h2>出发，配好你的开发环境。</h2>
    <div class="landing-mini-install"><code>curl -fsSL https://mise.run | sh</code></div>
    <div class="landing-links">
      <a href="/getting-started.html">快速开始</a>
      <a :href="showreel ? '/#showreel' : '/demo.html'">观看演示</a>
      <a href="https://github.com/jdx/mise">GitHub</a>
    </div>
  </div>

  <a class="landing-special landing-related" href="https://mr-boxington.jdx.dev/" aria-label="试用 Mr Boxington">
    <div>
      <p class="landing-kicker"><span>—</span> 相关项目</p>
      <h2>用 Mr Boxington 共享 Cargo 构建缓存</h2>
      <p>让每个 Cargo 检出目录在本地和 CI 中共用一个自动清理的编译缓存。</p>
    </div>
    <span class="card-link">mr-boxington.jdx.dev</span>
  </a>
</section>
