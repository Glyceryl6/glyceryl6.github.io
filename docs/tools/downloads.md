# 工具与下载

按“你卡在哪一步”来选工具，比按名字收集工具更有用。本页只收录**公开仓库或官方站点**，所有链接均指向项目主页，不提供二次打包的整合包。

> 下载任何工具前先确认来源。第三方“整合版”“汉化版”可能夹带旧版 DLL，而在这个技术栈里，同名 DLL 版本不一致本身就是一类典型故障。

## 一、框架与运行时

| 项目 | 用途 | 链接 |
|---|---|---|
| BepInEx 6 Bleeding Edge | IL2CPP 插件宿主（`Unity.IL2CPP-win-x64`） | [builds.bepinex.dev](https://builds.bepinex.dev/projects/bepinex_be) |
| BepInEx 文档 | 安装、配置、插件开发 | [docs.bepinex.dev](https://docs.bepinex.dev/) |
| BepInEx.Templates | `dotnet new` 项目模板 | [BepInEx.Templates](https://github.com/BepInEx/BepInEx.Templates) |
| Il2CppInterop（上游） | 生成代理程序集、运行时桥接 | [BepInEx/Il2CppInterop](https://github.com/BepInEx/Il2CppInterop) |
| Il2CppInterop（HybridCLR 分支） | 带兼容修复的运行时与生成器 | [SNWCreations/Il2CppInterop](https://github.com/SNWCreations/Il2CppInterop) |
| HybridCLR 兼容性 PR | 了解修复范围与限制 | [PR #251](https://github.com/BepInEx/Il2CppInterop/pull/251) |

**注意：** BepInEx 5 只支持 Unity Mono，不适用于 IL2CPP 游戏。看到一个教程让你往 IL2CPP 游戏里放 BepInEx 5，可以直接跳过。

## 二、运行时访问与 Hook

| 包 / 项目 | 用途 | 当前版本 |
|---|---|---|
| [IL2CppSharp](https://github.com/SNWCreations/IL2CppSharp) | 按类名/方法名查找、调用，不依赖预生成包装 | `0.1.0-alpha.5` |
| [IL2CppSharp.Hooking](https://github.com/SNWCreations/IL2CppSharp.Hooking) | 原生方法与解释器方法的 Hook 引擎 | `0.1.2-alpha.1` |
| [IL2CppSharp.Hooking.BepInEx](https://github.com/SNWCreations/IL2CppSharp.Hooking.BepInEx) | 与 BepInEx 日志系统对接 | `0.1.2-alpha.1` |
| [SNWCreations.Il2CppInterop.Runtime](https://www.nuget.org/packages/SNWCreations.Il2CppInterop.Runtime) | HybridCLR 兼容运行时（NuGet） | `1.5.2-snw.4` |
| [SNWCreations.Il2CppInterop.Common](https://www.nuget.org/packages/SNWCreations.Il2CppInterop.Common) | 运行时的配套程序集 | `1.5.2-snw.4` |
| [Harmony](https://github.com/pardeike/Harmony) | 常规方法补丁（AOT 方法需匹配原生签名） | 以 BepInEx 实际携带版本为准 |

包名与程序集名不是一回事：`SNWCreations.Il2CppInterop.*` 是 package-id fork，程序集名与命名空间仍是 `Il2CppInterop.*`。混装两份会导致运行时类型身份冲突。

所有包版本信息可在 [SNWCreations 的 NuGet 主页](https://www.nuget.org/profiles/SNWCreations)核对。上表是 2026 年年中的检索结果，属于预发行版本，升级前请重新确认。

## 三、反编译与元数据分析

| 工具 | 用途 | 备注 |
|---|---|---|
| [dnSpyEx](https://github.com/dnSpyEx/dnSpy) | 查看 / 编辑托管 DLL 的 C# 与 IL | 路线 B 的核心工具 |
| [ILSpy](https://github.com/icsharpcode/ILSpy) | 只读反编译，浏览结构更顺手 | 不想改动时优先用它 |
| [Cpp2IL](https://github.com/SamboyCoding/Cpp2IL) | 从 IL2CPP 二进制还原程序集与元数据 | Il2CppInterop 的输入来源 |
| [Il2CppDumper](https://github.com/Perfare/Il2CppDumper) | 导出 `dump.cs`、结构体与函数地址 | 查类型和方法地址很快 |

对 HybridCLR 游戏要区分两类目标：**AOT 程序集**靠 Cpp2IL / Il2CppDumper；**热更新程序集**本身就是普通 .NET DLL，直接用 dnSpyEx / ILSpy 打开即可，不需要经过 IL2CPP 还原。

## 四、资源分析

| 工具 | 用途 | 备注 |
|---|---|---|
| [AssetRipper](https://github.com/AssetRipper/AssetRipper) | 还原贴图、Prefab、动画与工程结构 | 分析引用关系强 |
| [AssetStudioMod](https://github.com/aelurum/AssetStudioMod) | 快速枚举、预览、批量导出 | 原版 AssetStudio 已停止维护 |
| [UABEA](https://github.com/nesrak1/UABEA) | 检查、编辑、替换 Bundle 内资源 | 路线 B 必装 |
| [UnityPy](https://github.com/K0lb3/UnityPy) | 用 Python 脚本批量处理资源 | 适合写自动化流程 |

Unity 的 Addressables 会把资源分散在安装目录和用户缓存两处，只扫一处很容易得出“资源缺失”的错误结论。资源与文件名的对应关系在 catalog 里，不在文件名里。

## 五、音频与视频

| 工具 | 用途 |
|---|---|
| [vgmstream](https://github.com/vgmstream/vgmstream) | 解码 Wwise `.wem` 等格式，导出 WAV |
| [wwiseutil](https://github.com/hpxro7/wwiseutil) | 查看与重打包 Wwise SoundBank（已归档，参考用） |
| [CriCodecs](https://github.com/youjose/cricodecs) | CRI 中间件音视频解码，处理 USM |
| [cridecoder](https://github.com/seiunx-dev/cridecoder) | 纯 Rust 实现的 CRI 解码库，可带 Python 绑定 |

如果解包结果里几乎没有音频资源，先怀疑 Wwise；如果技能演出是视频但导出后什么都没有，先怀疑 CRIWARE / USM。**把 MP4 改名为 USM 并不能保证被解码**，编码与容器都要匹配。

## 六、同类游戏的参考实现

这两个是公开的、针对同一款游戏的资源工具，适合用来理解资源位置与替换机制：

| 项目 | 侧重 |
|---|---|
| [astral-party-mod-maker](https://github.com/noah-ad/astral-party-mod-maker) | 立绘浏览 / 替换、图包导入导出、旧 MOD 迁移 |
| [JiXingModHelper](https://github.com/kldsjfas/JiXingModHelper) | 资源浏览预览、贴图替换、打包安装与备份还原 |

它们的价值在于**提供了可对照的资源索引与替换流程**，而不在于可以直接拿来改代码逻辑。阅读时注意它们针对的游戏版本。

## 七、编写、调试与观察

| 工具 | 用途 |
|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 编译 `net6.0` 插件 |
| [Rider](https://www.jetbrains.com/rider/) / [Visual Studio 2022](https://visualstudio.microsoft.com/) | 代码编写与调试 |
| [UnityExplorer](https://github.com/sinai-dev/UnityExplorer) | 运行时浏览场景对象与组件（需确认支持 IL2CPP） |
| Git | 记录依赖版本、回滚实验 |

调试建议优先看日志而不是单步：这个技术栈里大量故障发生在托管代码之外，断点根本走不到。

## 八、官方文档

| 文档 | 为什么值得读 |
|---|---|
| [Unity：IL2CPP](https://docs.unity3d.com/Manual/IL2CPP.html) | 理解 AOT 到底做了什么 |
| [HybridCLR 文档](https://www.hybridclr.cn/docs/intro) | 热更新程序集如何加载与执行 |
| [HybridCLR 快速上手](https://www.hybridclr.cn/docs/beginner/quickstart) | 亲手跑一遍热更新流程，理解“为什么 DLL 是后加载的” |
| [Addressables 文档](https://docs.unity3d.com/Packages/com.unity.addressables@latest) | catalog、Bundle 与缓存的关系 |
| [BepInEx IL2CPP 安装](https://docs.bepinex.dev/master/articles/user_guide/installation/unity_il2cpp.html) | 官方安装步骤与目录约定 |

想理解“为什么官方版不能用”，推荐先看知乎上[这篇关于 HybridCLR 与 BepInEx 的文章](https://zhuanlan.zhihu.com/p/1962949427217015984)，再看[本站的原理说明](unity/hybridclr-support.md)。

## 下载与验证建议

1. **只从项目主页或官方源下载。** Release 页比网盘可靠。
2. **记录版本与哈希。** 至少记下 BepInEx 构建编号和 Il2CppInterop 的提交。
3. **一次只换一个变量。** 同时换宿主、生成器和插件，崩溃后无法归因。
4. **保留可用组合。** 把“上次能启动”的整套文件打包留档，比事后重装快得多。

工具本身不构成使用授权。是否允许修改游戏、能否分发修改后的资源，取决于目标软件的服务条款，详见[使用声明](unity/safety.md)。
