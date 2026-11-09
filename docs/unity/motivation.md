# 写这套笔记的初衷

这套笔记不是从“如何安装 BepInEx”开始的，而是从一个更具体的问题开始的：**当一款 Unity 游戏用 IL2CPP 编译、又用 HybridCLR 做热更新时，现有的 MOD 教程几乎全部失效。**

《吉星派对》正好是这种组合。把开发过程中反复踩到的坑整理成可以检索的文字，是我写这些页面的直接原因；如果后来的人能少走一次弯路，这些记录就算有价值。

> 本页讲的是“为什么写”，不构成对任何游戏的使用授权。第三方插件可能违反游戏规则，详见[使用风险](unity/safety.md)。

## 网上能找到的教程，其实停在另一个时代

按目前公开可查的资料，Unity 游戏的 MOD 教程大致分三代，而这三代之间并不是平滑过渡的：

| 阶段 | 常见写法 | 为什么对 HybridCLR 游戏无效 |
|---|---|---|
| Mono 时代 | 安装 BepInEx 5 → 用 dnSpy 打开 `Assembly-CSharp.dll` → 改 IL 或挂 Harmony | 游戏根本没有可供 JIT 执行的 `Assembly-CSharp.dll`，逻辑已经 AOT 化 |
| IL2CPP 早期 | 使用 BepInEx 5 的社区魔改版，或手工注入 `GameAssembly.dll` | 缺少统一框架，维护成本高，且多数文档已经过期 |
| BepInEx 6 | 使用 `Unity.IL2CPP` 构建 + Il2CppInterop 生成代理程序集 | 方向正确，但发行版不认识被 HybridCLR 改造过的运行时 |

