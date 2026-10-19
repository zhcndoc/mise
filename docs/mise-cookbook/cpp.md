---
description: "通过 mise 安装 CMake，并为 C++ 项目定义配置、构建和清理任务。"
---

# C++ 与 CMake

为 C++ 项目固定 CMake 版本，并将 configure、build 和 clean 步骤设为任务。系统中必须已安装 C 或 C++ 编译器，例如通过操作系统的开发工具安装；安装 CMake 不会同时安装编译器。

## 构建 CMake 项目 {#a-c-project-with-cmake}

这些任务使用 CMake 的构建接口，因此可与 Make、Ninja 等任意生成器配合使用：

```toml [mise.toml]
[tools]
cmake = "4"

[tasks.configure]
description = "Configure the CMake build"
run = "cmake -S . -B build"

[tasks.build]
description = "构建项目"
alias = "b"
depends = ["configure"]
run = "cmake --build build"

[tasks.clean]
description = "Clean compiled targets and keep the CMake configuration"
alias = "c"
run = "cmake --build build --target clean"
```

要运行此示例，请在 `mise.toml` 旁添加 `CMakeLists.txt` 和一个源文件。`cmake_minimum_required` 指定项目支持的最低 CMake 版本；`[tools]` 中的条目则选择实际用于构建的版本：

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

运行 `mise run build`，然后执行 `./build/hello`。build 任务会在编译前配置 `build` 目录。请将 `build/` 加入 `.gitignore`。

使用 Unix Makefiles 这类单配置生成器时，程序位于 `build/hello`。Visual Studio 或 Ninja Multi-Config 这类多配置生成器会将程序放在配置对应的子目录中；可运行 `mise run build -- --config Debug` 构建一个配置，再到该生成器的输出路径中查找。

首次构建后，`mise run clean` 会调用生成器的 clean target 删除编译产物，同时保留构建配置。有关生成器选择和构建选项，请参阅 [CMake 命令行参考](https://cmake.org/cmake/help/latest/manual/cmake.1.html)。
