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

// Guides for a key more specific than its section's. A key without one uses the guide of
// the nearest key above it that has one, and then its section's.
const keyGuides: Record<string, Guide> = {
  "tools.<tool>": { text: "工具选项", link: "/dev-tools/#tool-options" },
  "tools.<tool>.version": {
    text: "版本请求",
    link: "/dev-tools/versions.html#request-syntax",
  },
  "tools.<tool>.os": {
    text: "特定操作系统的工具",
    link: "/dev-tools/#os-specific-tools",
  },
  "tools.<tool>.depends": {
    text: "工具依赖",
    link: "/dev-tools/#tool-dependencies",
  },
  "tools.<tool>.postinstall": {
    text: "工具 postinstall 命令",
    link: "/dev-tools/#tool-postinstall-commands",
  },
  "tools.<tool>.install_env": {
    text: "工具选项中的变量",
    link: "/dev-tools/#templates-in-tool-configuration",
  },
  "tools.<tool>.auto_update": {
    text: "工具自动更新",
    link: "/dev-tools/#automatic-tool-updates",
  },
  "tools.<tool>.lazy": {
    text: "延迟安装的工具",
    link: "/dev-tools/shims.html#lazy-tools",
  },
  "tools.<tool>.version_order": {
    text: "版本排序",
    link: "/dev-tools/versions.html#version-ordering",
  },
  "tools.<github:…>": {
    text: "GitHub 后端",
    link: "/dev-tools/backends/github.html#tool-options",
  },
  "tools.<github:…>.asset_pattern": {
    text: "选择 GitHub 资源文件",
    link: "/dev-tools/backends/github.html#selecting-assets",
  },
  "tools.<github:…>.platforms": {
    text: "平台特定选项",
    link: "/dev-tools/backends/github.html#per-platform-options",
  },
  "tools.<github:…>.version_prefix": {
    text: "版本选择",
    link: "/dev-tools/backends/github.html#choosing-versions",
  },
  "tools.<github:…>.bin": {
    text: "提取并命名可执行文件",
    link: "/dev-tools/backends/github.html#extracting-and-naming-executables",
  },
  "tools.<gitlab:…>": {
    text: "GitLab 后端",
    link: "/dev-tools/backends/gitlab.html",
  },
  "tools.<forgejo:…>": {
    text: "Forgejo 后端",
    link: "/dev-tools/backends/forgejo.html",
  },
  "tools.<ubi:…>": {
    text: "ubi 后端",
    link: "/dev-tools/backends/ubi.html",
  },
  "tools.<http:…>": {
    text: "http 后端",
    link: "/dev-tools/backends/http.html",
  },
  "tools.<s3:…>": {
    text: "s3 后端",
    link: "/dev-tools/backends/s3.html",
  },
  "tools.<aqua:…>": {
    text: "aqua 后端",
    link: "/dev-tools/backends/aqua.html",
  },
  "tools.<cargo:…>": {
    text: "cargo 后端",
    link: "/dev-tools/backends/cargo.html",
  },
  "tools.<npm:…>": {
    text: "npm 后端",
    link: "/dev-tools/backends/npm.html",
  },
  "tools.<pypi:…>": {
    text: "PyPI 后端",
    link: "/dev-tools/backends/pypi.html",
  },
  "tools.<pipx:…>": {
    text: "PyPI 后端",
    link: "/dev-tools/backends/pypi.html",
  },
  "tools.<gem:…>": {
    text: "gem 后端",
    link: "/dev-tools/backends/gem.html",
  },
  "tools.<go:…>": {
    text: "go 后端",
    link: "/dev-tools/backends/go.html",
  },
  "tools.<conda:…>": {
    text: "conda 后端",
    link: "/dev-tools/backends/conda.html",
  },
  "tools.<spm:…>": {
    text: "spm 后端",
    link: "/dev-tools/backends/spm.html",
  },
  "tools.<packslip:…>": {
    text: "packslip 后端",
    link: "/dev-tools/backends/packslip.html",
  },
  "tools.<spinel:…>": {
    text: "spinel 后端",
    link: "/dev-tools/backends/spinel.html",
  },
  "tools.python": { text: "Python", link: "/lang/python.html" },
  "tools.java": { text: "Java", link: "/lang/java.html" },
  "tools.rust": { text: "Rust", link: "/lang/rust.html" },
  "tools.dotnet": { text: ".NET", link: "/dev-tools/backends/dotnet.html" },
  "env._": { text: "环境指令", link: "/environments/#env-directives" },
  "env._.file": { text: "env._.file", link: "/environments/#env-file" },
  "env._.path": { text: "env._.path", link: "/environments/#env-path" },
  "env._.source": { text: "env._.source", link: "/environments/#env-source" },
  "env._.python.venv": {
    text: "env._.python.venv",
    link: "/environments/#env-python-venv",
  },
  "env.<NAME>.default": {
    text: "默认值",
    link: "/environments/#defaults",
  },
  "env.<NAME>.required": {
    text: "必需变量",
    link: "/environments/#required-variables",
  },
  "env.<NAME>.redact": {
    text: "脱敏",
    link: "/environments/secrets/#redaction",
  },
  "env.<NAME>.tools": {
    text: "工具设置的值",
    link: "/environments/#lazy-eval",
  },
  "vars.<name>.prompt": {
    text: "询问一次并记住",
    link: "/configuration/vars.html#prompt",
  },
  "hooks.enter": {
    text: "目录切换钩子",
    link: "/hooks.html#directory-hooks",
  },
  "hooks.leave": {
    text: "目录切换钩子",
    link: "/hooks.html#directory-hooks",
  },
  "hooks.cd": { text: "目录切换钩子", link: "/hooks.html#directory-hooks" },
  "hooks.preinstall": {
    text: "安装钩子",
    link: "/hooks.html#preinstall-postinstall-hook",
  },
  "hooks.postinstall": {
    text: "安装钩子",
    link: "/hooks.html#preinstall-postinstall-hook",
  },
  watch_files: { text: "监视文件", link: "/hooks.html#watch-files-hook" },
  "tasks.<name>.run": {
    text: "任务命令",
    link: "/tasks/task-configuration.html#run",
  },
  "daemons.<name>.port": {
    text: "端口、URL 与工作树",
    link: "/daemons/worktrees.html#automatic-ports",
  },
  "monorepo.path_aliases": {
    text: "路径别名",
    link: "/tasks/monorepo.html#short-names-for-project-paths",
  },
  "monorepo.config_roots": {
    text: "配置根目录",
    link: "/tasks/monorepo.html#explicit-config-roots",
  },
  "oci.copy": {
    text: "将文件复制到镜像",
    link: "/dev-tools/mise-oci.html#copy-files-into-the-image",
  },
};

