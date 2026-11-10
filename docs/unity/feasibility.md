# 开发可行性分析：三个独立的问题

用 IL2CPP + HybridCLR 的游戏做 MOD，最大的认知障碍不是“难不难”，而是把三件互不相干的事混成一件：**资源在哪、代码在哪、怎么进去。**

把这三层拆开后，每一层的可行性、工具和风险都会变得清楚。本页是这种拆法的结论汇总。

> 本页面向“自己的测试环境与明确允许修改的软件”。它不提供游戏文件的获取方式，也不保证任何版本可用。账号风险见[使用声明](unity/safety.md)。

## 先看结论

| 问题 | 判断 |
|---|---|
| 解包后只有静态美术、没有音频和视频，是解包失败吗？ | 通常不是。游戏可能使用 Wwise 音频和 CRIWARE 视频中间件，需要用对应的工具链，而不是 Unity 的 `AudioClip` / `VideoClip` |
| 热更新 DLL 里只有客户端 UI 和资源加载代码，正常吗？ | 正常。核心规则可能在别的热更新程序集、AOT 代码或服务端 |
| 能 Hook HybridCLR 热更新代码吗？ | **能。** 但必须在目标程序集加载之后，用兼容的运行时访问与 Hook 机制 |
| BepInEx 6 能用于这类游戏吗？ | 已有针对这类游戏的兼容修复，但**不能把官方发行版当作即装即用** |
| 要不要从零实现一套技术栈？ | 不需要。运行时反射、Hook 引擎和 NuGet 包都有公开实现 |
| 有没有成熟的一键 SDK？ | 尚未发现能覆盖所有游戏版本的一站式方案，仍要自己完成依赖整合与验证 |

一句话：**可行性不是问题，定位“功能在哪一层”才是问题。**

## 一、资源层：为什么解包工具只给出静态素材

### 资源通常不在一个地方

<figure class="doc-figure">
  <img src="assets/images/addressables-folders.png" alt="Addressables 资源目录" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：Addressables 资源目录">
    <span class="doc-figure-tag">图片占位</span>
    <strong>Addressables 资源目录</strong>
    <span class="doc-figure-note">说明：安装目录下的 <code>StreamingAssets/aa/&lt;平台&gt;/</code> 与用户缓存中的 <code>com.unity.addressables/AssetBundles/</code> 对照图。</span>
    <span class="doc-figure-hint">后续替换为本地目录截图（注意遮挡个人信息）</span>
  </div>
  <figcaption>图 1 · 建议配图：两处 Bundle 目录的对照。</figcaption>
</figure>

