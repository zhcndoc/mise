// Add mise-specific website navigation after usage generates docs/cli.
// Command prose, arguments, flags, and visibility still come from mise.usage.kdl.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pageDescription } from "./social-descriptions.mjs";

export interface Command {
  full_cmd: string[];
  usage: string;
  help?: string;
  hide: boolean;
  subcommands: Record<string, Command>;
}

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const navigationMarker = "<!-- generated reference navigation -->";

// Longest matching command path wins; descendants share their resource's guide.
const guides: Record<string, [string, string]> = {
  "bootstrap unapply": [
    "移除模块",
    "/bootstrap/modules.html#remove-a-module-s-resources",
  ],
  "bootstrap status": [
    "检查初始化状态",
    "/bootstrap.html#inspecting-state",
  ],
  "bootstrap plan": [
    "预览初始化",
    "/bootstrap.html#plan-declarative-resources",
  ],
  "plugins ls": ["安装插件", "/plugins.html#installing-plugins"],
  "plugins uninstall": ["移除插件", "/plugins.html#remove-plugins"],
  "plugins update": ["更新插件", "/plugins.html#update-plugins"],
  "plugins install": ["安装插件", "/plugins.html#installing-plugins"],
  activate: ["Shell 设置", "/shell-setup.html"],
  deactivate: ["Shell 设置", "/shell-setup.html"],
  en: ["Shell 设置", "/shell-setup.html"],
  shell: ["Shell 设置", "/shell-setup.html"],
  completion: ["Shell 补全", "/shell-setup.html#autocompletion"],
  "shell-alias": ["Shell 别名", "/shell-aliases.html"],
  vars: ["配置变量", "/configuration/vars.html"],
  env: ["环境变量", "/environments/"],
  set: ["环境变量", "/environments/"],
  unset: ["环境变量", "/environments/"],
  exec: ["运行工具", "/dev-tools/"],
  installs: ["身份安装布局", "/dev-tools/install-layout.html"],
  backends: ["选择后端", "/dev-tools/backends/"],
  config: ["配置", "/configuration.html"],
  edit: ["配置", "/configuration.html"],
  fmt: ["配置", "/configuration.html"],
  settings: ["设置参考", "/configuration/settings.html"],
  "tool-alias": ["工具版本别名", "/dev-tools/aliases.html"],
  bootstrap: ["初始化工作流", "/bootstrap.html"],
  "bootstrap accounts": ["Linux 用户和用户组", "/bootstrap/accounts.html"],
  "bootstrap compose": ["Docker Compose 项目", "/bootstrap/compose.html"],
  "bootstrap files": ["系统文件和目录", "/bootstrap/files.html"],
  "bootstrap firewall": ["Linux 防火墙", "/bootstrap/firewall.html"],
  "bootstrap linux": ["systemd 用户单元", "/bootstrap/systemd.html"],
  "bootstrap macos": ["macOS 默认设置", "/bootstrap/macos-defaults.html"],
  "bootstrap macos launchd-agents": ["LaunchAgents", "/bootstrap/launchd.html"],
  "bootstrap mise-shell-activate": [
    "Shell 激活和登录 Shell",
    "/bootstrap/shell.html",
  ],
  "bootstrap packages": ["初始化软件包", "/bootstrap/packages/"],
  "bootstrap packages brew": [
    "Homebrew 软件包和 tap",
    "/bootstrap/packages/brew.html#third-party-taps",
  ],
  "bootstrap plugins": [
    "软件包管理器插件",
    "/bootstrap/packages/plugins.html",
  ],
  daemons: ["守护进程", "/daemons.html"],
  "daemons providers": [
    "在项目间共享守护进程",
    "/daemons/sharing.html",
  ],
  dotfiles: ["点文件", "/dotfiles.html"],
  "dotfiles history": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles save": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles rollback": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles undo": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles sync": ["在多台机器间同步", "/dotfiles/sync.html"],
  "dotfiles pull": ["在多台机器间同步", "/dotfiles/sync.html"],
  "dotfiles origin": ["在多台机器间同步", "/dotfiles/sync.html"],
  "dotfiles conflicts": ["在多台机器间同步", "/dotfiles/sync.html"],
  "dotfiles watch": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles notify": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles track": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles untrack": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles exclude": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles include": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles paths": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles capture": ["点文件历史", "/dotfiles/history.html"],
  "dotfiles recover": ["点文件历史", "/dotfiles/history.html"],
  secrets: ["fnox 密钥", "/environments/secrets/fnox.html"],
  "generate task-stubs": [
    "项目本地任务入口",
    "/tips-and-tricks.html#bootstrap-script",
  ],
  "bootstrap remote": ["远程主机", "/bootstrap/remote.html"],
  "bootstrap repos": ["Git 仓库", "/bootstrap/repos.html"],
  "bootstrap secrets": ["机密输入", "/bootstrap/secrets.html"],
  "bootstrap services": ["服务", "/bootstrap/services.html"],
  "bootstrap user": [
    "登录 Shell",
    "/bootstrap/shell.html#set-your-login-shell",
  ],
  cache: ["缓存行为", "/cache-behavior.html"],
  "cache task": ["任务缓存", "/tasks/caching.html"],
  deps: ["项目依赖", "/dev-tools/deps.html"],
  doctor: ["故障排除", "/troubleshooting.html"],
  "doctor project": [
    "项目诊断",
    "/configuration/project-diagnostics.html",
  ],
  generate: ["任务和自动化", "/tasks/"],
  "generate config": ["配置", "/configuration.html"],
  "generate devcontainer": [
    "开发容器",
    "/ide-integration.html#dev-containers",
  ],
  "generate github-action": [
    "持续集成",
    "/continuous-integration.html#github-actions",
  ],
  "generate install-script": [
    "项目安装脚本",
    "/continuous-integration.html#bootstrapping",
  ],
  "generate tool-stub": ["可移植工具存根", "/dev-tools/tool-stubs.html"],
  implode: ["卸载 mise", "/installing-mise.html#uninstalling"],
  "install-into": ["开发工具", "/dev-tools/"],
  install: ["安装和选择工具", "/dev-tools/"],
  latest: ["版本请求", "/dev-tools/versions.html"],
  link: ["开发工具", "/dev-tools/"],
  lock: ["锁定文件和严格安装", "/dev-tools/mise-lock.html"],
  ls: ["开发工具", "/dev-tools/"],
  "ls-remote": ["版本请求", "/dev-tools/versions.html"],
  mcp: ["AI 助手（MCP）", "/mcp.html"],
  oci: ["OCI 镜像", "/dev-tools/mise-oci.html"],
  outdated: ["升级工具", "/dev-tools/#upgrade-tools"],
  packslip: ["签名者验证", "/dev-tools/packslip-verification.html"],
  patrons: ["支持 mise", "/about.html#supporting-mise"],
  plugins: ["插件", "/plugins.html"],
  "plugins link": ["工具插件", "/tool-plugin-development.html"],
  prune: ["移除工具", "/dev-tools/#remove-tools"],
  registry: ["注册表和显式后端", "/registry.html"],
  reshim: ["垫片", "/dev-tools/shims.html"],
  run: ["运行任务", "/tasks/running-tasks.html"],
  search: ["注册表和显式后端", "/registry.html"],
  "self-update": ["更新 mise", "/installing-mise.html#updating"],
  skills: [
    "技能和其他 Packslip 资源",
    "/dev-tools/packslip-resources.html",
  ],
  sponsors: ["支持 mise", "/about.html#supporting-mise"],
  ssh: ["GitHub 中继", "/bootstrap/github-relay.html"],
  sync: ["开发工具", "/dev-tools/"],
  "sync node": [
    "Node.js",
    "/lang/node.html#migrating-from-nvm-nodenv-or-homebrew",
  ],
  "sync python": ["Python", "/lang/python.html#migrating-from-pyenv-or-uv"],
  "sync ruby": ["Ruby", "/lang/ruby.html#migrating-from-other-ruby-managers"],
  tasks: ["任务配置参考", "/tasks/task-configuration.html"],
  "tasks add": ["TOML 任务", "/tasks/toml-tasks.html"],
  "tasks deps": [
    "依赖和执行顺序",
    "/tasks/architecture.html",
  ],
  "tasks edit": ["文件任务", "/tasks/file-tasks.html"],
  "tasks graph": ["工作区项目图", "/tasks/workspace-graph.html"],
  "tasks run": ["运行任务", "/tasks/running-tasks.html"],
  "test-tool": [
    "测试注册表工具",
    "/contributing/registry.html#tool-testing",
  ],
  token: ["Git 提供商身份验证", "/dev-tools/github-tokens.html"],
  tool: ["开发工具", "/dev-tools/"],
  "bin-paths": ["垫片和可执行文件查找", "/dev-tools/shims.html"],
  "tool-stub": ["可移植工具存根", "/dev-tools/tool-stubs.html"],
  trust: ["配置信任", "/security.html#configuration-trust"],
  untrust: ["配置信任", "/security.html#configuration-trust"],
  uninstall: ["移除工具", "/dev-tools/#remove-tools"],
  unuse: ["移除工具", "/dev-tools/#remove-tools"],
  upgrade: ["升级工具", "/dev-tools/#upgrade-tools"],
  use: ["安装和选择工具", "/dev-tools/"],
  version: ["故障排除", "/troubleshooting.html"],
  watch: [
    "文件更改时重新运行任务",
    "/tasks/running-tasks.html#rerun-tasks-when-files-change",
  ],
  where: ["开发工具", "/dev-tools/"],
  which: ["垫片和可执行文件查找", "/dev-tools/shims.html"],
};

