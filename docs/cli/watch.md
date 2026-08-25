<!-- 由 usage-cli 根据用法规范生成 -->
# `mise watch`

- **用法：** `mise watch [FLAGS] [TASK] [ARGS]…`
- **别名：** `w`
- **源代码：** [`src/cli/watch.rs`](https://github.com/jdx/mise/blob/main/src/cli/watch.rs)

运行任务并监视更改以重新运行它

此命令使用 `watchexec` 工具来监视文件更改并重新运行指定的任务。
要使此命令生效，必须安装它；你可以使用 `mise use -g watchexec@latest` 来安装。

如需更高级的进程管理（守护进程管理、自动重启、就绪检查、
cron 调度），请参阅 mise 的姊妹项目：https://pitchfork.jdx.dev

## 参数
- **`[TASK]`** — 要运行的任务
  可以使用 `:::` 分隔来指定多个任务
  例如：`mise run task1 arg1 arg2 ::: task2 arg1 arg2`
  默认为 `default`
- **`[ARGS]…`** — 要运行的任务及参数

## 标志
- **`--skip-deps`** — 仅运行指定的任务，跳过所有依赖项
- **`-o --on-busy-update <MODE>`** — 命令运行时收到事件应执行的操作

  默认值为 'do-nothing'，即命令运行时忽略事件，因此由命令产生的更改（如编译输出）会被忽略。你也可以使用 'queue'，在命令运行期间发生任何事件时，等当前运行结束后再次运行命令；或者使用 'restart'，终止正在运行的命令并启动新命令。最后，还有 'signal'，它只发送信号；对于可以在不完全重启的情况下重新加载配置的程序，这可能很有用。

  可以使用 '--signal' 选项指定信号。

  **选项：** `queue`、`do-nothing`、`restart`、`signal`

  **默认值：** `do-nothing`
- **`-r --restart`** — 如果进程仍在运行，则重启进程

  这是 '--on-busy-update=restart' 的简写。
- **`-s --signal <SIGNAL>`** — 如果进程仍在运行，则向其发送信号

  指定在进程仍在运行时要发送的信号。这会隐式启用 '--on-busy-update=signal'；否则，当该模式为 'restart' 时所使用的信号由 '--stop-signal' 控制。

  有关语法，请参阅 '--stop-signal' 的详细文档。

  Windows 目前不支持信号，并且始终会将其覆盖为 'kill'。有关 Windows“信号”的更多信息，请参阅 '--stop-signal'。
- **`--stop-signal <SIGNAL>`** — 发送以停止命令的信号

  此选项由 '--on-busy-update' 的 'restart' 和 'signal' 模式使用（除非提供了 '--signal'）。重启行为是发送信号，等待命令退出；如果经过一段时间后命令仍未退出（参见 '--timeout-stop'），则强制终止它。

  unix 上的默认值为 "SIGTERM"。

  输入会解析为完整的信号名称（如 "SIGTERM"）、简短的信号名称（如 "TERM"）或信号编号（如 "15"）。所有输入均不区分大小写。

  在 Windows 上，此选项在技术上受支持，但只支持 "KILL" 事件，因为 Watchexec 目前还无法传递其他事件。Windows 没有严格意义上的信号；它有终止（此处称为 "KILL" 或 "STOP"）以及 "CTRL+C"、"CTRL+BREAK" 和 "CTRL+CLOSE" 事件。为实现可移植性，unix 信号 "SIGKILL"、"SIGINT"、"SIGTERM" 和 "SIGHUP" 分别映射到这些事件。
- **`--stop-timeout <TIMEOUT>`** — 等待命令正常退出的时间

  此选项由 '--on-busy-update' 的 'restart' 模式使用。发送正常停止信号后，Watchexec 将等待命令退出。如果命令在这段时间后仍未退出，则会被强制终止。

  接受不带单位的秒数值，或类似 "5min 20s" 的时间跨度值。不带单位的值已弃用，并会发出警告；未来将改为错误。

  默认值为 10 秒。设置为 0 可立即强制终止命令。

  此选项在 Windows 上没有实际效果，因为命令始终会被强制终止；具体原因请参阅 '--stop-signal'。

  **默认值：** `10s`
- **`--map-signal <SIGNAL:SIGNAL>`** — 将来自操作系统的信号转换为要发送给命令的信号

  接受一对以冒号分隔的信号名称，例如 "TERM:INT" 会将 SIGTERM 映射为 SIGINT。第一个信号是 watchexec 收到的信号，第二个信号是发送给命令的信号。可以省略第二个信号以丢弃第一个信号，例如 "TERM:" 表示对 SIGTERM 不执行任何操作。

  此选项可以多次指定，以映射多个信号。

  对于简短名称（如 "TERM"、"USR2"）和完整名称（如 "SIGKILL"、"SIGHUP"），信号语法均不区分大小写。也支持信号编号（如 "15"、"31"）。在 Windows 上，接收信号时还支持 "STOP"、"CTRL+C" 和 "CTRL+BREAK" 形式，但 Watchexec 目前无法传递除 STOP 以外的其他“信号”。
- **`-d --debounce <TIMEOUT>`** — 在采取操作前等待新事件的时间

  收到事件后，Watchexec 最多会等待这段时间，然后再处理事件（例如运行命令）。这是必需的，因为你认为的单次更改实际上可能会产生许多事件；如果没有此行为，Watchexec 的运行频率会过高。此外，文件写入并不总是原子的，每次写入都可能产生一个事件，因此这也是避免在文件部分写入时运行命令的好方法。

  另一种用途是设置较高的值（如 "30min" 或更长），以便为高强度任务（如临时备份脚本）节省电量或带宽。在这些使用场景中，请注意每个累积的事件都会占用内存。

  接受以毫秒为单位的不带单位的值，或类似 "5sec 20ms" 的时间跨度值。不带单位的值已弃用，并会发出警告；未来将改为错误。

  默认值为 50 毫秒。强烈不建议设置为 0。

  **默认值：** `50ms`
- **`--stdin-quit`** — 标准输入关闭时退出

  此选项会监视标准输入文件描述符的 EOF，并在其关闭时让 Watchexec 正常退出。一些进程管理器会使用此选项来避免遗留僵尸进程。
- **`-p --postpone`** — 等待首次更改后再运行命令

  默认情况下，Watchexec 会立即运行命令一次。使用此选项后，它会改为等待检测到事件，然后像往常一样运行命令。
- **`--delay-run <DURATION>`** — 运行命令前休眠

  检测到事件后，此选项会使 Watchexec 在运行命令前休眠指定的时间。这类似于在 shell 中使用 "sleep 5 && command"，但具有可移植性且效率略高。

  接受以秒为单位的不带单位的值，或类似 "2min 5s" 的时间跨度值。不带单位的值已弃用，并会发出警告；未来将改为错误。
- **`--poll [INTERVAL]`** — 轮询文件系统更改

  默认情况下，在可用时，Watchexec 会使用操作系统原生的文件系统监视功能。此选项会禁用该功能，改用轮询机制。轮询效率较低，但可以规避某些文件系统（如网络共享）的问题或处理边缘情况。

  可选接受以毫秒为单位的不带单位的值，或类似 "2s 500ms" 的时间跨度值，作为轮询间隔。如果未指定，默认值为 30 秒。不带单位的值已弃用，并会发出警告；未来将改为错误。

  别名为 '--force-poll'。
- **`--project-origin <DIRECTORY>`** — 设置项目起点

  Watchexec 会通过搜索各种标记（如文件或目录模式）来尝试发现项目的“起点”（或“根目录”）。它会尽力完成此操作，但有时可能判断错误，你可以使用此选项覆盖结果。

  项目起点用于确定某些忽略文件的路径、正在使用的 VCS、过滤模式中开头的 '/' 的含义，以及未来可能增加的其他内容。

  设置后，Watchexec 也不会再执行搜索，从而可以显著加快速度。
- **`--workdir <DIRECTORY>`** — 设置工作目录

  默认情况下，命令的工作目录就是 Watchexec 的工作目录。你可以使用此选项更改它。请注意，路径的使用可能会变得不那么直观。
- **`-h --help`** — 打印帮助

## 过滤
- **`-w --watch <PATH>`** — 监视指定的文件或目录

  默认情况下，Watchexec 会监视当前目录。

  监视单个文件时，通常最好改为监视其所在目录，然后根据文件名进行过滤。一些编辑器保存时可能会用新文件替换原文件，而某些平台可能无法检测到这一点或检测到后续更改。

  启动时，Watchexec 会根据被监视的路径解析“项目起点”。更多信息请参阅 '--project-origin' 的帮助。

  此选项可以多次指定，以监视多个文件或目录。

  特殊值 '/dev/null' 如果作为唯一被监视的路径提供，会使 Watchexec 不监视任何路径。其他事件源（如信号或按键事件）仍可能使用。
- **`-W --watch-non-recursive <PATH>`** — 以非递归方式监视指定目录

  与 '-w' 不同，使用此选项监视的文件夹不会递归进入其子目录。

  此选项可以多次指定，以非递归方式监视多个目录。
- **`-F --watch-file <PATH>`** — 从文件中读取要监视的文件和目录

  文件中的每一行都会被解释为像使用 '-w' 传入的内容。

  对于更复杂的用途（如非递归监视），请使用参数文件功能：创建一个包含命令行选项的文件，然后通过 `@path/to/argfile` 将其传递给 watchexec。

  特殊值 '-' 会从 STDIN 读取；这与 '--stdin-quit' 不兼容。
- **`--no-vcs-ignore`** — 不加载 gitignore

  以及其他 VCS 排除文件，例如 Mercurial、Subversion、Bazaar、DARCS、Fossil 的排除文件。请注意，Watchexec 会检测正在使用的 VCS（如果有），并且只加载相关文件。全局文件（如 '~/.gitignore'）和本地文件（如 '.gitignore'）都会被考虑。
  
  如果你想监视被 Git 忽略的文件，此选项很有用。
- **`--no-project-ignore`** — 不加载项目本地忽略文件

  此选项会禁用加载被监视项目中的项目本地忽略文件，例如 '.gitignore' 或 '.ignore'。这与 '--no-vcs-ignore' 不同，后者会禁用加载 Git 和其他 VCS 忽略文件；它也与 '--no-global-ignore' 不同，后者会禁用加载全局或用户忽略文件，例如 '~/.gitignore' 或 '~/.config/watchexec/ignore'。

  支持的项目忽略文件：

    - Git：项目根目录及子目录中的 .gitignore、.git/info/exclude，以及 .git/config 中 `core.excludesFile` 指向的文件。
    - Mercurial：项目根目录及子目录中的 .hgignore。
    - Bazaar：项目根目录中的 .bzrignore。
    - Darcs：_darcs/prefs/boring
    - Fossil：.fossil-settings/ignore-glob
    - Ripgrep/Watchexec/通用：项目根目录及子目录中的 .ignore。

  只有在发现相应 VCS 正用于该项目／起点时，才会使用 VCS 忽略文件（Git、Mercurial、Bazaar、Darcs、Fossil）。例如，Git 仓库中的 .bzrignore 会被丢弃。
- **`--no-global-ignore`** — 不加载全局忽略文件

  此选项会禁用加载全局或用户忽略文件，例如 '~/.gitignore'、'~/.config/watchexec/ignore' 或 '%APPDATA%\Bazaar\2.0\ignore'。请与 '--no-vcs-ignore' 和 '--no-project-ignore' 区分开。

  支持的全局忽略文件

    - Git（如果设置了 core.excludesFile）：该路径指向的文件
    - Git（否则）：以下路径中第一个找到的文件：$XDG_CONFIG_HOME/git/ignore、%APPDATA%/.gitignore、%USERPROFILE%/.gitignore、$HOME/.config/git/ignore、$HOME/.gitignore。
    - Bazaar：以下路径中第一个找到的文件：%APPDATA%/Bazaar/2.0/ignore、$HOME/.bazaar/ignore。
    - Watchexec：以下路径中第一个找到的文件：$XDG_CONFIG_HOME/watchexec/ignore、%APPDATA%/watchexec/ignore、%USERPROFILE%/.watchexec/ignore、$HOME/.watchexec/ignore。

  与项目文件一样，只有在项目中使用了相应 VCS 时，才会使用 Git 和 Bazaar 全局文件。
- **`--no-default-ignore`** — 不使用内部默认忽略规则

  Watchexec 有一组默认忽略模式，例如编辑器交换文件、`*.pyc`、`*.pyo`、`.DS_Store`、`.bzr`、`_darcs`、`.fossil-settings`、`.git`、`.hg`、`.pijul`、`.svn` 以及 Watchexec 日志文件。
- **`--no-discover-ignore`** — 完全不发现忽略文件

  这是 '--no-global-ignore'、'--no-vcs-ignore'、'--no-project-ignore' 的简写，但效率更高，因为它会从一开始就跳过所有忽略发现机制。

  请注意，默认忽略规则仍会加载，参见 '--no-default-ignore'。
- **`--ignore-nothing`** — 完全不忽略任何内容

  这是 '--no-discover-ignore'、'--no-default-ignore' 的简写。

  请注意，通过其他命令行选项（如 '--ignore' 或 '--ignore-file'）显式加载的忽略规则仍会使用。
- **`-e --exts <EXTENSIONS>`** — 要过滤的文件扩展名

  这是一个快速过滤器，仅为具有指定扩展名的文件发出事件。扩展名可以带前导点，也可以不带（例如 'js' 或 '.js'）。可以重复此选项或使用逗号分隔来指定多个扩展名。
- **`-f --filter <PATTERN>`** — 要过滤的文件名模式

  提供类似 glob 的过滤模式，仅发出与该模式匹配的文件事件。可以重复此选项来指定多个模式。不是来自文件的事件（例如信号、键盘事件）会原样通过。
- **`--filter-file <PATH>`** — 要从中加载过滤器的文件

  提供一个包含过滤器的文件路径，每行一个。空行以及以 '#' 开头的行会被忽略。使用与 '--filter' 选项相同的模式格式。

  也可以通过 $WATCHEXEC_FILTER_FILES 环境变量使用此功能。

  **环境变量：** `WATCHEXEC_FILTER_FILES`
- **`-J --filter-prog <EXPRESSION>`** — [实验性] 过滤程序。

  /!\ 此选项为实验性功能，可能会在不另行通知的情况下发生变化或消失。

  使用 jaq（类似于 jq）语法提供自定义过滤程序。程序会接收一个事件，格式与 '--emit-events-to' 中所述的格式相同，并且必须返回布尔值。无效程序会导致 watchexec 启动失败；使用 '-v' 查看程序运行时错误。

  除 jaq 标准库外，watchexec 还添加了一些自定义过滤器定义：

    - 'path | file_meta' 返回文件元数据；如果文件不存在，则返回 null。

    - 'path | file_size' 返回路径中文件的大小；如果文件不存在，则返回 null。

    - 'path | file_read(bytes)' 返回路径中文件的前 n 个字节。
  ```
  如果文件小于 n 个字节，则返回整个文件。没有一次读取整个文件的过滤器，这是为了鼓励限制读取和处理的数据量。
  ```

    - 'string | hash' 和 'path | file_hash' 返回字符串或路径中文件的哈希值。
  ```
  不保证所使用的算法：请将其视为不透明值。
  ```

    - 'any | kv_store(key)'、'kv_fetch(key)' 和 'kv_clear' 提供简单的键值存储。
  ```
  数据仅保存在内存中，不会持久化。不保证一致性。
  ```

    - 'any | printout'、'any | printerr' 和 'any | log(level)' 会打印或记录给定的任意
  ```
  值到 stdout、stderr 或日志（级别 = error、warn、info、debug、trace），并
  传递该值（因此 '[1] | log("debug") | .[]' 会产生 '1'，并记录 '[1]'）。
  ```

  使用此类程序完成的所有过滤，尤其是使用 kv 或文件系统访问的过滤，都比其他过滤方法慢得多。如果过滤速度太慢，事件会堆积并使 watchexec 停滞。设计过滤器时请务必谨慎。

  如果此选项的参数以 '@' 开头，则参数的其余部分会被视为包含 jaq 程序的文件路径。

  Jaq 程序会在所有其他过滤器之后按顺序运行，并且采用短路逻辑：如果某个过滤器（jaq 或其他类型）拒绝某个事件，则执行会在此处停止，不再运行其他过滤器。此外，它们会在输出第一个值后停止，因此在迭代时应使用 'any' 或 'all'，否则只会处理第一项，这可能会造成相当大的困惑！

  你可以在 &lt;https://github.com/watchexec/watchexec/discussions/592> 查找用户贡献的程序，或提交你自己的实用程序。

  ## 示例：

  对路径使用正则表达式忽略过滤器：

    'all(.tags[] | select(.kind == "path"); .absolute | test("[.]test[.]js$")) | not'

  传递创建文件的任意事件：

    'any(.tags[] | select(.kind == "fs"); .simple == "create")'

  传递涉及可执行文件的事件：

    'any(.tags[] | select(.kind == "path" && .filetype == "file"); .absolute | metadata | .executable)'

  忽略以 shebang 开头的文件：

    'any(.tags[] | select(.kind == "path" && .filetype == "file"); .absolute | read(2) == "#!") | not'
- **`-i --ignore <PATTERN>`** — 要过滤掉的文件名模式

  提供类似 glob 的过滤模式，与该模式匹配的文件事件将被排除。可以重复此选项来指定多个模式。不是来自文件的事件（例如信号、键盘事件）会原样通过。
- **`--ignore-file <PATH>`** — 要从中加载忽略规则的文件

  提供一个包含忽略规则的文件路径，每行一个。空行以及以 '#' 开头的行会被忽略。使用与 '--ignore' 选项相同的模式格式。

  也可以通过 $WATCHEXEC_IGNORE_FILES 环境变量使用此功能。

  **环境变量：** `WATCHEXEC_IGNORE_FILES`
- **`--fs-events <EVENTS>`** — 要过滤的文件系统事件

  这是一个快速过滤器，仅发出指定类型的文件系统更改事件。可选类型包括 'access'、'create'、'remove'、'rename'、'modify'、'metadata'。可以重复此选项或使用逗号分隔来指定多个类型。默认情况下，包含除 'access' 之外的所有类型。

  在可能的情况下，这可能会在内核级别应用过滤，从而提高效率，但阅读日志时可能更容易造成困惑。

  **选项：** `access`、`create`、`remove`、`rename`、`modify`、`metadata`

  **默认值：** `create,remove,rename,modify,metadata`
- **`--no-meta`** — 不为元数据更改发出文件系统事件

  这是 '--fs-events create,remove,rename,modify' 的简写。与 '--fs-events' 选项同时使用没有意义，也不被允许。

## 输出
- **`-c --clear [MODE]`** — 运行命令前清除屏幕

  如果无法完全清除屏幕，请尝试 '--clear=reset'。

  **选项：** `clear`、`reset`
- **`--only-emit-events`** — 仅向 stdout 发出事件，不运行命令。

  这是将 Watchexec 用作文件监视器的便利选项，不运行任何命令。它几乎等同于使用 `cat` 作为命令，但不会为每个事件生成一个新进程。

  此选项要求设置 `--emit-events-to`，并将可用模式限制为 `stdio` 和 `json-stdio`，同时修改它们的行为，使其写入 stdout，而不是写入命令的 stdin。
- **`-N --notify`** — 在命令开始和结束时发出提醒

  启用此选项后，在支持的平台上，Watchexec 会在命令开始和结束时发出桌面通知。在不支持的平台上，它可能静默不执行任何操作，或记录警告。
- **`--color <MODE>`** — 何时使用终端颜色

  将环境变量 `NO_COLOR` 设置为任意值等同于使用 `--color=never`。

  **选项：** `auto`、`always`、`never`

  **默认值：** `auto`
- **`--timings`** — 打印命令运行所需的时间

  这可能并不完全准确，因为其中包含 Watchexec 本身的一些开销。若要获得更准确的结果，请使用 `time` 工具、高精度计时器或基准测试工具。
- **`-q --quiet`** — 不打印启动和停止消息

  默认情况下，Watchexec 会在命令启动和停止时打印消息。此选项会禁用该行为，因此只会打印命令的输出、警告和错误。
- **`--bell`** — 命令完成时响铃

## 命令
- **`--shell <SHELL>`** — 使用其他 shell

  默认情况下，在类 Unix 系统上，Watchexec 会使用已定义的 '$SHELL'，否则使用默认的 'sh'；在 Windows 上，则根据 Watchexec 检测到的运行中 shell，使用 'pwsh'、'powershell' 或 'cmd'（CMD.EXE）之一。

  使用此选项可以覆盖默认设置并使用其他 shell，例如功能更多的 shell，或包含你自定义别名和函数的 shell。

  如果值中包含空格，则会将其解析为命令行，并将第一个单词用作 shell 程序，其余部分作为 shell 参数。

  命令会使用 '-c' 标志运行（Windows 上的 'cmd' 除外，其使用 '/C'）。

  特殊值 'none' 可用于完全禁用 shell。在这种情况下，提供给 Watchexec 的命令会被解析，第一个单词作为可执行文件，其余部分作为参数，然后直接执行。请注意，此解析方式较为简单，在某些情况下可能无法按预期工作。

  使用 'none' 的效率略高，并且可以启用对输入更严格的解释，但这也意味着你无法使用 glob、重定向、控制流、逻辑或管道等 shell 功能。

  示例：

  不使用 shell：

    $ watchexec -n -- zsh -x -o shwordsplit scr

  使用 powershell core：

    $ watchexec --shell=pwsh -- Test-Connection localhost

  使用 CMD.exe：

    $ watchexec --shell=cmd -- dir

  使用其他 unix shell：

    $ watchexec --shell=bash -- 'echo $BASH_VERSION'

  使用带选项的 unix shell：

    $ watchexec --shell='zsh -x -o shwordsplit' -- scr
- **`-n`** — '--shell=none' 的简写
- **`--emit-events-to <MODE>`** — 配置事件发出方式

  Watchexec 在运行命令时可以发出事件信息，子进程可以利用这些信息来定位特定的更改文件。

  需要注意的是，不要把可能性误认为必然行为。
  尤其是，表面上看，`RENAMED` 变量似乎同时包含被重命名文件的原路径和新路径。在之前的版本中，在某些平台上甚至似乎总是原路径先于新路径。然而，这些都不是真的。无法可靠且可移植地判断哪个变更路径是旧路径或新路径；可能出现“半重命名”（只有原路径或只有新路径）、“未知重命名”（变更确实是重命名，但无法知道是旧路径还是新路径），重命名事件可能跨越两个防抖边界，等等。

  此选项控制发出这些信息的位置。默认值为 'none'，表示完全不发出事件信息。其他选项为 'environment'（已弃用）、'stdio'、'file'、'json-stdio' 和 'json-file'。

  'stdio' 和 'file' 模式基于文本：'stdio' 将绝对路径写入命令的 stdin，每行一个，每个路径前缀为 `create:`、`remove:`、`rename:`、`modify:` 或 `other:`，然后关闭该句柄；'file' 将相同内容写入临时文件，并通过 $WATCHEXEC_EVENTS_FILE 环境变量提供其路径。

  还有两种 JSON 模式，它们基于 JSON 对象，可以表示 Watchexec 处理的完整事件集合。以下是 Linux 上创建文件夹的示例：

  ```json
    {
  ```
  "tags": [
    {
      "kind": "path",
      "absolute": "/home/user/your/new-folder",
      "filetype": "dir"
    },
    {
      "kind": "fs",
      "simple": "create",
      "full": "Create(Folder)"
    },
    {
      "kind": "source",
      "source": "filesystem",
    }
  ],
  "metadata": {
    "notify-backend": "inotify"
  }
  ```
    }
  ```

  字段如下：

    - `tags`，结构化事件数据。
    - `tags[].kind`，可以是：
  ```
  * 'path'，以及：
    + `absolute`，绝对路径。
    + `filetype`，已知时的文件类型（'dir'、'file'、'symlink'、'other'）。
  * 'fs'：
    + `simple`，“简单”事件类型（'access'、'create'、'modify'、'remove' 或 'other'）。
    + `full`，“完整”事件类型，其复杂程度过高，无法在此完整描述，但形式类似 'General(Precise(Specific))'。
  * 'source'，以及：
    + `source`，事件来源（'filesystem'、'keyboard'、'mouse'、'os'、'time'、'internal'）。
  * 'keyboard'，以及：
    + `keycode`。目前仅支持值 'eof'。
  * 'process'，表示由进程导致的事件：
    + `pid`，进程 ID。
  * 'signal'，表示发送给 Watchexec 的信号：
    + `signal`，规范化的信号名称（'hangup'、'interrupt'、'quit'、'terminate'、'user1'、'user2'）。
  * 'completion'，表示命令结束：
    + `disposition`，退出处置方式（'success'、'error'、'signal'、'stop'、'exception'、'continued'）。
    + `code`，退出、信号、停止或异常代码。
  ```
    - `metadata`，有关事件的其他信息。

  'json-stdio' 模式会将 JSON 事件发送到命令的标准输入，每行一个，然后关闭 stdin。'json-file' 模式会创建一个临时文件，将事件写入其中，并通过 $WATCHEXEC_EVENTS_FILE 环境变量提供文件路径。

  最后，'environment' 模式在 2.0 之前是默认模式。对于文件系统事件，它会设置包含受影响文件路径的环境变量：

  $WATCHEXEC_COMMON_PATH 被设置为以下所有变量中最长的公共路径，因此应将其添加到每个路径前面，以获得完整／实际路径。然后：

    - 创建文件／文件夹时设置 $WATCHEXEC_CREATED_PATH
    - 删除文件／文件夹时设置 $WATCHEXEC_REMOVED_PATH
    - 重命名文件／文件夹时设置 $WATCHEXEC_RENAMED_PATH
    - 修改文件／文件夹时设置 $WATCHEXEC_WRITTEN_PATH
    - 修改文件／文件夹元数据时设置 $WATCHEXEC_META_CHANGED_PATH
    - 对于其他所有类型的带路径事件设置 $WATCHEXEC_OTHERWISE_CHANGED_PATH

  多个路径使用系统路径分隔符分隔；Windows 上为 ';'，unix 上为 ':'。
  在每个变量中，路径会去重并按二进制顺序排序（即不考虑 Unicode 或区域设置）。

  这是旧版模式，已弃用，并将在未来移除。环境变量空间非常有限，同时能够有效表示的信息也很有限。大量文件可能导致环境变量被截断，也可能使进程报错或完全崩溃。$WATCHEXEC_COMMON_PATH 也不直观，多年来收件箱中出现的多次困惑咨询就证明了这一点。

  **选项：** `environment`、`stdio`、`file`、`json-stdio`、`json-file`、`none`

  **默认值：** `none`
- **`-E --env <KEY=VALUE>`** — 向命令添加环境变量

  这是一个用于为命令设置环境变量的便利选项，不会为 Watchexec 进程本身设置这些变量。

  使用 key=value 语法。可以重复此选项来设置多个变量。
- **`--wrap-process <MODE>`** — 配置进程的包装方式

  默认情况下，Watchexec 会在 macOS 上的会话中运行命令，在其他 Unix 平台上将命令置于进程组中，并在 Windows 上将命令置于 Job Object 中。

  一些 Unix 程序更适合在会话中运行，而另一些程序无法在进程组中运行。

  使用 'group' 表示使用进程组，使用 'session' 表示使用进程会话，使用 'none' 表示直接运行命令。在 Windows 上，'group' 或 'session' 都会使用 Job Object。

  **选项：** `group`、`session`、`none`

## 调试
- **`--print-events`** — 打印触发操作的事件

  处理事件时（防抖后），此选项会以人类可读的形式打印触发操作的事件。这对于调试过滤器很有用。

  需要更多诊断信息时，请改用 '-vvv'。
- **`--manual`** — 显示手册页

  如果输出目标是终端且 'man' 程序可用，则显示 Watchexec 的手册页。否则，以 ROFF 格式将手册页打印到 stdout（适合写入 watchexec.1 文件）。

示例：

```
$ mise watch build
运行 "build" 任务。只要其任一源发生变化，就会重新运行这些任务。
使用任务定义中的 "sources" 来确定要监视哪些文件。

$ mise watch build --glob src/**/*.rs
运行 "build" 任务，但使用 glob 模式指定要监视的文件。
这会覆盖任务定义中的 "sources"。

$ mise watch build --clear
额外参数会传递给 watchexec。详情请参见 `watchexec --help`。

$ mise watch serve --watch src --exts rs --restart
启动一个 API 服务器，监视 "./src" 中 "*.rs" 文件的变化，并在它们变化时终止／重启服务器。
```
