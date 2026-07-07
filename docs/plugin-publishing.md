# 插件发布

本指南展示了如何发布和分发您的插件，无论它们是后端插件还是工具插件。发布使您的插件可供其他用户使用，并确保它们可以轻松安装和维护。

## 发布检查清单

在发布你的插件之前，请确保你已具备：

### 必备文件

- **`metadata.lua`** - 包含名称、版本、描述和作者的插件元数据
- **插件实现** - 后端方法或钩子函数
- **测试覆盖** - 用于验证功能的自动化测试

### 可选但推荐

- **`README.md`** - 基本使用说明和示例
- **`test/`** 目录 - 用于验证的测试脚本
- **版本控制** - 具有适当版本管理的 Git 仓库

## 仓库设置

### 1. 初始化仓库

最简单的开始方式是使用 [mise-tool-plugin-template](https://github.com/jdx/mise-tool-plugin-template)：

```bash
# 克隆模板
git clone https://github.com/jdx/mise-tool-plugin-template my-plugin
cd my-plugin

# 删除模板历史并设置你自己的仓库
rm -rf .git
git init
git remote add origin https://github.com/username/my-plugin.git

# 为你的插件进行自定义
# 编辑 metadata.lua、hooks/*.lua、README.md 等
```

或者，从头创建一个仓库：

```bash
# 创建插件目录
mkdir my-plugin
cd my-plugin

# 初始化 git 仓库
git init
git remote add origin https://github.com/username/my-plugin.git

# 创建初始结构
touch metadata.lua
mkdir -p test
echo "# 我的插件" > README.md
```

### 2. 基本目录结构

按以下结构组织你的插件：

```
my-plugin/
├── metadata.lua          # 插件元数据
├── README.md            # 基本文档
├── test/                # 测试脚本
│   └── test.sh
├── .gitignore           # Git 忽略规则
└── [实现文件]
```

对于后端插件：

```
backend-plugin/
├── metadata.lua          # 后端方法实现
├── README.md
└── test/
    └── test.sh
```

对于工具插件：

```
tool-plugin/
├── metadata.lua          # 插件元数据
├── hooks/               # Hook 实现
│   ├── available.lua
│   ├── pre_install.lua
│   └── env_keys.lua
├── lib/                 # 辅助库
│   └── helper.lua
├── README.md
└── test/
    └── test.sh
```

### 3. Git 忽略配置

创建一个 `.gitignore` 文件：

```gitignore
# 临时文件
*.tmp
*.temp
.DS_Store
Thumbs.db

# 测试产物
test/tmp/
test/output/

# IDE 文件
.vscode/
.idea/
*.swp
*.swo

# 操作系统文件
*.log
```

## 版本控制策略

### 语义化版本

插件发布请使用语义化版本（SemVer）：

- **主版本**（1.0.0 → 2.0.0）：破坏性变更
- **次版本**（1.0.0 → 1.1.0）：新功能，向后兼容
- **补丁版本**（1.0.0 → 1.0.1）：错误修复，向后兼容

### 版本管理

在 `metadata.lua` 中更新版本：

```lua
PLUGIN = {
    name = "my-plugin",
    version = "1.2.3",  -- 每次发布都更新这里
    description = "My awesome plugin",
    author = "Your Name"
}
```

为发布创建 git 标签：

```bash
# 给当前提交打标签
git tag -a v1.2.3 -m "Release version 1.2.3"

# 将标签推送到仓库
git push origin --tags
```

## 发布前测试

### 自动化测试

创建全面的测试脚本：

```bash
#!/bin/bash
# test/test.sh
set -e

echo "测试插件功能..."

# 本地安装插件
mise plugin install my-plugin .

# 测试基本功能
if [[ "$(mise ls-remote my-plugin)" == "" ]]; then
    echo "错误：没有可用版本"
    exit 1
fi

# 测试安装
mise install my-plugin@latest

# 测试执行
mise exec my-plugin:tool -- --version

# 清理
mise plugin remove my-plugin

echo "所有测试通过！"
```

### 手动测试

手动测试你的插件：

```bash
# 开发链接
mise plugin link my-plugin /path/to/plugin

# 测试所有功能
mise ls-remote my-plugin
mise install my-plugin@latest
mise use my-plugin@latest

# 在不同环境中测试
docker run --rm -it ubuntu:latest bash -c "
    curl -fsSL https://mise.jdx.dev/install.sh | sh
    mise plugin install my-plugin https://github.com/username/my-plugin
    mise install my-plugin@latest
"
```

## 发布流程

### 1. 准备发布

在发布之前，确保一切都已准备就绪：

```bash
# 运行测试
./test/test.sh

# 检查 git 状态
git status

# 在 metadata.lua 中更新版本
vim metadata.lua

# 提交更改
git add .
git commit -m "准备发布 v1.2.3"
```

### 2. 创建发布

创建一个带标签的发布：

```bash
# 创建并推送标签
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
git push origin main
```

### 3. GitHub Releases（推荐）

创建一个 GitHub release 以便更容易被发现：

1. 前往 GitHub 上的你的仓库
2. 点击 "Releases" → "Create a new release"
3. 选择你的标签（v1.2.3）
4. 编写描述更改的发布说明
5. 发布该 release

### 4. 发布说明模板

````markdown
## v1.2.3 的更改

### 新增

- 新功能 X
- 支持 Y

### 变更

- 提升了 Z 的性能
- 更新了依赖项

### 修复

- 修复了 A 的问题
- 解决了 B 中的 bug

### 安装

```bash
mise plugin install my-plugin https://github.com/username/my-plugin
```
````

## 分发方式

### 1. 直接 Git 安装

用户可以直接从你的仓库安装：

```bash
# 从 GitHub 安装
mise plugin install my-plugin https://github.com/username/my-plugin

# 安装特定版本
mise plugin install my-plugin https://github.com/username/my-plugin@v1.2.3

# 从其他 Git 提供商安装
mise plugin install my-plugin https://gitlab.com/username/my-plugin
```

### 2. 私有仓库访问

对于私有仓库，用户需要访问权限：

```bash
# SSH 访问（推荐）
mise plugin install my-plugin git@github.com:username/private-plugin.git

# 使用 token 的 HTTPS
mise plugin install my-plugin https://username:token@github.com/username/private-plugin.git
```

### 3. 归档分发

你也可以以归档文件的形式分发：

```bash
# 创建发布归档
git archive --format=zip --output=my-plugin-v1.2.3.zip v1.2.3

# 用户可以从归档文件安装
mise plugin install my-plugin https://github.com/username/my-plugin/releases/download/v1.2.3/my-plugin-v1.2.3.zip
```

## 维护和更新

### 1. 更新工作流

建立定期更新流程：

```bash
# 开发工作流
git checkout -b feature/new-feature
# ... 做出更改 ...
git commit -m "Add new feature"
git push origin feature/new-feature

# 审核并合并后
git checkout main
git pull origin main
git tag -a v1.3.0 -m "发布 v1.3.0"
git push origin v1.3.0
```

### 2. 向后兼容性

在可能的情况下保持向后兼容：

- 保持现有插件接口不变
- 将新功能作为可选项添加
- 逐步弃用旧功能
- 清晰记录破坏性变更

### 3. 用户沟通

让用户及时了解更新情况：

- 使用清晰的发布说明
- 宣布重大变更
- 为破坏性变更提供迁移指南
- 维护文档

## 安全注意事项

### 1. 代码审查

- 在发布前审查所有代码变更
- 检查安全漏洞
- 验证外部依赖
- 使用不受信任的输入进行测试

### 2. 依赖管理

- 尽可能固定依赖版本
- 定期更新依赖
- 关注安全公告
- 仅使用可信来源

### 3. 访问控制

- 适当限制仓库访问权限
- 使用强身份验证
- 定期审计访问权限
- 对于敏感插件，考虑使用签名发布版本

## 最佳实践

### 1. 文档

- 保持 README.md 简洁但完整
- 包含使用示例
- 记录配置选项
- 提供故障排查指南

### 2. 测试

- 在多个平台上进行测试
- 包含边界情况
- 测试升级场景
- 尽可能自动化测试

### 3. 社区

- 及时响应问题
- 友好地接受贡献
- 保持一致的代码风格
- 乐于助人并保持尊重

### 4. 发布管理

- 遵循语义化版本控制
- 创建清晰的发布说明
- 彻底测试发布版本
- 维护稳定分支

## 故障排查

### 常见问题

**插件未安装：**

```bash
# 检查仓库 URL
git clone https://github.com/username/my-plugin.git

# 验证 metadata.lua 是否存在
ls -la my-plugin/metadata.lua

# 本地测试
mise plugin link my-plugin ./my-plugin
```

**版本冲突：**

```bash
# 检查 metadata.lua 中的版本
grep version my-plugin/metadata.lua

# 验证 git 标签
git tag -l
```

**权限问题：**

```bash
# 检查仓库权限
git ls-remote https://github.com/username/my-plugin.git

# 对于私有仓库，验证访问权限
ssh -T git@github.com
```

## 下一步

- [后端插件开发](backend-plugin-development.md)
- [工具插件开发](tool-plugin-development.md)
- [插件 Lua 模块](plugin-lua-modules.md)

## 示例

### 简单的后端插件发布

```bash
# 1. 准备插件
cd my-backend-plugin
echo "Updated backend methods" > metadata.lua

# 2. 本地测试
mise plugin link my-plugin .
mise ls-remote my-plugin:tool

# 3. 发布
git add .
git commit -m "v1.0.0: Initial release"
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

### 带钩子的工具插件

```bash
# 1. 准备插件
cd my-tool-plugin
./test/test.sh  # 运行测试

# 2. 更新版本
sed -i 's/version = "1.0.0"/version = "1.1.0"/' metadata.lua

# 3. 发布
git add .
git commit -m "v1.1.0: Add new hook functionality"
git tag -a v1.1.0 -m "Add new hook functionality"
git push origin v1.1.0
```
