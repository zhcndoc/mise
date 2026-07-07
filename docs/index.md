---
layout: home
title: Mise 中文文档 - 管理本地开发运行时环境工具
titleTemplate: false

hero:
  name: mise-en-place
  tagline: 开发工具、环境变量和任务，一站式 CLI
---

<section class="landing-page" aria-label="mise 概览">
  <div class="landing-section landing-metaphor">
    <div>
      <p class="landing-kicker">理念</p>
      <h2>万物各归其位，<em>在你写代码之前</em>。</h2>
      <p>
        在专业厨房里，<em>mise en place</em> 是备料的仪式：
        刀已磨快，洋葱切丁，高汤温热，操作台整洁。先于工作的工作。
      </p>
      <p>
        mise 也为你的开发环境做同样的事。它安装并激活
        合适的工具，加载正确的环境变量，并为你运行的命令
        串联起合适的任务。
      </p>
    </div>
    <div class="landing-definition">
      <div class="definition-word">mise en place <span>/meez ahn plahs/</span></div>
      <p>1. 烹饪前对食材和工具进行收集与摆放。</p>
      <p>2. 一个多语言工具，将项目工具、环境和任务集中在一处。</p>
    </div>
  </div>

  <div class="landing-section landing-menu">
    <div class="landing-section-heading">
      <p class="landing-kicker">菜单</p>
      <h2>一个 CLI 搞定整个项目配置。</h2>
      <a href="/getting-started" class="landing-small-button">全部文档</a>
    </div>
    <div class="landing-feature-grid">
      <a href="/dev-tools/" class="landing-feature-card">
        <span class="card-number">— 01</span>
        <span class="card-icon">🔪</span>
        <h3>开发工具</h3>
        <p>安装项目工具，锁定版本，并在你切换目录时自动切换。</p>
        <span class="card-link">阅读更多 →</span>
      </a>
      <a href="/environments/" class="landing-feature-card">
        <span class="card-number">— 02</span>
        <span class="card-icon">🫕</span>
        <h3>环境</h3>
        <p>从 <code>mise.toml</code>、<code>.env</code> 文件、shell 命令等来源加载项目专属环境变量。</p>
        <span class="card-link">阅读更多 →</span>
      </a>
      <a href="/tasks/" class="landing-feature-card">
        <span class="card-number">— 03</span>
        <span class="card-icon">🍳</span>
        <h3>任务</h3>
        <p>把构建、测试、lint 和部署命令与它们所需的工具和环境变量放在一起定义。</p>
        <span class="card-link">阅读更多 →</span>
      </a>
    </div>
  </div>

  <div class="landing-tools" aria-label="支持的工具">
    <p>— 食材储备 · 900+ 工具，1 个 toml 文件 —</p>
    <div class="landing-tools-track">
      <a href="https://mise-versions.jdx.dev/tools/node">node</a><a href="https://mise-versions.jdx.dev/tools/python">python</a><a href="https://mise-versions.jdx.dev/tools/ruby">ruby</a><a href="https://mise-versions.jdx.dev/tools/go">go</a><a href="https://mise-versions.jdx.dev/tools/rust">rust</a><a href="https://mise-versions.jdx.dev/tools/java">java</a><a href="https://mise-versions.jdx.dev/tools/deno">deno</a><a href="https://mise-versions.jdx.dev/tools/bun">bun</a><a href="https://mise-versions.jdx.dev/tools/terraform">terraform</a><a href="https://mise-versions.jdx.dev/tools/kubectl">kubectl</a><a href="https://mise-versions.jdx.dev/tools/zig">zig</a><a href="https://mise-versions.jdx.dev/tools/swift">swift</a><a href="https://mise-versions.jdx.dev/tools/php">php</a><a href="https://mise-versions.jdx.dev/tools/elixir">elixir</a><a href="https://mise-versions.jdx.dev/tools/node">node</a><a href="https://mise-versions.jdx.dev/tools/python">python</a><a href="https://mise-versions.jdx.dev/tools/ruby">ruby</a><a href="https://mise-versions.jdx.dev/tools/go">go</a><a href="https://mise-versions.jdx.dev/tools/rust">rust</a><a href="https://mise-versions.jdx.dev/tools/java">java</a><a href="https://mise-versions.jdx.dev/tools/deno">deno</a><a href="https://mise-versions.jdx.dev/tools/bun">bun</a><a href="https://mise-versions.jdx.dev/tools/terraform">terraform</a><a href="https://mise-versions.jdx.dev/tools/kubectl">kubectl</a><a href="https://mise-versions.jdx.dev/tools/zig">zig</a><a href="https://mise-versions.jdx.dev/tools/swift">swift</a><a href="https://mise-versions.jdx.dev/tools/php">php</a><a href="https://mise-versions.jdx.dev/tools/elixir">elixir</a>
    </div>
  </div>

  <a class="landing-aube" href="https://aube.jdx.dev/" aria-label="尝试 aube">
    <div>
      <p class="landing-kicker">主厨推荐</p>
      <h2>认识一下 <em>aube</em>，一款快速的 Node.js 包管理器。</h2>
      <p>
        @jdx 的新作。aube 使用你现有的锁文件，并且已准备好
        进入 beta 试用。
      </p>
    </div>
    <div class="aube-ticket" aria-hidden="true">
      <code>$ aube</code>
    </div>
  </a>

  <div class="landing-section landing-quickstart">
    <div>
      <p class="landing-kicker">配方</p>
      <h2>四步准备好你的工作台。</h2>
    </div>
    <div class="landing-recipe-grid">
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-1" checked />
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-2" />
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-3" />
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-4" />
      <div class="recipe-steps" aria-label="配方步骤">
        <label class="recipe-step recipe-step-1" for="recipe-tab-1"><span>01</span> 安装 mise</label>
        <label class="recipe-step recipe-step-2" for="recipe-tab-2"><span>02</span> 添加并安装工具</label>
        <label class="recipe-step recipe-step-3" for="recipe-tab-3"><span>03</span> 加载环境变量</label>
        <label class="recipe-step recipe-step-4" for="recipe-tab-4"><span>04</span> 定义任务</label>
      </div>
      <div class="landing-code">
        <div class="recipe-panel recipe-panel-1">
          <pre><code>$ curl https://mise.run | sh<br />✓ mise 已安装<br /><br />$ mise doctor<br />✓ mise 已就绪</code></pre>
        </div>
        <div class="recipe-panel recipe-panel-2">
          <pre><code>$ mise use node@26 python@3.14 terraform@1<br />✓ 已写入 mise.toml<br /><br />$ mise install<br />✓ 已安装 3 个工具</code></pre>
        </div>
        <div class="recipe-panel recipe-panel-3">
          <pre><code>$ cat .env.local<br />DATABASE_URL=postgres://localhost/orders<br /><br />$ mise env -s bash<br />export DATABASE_URL=postgres://localhost/orders</code></pre>
        </div>
        <div class="recipe-panel recipe-panel-4">
          <pre><code>$ mise run test<br />→ lint · typecheck · unit · e2e<br />✓ 4 个任务已完成<br /><br />$ mise run deploy<br />✓ 已发布</code></pre>
        </div>
      </div>
    </div>
  </div>

  <div class="landing-section landing-cta">
    <p class="landing-kicker">随时待命</p>
    <h2><em>Allez,</em> 准备好你的工作台。</h2>
    <div class="landing-mini-install"><code>curl https://mise.run | sh</code></div>
    <div class="landing-links">
      <a href="/getting-started">入门指南</a>
      <a href="/demo">运行演示</a>
    </div>
  </div>
</section>
