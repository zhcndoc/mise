---
description: "使用 mise 安装构建工具并定义配置和构建周期。"
---

# C++ Cookbook

使用 mise 安装构建工具并定义配置和构建周期。C 或 C++ 编译器必须已经可用，例如通过操作系统的开发工具提供。安装 CMake 不会安装编译器。

## 一个使用 CMake 的 C++ 项目

此配方要求项目根目录中存在 `CMakeLists.txt`。它使用 CMake 的构建接口，因此任务不依赖于特定的 Make 或 Ninja 生成器：

```toml [mise.toml]
[tools]
cmake = "latest"

[tasks.configure]
description = "Configure the CMake build"
run = 'cmake -S . -B build'

[tasks.build]
description = "构建项目"
alias = "b"
depends = ["configure"]
run = 'cmake --build build'

[tasks.clean]
description = "Clean compiled targets while keeping CMake configuration"
alias = "c"
run = 'cmake --build build --target clean'
```

在项目中运行 `mise run build`。它会在编译前配置构建目录。首次构建后，`mise run clean` 会使用所选生成器的 clean 目标移除已编译的目标，同时保留构建配置。

要运行示例，请创建以下两个文件：

```cmake [CMakeLists.txt]
cmake_minimum_required(VERSION 3.20)
project(hello LANGUAGES CXX)
add_executable(hello main.cpp)
```

```cpp [main.cpp]
#include <iostream>

int main() {
    std::cout << "Hello from CMake\n";
}
```

对于 Unix Makefiles 这样的单配置生成器，生成的程序在 Unix 上位于 `build/hello`。多配置生成器可能会将其放在配置子目录中；使用 `mise run build -- --config Debug` 构建特定配置，并使用该生成器的输出路径。

将 `build/` 添加到 `.gitignore`。有关生成器选择和构建选项，请参阅 [CMake 的命令行参考](https://cmake.org/cmake/help/latest/manual/cmake.1.html)。
