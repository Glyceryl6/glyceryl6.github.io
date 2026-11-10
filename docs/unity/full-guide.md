# 开发完整指南：从空工程到第一个功能

适用范围：**Windows x64 · Unity 2021.3 · IL2CPP + HybridCLR · BepInEx 6（Bleeding Edge）**。

具体版本号会变，思路不会：先让宿主稳定，再让反射找得到，最后才是 Hook。本页把这条路径拆成可以逐项验证的步骤，每一步都有明确的“完成标志”，避免在多个变量同时变化时失去方向。

> 前提：目标软件是你自己有权修改的测试环境。请先阅读[使用声明](unity/safety.md)与[公开边界](about/publication-policy.md)。

## 两条路线，先选一条

| 对比项 | BepInEx 独立插件 | 直接修改热更新 DLL |
|---|---|---|
| 安装方式 | 放入 `BepInEx/plugins` | 改 DLL 后重新打包原 Bundle |
| 需要改游戏缓存 | 否 | 通常需要 |
| 需要兼容 HybridCLR 的 Hook 框架 | Hook 热更新方法时需要 | 通常不需要 |
| 新增独立功能 | 可以 | 可以，但受原有代码结构限制 |
| 修改原方法内部逻辑 | 通过 Hook / Detour 间接修改 | 直接改 IL |
| 处理 AOT 方法 | 可以，需要匹配原生签名 | 不行 |
| 游戏更新后 | 相对稳定，但 API 变化仍可能失效 | 通常要重新验证、重做补丁 |
| 多 MOD 共存 | 相对方便 | 多人改同一 DLL 容易冲突 |

两条路线不互斥：可以先用 B 验证“这个行为能不能改”，确认有价值后再迁移到 A。

## 准备清单

