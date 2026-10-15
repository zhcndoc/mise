<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { data as showreel } from "../showreel.data";

// With a rendered showreel, "Watch the demo" goes to the player under the
// hero; builds without one keep the recorded demo page.
const demoLink = showreel ? "/#showreel" : "/demo";

const examples = [
  {
    name: "工具",
    section: "[tools]",
    lines: ['node = "24"', 'python = "3.14"'],
    command: "mise install",
    output: ["✓ 在 6.2 秒内安装了 2 个工具：node@24.21.0、python@3.14.8"],
    caption: "此项目的工具版本",
    link: "/dev-tools/",
  },
  {
    name: "环境",
    section: "[env]",
    lines: [
      'DATABASE_URL = "postgres://localhost/app"',
      '_.file = ".env.local"',
    ],
    command: "mise set",
    output: [
      "键           值                       来源",
      "DATABASE_URL  postgres://localhost/app ~/my-project/mise.toml",
      "API_KEY       dev-key                  ~/my-project/.env.local",
    ],
    caption: "项目环境变量",
    link: "/environments/",
  },
  {
    name: "任务",
    section: "[tasks.lint]",
    lines: ['run = "ruff check"'],
    command: "mise run lint",
    output: ["[lint] $ ruff check", "所有检查均通过！"],
    caption: "用于检查项目的命名命令",
    link: "/tasks/",
  },
  {
    name: "引导",
    section: "[bootstrap.packages]",
    lines: ['"apt:tmux" = "latest"', '"apt:tree" = "latest"'],
    command: "mise bootstrap status",
    output: [
      "部分      项目      当前状态",
      "软件包    apt:tmux           缺失",
      "软件包    apt:tree           缺失",
    ],
    caption: "本机的系统软件包",
    link: "/bootstrap.html",
  },
];
const selected = ref(0);
const active = computed(() => examples[selected.value]);
const copyState = ref("复制");
const installCommand = "curl -fsSL https://mise.run | sh";
const installCode = ref<HTMLElement | null>(null);
let copyTimeout: ReturnType<typeof setTimeout> | undefined;

async function copyInstall() {
  let copied = false;
  try {
    await navigator.clipboard.writeText(installCommand);
    copied = true;
  } catch {
    // Keep copy working when the Clipboard API is unavailable or denied.
    const button = document.activeElement;
    const textarea = document.createElement("textarea");
    textarea.value = installCommand;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      // Select the visible command below if neither clipboard method works.
    } finally {
      textarea.remove();
      if (button instanceof HTMLElement) button.focus({ preventScroll: true });
    }
  }
  clearTimeout(copyTimeout);
  if (!installCode.value) return;
  if (copied) {
    copyState.value = "已复制！";
    copyTimeout = setTimeout(() => (copyState.value = "复制"), 2500);
  } else {
    const selection = window.getSelection();
    if (selection) {
      installCode.value.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(installCode.value);
      selection.removeAllRanges();
      selection.addRange(range);
      copyState.value = "按 Ctrl/Cmd+C";
    } else {
      copyState.value = "选择以复制";
    }
  }
}
onUnmounted(() => clearTimeout(copyTimeout));
</script>

<template>
  <section class="home-hero" aria-labelledby="home-title">
    <div class="hero-copy">
      <a class="hero-song" href="/mise-en-place.html">
        <span class="hero-song-play" aria-hidden="true">▶</span>
        <span
          ><strong>mise run</strong>，主题曲<span
            class="hero-song-extra"
          >
            与音乐视频</span
          ></span
        >
        <span class="hero-song-arrow" aria-hidden="true">→</span>
      </a>
      <h1 id="home-title" class="hero-title">mise-en-place</h1>
      <p class="hero-meaning">CLI 中的开发工具、环境变量和任务</p>
      <p class="hero-pronunciation">
        mise 的发音是 <strong>“meez”</strong>
      </p>
      <p class="hero-lede">
        mise 从一个能在 shell、编辑器和 CI 中通用的
        <code>mise.toml</code> 安装项目工具、设置环境变量并运行任务。借助
        <code>mise bootstrap</code>，它还可以配置整台机器，包括软件包、点文件和服务。
      </p>
      <div class="hero-actions">
        <a class="action-btn action-btn-brand" href="/getting-started.html">
          开始使用 <span aria-hidden="true">→</span>
        </a>
        <a class="action-btn action-btn-alt" :href="demoLink">观看演示</a>
      </div>
      <div class="hero-install">
        <span class="install-prompt" aria-hidden="true">$</span>
        <code ref="installCode" tabindex="-1">{{ installCommand }}</code>
        <button
          type="button"
          aria-label="复制 mise 安装命令"
          @click="copyInstall"
        >
          <span aria-live="polite">{{ copyState }}</span>
        </button>
      </div>
      <p class="hero-install-note">
        macOS &amp; Linux <span aria-hidden="true">·</span>
        <a href="/installing-mise.html#windows">正在 Windows 上安装？</a>
      </p>
    </div>
    <div class="hero-workbench">
      <div class="workbench-bar">
        <span class="workbench-file"
          ><span aria-hidden="true">≡</span> mise.toml</span
        >
        <span>示例配置</span>
      </div>
      <div
        class="workbench-select"
        role="group"
        aria-label="探索 mise 功能"
      >
        <button
          v-for="(example, index) in examples"
          :key="example.name"
          type="button"
          :aria-pressed="selected === index"
          aria-controls="workbench-example"
          @click="selected = index"
        >
          {{ example.name }}
        </button>
      </div>
      <div id="workbench-example" aria-live="polite" aria-atomic="true">
        <div class="workbench-config">
          <p class="workbench-comment"># {{ active.caption }}</p>
          <pre
            :aria-label="`${active.name} 配置示例`"
          ><code><span class="workbench-section">{{ active.section }}</span>
<span v-for="line in active.lines" :key="line" class="workbench-line">{{ line.split(' = ')[0] }}<span class="workbench-equals"> = </span><span class="workbench-value">{{ line.split(' = ')[1] }}</span>
</span></code></pre>
        </div>
        <div class="workbench-terminal">
          <p class="workbench-terminal-label">
            输出示例 <span>~/my-project</span>
          </p>
          <pre><code><span class="workbench-prompt">$</span> {{ active.command }}
<span v-for="line in active.output" :key="line" class="workbench-output">{{ line }}
</span></code></pre>
        </div>
      </div>
      <a class="workbench-guide" :href="active.link"
        >探索 {{ active.name }}
        <span aria-hidden="true">→</span></a
      >
    </div>
  </section>
  <div class="hero-footnote">
    <span>开源，采用 MIT 许可证</span>
    <ul aria-label="关于 mise">
      <li>macOS、Linux 和 Windows</li>
      <li>使用 Rust 编写</li>
      <li>每周发布数次</li>
    </ul>
  </div>
</template>
