import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { sidebar } from "./sidebar";
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
const publicSchemas = [
  "mise.json",
  "mise.plugin.json",
  "mise-task.json",
  "mise-settings.json",
  "mise-registry-tool.json",
];

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
      sidebar,

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
        {
          name: "mise-schema-assets",
          apply: "build",
          buildStart() {
            for (const filename of publicSchemas) {
              this.emitFile({
                type: "asset",
                fileName: `schema/${filename}`,
                source: readFileSync(
                  resolve(configDir, "../../schema", filename),
                ),
              });
            }
          },
        },
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
      // Pre-paint setup to avoid first-load pop-in (see custom.css "preboot"
      // rules; Layout.vue removes the preboot classes right after hydration):
      // - `preboot` disables navbar transitions so hydration state
      //   corrections snap instead of visibly fading
      // - home: hide the navbar brand before the scroll handler takes over
      // - other pages: pre-apply the has-sidebar navbar layout so the
      //   search/menu don't jump right when hydration adds the class
      // - reserve the announcement banner's space from the cached height so
      //   the header doesn't jump when the banner arrives (banner.ts)
      [
        "script",
        {},
        `(function () {
  try {
    var d = document.documentElement;
    var p = location.pathname;
    d.classList.add("preboot");
    if (p === "/" || p === "/index.html") {
      d.classList.add("hide-nav-brand");
      // Scroll restoration on a mid-page reload fires before hydration —
      // unhide the brand right away instead of waiting for Layout.vue.
      addEventListener(
        "scroll",
        function () {
          if (scrollY > 300) d.classList.remove("hide-nav-brand");
        },
        { once: true },
      );
    } else {
      d.classList.add("preboot-sidebar");
    }
    var id = localStorage.getItem("jdx-banner-id");
    var h = localStorage.getItem("jdx-banner-height");
    if (id && h && localStorage.getItem("jdx-banner-dismissed") !== id)
      d.style.setProperty("--vp-layout-top-height", h);
  } catch (e) {}
})();`,
      ],
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