const categories = [
  [
    "安装和检查工具",
    "use install install-into installs uninstall unuse upgrade outdated lock latest ls ls-remote tool where which bin-paths registry search backends link sync prune reshim tool-stub packslip",
  ],
  [
    "Shell 和环境",
    "activate deactivate completion en env exec shell set unset vars shell-alias tool-alias secrets token ssh",
  ],
  ["任务和项目自动化", "run tasks watch deps daemons generate"],
  ["机器设置和镜像", "bootstrap dotfiles oci"],
  [
    "配置和诊断",
    "config edit fmt settings trust untrust doctor cache version self-update implode",
  ],
  ["插件", "plugins test-tool"],
  ["集成和社区", "mcp skills patrons sponsors"],
];

export function commandIndex(root: Command): string {
  const remaining = new Map(
    Object.entries(root.subcommands).filter(([, cmd]) => !cmd.hide),
  );
  const sections: string[] = [];
  for (const [heading, names] of [
    ...categories,
    ["其他命令", [...remaining.keys()].join(" ")],
  ]) {
    const rows: string[] = [];
    for (const name of names.split(" ")) {
      const cmd = remaining.get(name);
      if (!cmd) continue;
      remaining.delete(name);
      rows.push(
        `- [\`mise ${name}\`](/cli/${name}.html) — ${cmd.help ?? "命令参考"}`,
      );
    }
    if (rows.length) sections.push(`### ${heading}\n\n${rows.join("\n")}`);
  }
  return `## 子命令\n\n请选择下面的命令类别。对应页面会列出可用的子命令。\n\n${sections.join("\n\n")}`;
}

