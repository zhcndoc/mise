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
        它会安装项目所需的工具，加载环境变量并运行任务——所有配置都集中在提交到代码仓库中的单个 <code>mise.toml</code> 文件里，因此每台机器都能获得相同的设置。
      </p>
      <div class="landing-definition">
        <div class="definition-word">mise en place <span>/meez ahn plahs/</span></div>
        <p>1. 烹饪前对食材和工具进行收集与安排。</p>
        <p>2. 一款多语言工具，将项目工具、环境变量和任务集中管理。</p>
      </div>
    </div>
    <div class="landing-config" aria-label="mise.toml 示例">

```toml
# mise.toml
[tools]
node = "24"
python = "3.13"

[env]
_.file = ".env.local"

[tasks.test]
run = "pytest"
```

</div>
  </div>

  <div class="landing-section landing-menu">
    <div class="landing-section-heading">
      <div>
        <p class="landing-kicker">菜单</p>
        <h2>mise 能做什么。</h2>
      </div>
      <a href="/getting-started" class="landing-small-button">全部文档</a>
    </div>
    <div class="landing-feature-grid">
      <a href="/dev-tools/" class="landing-feature-card">
        <p class="card-cmd">$ mise install</p>
        <h3>开发工具</h3>
        <p>安装项目工具、固定版本，并在你切换目录时自动切换工具版本。</p>
        <span class="card-link">了解更多</span>
      </a>
      <a href="/environments/" class="landing-feature-card">
        <p class="card-cmd">$ mise env</p>
        <h3>环境</h3>
        <p>从 <code>mise.toml</code>、<code>.env</code> 文件、Shell 命令等来源加载项目专属环境变量。</p>
        <span class="card-link">了解更多</span>
      </a>
      <a href="/tasks/" class="landing-feature-card">
        <p class="card-cmd">$ mise run</p>
        <h3>任务</h3>
        <p>将构建、测试、代码检查和部署命令，与它们所需的工具和环境变量放在一起定义。</p>
        <span class="card-link">了解更多</span>
      </a>
    </div>
  </div>

  <div class="landing-tools" aria-label="支持的工具">
    <p>储藏室 · 1000+ 款工具，一个配置文件</p>
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
      <a href="/registry">……以及另外 1000+ 款工具</a>
    </div>
  </div>

  <a class="landing-aube" href="https://aube.jdx.dev/" aria-label="尝试 aube">
    <div>
      <p class="landing-kicker">主厨特选</p>
      <h2>aube：快速的 Node.js 包管理器。</h2>
      <p>
        来自 mise 的作者。aube 可与现有 lockfile 配合使用——无需迁移。
      </p>
    </div>
  </a>

  <div class="landing-section landing-quickstart">
    <div>
      <p class="landing-kicker">食谱</p>
      <h2>四步完成设置。</h2>
    </div>
    <div class="landing-recipe-grid">
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-1" checked />
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-2" />
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-3" />
      <input class="recipe-tab-input" type="radio" name="recipe-tab" id="recipe-tab-4" />
      <div class="recipe-steps" aria-label="快速入门步骤">
        <label class="recipe-step recipe-step-1" for="recipe-tab-1"><span>01</span> 安装 mise</label>
        <label class="recipe-step recipe-step-2" for="recipe-tab-2"><span>02</span> 添加并安装工具</label>
        <label class="recipe-step recipe-step-3" for="recipe-tab-3"><span>03</span> 加载环境变量</label>
        <label class="recipe-step recipe-step-4" for="recipe-tab-4"><span>04</span> 定义任务</label>
      </div>
      <div class="landing-code">
        <div class="recipe-panel recipe-panel-1">
          <div class="terminal-body">
            <div><span class="prompt">$</span> curl https://mise.run | sh</div>
            <div>&nbsp;</div>
            <div><span class="prompt">$</span> mise --version</div>
            <div>2026.7.0 linux-x64</div>
          </div>
        </div>
        <div class="recipe-panel recipe-panel-2">
          <div class="terminal-body">
            <div><span class="prompt">$</span> mise use node@24 python@3.13</div>
            <div><span class="dim">mise</span> node@24.18.0 <span class="ok">✓ installed</span></div>
            <div><span class="dim">mise</span> python@3.13.14 <span class="ok">✓ installed</span></div>
            <div><span class="dim">mise</span> ./mise.toml tools: node@24.18.0, python@3.13.14</div>
          </div>
        </div>
        <div class="recipe-panel recipe-panel-3">
          <div class="terminal-body">
            <div><span class="prompt">$</span> cat .env.local</div>
            <div>DATABASE_URL=postgres://localhost/orders</div>
            <div>&nbsp;</div>
            <div><span class="prompt">$</span> mise env -s bash</div>
            <div>export DATABASE_URL='postgres://localhost/orders'</div>
          </div>
        </div>
        <div class="recipe-panel recipe-panel-4">
          <div class="terminal-body">
            <div><span class="prompt">$</span> mise run test</div>
            <div><span class="key">[test]</span> $ pytest</div>
            <div><span class="ok">42 passed</span> in 1.02s</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="landing-section landing-cta">
    <p class="landing-kicker">随时待命</p>
    <h2><em>来吧，</em>准备好你的工作台。</h2>
    <div class="landing-mini-install"><code>curl https://mise.run | sh</code></div>
    <div class="landing-links">
      <a href="/getting-started">入门指南</a>
      <a href="/demo">运行演示</a>
    </div>
  </div>
</section>
