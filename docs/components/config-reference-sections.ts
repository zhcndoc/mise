// How the mise.toml reference groups its top-level sections, and the guide that explains
// each one. The page and its Markdown copy both read this; the keys themselves come from
// schema/mise.json. A section missing here is listed under "Other", so a new top-level key
// still shows up, but give it a group and a guide.

export type Guide = { text: string; link: string };

export type Group = { title: string; sections: string[] };

export const groups: Group[] = [
  {
    title: "工具",
    sections: ["tools", "tool_alias", "tool_config", "plugins", "wrappers"],
  },
  {
    title: "环境",
    sections: ["env", "vars", "redactions", "secrets"],
  },
  {
    title: "任务",
    sections: [
      "tasks",
      "task_config",
      "task_templates",
      "monorepo",
      "monorepo_root",
    ],
  },
  {
    title: "钩子与 Shell",
    sections: ["hooks", "watch_files", "shell_alias"],
  },
  {
    title: "配置文件",
    sections: ["settings", "include", "min_version", "doctor", "_"],
  },
  {
    title: "项目服务",
    sections: [
      "deps",
      "oci",
      "daemons",
      "daemon_groups",
      "daemons_settings",
      "daemon_providers",
    ],
  },
  {
    title: "机器初始化",
    sections: ["bootstrap", "dotfiles", "dotfile_groups", "history"],
  },
];

// The page that explains a section, as listed in the table of sections on /configuration.html.
export const guides: Record<string, Guide> = {
  _: { text: "自由格式数据", link: "/configuration.html#free-form-data" },
  alias: { text: "工具别名", link: "/dev-tools/aliases.html" },
  bootstrap: { text: "初始化", link: "/bootstrap.html" },
  daemon_groups: { text: "守护进程组", link: "/daemons.html#groups" },
  daemon_providers: {
    text: "在项目间共享守护进程",
    link: "/daemons/sharing.html",
  },
  daemons: { text: "守护进程", link: "/daemons.html" },
  daemons_settings: {
    text: "端口、URL 与工作树",
    link: "/daemons/worktrees.html#namespaces",
  },
  deps: { text: "项目依赖", link: "/dev-tools/deps.html" },
  doctor: {
    text: "项目诊断",
    link: "/configuration/project-diagnostics.html",
  },
  dotenv: { text: "环境变量", link: "/environments/" },
  dotfile_groups: { text: "Dotfile 组", link: "/dotfiles/groups.html" },
  dotfiles: { text: "Dotfiles", link: "/dotfiles.html" },
  env: { text: "环境变量", link: "/environments/" },
  env_file: { text: "环境变量", link: "/environments/" },
  env_path: { text: "环境变量", link: "/environments/" },
  experimental_monorepo_root: {
    text: "Monorepo 任务",
    link: "/tasks/monorepo.html",
  },
  history: { text: "Dotfiles 历史记录", link: "/dotfiles/history.html" },
  hooks: { text: "钩子", link: "/hooks.html" },
  include: { text: "include", link: "/configuration.html#include" },
  min_version: {
    text: "最低 mise 版本",
    link: "/configuration.html#minimum-mise-version",
  },
  monorepo: { text: "Monorepo 任务", link: "/tasks/monorepo.html" },
  monorepo_root: { text: "Monorepo 任务", link: "/tasks/monorepo.html" },
  oci: { text: "OCI 镜像", link: "/dev-tools/mise-oci.html" },
  plugins: { text: "插件", link: "/configuration.html#plugins" },
  redactions: {
    text: "敏感值脱敏",
    link: "/environments/secrets/#redaction",
  },
  secrets: { text: "fnox", link: "/environments/secrets/fnox.html" },
  settings: { text: "设置", link: "/configuration/settings.html" },
  shell_alias: { text: "Shell 别名", link: "/shell-aliases.html" },
  task_config: {
    text: "任务配置",
    link: "/tasks/task-configuration.html#task-config-options",
  },
  task_templates: { text: "任务模板", link: "/tasks/templates.html" },
  tasks: { text: "任务", link: "/tasks/" },
  tool_alias: { text: "工具别名", link: "/dev-tools/aliases.html" },
  tool_config: {
    text: "工具策略",
    link: "/configuration.html#tool-config",
  },
  tools: { text: "开发工具", link: "/dev-tools/" },
  vars: { text: "配置变量", link: "/configuration/vars.html" },
  watch_files: { text: "钩子", link: "/hooks.html" },
  wrappers: {
    text: "命令包装器",
    link: "/dev-tools/shims.html#command-wrappers",
  },
};

type Named = { path: string; deprecated: boolean };

// `keys` in the groups above, with deprecated sections in a group of their own at the end
// and any section no group names under "Other".
export function grouped<K extends Named>(
  keys: K[],
): { title: string; keys: K[] }[] {
  const byPath = new Map(keys.map((k) => [k.path, k]));
  const placed = new Set<string>();
  const out: { title: string; keys: K[] }[] = [];
  for (const group of groups) {
    const members = group.sections
      .map((s) => byPath.get(s))
      .filter((k): k is K => k !== undefined && !k.deprecated);
    members.forEach((k) => placed.add(k.path));
    if (members.length > 0) out.push({ title: group.title, keys: members });
  }
  const other = keys.filter((k) => !placed.has(k.path) && !k.deprecated);
  if (other.length > 0) out.push({ title: "其他", keys: other });
  const deprecated = keys.filter((k) => k.deprecated);
  if (deprecated.length > 0)
    out.push({ title: "已弃用", keys: deprecated });
  return out;
}
