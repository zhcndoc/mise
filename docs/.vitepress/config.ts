import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { Command, commands } from "./cli_commands";
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from "vitepress-plugin-group-icons";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";
import { withMermaid } from "vitepress-plugin-mermaid";
import kdlGrammar from "./grammars/kdl.tmLanguage.json";
import miseTomlGrammar from "./grammars/mise-toml.tmLanguage.json";

const configDir = dirname(fileURLToPath(import.meta.url));
const cargoToml = readFileSync(resolve(configDir, "../../Cargo.toml"), "utf8");
const versionMatch = cargoToml.match(
  /^\[package\][\s\S]*?^\s*version\s*=\s*"([^"]+)"/m,
);
if (!versionMatch) {
  console.warn("Unable to find package version in Cargo.toml");
}
const latestVersion = versionMatch?.[1] ?? "0.0.0";

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: "Mise 中文文档",
    description: "Mise 中文文档：管理本地开发运行时、环境变量和任务的工具",
    lang: "zh-CN",
    titleTemplate: ":title - Mise 中文文档",
    lastUpdated: true,
    appearance: true,
    mermaid: {},
    sitemap: {
      hostname: "https://mise.zhcndoc.com",
    },
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      logo: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
      outline: { level: "deep", label: "本页目录" },
      nav: [
        { text: "mise 版本", link: "https://mise-versions.jdx.dev/" },
        { text: "开发工具", link: "/dev-tools/" },
        { text: "环境变量", link: "/environments/" },
        { text: "任务", link: "/tasks/" },
        {
          text: `v${latestVersion}`,
          link: "https://github.com/jdx/mise/releases",
        },
        { text: "简中文档", link: "https://www.zhcndoc.com" },
      ],
      sidebar: [
        {
          text: "指南",
          items: [
            { text: "演示", link: "/demo" },
            { text: "入门指南", link: "/getting-started" },
            { text: "演练", link: "/walkthrough" },
            { text: "安装 mise", link: "/installing-mise" },
            { text: "IDE 集成", link: "/ide-integration" },
            { text: "持续集成", link: "/continuous-integration" },
          ],
        },
        {
          text: "配置",
          items: [
            { text: "mise.toml", link: "/configuration" },
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
            { text: "命令垫片", link: "/dev-tools/shims" },
            { text: "工具别名", link: "/dev-tools/aliases" },
            { text: "工具存根", link: "/dev-tools/tool-stubs" },
            { text: "注册表", link: "/registry" },
            { text: "GitHub 令牌", link: "/dev-tools/github-tokens" },
            { text: "mise.lock 锁文件", link: "/dev-tools/mise-lock" },
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
          text: "Bootstrap（实验性）",
          items: [
            { text: "概览", link: "/bootstrap" },
            {
              text: "Bootstrap 包",
              link: "/bootstrap/packages/",
              collapsed: true,
              items: [
                { text: "apk", link: "/bootstrap/packages/apk" },
                { text: "apt", link: "/bootstrap/packages/apt" },
                { text: "dnf", link: "/bootstrap/packages/dnf" },
                { text: "pacman", link: "/bootstrap/packages/pacman" },
                { text: "brew", link: "/bootstrap/packages/brew" },
              ],
            },
            {
              text: "仓库",
              link: "/bootstrap/repos",
            },
            {
              text: "Dotfiles",
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
              text: "用户登录 Shell",
              link: "/bootstrap/user",
            },
          ],
        },
        {
          text: "环境变量",
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
            { text: "故障排查", link: "/troubleshooting" },
            { text: "错误", link: "/errors" },
            { text: "技巧", link: "/tips-and-tricks" },
            {
              text: "Cookbook",
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
            { text: "贡献指南", link: "/contributing" },
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
          items: [
            { text: "CLI 概览", link: "/cli/" },
            ...cliReference(commands),
          ],
        },
      ],

      socialLinks: [
        { icon: "github", link: "https://github.com/jdx/mise" },
        { icon: "discord", link: "https://discord.gg/UBa7pJUN7Z" },
      ],

      editLink: {
        pattern: "https://github.com/zhcndoc/mise/edit/main/docs/:path",
        text: "在 GitHub 上编辑此页",
      },
      lastUpdated: {
        text: "最后更新于",
      },
      docFooter: {
        prev: "上一页",
        next: "下一页",
      },
      sidebarMenuLabel: "菜单",
      returnToTopLabel: "返回顶部",
      langMenuLabel: "切换语言",
      darkModeSwitchLabel: "外观",
      lightModeSwitchTitle: "切换到浅色模式",
      darkModeSwitchTitle: "切换到深色模式",
      skipToContentLabel: "跳转到内容",
      search: {
        provider: "algolia",
        options: {
          indexName: "rtx",
          appId: "1452G4RPSJ",
          apiKey: "ad09b96a7d2a30eddc2771800da7a1cf",
          insights: true,
          translations: {
            button: {
              buttonText: "搜索",
              buttonAriaLabel: "搜索文档",
            },
            modal: {
              searchBox: {
                resetButtonTitle: "清除搜索条件",
                resetButtonAriaLabel: "清除搜索条件",
                cancelButtonText: "取消",
                cancelButtonAriaLabel: "取消搜索",
              },
              startScreen: {
                recentSearchesTitle: "最近搜索",
                noRecentSearchesText: "没有最近搜索",
                saveRecentSearchButtonTitle: "保存此搜索",
                removeRecentSearchButtonTitle: "从历史记录中移除此搜索",
                favoriteSearchesTitle: "收藏搜索",
                removeFavoriteSearchButtonTitle: "从收藏中移除此搜索",
              },
              errorScreen: {
                titleText: "无法获取结果",
                helpText: "请检查网络连接。",
              },
              footer: {
                selectText: "选择",
                navigateText: "导航",
                closeText: "关闭",
                searchByText: "搜索提供方",
              },
              noResultsScreen: {
                noResultsText: "没有找到结果：",
                suggestedQueryText: "可以尝试搜索：",
                reportMissingResultsText: "认为这个查询应该有结果？",
                reportMissingResultsLinkText: "告诉我们。",
              },
            },
          },
        },
      },
      footer: false,
      // carbonAds: {
      //   code: "CWYIPKQN",
      //   placement: "misejdxdev",
      // },
    },
    markdown: {
      languages: [
        // Load base languages needed for embedded support
        "toml",
        "shell",
        "bash",
        // TODO: Once Shiki bundles KDL (tracked in shikijs/textmate-grammars-themes),
        // we can import it from 'shiki/langs/kdl' instead of storing locally
        {
          ...kdlGrammar,
          name: "kdl",
          scopeName: "source.kdl",
        } as any,
        // Custom mise.toml grammar with embedded KDL (usage fields) and bash (run fields)
        {
          ...miseTomlGrammar,
          name: "mise-toml",
          aliases: ["mise.toml"],
          scopeName: "source.mise-toml",
        } as any,
      ],
      config(md) {
        md.use(groupIconMdPlugin);
        md.use(tabsMarkdownPlugin);
      },
    },
    vite: {
      build: {
        target: "es2022",
      },
      optimizeDeps: {
        esbuildOptions: {
          target: "es2022",
        },
      },
      plugins: [
        groupIconVitePlugin({
          customIcon: {
            ".toml": "vscode-icons:file-type-toml",
            brew: "logos:homebrew",
            python: "logos:python",
            node: "logos:nodejs",
            ruby: "logos:ruby",
          },
        }),
      ],
    },
    head: [
      // Favicon
      ["link", { rel: "icon", href: "/favicon.ico", sizes: "any" }],
      [
        "link",
        {
          rel: "icon",
          href: "/favicon-16x16.png",
          type: "image/png",
          sizes: "16x16",
        },
      ],
      [
        "link",
        {
          rel: "icon",
          href: "/favicon-32x32.png",
          type: "image/png",
          sizes: "32x32",
        },
      ],
      ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
      [
        "link",
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },
      ],
      // Google Fonts
      [
        "link",
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
      ],
      [
        "link",
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
      ],
      [
        "link",
        {
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
          rel: "stylesheet",
        },
      ],
      [
        "script",
        {
          async: "",
          src: "https://www.zhcndoc.com/js/common.js",
        },
      ],
      // Open Graph
      ["meta", { property: "og:site_name", content: "Mise 中文文档" }],
      ["meta", { property: "og:type", content: "website" }],
      [
        "meta",
        {
          property: "og:image",
          content: "https://mise.zhcndoc.com/android-chrome-512x512.png",
        },
      ],
      ["meta", { name: "twitter:card", content: "summary" }],
      [
        "meta",
        {
          name: "twitter:image",
          content: "https://mise.zhcndoc.com/android-chrome-512x512.png",
        },
      ],
    ],
    transformPageData(pageData) {
      const canonicalUrl = `https://mise.zhcndoc.com/${pageData.relativePath}`
        .replace(/index\.md$/, "")
        .replace(/\.md$/, ".html");

      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push([
        "link",
        { rel: "canonical", href: canonicalUrl },
      ]);
      pageData.frontmatter.head.push([
        "link",
        {
          rel: "sitemap",
          href: "https://mise.zhcndoc.com/sitemap.xml",
          type: "application/xml",
          title: "Sitemap",
        },
      ]);
    },
    transformHtml(code) {
      return code.replace(
        /<script id="check-dark-mode">/,
        '<script id="check-dark-mode" data-cfasync="false">',
      );
    },
  }),
);

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
