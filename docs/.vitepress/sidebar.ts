import { Command, commands } from "./cli_commands";

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
    text: "指南",
    items: [
      { text: "演示", link: "/demo" },
      { text: "入门指南", link: "/getting-started" },
      { text: "使用指南", link: "/walkthrough" },
      { text: "安装 mise", link: "/installing-mise" },
      { text: "IDE 集成", link: "/ide-integration" },
      { text: "持续集成", link: "/continuous-integration" },
    ],
  },
  {
    text: "配置",
    items: [
      { text: "mise.toml", link: "/configuration" },
      { text: "变量", link: "/configuration/vars" },
      { text: "设置", link: "/configuration/settings" },
      {
        text: "配置环境",
        link: "/configuration/environments",
      },
    ],
  },
  {
    text: "开发工具",
    items: [
      { text: "开发工具概览", link: "/dev-tools/" },
      {
        text: "与 asdf 对比",
        link: "/dev-tools/comparison-to-asdf",
      },
      { text: "垫片", link: "/dev-tools/shims" },
      { text: "工具别名", link: "/dev-tools/aliases" },
      { text: "工具存根", link: "/dev-tools/tool-stubs" },
      { text: "工具注册表", link: "/registry" },
      { text: "GitHub 令牌", link: "/dev-tools/github-tokens" },
      { text: "mise.lock 锁定文件", link: "/dev-tools/mise-lock" },
      { text: "安全", link: "/security" },
      { text: "OCI 镜像（实验性）", link: "/dev-tools/mise-oci" },
      { text: "依赖", link: "/dev-tools/deps" },
      {
        text: "后端架构",
        link: "/dev-tools/backend_architecture",
      },
      {
        text: "核心工具",
        link: "/core-tools",
        collapsed: true,
        items: [
          { text: "Bun", link: "/lang/bun" },
          { text: "Deno", link: "/lang/deno" },
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
        text: "后端",
        link: "/dev-tools/backends/",
        collapsed: true,
        items: [
          { text: "aqua", link: "/dev-tools/backends/aqua" },
          { text: "asdf", link: "/dev-tools/backends/asdf" },
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
          { text: "pipx", link: "/dev-tools/backends/pipx" },
          { text: "pkgx", link: "/dev-tools/backends/pkgx" },
          { text: "spm", link: "/dev-tools/backends/spm" },
          { text: "ubi", link: "/dev-tools/backends/ubi" },
          { text: "vfox", link: "/dev-tools/backends/vfox" },
        ],
      },
    ],
  },
  {
    text: "初始化",
    items: [
      { text: "概览", link: "/bootstrap" },
      {
        text: "远程主机",
        link: "/bootstrap/remote",
      },
      {
        text: "初始化软件包",
        link: "/bootstrap/packages/",
        collapsed: true,
        items: [
          { text: "apk", link: "/bootstrap/packages/apk" },
          { text: "apt", link: "/bootstrap/packages/apt" },
          { text: "dnf", link: "/bootstrap/packages/dnf" },
          { text: "pacman", link: "/bootstrap/packages/pacman" },
          { text: "brew", link: "/bootstrap/packages/brew" },
          { text: "mas", link: "/bootstrap/packages/mas" },
          {
            text: "软件包插件",
            link: "/bootstrap/packages/plugins",
          },
        ],
      },
      {
        text: "Linux 用户和用户组",
        link: "/bootstrap/accounts",
      },
      {
        text: "系统文件",
        link: "/bootstrap/files",
      },
      {
        text: "系统服务",
        link: "/bootstrap/services",
      },
      {
        text: "Docker Compose 项目",
        link: "/bootstrap/compose",
      },
      {
        text: "机密输入",
        link: "/bootstrap/secrets",
      },
      {
        text: "代码仓库",
        link: "/bootstrap/repos",
      },
      {
        text: "点文件",
        link: "/dotfiles",
      },
      {
        text: "Shell 激活",
        link: "/bootstrap/shell",
      },
      {
        text: "macOS 默认设置",
        link: "/bootstrap/macos-defaults",
      },
      {
        text: "launchd",
        link: "/bootstrap/launchd",
      },
      {
        text: "systemd",
        link: "/bootstrap/systemd",
      },
      {
        text: "用户登录 Shell",
        link: "/bootstrap/user",
      },
    ],
  },
  {
    text: "环境",
    items: [
      { text: "环境变量", link: "/environments/" },
      { text: "Shell 别名", link: "/shell-aliases" },
      {
        text: "密钥",
        link: "/environments/secrets/",
        collapsed: true,
        items: [
          { text: "sops", link: "/environments/secrets/sops" },
          { text: "age", link: "/environments/secrets/age" },
        ],
      },
      { text: "钩子", link: "/hooks" },
      { text: "direnv", link: "/direnv" },
    ],
  },
  {
    text: "任务",
    items: [
      { text: "任务概览", link: "/tasks/" },
      { text: "任务架构", link: "/tasks/architecture" },
      { text: "运行任务", link: "/tasks/running-tasks" },
      { text: "TOML 任务", link: "/tasks/toml-tasks" },
      { text: "文件任务", link: "/tasks/file-tasks" },
      { text: "任务参数", link: "/tasks/task-arguments" },
      { text: "任务配置", link: "/tasks/task-configuration" },
      { text: "远程缓存协议", link: "/tasks/remote-cache-protocol" },
      { text: "任务模板", link: "/tasks/templates" },
      { text: "Monorepo 任务", link: "/tasks/monorepo" },
      { text: "沙箱", link: "/sandboxing" },
    ],
  },
  {
    text: "插件",
    items: [
      { text: "插件概览", link: "/plugins" },
      { text: "使用插件", link: "/plugin-usage" },
      {
        text: "后端插件开发",
        link: "/backend-plugin-development",
      },
      {
        text: "工具插件开发",
        link: "/tool-plugin-development",
      },
      {
        text: "环境插件开发",
        link: "/env-plugin-development",
      },
      {
        text: "软件包插件开发",
        link: "/package-plugin-development",
      },
      { text: "插件 Lua 模块", link: "/plugin-lua-modules" },
      { text: "插件发布", link: "/plugin-publishing" },
      { text: "asdf（旧版）插件", link: "/asdf-legacy-plugins" },
    ],
  },
  {
    text: "关于",
    items: [
      { text: "关于 mise", link: "/about" },
      { text: "mise-en-place：歌曲", link: "/mise-en-place" },
      { text: "术语表", link: "/glossary" },
      { text: "常见问题", link: "/faq" },
      { text: "故障排除", link: "/troubleshooting" },
      { text: "错误", link: "/errors" },
      { text: "技巧", link: "/tips-and-tricks" },
      {
        text: "实用菜谱",
        link: "/mise-cookbook/",
        collapsed: true,
        items: [
          { text: "C++", link: "/mise-cookbook/cpp" },
          { text: "Docker", link: "/mise-cookbook/docker" },
          { text: "Node", link: "/mise-cookbook/nodejs" },
          { text: "Ruby", link: "/mise-cookbook/ruby" },
          { text: "Terraform", link: "/mise-cookbook/terraform" },
          { text: "Python", link: "/mise-cookbook/python" },
          { text: "预设", link: "/mise-cookbook/presets" },
          { text: "Shell 技巧", link: "/mise-cookbook/shell-tricks" },
        ],
      },
      { text: "团队", link: "/team" },
      { text: "参与贡献", link: "/contributing" },
      { text: "外部资源", link: "/external-resources" },
    ],
  },
  {
    text: "高级",
    items: [
      { text: "架构", link: "/architecture" },
      { text: "偏执模式", link: "/paranoid" },
      { text: "模板", link: "/templates" },
      { text: "URL 替换", link: "/url-replacements" },
      { text: "模型上下文协议", link: "/mcp" },
      { text: "目录结构", link: "/directories" },
      { text: "缓存行为", link: "/cache-behavior" },
    ],
  },
  {
    text: "CLI 参考",
    collapsed: true,
    items: [{ text: "CLI 概览", link: "/cli/" }, ...cliReference(commands)],
  },
];

function cliReference(commands: { [key: string]: Command }) {
  return Object.keys(commands)
    .map((name) => [name, commands[name]] as [string, Command])
    .filter(([_name, command]) => command.hide !== true)
    .map(([name, command]) => {
      const x: any = {
        text: `mise ${name}`,
        link: `/cli/${name}`,
      };
      if (command.subcommands) {
        x.collapsed = true;
        x.items = Object.keys(command.subcommands)
          .filter(
            (subcommand) => command.subcommands![subcommand].hide !== true,
          )
          .map((subcommand) => ({
            text: `mise ${name} ${subcommand}`,
            link: `/cli/${name}/${subcommand}`,
          }));
      }
      return x;
    });
}
