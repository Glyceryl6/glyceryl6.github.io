# 为什么官方版 BepInEx 还不能直接支持 HybridCLR 游戏

这一页解释一个很常见、也很容易被误解的现象：**在 HybridCLR 游戏里装好官方 BepInEx 6，游戏还没进主界面就崩了，而崩溃日志和你的插件没有任何关系。**

结论先放在前面：问题不在插件代码，而在宿主——BepInEx 依赖的 `Il2CppInterop` 在被 HybridCLR 改造过的运行时上会挂错位置。修复已经写好并在真实游戏上验证过，但**截至 2026 年 11 月仍未合并进上游**，所以任何官方发行版都不包含它。

> 技术原理来自公开的 [Il2CppInterop PR #251](https://github.com/BepInEx/Il2CppInterop/pull/251) 与 SNWCreations 的公开仓库。这里只解释机制，不提供任何游戏文件或注入流程。

## 先把“不支持”拆成三层

很多人把这三个问题混成一句“BepInEx 不支持这个游戏”，于是排查方向从一开始就错了。

| 层次 | 现状 | 表现 |
|---|---|---|
| BepInEx 5 | 只支持 Unity Mono，不支持 IL2CPP | 放进游戏目录后完全没有日志 |
| BepInEx 6 + 上游 Il2CppInterop | 支持普通 IL2CPP，不认识 HybridCLR 改造过的运行时 | 启动即 `AccessViolationException`，插件根本没被加载 |
| 社区修复（PR #251 及其衍生包） | 支持，但上游尚未合并 | 需要自行替换宿主运行时与生成器 |

所以“安装 BepInEx 6 之后游戏崩溃”这句话里，至少藏着两种完全不同的故障：装错了框架类型，或者框架类型对了但运行时不受支持。二者都不应该从插件代码开始查。

## 崩溃点：一个短跳转

HybridCLR 并不是“在 IL2CPP 外面套一层”，它直接修改了 IL2CPP 运行时（`il2cpp_plus`），其中一处改动是在 `GetTypeInfoFromTypeDefinitionIndex` 这类元数据函数的开头插入解释器索引判断。反汇编出来大致是：

```asm
cmp  ecx, -1
jne  short +3          ; ← 问题就在这里
xor  eax, eax
ret
test ecx, 0F0000000h   ; IsInterpreterIndex 检查
jne  ...
```

`Il2CppInterop` 的做法是在这些元数据函数**入口处**安装 detour。安装 detour 需要把被覆盖的前几条指令复制到另一块可执行内存（trampoline），而 `jne short +3` 是一个相对短跳转：指令被搬到新地址后，它要跳的相对偏移就失效了。

结果是 trampoline 里的指令被破坏，进程在原生层直接崩溃：

```
Fatal error. System.AccessViolationException: Attempted to read or write protected memory.
   at ...MetadataCache_GetTypeInfoFromTypeDefinitionIndex_Hook.Hook(Int32)
```

**关键推论：** 这一步发生在 BepInEx 初始化 interop 的时候，**早于任何插件的 `Load()`**。所以：

- 在插件项目里加再多 NuGet 引用，都不会改变这次崩溃；
- 换一个插件模板、删掉所有插件，游戏照样崩；
- 崩溃日志里不会出现你的程序集名字，这不是“日志没写全”，而是真的还没轮到它。

修复思路也因此很朴素：不在函数开头挂钩，而是**往后挪到 `test ecx, 0F0000000h` 那条指令上**，跳过这段短跳转；同时用特征码扫描定位这个位置：

```
F7 C1 00 00 00 F0 0F 85 ?? ?? ?? ?? 48 8B 05
```

由于跳过了开头的 `-1` 判断，这个分支需要在 hook 里自行处理。

<figure class="doc-figure">
  <img src="assets/images/hybridclr-crash-log.png" alt="HybridCLR 游戏启动崩溃日志" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：启动崩溃日志">
    <span class="doc-figure-tag">图片占位</span>
    <strong>启动崩溃日志</strong>
    <span class="doc-figure-note">说明：BepInEx 日志里 `AccessViolationException` 与 `MetadataCache_GetTypeInfoFromTypeDefinitionIndex_Hook` 的完整堆栈，用来确认崩溃发生在插件加载之前。</span>
    <span class="doc-figure-hint">放到 docs/assets/images/hybridclr-crash-log.png 即可自动显示</span>
  </div>
  <figcaption>图 1 · 建议配图：典型的 HybridCLR 启动崩溃日志。</figcaption>
</figure>

## 就算不崩溃，还有三处不一致

把启动崩溃修掉只是第一步。HybridCLR 让“运行时视图”和“启动时的静态视图”产生了系统性偏差，具体有三处。

### 1. 类型索引空间被扩展了

上游 `Il2CppInterop` 假定：`global-metadata.dat` 里的类型定义表在进程生命周期内是固定的，于是它按索引缓存类型信息。

HybridCLR 会在运行时加载热更新程序集，这些程序集里的类型是**启动时不存在**的；解释器方法还使用带标记的独立索引（上例中的 `0F0000000h` 位段）。启动时建立的缓存不会自动包含它们，于是出现“类确实存在，但查不到”“查到的类型信息对不上”这类现象。

修复里对应的是 `RefreshImageCache()`：在热更新程序集加载后刷新运行时缓存。

### 2. 热更新程序集是“晚到”的

插件 `Load()` 执行时，游戏往往还没走到 `Assembly.Load(byte[])` 那一步。此时按类名查找只会得到 `IntPtr.Zero`——不是名字写错了，而是目标类型当时还不在 domain 里。

这类问题有一个很典型的错误排查路径：反复确认类名拼写、反复重新编译，但真正要改的是**查找时机**。

### 3. 解释器方法没有可以逐方法挂钩的原生入口

这是最容易被低估的一点。AOT 方法有编译后的原生代码，`MethodInfo` 上有一个可以定位的 `methodPointer`。解释器方法不是：

- 它由运行时里的**共享 bridge（桥接）函数**驱动执行；
- 多个不同的解释器方法可能共用同一个 bridge；
- 因此直接去 patch 这个 bridge，会同时影响所有走这条路径的方法。

修复为此做的事是：把 bridge 函数**复制**到新的可执行内存，把目标方法的指针改为指向副本，清掉 `isInterpterImpl` 标记让 Harmony 把它当原生方法处理，装好 detour 后再恢复 `invoker_method` 以便调用原逻辑。

这也解释了一个常见困惑：**Harmony 的 IL 替换在这里没有用武之地。** 它替换的是“可被 JIT 编译的 IL”，而解释器方法压根不经过那条路径。

## PR #251 到底改了什么

把修复拆开看，它其实覆盖了四个层面：

| 层面 | 主要改动 |
|---|---|
| Runtime | 通过 icall 检测 HybridCLR（如 `HybridCLR.RuntimeApi::LoadMetadataForAOTAssembly`、`GetRuntimeOption`）；`RefreshImageCache()`；为解释器方法准备 detour；跨平台可执行内存分配 |
| Generator | 热更新程序集单独生成时 mscorlib 缺失的空值保护；忽略签名差异的程序集解析；`System.dll → mscorlib` 类型搬迁的兜底；`IsHybridCLREnvironment` 开关 |
| HarmonySupport | `HybridCLRMethodInfo` 扩展字段（`interpData`、`methodPointerCallByInterp` 等）；解释器方法的完整 detour 流程 |
| BepInEx 集成 | 让 BepInEx 的启动流程使用正确的运行时与生成器设置 |

注意“Generator”那一栏：它说明**热更新程序集的代理程序集生成**是独立的一摊问题。上游生成器只认识 `global-metadata.dat` 里的 AOT 程序集；热更新 DLL 是普通 .NET 程序集，但它引用的类型可能已经被 HybridCLR 在程序集归属上搬过家，签名也可能和 AOT 侧不完全一致。这些都会让生成器在“只给热更新 DLL 生成包装”时直接抛异常。

## 为什么“PR 没合并”这件事影响这么大

一个未合并的 PR 意味着：**官方发行版里没有这段代码。** 而 BepInEx 的 IL2CPP 构建本身还处在 Bleeding Edge（[builds.bepinex.dev](https://builds.bepinex.dev/projects/bepinex_be)），没有稳定的“6.x 正式版”可以等。

SNWCreations 的处理方式是把修复做成可引用的包，而不是让大家自己去打补丁：

| NuGet 包 | 版本 | 用途 |
|---|---|---|
| [`SNWCreations.Il2CppInterop.Runtime`](https://www.nuget.org/packages/SNWCreations.Il2CppInterop.Runtime) | `1.5.2-snw.4` | HybridCLR 兼容运行时 |
| [`IL2CppSharp`](https://www.nuget.org/packages/IL2CppSharp) | `0.1.0-alpha.5` | 运行时反射与调用 |
| [`IL2CppSharp.Hooking`](https://www.nuget.org/packages/IL2CppSharp.Hooking) | `0.1.2-alpha.1` | 原生 / 解释器方法 Hook |
| [`IL2CppSharp.Hooking.BepInEx`](https://www.nuget.org/packages/IL2CppSharp.Hooking.BepInEx) | `0.1.2-alpha.1` | 与 BepInEx 日志系统对接 |

这些是 package-id fork：**包名不同，但程序集名和命名空间仍然是 `Il2CppInterop.*`**。这带来一个非常容易踩的坑——项目里同时出现两份 `Il2CppInterop.Runtime.dll` 时，编译器可能不报错，运行时却因为程序集身份冲突而抛 `TypeLoadException` / `MissingMethodException`。

由此得到三条硬约束：

1. **编译期引用可以来自 NuGet。** 这一步很顺，`dotnet add package` 就完事。
2. **运行时宿主必须换成含修复的构建。** 这是最常被误解的地方：`dotnet add package` 只让代码编译通过，不会替换游戏目录里正在运行的 `BepInEx/core`。
3. **Runtime / Common / Generator / HarmonySupport 必须来自同一套提交。** 混搭不同提交的产物，比不修还难排查。

## 现状与预期

- PR 于 2026 年 2 月创建，到 2026 年 11 月仍为 Open；期间有 30 个提交、约 1800 行新增，最近一次更新在 6 月。
- 作者在 PR 中明确说明：验证环境主要是 **Windows x64 + Unity 2021.3**，其他 HybridCLR 版本可能存在结构差异；`MethodInfo` 的布局也可能随 HybridCLR 版本变化。
- 上游维护者没有给出合并时间表。因此**不要把“官方版马上会支持”当作排期前提**。

比较务实的判断是：这个组合目前处在“有人修好了、但还没进入主干”的阶段。你要么跟着修复走（用兼容包 + 自建宿主），要么退回改热更新 DLL 的路线。两条路的取舍见[开发可行性分析](unity/feasibility.md)。

## 一页速查

| 你看到的现象 | 最可能属于哪一层 | 先做什么 |
|---|---|---|
| 装好后完全没有 `LogOutput.txt` | 框架类型错了（Mono 版 / 位数不对） | 确认是 `Unity.IL2CPP-win-x64`，确认游戏是 64 位 |
| 启动即 `AccessViolationException`，堆栈在 `MetadataCache_*` | 宿主 interop 与 HybridCLR 不兼容 | 换含修复的运行时，别先动插件 |
| 插件加载成功，但按类名查不到热更新类型 | 查找时机太早 | 等程序集加载后再查，必要时刷新缓存 |
| 能找到类，`Hook` 后闪退 | 方法执行方式判断错了 | 先只读、只记录日志，确认是解释器方法还是 AOT 方法 |
| Hook 装上了但从不回调 | 目标没被调用 / Hook 路径不对 | 换一个确定高频调用的方法验证链路 |
| 多个 Hook 互相影响、行为诡异 | 共享 bridge 被直接 patch | 用支持逐方法 detour 的 Hook 引擎 |

更完整的排错表在[常见问题](unity/troubleshooting.md)。