| 工具 | 用途 | 必要性 |
|---|---|---|
| [.NET SDK 6+](https://dotnet.microsoft.com/download) | 编译 BepInEx 6 插件 | 路线 A 必需 |
| [BepInEx 6 IL2CPP（Bleeding Edge）](https://builds.bepinex.dev/projects/bepinex_be) | 插件宿主 | 路线 A 必需 |
| [SNWCreations.Il2CppInterop](https://github.com/SNWCreations/Il2CppInterop) | HybridCLR 兼容运行时与生成器 | 路线 A 关键 |
| [IL2CppSharp](https://github.com/SNWCreations/IL2CppSharp) | 运行时查找类、方法并调用 | 路线 A 推荐 |
| [IL2CppSharp.Hooking](https://github.com/SNWCreations/IL2CppSharp.Hooking) | 原生 / 解释器方法 Hook | 路线 A 推荐 |
| [dnSpyEx](https://github.com/dnSpyEx/dnSpy) | 编辑托管 DLL 的 C# / IL | 路线 B 必需 |
| [UABEA](https://github.com/nesrak1/UABEA) | 导入导出 Bundle 内的资源 | 路线 B 必需 |
| [AssetRipper](https://github.com/AssetRipper/AssetRipper) | 分析资源与引用关系 | 推荐 |
| [Cpp2IL](https://github.com/SamboyCoding/Cpp2IL) | 分析 AOT 元数据 | 可选 |
| Rider / Visual Studio 2022 | 编写与调试 | 必需 |

完整的下载入口整理在[工具与下载](tools/downloads.md)。**不需要**一开始就装 Unity 编辑器：纯 C# Hook、资源提取、改现有 DLL 都可以在没有 Editor 的情况下完成。

## 阶段 0：做一个能回滚的测试环境

在动手之前先固定变量，否则之后无法判断“是哪一步让它崩的”。

1. 复制一份可独立启动的游戏目录作为测试副本（部分平台要求从原位置启动，这一点需要自行确认）。
2. 备份 Addressables 缓存目录，尤其是 `com.unity.addressables\AssetBundles`。
3. 记录当前状态的指纹：

| 记录项 | 为什么 |
|---|---|
| 游戏 EXE 与 `GameAssembly.dll` 的版本 / SHA-256 | 区分“游戏更新了”与“我改坏了” |
| `global-metadata.dat` 的哈希 | AOT 元数据变化会直接让代理程序集失效 |
| 热更新 DLL 的 SHA-256 | 判断补丁是否还对应同一份代码 |
| 含热更新 DLL 的 Bundle 名与路径 | 路线 B 的回滚依据 |
| BepInEx / Il2CppInterop 的具体构建编号 | 兼容问题的第一现场 |

有了这些，游戏更新后就能区分两种情况：只是 Bundle 换了文件名，还是代码真的变了。

## 路线 A：BepInEx 6 插件

### A1 · 安装正确的 BepInEx

1. 打开 [BepInEx Bleeding Edge Builds](https://builds.bepinex.dev/projects/bepinex_be)。
2. 选择 **Unity.IL2CPP-win-x64**（不是 Mono，也不是 x86）。
3. 解压到游戏 EXE 所在目录。
4. 启动一次游戏，确认生成了 `BepInEx/config` 和 `BepInEx/LogOutput.txt`。

完成标志：`LogOutput.txt` 存在，且其中没有原生崩溃堆栈。

如果连这个文件都没有，先不要继续——这说明代理 DLL 没有加载成功，问题和插件代码无关。

### A2 · 处理 HybridCLR 兼容性

这是整条路线最关键的一步，也是最容易误解的一步：**引用 NuGet 包只解决编译，不解决运行。**

- 崩溃发生在插件加载之前，堆栈落在 `Il2CppInterop` 的元数据 hook 上 → 必须替换宿主运行时与生成器。
- 官方发行版不包含修复（PR 仍未合并），详见[为什么官方版还不支持 HybridCLR](unity/hybridclr-support.md)。
- Runtime / Common / Generator / HarmonySupport 必须来自同一套构建，不要混搭不同提交。

完成标志：**空插件能加载并写出日志**。在这之前不要写任何业务代码。

### A3 · 创建工程

确认 SDK 可用后，安装 Bleeding Edge 模板并生成 IL2CPP 插件工程：

```powershell
dotnet --info
dotnet new install BepInEx.Templates::2.0.0-be.4 --nuget-source https://nuget.bepinex.dev/v3/index.json
dotnet new bep6plugin_unity_il2cpp -n AstralProbe
```

模板短名对版本很敏感：Bleeding Edge 是 `bep6plugin_unity_il2cpp`，稳定模板里对应的是 `bep6plugin_il2cpp`。用 `dotnet new list` 确认实际装上了哪一个，不要凭记忆敲。

工程里需要确认的几件事：

```xml
<PropertyGroup>
  <TargetFramework>net6.0</TargetFramework>
  <AssemblyName>AstralProbe</AssemblyName>
  <LangVersion>latest</LangVersion>
</PropertyGroup>
```

- `TargetFramework` 必须和 BepInEx 6 的宿主一致（通常 `net6.0`）。
- 引用来自模板生成的属性与本地 interop 目录，不要手工塞入别的游戏生成的代理 DLL。
- 输出目录里只应有一份 `Il2CppInterop.Runtime.dll` / `Common.dll`。出现两份时，编译器可能不报错，运行时才炸。

### A4 · 先让空插件跑通

```csharp
using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;

[BepInPlugin("com.example.astralprobe", "Astral Probe", "0.1.0")]
public class Plugin : BasePlugin
{
    internal static ManualLogSource Logger;

    public override void Load()
    {
        Logger = Log;
        Logger.LogInfo("Astral Probe loaded.");
    }
}
```

编译后把输出 DLL 放进 `BepInEx/plugins/`，启动游戏，在 `LogOutput.txt` 里找这一行。

完成标志：`Astral Probe loaded.` 出现，游戏不闪退。

<figure class="doc-figure">
  <img src="assets/images/bepinex-log.png" alt="BepInEx 日志输出" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：BepInEx 日志输出">
    <span class="doc-figure-tag">图片占位</span>
    <strong>BepInEx 日志输出</strong>
    <span class="doc-figure-note">说明：<code>BepInEx/LogOutput.txt</code> 中出现插件加载日志的样子，用于对照“宿主是否正常启动”。</span>
    <span class="doc-figure-hint">后续替换为实际日志截图</span>
  </div>
  <figcaption>图 1 · 建议配图：空插件成功加载后的日志片段。</figcaption>
</figure>

这一步看起来毫无技术含量，但它是后面所有问题的分界线：**插件入口能跑，说明宿主、位数、依赖、加载路径全都对了。**

### A5 · 加入运行时访问库

```powershell
dotnet add package IL2CppSharp --version 0.1.0-alpha.5
dotnet add package IL2CppSharp.Hooking --version 0.1.2-alpha.1
dotnet add package IL2CppSharp.Hooking.BepInEx --version 0.1.2-alpha.1
```

注意包名大小写与版本：`IL2CppSharp`（NuGet 上是这个 ID）与 `IL2CppSharp.Hooking.*` 属于预发行版本，升级时要一起升级。

如果模板和这些包出现同名程序集冲突，**不要通过同时携带两套 `Il2CppInterop.Runtime.dll` 来解决**，而应把宿主与工程的 Interop 版本统一。

### A6 · 等热更新程序集真正加载

这是 HybridCLR 与普通 IL2CPP 最大的行为差异：插件 `Load()` 执行时，游戏的热更新程序集通常还没被 `Assembly.Load` 进来。

此时按类名查找只会得到 `IntPtr.Zero`。所以需要一个“等待 + 重试”的观察者：

```csharp
using System;
using BepInEx.Logging;
using IL2CppSharp;
using UnityEngine;

public class HotfixWatcher : MonoBehaviour
{
    private float _nextCheck;
    private IntPtr _klass;
    private IntPtr _method;

    public void Update()
    {
        if (Time.unscaledTime < _nextCheck) return;
        _nextCheck = Time.unscaledTime + 2f;
        if (_method != IntPtr.Zero) return;

        _klass = Il2CppReflection.FindClass("UI.FightWindow");
        if (_klass == IntPtr.Zero) return;

        _method = Il2CppReflection.FindMethod(_klass, "RefreshThrowDice", 2);
        if (_method == IntPtr.Zero) return;

        Plugin.Logger.LogInfo("Found UI.FightWindow.RefreshThrowDice");
    }
}
```

在 IL2CPP 下，自定义 `MonoBehaviour` 需要先向运行时注册类型（`ClassInjector.RegisterTypeInIl2Cpp<HotfixWatcher>()`），或者在宿主提供的组件上挂载。如果这一步报错，先退回到“用协程轮询”或“Hook 某个已经存在的更新方法”，不要在这上面死磕。

完成标志：日志里出现 `Found ...`，且是在进入战斗场景之后出现的——这证明你抓到的是**加载时机**，而不是碰巧命中的同名类型。

补充：能通过反射找到方法，**不代表**它是解释器方法。这一步只验证“看得见”，不验证“改得动”。

### A7 · 调用一个游戏已有的方法

第一个真正有用的功能，建议选**纯客户端表现**：弹一个游戏自带的提示框。

```csharp
using IL2CppSharp;

// 热更新程序集加载完成之后
IL2CPP.Initialize();
IL2CPP.AddAssemblyHint("AstralParty.Runtime");
```

调用时用流式 API，参数类型写在泛型里，具体实例指针必须从运行时取：

```csharp
// systemTipsPtr 必须来自游戏运行时（单例/属性），不能凭空构造
IL2CPP.Class("UI.SystemTipsWindow")
    .Method("ShowTips")
    .Args<string, float>()
    .Invoke(systemTipsPtr, "来自 MOD 的提示", 3.0f);
```

这类“只调用、不拦截”的功能价值很高：它把“反射是否正确”和“Hook 是否正确”两件事分开了。调用成功说明类型查找、参数封送、对象生命周期都对；之后 Hook 出问题，就只需要怀疑 Hook 本身。

### A8 · 安装第一个 Hook

先初始化 Hook 引擎（BepInEx 适配包提供日志桥接）：

```csharp
using IL2CppSharp.Hooking;
using IL2CppSharp.Hooking.BepInEx;

HookEngine.Initialize(new BepInExHookLogger(Logger));
```

然后针对**确认是解释执行**的低频方法安装回调。下面这段是结构示意，具体重载以所用版本的公开 API 为准：

```csharp
// 1) 取到目标方法的 MethodInfo 指针
IntPtr methodInfo = Il2CppReflection.FindMethod(klass, "RefreshThrowDice", 2);

// 2) 安装 post 回调，保存句柄以便卸载
HookHandle handle = HookEngine.HookInterpreter(methodInfo, onPost: mi =>
{
    Plugin.Logger.LogInfo("RefreshThrowDice called");
});

// 3) 插件卸载或功能关闭时还原
// handle.Unhook();
```

几条必须遵守的纪律：

- **先只记录日志，不改参数、不改返回值。** 能稳定记录，才说明 detour 链路是通的。
- **不要 Hook 每帧调用几百次的方法。** 日志本身会成为新的性能问题和崩溃源。
- **保存 `HookHandle`，避免重复安装。** 重复 Hook 同一目标在不同引擎里行为不一致，很容易出现“重启才好”。
- **判断执行方式。** AOT 方法要用匹配原生签名的 Hook 接口，`HookInterpreter` 不适用。

完成标志：进入对应场景后日志稳定出现，退出游戏不崩溃，卸载插件后行为恢复。

### A9 · 快捷键、配置与生命周期

到这一步才开始考虑“像个 MOD”：

```csharp
var toggleKey = Config.Bind("General", "ToggleKey", "F8", "打开/关闭面板");
```

- 快捷键读取要处理 `Legacy Input` 不可用的情况，并在日志里明确写出“这次没有响应”的原因。
- 配置项改动后是否需要重启，要在说明里写清楚；很多“设置不生效”其实是没重启。
- 所有 Hook 都应有对应的卸载路径，否则热重载会叠加出奇怪的行为。

## 路线 B：直接修改热更新 DLL

这条路线的优势很直接：**不需要框架，直接改即将被执行的托管代码。** 代价是每次游戏更新都要重做。

### B1 · 取原始 DLL，而不是反编译工程

反编译出来的工程用于阅读，不能直接编译回原始 DLL：它引用了大量外部程序集，部分 IL 也无法完整还原。

正确做法是从原始 Bundle 里取字节：

1. 根据 catalog 与资源名定位包含目标程序集的 Bundle。
2. 用 UABEA 打开**原始 Bundle**，而不是 AssetRipper 导出的工程。
3. 在内部 SerializedFile 中找到承载字节的资源（常见是 `TextAsset`）。
4. 导出 `m_Script` 的原始字节。
5. 如果字节被压缩或包装，先弄清楚加载器做了什么处理，再交给 dnSpyEx。

普通 .NET DLL 的文件头是 `MZ`，但**只有 `MZ` 不足以证明它是有效托管程序集**；dnSpyEx 能否正确读出元数据更有说服力。

### B2 · 用 dnSpyEx 改方法

以“限制回放倍速”为例：

1. 打开 DLL，定位目标类型与方法。
2. 右键 → `Edit Method (C#)`，只改方法体，**不要改类名、方法名、参数签名**。
3. `Compile`；如果因为缺引用失败，检查程序集解析路径，或改编辑更小范围的 IL。
4. `File → Save Module` 保存到独立工作目录。
5. 重新打开修改后的 DLL，确认元数据仍然可读。

注意这个补丁只限制方法收到的参数，**不会自动在界面上多出一个“4 倍速”按钮**——UI 入口需要另外处理。

### B3 · 写回 Bundle

1. 用 UABEA 打开原始 Bundle 与内部的 SerializedFile。
2. 找到对应 `TextAsset`。
3. 用“导入原始数据”把新字节替换到数据字段。
4. 保留原 `PathID`、类型、名称与引用关系。
5. 保存 SerializedFile，再保存外层 Bundle；**先另存为新文件**，不要直接覆盖缓存。

要替换的是二进制字节字段，不是把导出的 YAML 原样复制回去。

### B4 · 面对 catalog、哈希与校验

Addressables 的 catalog 记录资源地址、依赖和 Bundle 位置。游戏更新后，新 catalog 会指向新的 Bundle 文件名——你把旧版本改好了，游戏却去加载新文件，这是最常见的“改了没效果”。

实务上：

- 先在测试副本里验证重打包后的 Bundle 能被加载。
- 记录修改前后的哈希。
- 确认游戏读的是你的文件，而不是又下载了一份。
- 出现 CRC 错误、缓存重建或启动失败，先恢复原文件。
- 游戏更新后重新提取、重新比较、重做补丁。

不建议去改游戏整体的校验与更新机制来强迫旧代码加载，尤其是有在线多人功能的客户端。

## 两条路线怎么选

| 你想做的事 | 更合适的路线 |
|---|---|
| 只验证“这个行为能不能改” | B（快） |
| 要发布给其他玩家、可配置、可叠加 | A |
| 要改 AOT 方法 | A |
| 要改一个方法内部的 IL 逻辑 | B |
| 要做界面增强、快捷键、回放控制 | A |
| 游戏版本频繁更新 | A（B 每次都要重做） |

## 分层排错

遇到问题时先确定它属于哪一层，再查对应页面：

| 现象 | 层 | 去哪看 |
|---|---|---|
| 没有 `LogOutput.txt` | 宿主安装 | [BepInEx 与插件边界](unity/bepinex.md) |
| 启动即崩溃，堆栈在 `MetadataCache_*` | 宿主兼容性 | [为什么官方版还不支持](unity/hybridclr-support.md) |
| 插件加载成功但找不到热更新类 | 加载时机 | 本页 A6 |
| 找得到类但调用崩溃 | 对象与线程 | [生命周期](sdk/lifecycle.md) |
| Hook 装上没回调 / 闪退 | 执行方式与签名 | [实践中的坑](unity/pitfalls.md) |
| 构建报一堆红 | 依赖与引用 | [构建与引用](unity/build-and-references.md) |

## 里程碑清单

按顺序打勾，不要跳步：

- [ ] 测试副本可独立启动，原始文件已备份并记录哈希
- [ ] `LogOutput.txt` 正常生成，无原生崩溃
- [ ] 空插件输出 `loaded`
- [ ] 进入目标场景后能找到热更新类型
- [ ] 能调用一个游戏自带的客户端方法（例如提示框）
- [ ] 能对一个低频解释器方法记录日志
- [ ] Hook 能卸载，卸载后行为恢复
- [ ] 配置、快捷键、日志输出都可用
- [ ] 游戏更新后，有一套重新验证的流程

第一个推荐做完整的功能是“**快捷键触发的自定义提示**”：它同时覆盖插件加载、类型查找、运行时调用和输入处理，但完全不碰网络与规则。

照着做的话，接下来可以依次看：

1. [案例一：快捷键](unity/case-keybinds.md)——配置绑定与输入处理；
2. [案例二：自定义提示](unity/case-tips.md)——调用原版提示窗口；
3. [案例三：窗口与场景监听](unity/case-window.md)——判断当前界面与清理时机；
4. [案例四：设置面板与配置](unity/case-settings.md)——把开关交给用户。

过程中遇到具体故障，查[实践中的坑](unity/pitfalls.md)；想知道某个方案为什么被放弃，查[开发手记](unity/dev-notes.md)。