// The ids of the headings in /tasks/task-configuration.html, by the property they describe.
const taskProperties: Record<string, string> = {
  run: "run",
  run_windows: "run-windows",
  file: "file",
  shell: "shell",
  dir: "dir",
  usage: "usage",
  raw_args: "raw-args",
  extends: "extends",
  description: "description",
  alias: "alias",
  hide: "hide",
  confirm: "confirm",
  depends: "depends",
  depends_post: "depends-post",
  wait_for: "wait-for",
  daemons: "daemons",
  env: "env",
  vars: "task-vars",
  secrets: "secrets",
  tools: "tools",
  skip_if: "skip-if",
  sources: "sources",
  outputs: "outputs",
  watch: "watch",
  cache: "cache",
  timeout: "timeout",
  raw: "raw",
  interactive: "interactive",
  output: "output",
  quiet: "quiet",
  silent: "silent",
};

function ruleGuide(path: string): Guide | undefined {
  const task = path.match(/^tasks\.<name>\.([a-z_]+)$/);
  const id = task && taskProperties[task[1]];
  if (id) {
    return {
      text: `任务属性 ${task[1]}`,
      link: `/tasks/task-configuration.html#${id}`,
    };
  }
  const config = path.match(/^task_config\.([a-z_]+)$/);
  if (config && config[1] in taskConfigIds) {
    return {
      text: `task_config.${config[1]}`,
      link: `/tasks/task-configuration.html#task_config.${config[1]}`,
    };
  }
  return undefined;
}

const taskConfigIds: Record<string, true> = {
  cascade: true,
  dir: true,
  shell: true,
  includes: true,
  excludes: true,
  cache: true,
  global_inputs: true,
  input_groups: true,
  global_env: true,
  global_pass_through_env: true,
};

// The guide that explains `path`, a key at any depth, and failing that its section.
export function guideFor(path: string): Guide | undefined {
  // `watch_files[].run` is a key of `watch_files`, so a list marker does not change the guide
  const segments = path.split(".").map((s) => s.replace(/\[\]$/, ""));
  for (let n = segments.length; n > 0; n--) {
    const above = segments.slice(0, n).join(".");
    const guide = keyGuides[above] ?? ruleGuide(above);
    if (guide) return guide;
  }
  return guides[segments[0]];
}

// Every guide link the reference can show, for the test that they still lead somewhere.
export function allGuides(): Guide[] {
  const taskGuides = Object.keys(taskProperties).flatMap((p) => {
    const guide = ruleGuide(`tasks.<name>.${p}`);
    return guide ? [guide] : [];
  });
  const configGuides = Object.keys(taskConfigIds).flatMap((p) => {
    const guide = ruleGuide(`task_config.${p}`);
    return guide ? [guide] : [];
  });
  return [
    ...Object.values(guides),
    ...Object.values(keyGuides),
    ...taskGuides,
    ...configGuides,
  ];
}
