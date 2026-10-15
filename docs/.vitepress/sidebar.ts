import { type Command, commands } from "./cli_commands.ts";

// Shared between the VitePress config and the llms.txt generator
// (docs/.vitepress/llms.ts), so both describe the same set of pages.
export type SidebarItem = {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
};

export const sidebar: SidebarItem[] = [
  {
    text: "开始",
    items: [
      { text: "入门指南", link: "/getting-started" },
      { text: "安装 mise", link: "/installing-mise" },
      { text: "Shell 设置", link: "/shell-setup" },
      { text: "现有项目", link: "/walkthrough" },
      { text: "编辑器和 IDE", link: "/ide-integration" },
      { text: "持续集成", link: "/continuous-integration" },
      { text: "Docker", link: "/mise-cookbook/docker" },
      { text: "AI 助手（MCP）", link: "/mcp" },
    ],
  },
  {
    text: "开发工具",
    collapsed: true,
    items: [
      { text: "概览", link: "/dev-tools/" },
      {
        text: "版本请求和版本文件",
        link: "/dev-tools/versions",
      },
      { text: "注册表", link: "/registry" },
      {
        text: "后端",
        link: "/dev-tools/backends/",
        collapsed: true,
        items: [
          { text: "aqua", link: "/dev-tools/backends/aqua" },
          { text: "asdf（旧版）", link: "/dev-tools/backends/asdf" },
          { text: "cargo", link: "/dev-tools/backends/cargo" },
          { text: "conda", link: "/dev-tools/backends/conda" },
          { text: "dotnet", link: "/dev-tools/backends/dotnet" },
          { text: "forgejo", link: "/dev-tools/backends/forgejo" },
          { text: "gem", link: "/dev-tools/backends/gem" },
          { text: "github", link: "/dev-tools/backends/github" },
          { text: "gitlab", link: "/dev-tools/backends/gitlab" },
          { text: "go", link: "/dev-tools/backends/go" },
          { text: "http", link: "/dev-tools/backends/http" },
          { text: "npm", link: "/dev-tools/backends/npm" },
          {
            text: "packslip",
            link: "/dev-tools/backends/packslip",
            collapsed: true,
            items: [
              {
                text: "验证与策略",
                link: "/dev-tools/packslip-verification",
              },
              {
                text: "手册页、补全和技能",
                link: "/dev-tools/packslip-resources",
              },
            ],
          },
          { text: "pypi", link: "/dev-tools/backends/pypi" },
          { text: "s3", link: "/dev-tools/backends/s3" },
          { text: "spinel（实验性）", link: "/dev-tools/backends/spinel" },
          { text: "spm", link: "/dev-tools/backends/spm" },
          { text: "ubi（已弃用）", link: "/dev-tools/backends/ubi" },
          { text: "vfox", link: "/dev-tools/backends/vfox" },
        ],
      },
      { text: "垫片", link: "/dev-tools/shims" },
      { text: "工具别名", link: "/dev-tools/aliases" },
      { text: "工具存根", link: "/dev-tools/tool-stubs" },
      { text: "自动更新工具", link: "/dev-tools/self-updating-tools" },
      {
        text: "锁定文件（mise.lock）",
        link: "/dev-tools/mise-lock",
        collapsed: true,
        items: [
          {
            text: "mise.lock 参考",
            link: "/dev-tools/mise-lock-reference",
          },
        ],
      },
      { text: "Git 提供商令牌", link: "/dev-tools/github-tokens" },
      { text: "系统安装", link: "/dev-tools/system-installs" },
      { text: "OCI 镜像（实验性）", link: "/dev-tools/mise-oci" },
      {
        text: "身份安装布局（实验性）",
        link: "/dev-tools/install-layout",
      },
      { text: "从 asdf 迁移", link: "/dev-tools/comparison-to-asdf" },
    ],
  },
  {
    text: "语言",
    collapsed: true,
    items: [
      { text: "核心工具概览", link: "/core-tools" },
      { text: "Bun", link: "/lang/bun" },
      { text: "Deno", link: "/lang/deno" },
      { text: ".NET", link: "/lang/dotnet" },
      { text: "Elixir", link: "/lang/elixir" },
      { text: "Erlang", link: "/lang/erlang" },
      { text: "Go", link: "/lang/go" },
      { text: "Java", link: "/lang/java" },
      { text: "Node.js", link: "/lang/node" },
      { text: "Python", link: "/lang/python" },
      { text: "Ruby", link: "/lang/ruby" },
      { text: "Rust", link: "/lang/rust" },
      { text: "Swift", link: "/lang/swift" },
      { text: "Zig", link: "/lang/zig" },
    ],
  },
  {
    text: "环境",
    collapsed: true,
    items: [
      { text: "环境变量", link: "/environments/" },
      {
        text: "密钥",
        link: "/environments/secrets/",
        collapsed: true,
        items: [
          { text: "fnox（实验性）", link: "/environments/secrets/fnox" },
          { text: "SOPS 文件", link: "/environments/secrets/sops" },
          {
            text: "age 值（实验性）",
            link: "/environments/secrets/age",
          },
        ],
      },
      { text: "Shell 别名", link: "/shell-aliases" },
      { text: "钩子", link: "/hooks" },
      { text: "从 direnv 迁移", link: "/direnv" },
    ],
  },
  {
    text: "任务",
    collapsed: true,
    items: [
      { text: "概览", link: "/tasks/" },
      { text: "TOML 任务", link: "/tasks/toml-tasks" },
      { text: "文件任务", link: "/tasks/file-tasks" },
      { text: "任务参数", link: "/tasks/task-arguments" },
      { text: "运行任务", link: "/tasks/running-tasks" },
      { text: "任务发现和优先级", link: "/tasks/task-discovery" },
      { text: "依赖和执行顺序", link: "/tasks/architecture" },
      { text: "任务模板", link: "/tasks/templates" },
      {
        text: "任务缓存",
        link: "/tasks/caching",
        collapsed: true,
        items: [
          { text: "远程任务缓存", link: "/tasks/remote-cache" },
          {
            text: "远程缓存协议",
            link: "/tasks/remote-cache-protocol",
          },
        ],
      },
      {
        text: "Monorepo 任务",
        link: "/tasks/monorepo",
        collapsed: true,
        items: [
          {
            text: "工作区项目图（实验性）",
            link: "/tasks/workspace-graph",
          },
        ],
      },
      { text: "项目依赖（实验性）", link: "/dev-tools/deps" },
      { text: "OpenTelemetry（实验性）", link: "/tasks/opentelemetry" },
      {
        text: "任务配置参考",
        link: "/tasks/task-configuration",
      },
    ],
  },
  {
    text: "守护进程（实验性）",
    collapsed: true,
    items: [
      { text: "概览", link: "/daemons" },
      {
        text: "设置开发栈",
        link: "/daemons/development-stack",
      },
      { text: "服务预设", link: "/daemons/presets" },
      { text: "端口、URL 和工作树", link: "/daemons/worktrees" },
      { text: "在项目间共享守护进程", link: "/daemons/sharing" },
      { text: "数据和清理", link: "/daemons/data" },
    ],
  },
  {
    text: "初始化",
    collapsed: true,
    items: [
      { text: "概览", link: "/bootstrap" },
      { text: "设置机器", link: "/bootstrap/setup" },
      {
        text: "从仓库初始化",
        link: "/bootstrap/from-repository",
      },
      { text: "机器模块", link: "/bootstrap/modules" },
      {
        text: "远程主机",
        link: "/bootstrap/remote",
        collapsed: true,
        items: [
          { text: "GitHub 中继（mise ssh）", link: "/bootstrap/github-relay" },
        ],
      },
      {
        text: "软件包",
        link: "/bootstrap/packages/",
        collapsed: true,
        items: [
          { text: "apk", link: "/bootstrap/packages/apk" },
          { text: "apt", link: "/bootstrap/packages/apt" },
          { text: "aur", link: "/bootstrap/packages/aur" },
          { text: "brew", link: "/bootstrap/packages/brew" },
          { text: "brew-cask", link: "/bootstrap/packages/brew-cask" },
          { text: "dnf", link: "/bootstrap/packages/dnf" },
          { text: "flatpak", link: "/bootstrap/packages/flatpak" },
          { text: "macos-app", link: "/bootstrap/packages/macos-app" },
          { text: "mas", link: "/bootstrap/packages/mas" },
          { text: "nix", link: "/bootstrap/packages/nix" },
          { text: "pacman", link: "/bootstrap/packages/pacman" },
          { text: "scoop", link: "/bootstrap/packages/scoop" },
          { text: "snap", link: "/bootstrap/packages/snap" },
          { text: "winget", link: "/bootstrap/packages/winget" },
          { text: "zypper", link: "/bootstrap/packages/zypper" },
          {
            text: "软件包管理器插件",
            link: "/bootstrap/packages/plugins",
          },
        ],
      },
      {
        text: "主机设置",
        items: [
          { text: "Linux 用户和用户组", link: "/bootstrap/accounts" },
          { text: "系统文件和目录", link: "/bootstrap/files" },
          { text: "机密输入", link: "/bootstrap/secrets" },
          { text: "服务", link: "/bootstrap/services" },
          { text: "Linux 防火墙", link: "/bootstrap/firewall" },
          { text: "Docker Compose 项目", link: "/bootstrap/compose" },
        ],
      },
      {
        text: "你的环境",
        items: [
          { text: "Git 仓库", link: "/bootstrap/repos" },
          {
            text: "Shell 激活和登录 Shell",
            link: "/bootstrap/shell",
          },
        ],
      },
      {
        text: "特定平台",
        items: [
          { text: "macOS 默认设置", link: "/bootstrap/macos-defaults" },
          { text: "macOS LaunchAgents", link: "/bootstrap/launchd" },
          { text: "systemd 用户单元", link: "/bootstrap/systemd" },
        ],
      },
    ],
  },
  {
    text: "点文件",
    collapsed: true,
    items: [
      { text: "概览", link: "/dotfiles" },
      { text: "托管文件", link: "/dotfiles/managed" },
      { text: "分组", link: "/dotfiles/groups" },
      { text: "编辑文件的一部分", link: "/dotfiles/edits" },
      {
        text: "历史",
        link: "/dotfiles/history",
        collapsed: true,
        items: [
          { text: "在多台机器间同步", link: "/dotfiles/sync" },
          { text: "加密文件", link: "/dotfiles/encryption" },
        ],
      },
      { text: "点文件参考", link: "/dotfiles/reference" },
    ],
  },
  {
    text: "配置",
    collapsed: true,
    items: [
      { text: "mise.toml", link: "/configuration" },
      { text: "配置环境", link: "/configuration/environments" },
      { text: "设置", link: "/configuration/settings" },
      { text: "配置变量", link: "/configuration/vars" },
      { text: "Tera 模板", link: "/templates" },
      {
        text: "MISE_* 变量",
        link: "/configuration/environment-variables",
      },
      { text: "目录", link: "/directories" },
      { text: "缓存", link: "/cache-behavior" },
      { text: "URL 替换", link: "/url-replacements" },
      {
        text: "项目诊断",
        link: "/configuration/project-diagnostics",
      },
    ],
  },
  {
    text: "安全",
    collapsed: true,
    items: [
      { text: "安全概览", link: "/security" },
      { text: "偏执模式", link: "/paranoid" },
      { text: "沙箱", link: "/sandboxing" },
    ],
  },
  {
    text: "插件",
    collapsed: true,
    items: [
      { text: "插件", link: "/plugins" },
      {
        text: "编写插件",
        items: [
          { text: "工具插件", link: "/tool-plugin-development" },
          { text: "后端插件", link: "/backend-plugin-development" },
          { text: "环境插件", link: "/env-plugin-development" },
          {
            text: "软件包管理器插件",
            link: "/package-plugin-development",
          },
          { text: "插件 Lua 参考", link: "/plugin-lua-modules" },
          { text: "发布插件", link: "/plugin-publishing" },
        ],
      },
      { text: "asdf 插件（旧版）", link: "/asdf-legacy-plugins" },
    ],
  },
  {
    text: "帮助",
    collapsed: true,
    items: [
      { text: "故障排除", link: "/troubleshooting" },
      { text: "错误消息", link: "/errors" },
      { text: "常见问题", link: "/faq" },
      { text: "术语表", link: "/glossary" },
    ],
  },
  {
    text: "实用菜谱",
    collapsed: true,
    items: [
      { text: "菜谱概览", link: "/mise-cookbook/" },
      { text: "技巧", link: "/tips-and-tricks" },
      { text: "Bazel", link: "/mise-cookbook/bazel" },
      { text: "C++ 和 CMake", link: "/mise-cookbook/cpp" },
      { text: "Neovim", link: "/mise-cookbook/neovim" },
      { text: "Node.js", link: "/mise-cookbook/nodejs" },
      { text: "Python", link: "/mise-cookbook/python" },
      { text: "Ruby on Rails", link: "/mise-cookbook/ruby" },
      { text: "脚手架任务", link: "/mise-cookbook/presets" },
      { text: "Terraform and OpenTofu", link: "/mise-cookbook/terraform" },
    ],
  },
  {
    text: "关于",
    collapsed: true,
    items: [
      { text: "关于 mise", link: "/about" },
      { text: "版本发布", link: "/releases" },
      { text: "联系", link: "/contact" },
      { text: "演示", link: "/demo" },
      { text: "mise run：歌曲", link: "/mise-en-place" },
      { text: "外部资源", link: "/external-resources" },
    ],
  },
  {
    text: "贡献",
    collapsed: true,
    items: [
      { text: "贡献指南", link: "/contributing" },
      { text: "向注册表添加工具", link: "/contributing/registry" },
      { text: "代码库架构", link: "/architecture" },
      { text: "打包 mise", link: "/packaging" },
    ],
  },
  {
    text: "CLI 参考",
    collapsed: true,
    items: [{ text: "CLI 概览", link: "/cli/" }, ...cliReference(commands)],
  },
];

function cliReference(
  commands: { [key: string]: Command },
  parent: string[] = [],
): SidebarItem[] {
  return Object.keys(commands)
    .map((name) => [name, commands[name]] as [string, Command])
    .filter(([_name, command]) => command.hide !== true)
    .map(([name, command]) => {
      const path = [...parent, name];
      const item: SidebarItem = {
        text: `mise ${path.join(" ")}`,
        link: `/cli/${path.join("/")}`,
      };
      if (command.subcommands) {
        item.collapsed = true;
        item.items = cliReference(command.subcommands, path);
      }
      return item;
    });
}
