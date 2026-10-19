import * as fs from "node:fs";
import * as path from "node:path";
import { load } from "js-toml";
import { createMarkdownRenderer } from "vitepress";

// Render settings.toml text with the site's own markdown pipeline, so `:::`
// containers, Shiki code blocks and link handling match the rest of the docs.
// VitePress sets VITEPRESS_CONFIG while it builds or serves the site; the
// fallback only matters when this loader runs on its own.
async function markdownRenderer() {
  const config = (globalThis as any).VITEPRESS_CONFIG;
  if (config) {
    return createMarkdownRenderer(
      config.srcDir,
      config.markdown,
      config.site.base,
      config.logger,
    );
  }
  return createMarkdownRenderer(path.resolve("docs"));
}

// How a list setting's environment variable is split.
const parseEnvLabels: Record<string, string> = {
  list_by_comma: "按逗号分隔",
  set_by_comma: "按逗号分隔",
  list_by_colon: "按冒号分隔",
  list_by_os_path_separator:
    "按 <code>:</code> 分隔（Windows 上为 <code>;</code>）",
  parse_url_replacements: "JSON 对象",
};

const typeLabels: Record<string, string> = {
  String: "字符串",
  Path: "路径",
  Url: "URL",
  Duration: "持续时间",
  Bool: "布尔值",
  Integer: "整数",
  ListString: "字符串数组",
  ListPath: "路径数组",
  SetString: "字符串数组",
  "IndexMap<String, String>": "表格",
  BoolOrString: "布尔值 | 字符串",
  BoolOrList: "布尔值 | 字符串数组",
};

const typeHints: Record<string, string> = {
  Duration:
    "例如 <code>30s</code>、<code>10m</code>、<code>1h</code> 或 <code>7d</code>",
};

// Where a setting may be set, when that is narrower than everywhere. `text`
// gets the setting's environment variable, if it has one.
const restrictions = {
  global_only: {
    badge: "仅全局",
    title: "在项目配置中会被忽略",
    text: (env?: string) =>
      `全局或系统配置${env ? `，或 <code>${env}</code>` : ""}。在项目配置中会被忽略，并显示警告。请参阅<a href="/configuration/settings.html#global-only-settings">仅限全局的设置</a>。`,
  },
  rc: {
    badge: "miserc",
    title: "设置于 .miserc.toml 或环境变量，而不是 mise.toml",
    text: (env?: string) =>
      `<a href="/configuration.html#miserc"><code>.miserc.toml</code></a> 文件${env ? `或 <code>${env}</code>` : ""}。mise 会在加载配置文件前读取它，因此 <code>mise.toml</code> 中的 <code>[settings]</code> 不会生效。请参阅<a href="/configuration/settings.html#early-initialization">配置文件加载前读取的设置</a>。`,
  },
  env_only: {
    badge: "仅环境变量",
    title: "只能通过环境变量设置",
    text: (env?: string) =>
      `仅限${env ? `<code>${env}</code>` : "环境变量"}。mise 会在加载配置文件前读取它，并忽略配置文件中的值。请参阅<a href="/configuration/settings.html#environment-only-settings">仅限环境变量的设置</a>。`,
  },
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// A default as it would be written in TOML: `"30s"`, `8`, `["a", "b"]`.
function tomlLiteral(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(tomlLiteral).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(
      ([k, v]) => `${k} = ${tomlLiteral(v)}`,
    );
    return entries.length ? `{ ${entries.join(", ")} }` : "{}";
  }
  return String(value);
}

export default {
  watch: ["./settings.toml"],
  async load() {
    const md = await markdownRenderer();
    const inline = (s: string) => md.renderInline(s, {});
    const block = (s: string) => md.render(s, {});

    const raw = fs.readFileSync("./settings.toml", "utf-8");
    const doc = load(raw) as Record<string, any>;

    function renderDefault(props: Record<string, any>): string {
      // default_docs is either prose, rendered as markdown, or a single
      // value, shown as TOML like other defaults.
      if (props.default_docs !== undefined) {
        const text = String(props.default_docs);
        if (/[`\s]/.test(text)) return inline(text);
        const literal = ["Bool", "Integer"].includes(props.type)
          ? text
          : tomlLiteral(text);
        return `<code>${escapeHtml(literal)}</code>`;
      }
      let value = props.default;
      if (value === undefined && props.type === "Bool" && !props.optional) {
        value = false;
      }
      if (value === undefined) return "未设置";
      return `<code>${escapeHtml(tomlLiteral(value))}</code>`;
    }

    function buildElement(key: string, props: Record<string, any>) {
      const description: string = props.description ?? "";
      const experimental = /^\[experimental\]\s*/.test(description);
      const lead = description.replace(/^\[(experimental|deprecated)\]\s*/, "");
      const scope = (
        Object.keys(restrictions) as Array<keyof typeof restrictions>
      )
        .filter((flag) => props[flag])
        .map((flag) => restrictions[flag]);
      return {
        key,
        type: typeLabels[props.type] ?? props.type,
        typeHint: typeHints[props.type],
        default: renderDefault(props),
        description: lead ? inline(lead) : "",
        docs: props.docs ? block(props.docs) : "",
        deprecated: props.deprecated ? inline(props.deprecated) : undefined,
        experimental,
        badges: scope.map(({ badge, title }) => ({ text: badge, title })),
        scope: scope.map(({ text }) => text(props.env)),
        enum: props.enum?.map((choice: any) =>
          typeof choice === "object" && choice !== null
            ? {
                value: choice.value,
                description: choice.description
                  ? inline(choice.description)
                  : undefined,
              }
            : { value: choice },
        ),
        env: props.env,
        parseEnv: parseEnvLabels[props.parse_env],
      };
    }

    function appendSettings(group, node, keyPath: string[]) {
      for (const key in node) {
        const props = node[key];
        if (typeof props !== "object" || props === null || props.hide) {
          continue;
        }
        const settingPath = [...keyPath, key];
        if (props.type) {
          group.settings.push(buildElement(settingPath.join("."), props));
        } else {
          appendSettings(group, props, settingPath);
        }
      }
    }

    const settings = [];
    for (const key in doc) {
      const props = doc[key];
      if (props.hide) continue;
      if (props.type) {
        settings.push(buildElement(key, props));
      } else {
        const group = { key, settings: [] };
        appendSettings(group, props, [key]);
        // A group whose settings are all hidden has nothing to show.
        if (group.settings.length > 0) settings.push(group);
      }
    }
    return settings.sort((a, b) => a.key.localeCompare(b.key));
  },
};