Unity 的 Addressables 会把资源分散到两处：安装目录下的 `StreamingAssets/aa/<平台>/`，以及用户目录下的下载缓存（例如 Windows 上的 `%USERPROFILE%\AppData\LocalLow\<公司>\<产品>\com.unity.addressables\AssetBundles\`）。

第二个位置最容易被漏掉——只解包安装目录，就会得到“角色素材缺失”的错觉。另外，Bundle 常以哈希命名，**资源名与文件的对应关系记录在 catalog 里**；哈希文件名不代表资源损坏或丢失。

### 音频：先怀疑 Wwise，而不是 Unity 音频组件

如果解包结果里几乎看不到 `AudioClip`，但游戏里音乐音效齐全，那么音频很可能是 Wwise 资源：

| 格式 | 作用 |
|---|---|
| `.wem` | Wwise 编码后的音频数据 |
| `.bnk` | SoundBank，可能同时包含事件信息与音频数据 |
| `.pck` | 可能的 Wwise 音频包 |

Wwise 数据即使被正确解析，也不等于会被自动导出成 WAV 或 OGG——中间还差一次解码。可以用 [vgmstream](https://github.com/vgmstream/vgmstream) 处理其中一部分格式。

### 视频：先怀疑 CRIWARE / USM

技能演出这类视频，常见做法不是 Unity `VideoClip`，而是 CRI 中间件播放 `.usm` 文件，通过播放器组件按 key 加载。这类资源在解包工具里通常表现为不透明的大块数据。

判断依据可以看代码里是否出现 CRI 相关的管理器与 `SetFile` 一类的加载接口，以及资源名是否成组（例如按技能前缀命名）。

### 为什么人物动画导出后只是 PNG

因为屏幕上看到的“动画”往往不是一段视频，而是 **贴图 + 关键帧 + 骨骼变换 + Shader** 在运行时合成出来的。AssetRipper 导出的是贴图本身，它不会替你把动画重新执行一遍再录成 GIF。

所以“导出的立绘是静态图”通常不代表解包方法错了，而是导出目标选错了。

### 工具分工

| 工具 | 更适合的任务 |
|---|---|
| [AssetRipper](https://github.com/AssetRipper/AssetRipper) | 还原贴图、Prefab、动画与工程结构 |
| [AssetStudio](https://github.com/aelurum/AssetStudio) | 快速枚举资源类型、预览与批量导出 |
| [UABEA](https://github.com/nesrak1/UABEA) | 检查、编辑和替换 Bundle 内的序列化资源 |
| [vgmstream](https://github.com/vgmstream/vgmstream) | 解码部分 Wwise 音频格式 |
| CRI 相关解码工具 | 处理 USM 视频 |

对特定游戏，更高效的顺序通常是：先用社区已有的资源工具建立完整索引，再用 AssetRipper 看具体资源的引用关系，而不是反复整包导出。

## 二、代码层：热更新代码、AOT 代码、服务端

### IL2CPP 和 HybridCLR 不是同一层机制

- **IL2CPP**：把托管 IL 提前编译成 C++，最终成为原生机器码。它提高了反编译难度，但它本身不是混淆器。
- **HybridCLR**：扩展 IL2CPP 运行时，让它能在运行中加载并解释执行新的托管程序集，从而实现 C# 热更新。

两者叠在一起的结果是：**同一款游戏里，一部分方法有原生代码，一部分方法是解释执行的。** 这直接决定了 Hook 方式，也是所有“为什么我这个 Hook 没反应”问题的根源。

### 游戏逻辑可能分布在三个地方

| 位置 | 可能包含 | 适合做什么 MOD |
|---|---|---|
| HybridCLR 热更新程序集 | UI、角色表现、资源加载、客户端状态 | 界面增强、演出控制、客户端交互 |
| IL2CPP AOT 原生代码 | 客户端框架、初始化、网络层、未热更模块 | 更底层的客户端扩展 |
| 远程服务器 | 权威状态、规则判定、多人同步与结算 | 普通客户端 MOD 无法直接修改 |

### 客户端有逻辑，不等于客户端有决定权

这是网络派对类游戏最需要注意的一点。你可以 Hook 一个“展示骰子结果”的方法，但如果结果由服务器下发，改展示层并不会改变服务器记录的结果——只会让本地显示和别人不一致。

判断方法很朴素：**改动之后，另一个客户端看到的结果变了吗？** 如果没变，那你改的是表现层。

### 定位逻辑的两种手段

**静态分析：** 用 ILSpy / dnSpyEx 看热更新 DLL；用 Cpp2IL 或 Il2CppDumper 看 AOT 元数据与方法结构。搜索词从领域概念入手通常比从类型名入手有效：`Battle`、`Turn`、`Room`、`Card`、`Skill`、`State`、`Network`、`Message`。

**运行时分析：** 进不同场景时记录新加载的程序集；确认目标类型是否出现在当前 domain；对有明确客户端用途的方法先做**只读日志 Hook**；再根据调用时机判断它属于渲染、事件响应还是本地状态。

## 三、注入层：真正的难点

前两层是“看得到”的问题，第三层是“进得去”的问题，也是最花时间的部分。

一个常见的误解是：既然有热更新 DLL，把它反编译出来的工程加进自己的解决方案，然后 `Harmony.Patch()` 就能改游戏。这在 HybridCLR 下不成立——**游戏里的方法不在你的 `AssemblyLoadContext` 里**，你引用的只是同名类型的另一份副本。

| 开发方式 | 需要预生成热更新程序集的 Interop 包装吗 | 适合阶段 |
|---|---|---|
| `IL2CppSharp` 原生反射 | 通常不需要 | 探索类型、调用方法 |
| `IL2CppSharp.Hooking` + `MethodInfo` | 通常不需要逐方法包装 | 验证 Hook |
| `Il2CppInterop` 生成包装 + Harmony | 视目标程序集而定，通常需要 | 强类型、长期维护 |
| 直接编辑热更新 DLL | 不需要，但这是改代码而非运行时 Hook | 快速验证某个行为 |

早期建议先用反射路线把“找得到、调得动”跑通，再考虑生成包装。因为生成器依赖、程序集签名、类型缺失这些问题会同时出现，很难和业务问题区分开。

## 四、建议的推进顺序

| 阶段 | 目标 | 完成标志 |
|---|---|---|
| A · 资源 | 用社区工具定位并替换一项贴图 / 音频 / 视频 | 游戏里能看到自己的资源，且能还原 |
| B · 运行环境 | 让兼容 HybridCLR 的 BepInEx 6 稳定启动 | 空插件能写出日志 |
| C · 热更新反射 | 找到并调用一个安全的客户端方法 | 例如弹出游戏自带的提示框 |
| D · 方法 Hook | 对单个低频解释器方法记录日志 | Hook 装上、能卸载、不闪退 |
| E · 功能型 MOD | 做界面增强、回放控制、本地音频等功能 | 可配置、可共存、可回滚 |

A 和 B 可以并行，但**不要在 B 稳定之前同时改资源和代码**。否则一次崩溃里有两类变量，排查成本会翻倍。

## 五、几条容易走偏的判断

- **“AssetRipper 没导出音频，所以解包失败”** —— 先确认游戏是否使用 Wwise 或 CRI。
- **“热更新 DLL 里没找到规则，所以逻辑在服务端”** —— 也可能在 AOT 程序集里，或在另一个热更新程序集里。
- **“装了 BepInEx 就崩溃，所以这个游戏不能做 MOD”** —— 先看崩溃堆栈是不是落在 interop 元数据层，那是宿主兼容性问题，不是可行性问题。
- **“改 DLL 更快，所以框架没必要”** —— 单次验证确实更快；但要做可配置、可共存、能跟着版本更新走的功能，框架的长期成本更低。

下一步：看[开发完整指南](unity/full-guide.md)把阶段 B 到 D 走一遍，或者先读[为什么官方版还不支持 HybridCLR](unity/hybridclr-support.md) 理解崩溃原因。