export function replaceCommandIndex(page: string, index: string): string {
  const heading = "## Subcommands";
  const start = page.search(/^## Subcommands$/m);
  if (start === -1)
    throw new Error("Missing Subcommands section in generated CLI index");
  const bodyStart = start + heading.length;
  const nextSection = page.slice(bodyStart).search(/^## /m);
  const suffix = nextSection === -1 ? "" : page.slice(bodyStart + nextSection);
  return (
    page.slice(0, start) +
    index.trimEnd() +
    "\n" +
    (suffix ? "\n" + suffix : "")
  );
}

export function withCommandDescription(page: string, command: Command): string {
  const description = pageDescription(
    {
      description: command.full_cmd.length
        ? command.help
        : "探索用于管理工具、环境、任务和机器设置的 mise 命令。",
    },
    `CLI command ${command.full_cmd.join(" ") || "index"}`,
  );
  const body = page.replace(
    /^---\r?\ndescription: [^\r\n]*\r?\n---\r?\n\r?\n/,
    "",
  );
  return `---\ndescription: ${JSON.stringify(description)}\n---\n\n${body}`;
}

/**
 * Whether a command sits under a hidden command. usage still generates pages
 * for the subcommands of a hidden command; they are only reachable through the
 * hidden spelling, so the reference leaves them out.
 */
export function underHiddenCommand(
  name: string,
  commands: Map<string, Pick<Command, "hide">>,
): boolean {
  const parts = name ? name.split(" ") : [];
  return parts
    .slice(0, -1)
    .some(
      (_, i) => commands.get(parts.slice(0, i + 1).join(" "))?.hide === true,
    );
}

/** Remove directories left empty under `dir`. */
function removeEmptyDirs(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    removeEmptyDirs(path);
    if (readdirSync(path).length === 0) rmdirSync(path);
  }
}

function sourcePath(url: string): string {
  const path = url.split("#")[0];
  return resolve(
    docsDir,
    path.slice(1).replace(/\.html$/, ".md") +
      (path.endsWith("/") ? "index.md" : ""),
  );
}

function main() {
  const root = JSON.parse(
    execFileSync(
      "mise",
      [
        "x",
        "usage",
        "--",
        "usage",
        "generate",
        "json",
        "--file",
        "mise.usage.kdl",
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    ),
  ).cmd as Command;
  const commands = new Map<string, Command>();
  function visit(cmd: Command) {
    commands.set(cmd.full_cmd.join(" "), cmd);
    Object.values(cmd.subcommands).forEach(visit);
  }
  visit(root);
  for (const [label, url] of Object.values(guides)) {
    if (!existsSync(sourcePath(url)))
      throw new Error(`Missing guide: ${label} (${url})`);
  }
  let count = 0;
  let removed = 0;
  for (const name of commands.keys()) {
    const file = resolve(
      docsDir,
      "cli",
      name ? `${name.replaceAll(" ", "/")}.md` : "index.md",
    );
    if (!existsSync(file)) continue; // usage excludes hidden commands' own pages.
    if (underHiddenCommand(name, commands)) {
      rmSync(file);
      removed++;
      continue;
    }
    let page = readFileSync(file, "utf8").split(navigationMarker)[0].trimEnd();
    if (name) {
      const parts = name.split(" ");
      let guide: [string, string] | undefined;
      for (let i = parts.length; i > 0 && !guide; i--)
        guide = guides[parts.slice(0, i).join(" ")];
      guide ??= ["入门指南", "/getting-started.html"];
      let parent = parts.slice(0, -1);
      while (
        parent.length &&
        !existsSync(resolve(docsDir, "cli", parent.join("/") + ".md"))
      )
        parent.pop();
      const parentUsage =
        commands.get(parent.join(" "))?.usage ?? parent.join(" ");
      const parentLink = parent.length
        ? `[\`mise ${parentUsage}\`](/cli/${parent.join("/")}.html)`
        : "[All commands](/cli/)";
      page += `\n\n${navigationMarker}\n\n## 相关文档\n\n- [${guide[0]}](${guide[1]})。\n- ${parentLink}。\n- [全局选项和参数语法](/cli/#global-flags)。\n`;
    } else {
      page = page.replace(
        /^(?:- )?\*\*Usage:\*\* `[^\n]+`/m,
        "**Usage:** `mise [FLAGS] [COMMAND | TASK] [ARGS]…`",
      );
      page = page.replace(/^- \*\*Usage:\*\*[^\n]+\n/m, "");
      page = replaceCommandIndex(page, commandIndex(root));
      page = page.replace(
        "## Arguments",
        "请使用 `mise COMMAND --help` 查看当前安装版本附带的帮助。将 mise\n选项放在任务名称之前；名称之后的参数会传递给该任务。\n方括号表示可选输入，尖括号表示必需输入，`…`\n表示参数可以重复。不要输入这些表示法字符。\n\n## 参数",
      );
      page = page.replace(
        "## Global Flags",
        "## 全局选项\n\n这些选项提供共享上下文。命令可以定义同名的自有选项，因此请参考该命令的页面\n了解放置位置和含义。效果标签描述命令的预期操作；配置求值、缓存和所需工具\n安装仍可能产生副作用。它们不构成沙箱保证。\n",
      );
    }
    writeFileSync(
      file,
      withCommandDescription(page.trimEnd() + "\n", commands.get(name)!),
    );
    count++;
  }
  removeEmptyDirs(resolve(docsDir, "cli"));
  console.log(
    `Added reference navigation to ${count} CLI pages; removed ${removed} under hidden commands`,
  );
}

if (import.meta.main) main();
