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
    lines: ['node = "24"', 'python = "3.13"', 'terraform = "1.13"'],
    command: "mise install",
    output: [
      "✓ node, python, terraform installed",
      "项目工具版本已就绪。",
    ],
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
    command: "mise env",
    output: ["export DATABASE_URL=postgres://localhost/app"],
    caption: "项目环境变量",
    link: "/environments/",
  },
  {
    name: "任务",
    section: "[tasks.test]",
    lines: ['run = "python -m unittest"'],
    command: "mise run test",
    output: ["[test] $ python -m unittest", "已运行 42 个测试", "通过"],
    caption: "用于运行测试的命名命令",
    link: "/tasks/",
  },
  {
    name: "引导",
    section: "[bootstrap.packages]",
    lines: ['"brew:jq" = "latest"', '"apt:build-essential" = "latest"'],
    command: "mise bootstrap",
    output: ["✓ 系统软件包已安装", "✓ 开发工具已就绪"],
    caption: "要安装的系统软件包",
    link: "/bootstrap",
  },
];
const selected = ref(0);
const active = computed(() => examples[selected.value]);
const copyState = ref("复制");
const installCommand = "curl https://mise.run | sh";
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
      <a class="hero-song" href="/mise-en-place">
        <span class="hero-song-play" aria-hidden="true">▶</span>
        <span
          >新歌：<strong>mise run</strong>，主题曲<span
            class="hero-song-extra"
          >
            与音乐视频</span
          ></span
        >
        <span class="hero-song-arrow" aria-hidden="true">→</span>
      </a>
      <h1 id="home-title" class="hero-title">mise-en-place</h1>
      <p class="hero-meaning">开发工具、环境和任务</p>
      <p class="hero-pronunciation">
        mise 的发音是 <strong>“meez”</strong>
      </p>
      <p class="hero-lede">
        在 <code>mise.toml</code> 中定义工具版本、环境变量和项目命令。mise 会安装这些工具，并让配置在 shell、编辑器和 CI 中可用。
      </p>
      <div class="hero-actions">
        <a class="action-btn action-btn-brand" href="/getting-started">
          快速开始 <span aria-hidden="true">→</span>
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
        <a href="/getting-started#installing-mise-cli"
          >在 Windows 上安装？</a
        >
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
            :aria-label="`${active.name}配置示例`"
          ><code><span class="workbench-section">{{ active.section }}</span>
<span v-for="line in active.lines" :key="line" class="workbench-line">{{ line.split(' = ')[0] }}<span class="workbench-equals"> = </span><span class="workbench-value">{{ line.split(' = ')[1] }}</span>
</span></code></pre>
        </div>
        <div class="workbench-terminal">
          <p class="workbench-terminal-label">
            示例输出 <span>~/my-project</span>
          </p>
          <pre><code><span class="workbench-prompt">$</span> {{ active.command }}
<span v-for="line in active.output" :key="line" class="workbench-output">{{ line }}
</span></code></pre>
        </div>
      </div>
      <a class="workbench-guide" :href="active.link"
        >探索{{ active.name }}
        <span aria-hidden="true">↗</span></a
      >
    </div>
  </section>
  <div class="hero-footnote">
    <span>mise.toml 中的项目配置</span>
    <ul aria-label="关于 mise">
      <li>开源并采用 MIT 许可</li>
      <li>macOS、Linux 和 Windows</li>
      <li>单一 CLI</li>
    </ul>
  </div>
</template>