实际情况是：**国内和国外的教程都集中在 Mono 框架上**，IL2CPP 的内容本来就少，而且其中相当一部分还停留在 BepInEx 5 的术语和工具链里；至于 HybridCLR，中文资料里能查到的系统性文章，基本只有[知乎上的这一篇](https://zhuanlan.zhihu.com/p/1962949427217015984)（作者 Xkein）。

这篇知乎文章的价值在于它第一次把问题讲清楚了：HybridCLR 改变了 IL2CPP 的元数据和方法执行方式，因此不能沿用普通 IL2CPP 的 Hook 思路。SNWCreations 正是沿着这个思路，做出了 [Il2CppInterop PR #251](https://github.com/BepInEx/Il2CppInterop/pull/251) 的修复，并把它拆成了可以单独引用的 [IL2CppSharp](https://github.com/SNWCreations/IL2CppSharp) 与 [IL2CppSharp.Hooking](https://github.com/SNWCreations/IL2CppSharp.Hooking)。

具体到例子：Mono 时代的《Cities: Skylines》靠 BepInEx 5 加载 *TM:PE*、*Move It* 这类模组；IL2CPP 时代的《Among Us》《Lethal Company》已经转向 BepInEx 6 + Il2CppInterop；而 HybridCLR 在国内商业游戏里早就是常规方案——按官方统计，头部 Unity 热更新游戏里约 25%–35% 使用它。完整的生态梳理、代表作品和经典 MOD 见[Unity MOD 生态](unity/ecosystem.md)。

## 社区里的“魔改”，走的是另一条路

既然框架这条路这么难走，现存的魔改内容自然选择了另一条路：**直接修改热更新文件本身，再通过 DLL 注入加载。**

这条路能work，也很直接，但它有几个绕不开的代价：

- 每次游戏更新热更新程序集，补丁就要重做一次；方法签名一变，旧补丁立刻失效。
- 多个修改很难共存——大家都在改同一份 DLL，冲突只能靠人工合并。
- 出问题时没有日志、没有断点，只能在“能启动 / 不能启动”之间二分。
- 分发出去的往往是整包修改后的文件，用户无法只挑其中一项功能。

这不是在批评这种做法：在没有可用框架的时候，它就是唯一可行的做法。但它不应该成为**唯一**的做法。

## 所以这套笔记想补的是哪一块

我想记录的是“框架路线”，也就是：**让 BepInEx 6 在 HybridCLR 游戏里稳定启动，然后在运行时访问、调用、Hook 热更新代码。** 它比改 DLL 麻烦得多，但它是可组合、可更新、可调试的那条路。

具体来说，有三个目标：

1. **把“空插件能启动”变成一个独立的、可复现的检查项。** 很多教程一上来就讲 Hook，但在这个组合里，宿主能不能起来本身就是一个需要单独验证的关卡。
2. **把坑写成“现象 → 原因 → 动作”。** 单纯的结论记不住，能对应到日志和代码位置的结论才有用。
3. **只写可以公开验证的部分。** 公开的资料、开源库的行为、自己项目里可复现的工程问题；不涉及游戏文件、不涉及绕过检测。

## 需要先说清楚的三个前提

- **“能编译”不等于“能运行”。** 项目里引用了正确的 NuGet 包，只说明编译期类型齐全；运行时崩溃往往发生在插件加载之前，属于宿主层的问题。
- **“能找到方法”不等于“能 Hook”。** 反射拿得到 `MethodInfo`，不代表这个方法是 AOT 编译的、可以由 Harmony 直接替换。
- **“我这儿能用”不等于“所有人都能用”。** 修复主要在一款游戏、一个 Unity 版本上验证过，HybridCLR 的版本差异、`MethodInfo` 的布局差异都会影响结果。

## 为什么拿《吉星派对》当例子

理由很私人，也很实际。

除 Minecraft 之外，它是我唯一还在长期玩的游戏。**只有长期玩，才知道哪些地方真的硌手**——不是“这个功能看起来可以加”，而是“每次都要多点三下，烦”。MOD 的选题如果脱离真实使用，很容易做出一堆没人会开的开关。

另一个原因和游戏本身有关：它出自一个规模不大的团队，产能有限。更新频率、内容量、细节打磨都不可能像大厂那样铺开。这恰恰是 MOD 能补位的地方：

- 界面与交互的细节改进；
- 统计、回放、提示这类“应该有但没有”的辅助功能；
- 本地化、快捷操作等体验补丁。

这不是要替开发者做游戏，而是**在自己玩的那一份里，把想要的东西补上**。

还有一个附带好处：长期在线意味着游戏会持续更新，而每次更新都是一次真实的兼容性测试。补丁能不能活过版本更新，比任何演示都更有说服力。

<figure class="doc-figure">
  <div class="doc-figure-frame" role="img" aria-label="占位图：游戏主界面">
    <span class="doc-figure-tag">图片占位</span>
    <strong>游戏主界面</strong>
    <span class="doc-figure-note">说明：建议使用游戏官方公开的宣传图或主界面截图，用于说明这款游戏的美术风格与玩法场景。</span>
    <span class="doc-figure-hint">后续替换为 assets/images/ 下的图片；请确认图片来源与再发布权限</span>
  </div>
  <figcaption>图 1 · 建议配图：游戏主界面或官方宣传图（需确认授权）。</figcaption>
</figure>

> 需要说明的是：这样做的前提是**只影响自己的客户端**，不修改联机对局中他人的体验，也不绕过游戏的公平性设计。相关风险见[使用声明](unity/safety.md)。

## 这些经验是从哪来的

本站的结论来自一个仍在开发中的 MOD（AstralProbe）及其配套 SDK 的长期迭代。它们不是一次性写出来的设计文档，而是在真实崩溃、真实日志和真实版本更新里逐步修正的结果。

所以有些页面读起来会显得“啰嗦”——那些反复出现的注意事项，通常都对应过一次实际的故障。

## 建议的阅读顺序

| 顺序 | 页面 | 解决什么问题 |
|---|---|---|
| 00 | [Unity MOD 生态](unity/ecosystem.md) | Mono、IL2CPP、HybridCLR 三代技术栈与代表作品 |
| 01 | [为什么官方版还不能支持 HybridCLR](unity/hybridclr-support.md) | 先理解“为什么装不上”，再谈怎么装 |
| 02 | [开发可行性分析](unity/feasibility.md) | 资源层、代码层、注入层分别能做什么 |
| 03 | [开发完整指南](unity/full-guide.md) | 从空工程到第一个能用的功能 |
| 04 | [实战案例](unity/case-keybinds.md) | 快捷键、提示、窗口监听、设置面板 |
| 05 | [开发手记](unity/dev-notes.md) | 被放弃的方案与取舍理由 |
| 06 | [实践中的坑](unity/pitfalls.md) | 遇到具体现象时先查这里 |
| 07 | [工具与下载](tools/downloads.md) | 每个环节该用哪个工具 |

如果你只想先跑通一次，直接看[完整指南](unity/full-guide.md)的“最小验证”一节；如果你卡在启动崩溃，先看[为什么官方版还不支持](unity/hybridclr-support.md)。

## 致谢

这套笔记能存在，最应该感谢的是 **SNWCreations**：他在缺乏文档、缺乏参考实现的情况下，把 HybridCLR 兼容性做成了可以复用的开源修复，并且愿意把过程写成 PR 和库的形式公开出来。没有这份修复，“用 BepInEx 开发 HybridCLR 游戏 MOD”到现在仍然只是一句设想。

同样要感谢 HybridCLR 项目本身（[focus-creative-games/hybridclr](https://github.com/focus-creative-games/hybridclr)）、BepInEx 与 Il2CppInterop 的维护者，以及那些把资源工具、反编译工具开源出来的作者——这套教程里的每一步，都建立在别人的工作之上。
