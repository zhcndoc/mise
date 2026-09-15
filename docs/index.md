---
layout: home
title: 开发工具、环境和任务
description: 使用 mise 在一个项目配置中管理开发工具、环境变量、任务、软件包和 dotfiles
socialDescription: 你的工具、环境和工作流。一个 CLI，适用于每个项目

# The custom HomeHero renders the hero. These values supply the llms.txt header.
hero:
  name: mise-en-place
  tagline: 开发工具、环境变量和任务，一站式 CLI
---

<script setup>
import ProjectSwitchDiagram from "./.vitepress/theme/ProjectSwitchDiagram.vue";
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
          安装数百种工具，为每个项目选择版本，并在你切换目录时自动切换。
        </p>
        <span class="card-link">开发工具</span>
      </a>
      <a class="station pillar-env" href="/environments/">
        <p class="station-cmd">$ mise env</p>
        <h3>环境</h3>
        <p>
          来自 <code>mise.toml</code>、.env 文件、密钥和 shell 命令的项目级环境变量。进入时设置，离开时移除。
        </p>
        <span class="card-link">环境</span>
      </a>
      <a class="station pillar-tasks" href="/tasks/">
        <p class="station-cmd">$ mise run test</p>
        <h3>任务</h3>
        <p>
          在工具和环境旁定义构建、测试、代码检查和部署命令，并支持依赖关系和并行运行。
        </p>
        <span class="card-link">任务</span>
      </a>
      <a class="station pillar-boot" href="/bootstrap">
        <p class="station-cmd">$ mise bootstrap</p>
        <h3>引导</h3>
        <p>
          应用你声明的机器设置：OS 软件包、dotfiles、代码仓库、服务、macOS 默认设置和开发工具。
        </p>
        <span class="card-link">引导</span>
      </a>
    </div>
    <p class="landing-note migration-note">从 asdf 迁移而来？你的 <code>.tool-versions</code> 已经可以使用。<a href="/configuration.html#idiomatic-version-files">也可以启用 .nvmrc 等文件</a></p>
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
          <li>支持 bash、zsh、fish、nushell、PowerShell 等更多 shell 的 shell hooks</li>
          <li>为从不加载 shell rc 的编辑器和脚本提供 shims</li>
          <li>通过 <code>mise exec</code> 和 <code>mise-action</code> 支持 Docker 与 CI</li>
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
          <span class="bootstrap-label">声明你的设置</span>
          <strong>mise.toml</strong>
          <code>[bootstrap.packages]<br>[bootstrap.repos]<br>[dotfiles]<br>[bootstrap.services]</code>
        </div>
        <div class="bootstrap-connector"><span aria-hidden="true">↓</span> <code>mise bootstrap</code></div>
        <div class="bootstrap-resources">
          <div><strong>软件包</strong><span>brew · apt · winget</span></div>
          <div><strong>代码仓库</strong><span>项目检出</span></div>
          <div><strong>Dotfiles</strong><span>链接 · 复制 · 模板</span></div>
          <div><strong>服务</strong><span>后台进程</span></div>
        </div>
        <figcaption><code>mise bootstrap plan</code> 会在应用前预览声明式资源变更。</figcaption>
      </figure>
      <div>
        <h2>为<em>整台机器</em>使用一个配置。</h2>
        <p class="landing-lede">
          声明机器所需的软件包、代码仓库、dotfiles 和服务，然后使用 <code>mise bootstrap</code> 应用它们。使用 <code>mise bootstrap plan</code> 预览声明式资源变更。添加 shell 激活和特定平台的设置，让机器设置与工具保持在一起。
        </p>
        <ul class="landing-checklist">
          <li>通过 brew、apt、dnf、pacman、apk、mas 和 winget 安装软件包</li>
          <li>将 dotfiles 作为符号链接、复制文件或模板，并支持单行编辑</li>
          <li>通过 <code>mise bootstrap remote</code> 使用 SSH 连接远程主机</li>
        </ul>
        <div class="landing-inline-cmd"><code>mise bootstrap --from git@github.com:you/dotfiles.git</code></div>
        <p class="landing-note"><a href="/bootstrap">阅读引导指南</a></p>
      </div>
    </div>
  </div>

  <div class="landing-pantry" aria-label="支持的工具">
    <div class="landing-pantry-inner">
      <div class="pantry-head">
        <p class="landing-kicker"><span>—</span> 工具仓库</p>
        <p class="pantry-stat">1000+<small>注册表中的工具，从 node 到 terraform</small></p>
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
        <a class="more" href="/registry">浏览注册表</a>
      </div>
      <p class="pantry-backends">
        来源包括
        <a href="/dev-tools/backends/aqua">aqua</a>、
        <a href="/dev-tools/backends/github">GitHub releases</a>、
        <a href="/dev-tools/backends/cargo">cargo</a>、
        <a href="/dev-tools/backends/npm">npm</a>、
        <a href="/dev-tools/backends/pipx">pipx</a>、
        <a href="/dev-tools/backends/go">go</a>、
        <a href="/dev-tools/backends/gem">gem</a>、
        <a href="/dev-tools/backends/http">http</a>、
        <a href="/dev-tools/backends/asdf">asdf</a>、
        <a href="/dev-tools/backends/vfox">vfox</a>，以及
        <a href="/dev-tools/backends/">更多来源</a>
      </p>
    </div>
  </div>

  <a class="landing-special" href="https://mr-boxington.jdx.dev/" aria-label="试用 Mr Boxington">
    <div>
      <p class="landing-kicker"><span>—</span> 主厨特选</p>
      <h2>Mr Boxington：修复你的 target/。</h2>
      <p>为每个 Cargo 检出提供一个共享且会自动清理的编译缓存，同时支持本地和 CI。</p>
    </div>
    <span class="card-link">mr-boxington.jdx.dev</span>
  </a>

  <div class="landing-section landing-recipe">
    <p class="landing-kicker"><span>04</span> 快速开始</p>
    <h2>运行你的第一个项目任务。</h2>
    <ol class="recipe">
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">步骤 1</span>
          <h3>安装 mise</h3>
          <p>在 macOS 或 Linux 上，使用下面的安装程序。其他选项请参阅<a href="/installing-mise">Windows 和软件包管理器安装说明</a></p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> curl https://mise.run | sh</div>
          <div><span class="prompt">$</span> ~/.local/bin/mise --version</div>
        </div>
      </li>
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">步骤 2</span>
          <h3>激活你的 shell</h3>
          <p>对于 zsh，添加下面这一行并重启 shell。其他 shell 请参阅<a href="/getting-started#activate-mise">激活指南</a>。你也可以跳过激活，使用 <code>~/.local/bin/mise exec</code> 或 <code>~/.local/bin/mise run</code></p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> echo 'eval "$(~/.local/bin/mise activate zsh)"' &gt;&gt; ~/.zshrc</div>
          <div><span class="dim"># Restart your shell before continuing.</span></div>
        </div>
      </li>
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">步骤 3</span>
          <h3>添加工具</h3>
          <p>在项目目录中，<code>mise use</code> 会安装工具，并将其版本请求保存到 <code>mise.toml</code> 中</p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> mkdir mise-example</div>
          <div><span class="prompt">$</span> cd mise-example</div>
          <div><span class="prompt">$</span> mise use node@24</div>
        </div>
      </li>
      <li class="recipe-row">
        <div class="recipe-text">
          <span class="recipe-num">步骤 4</span>
          <h3>添加环境变量和任务</h3>
          <p>将任务与其环境一起保存，然后运行它。提交 <code>mise.toml</code> 以共享设置。请参阅<a href="/getting-started#set-up-a-project">完整示例</a>，同时打印工具版本和环境</p>
        </div>
        <div class="recipe-code terminal-lines">
          <div><span class="prompt">$</span> mise set NODE_ENV=development</div>
          <div><span class="prompt">$</span> mise tasks add hello -- node -p process.env.NODE_ENV</div>
          <div><span class="prompt">$</span> mise run hello</div>
          <div>development</div>
        </div>
      </li>
    </ol>
  </div>

  <div class="landing-cta">
    <p class="landing-kicker"><span>—</span> 随时准备就绪</p>
    <h2><em>Allez。</em> 准备你的工作台。</h2>
    <div class="landing-mini-install"><code>curl https://mise.run | sh</code></div>
    <div class="landing-links">
      <a href="/getting-started">快速开始</a>
      <a href="/demo">观看演示</a>
      <a href="https://github.com/jdx/mise">GitHub</a>
    </div>
  </div>
</section>
