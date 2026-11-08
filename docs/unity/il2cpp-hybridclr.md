# IL2CPP 与 HybridCLR：先理解运行模型

Unity 项目可以采用不同的脚本后端。**Mono** 和 **IL2CPP** 在编译结果、程序集加载与运行时行为上均有差异：IL2CPP 以 AOT 为核心，把受支持的托管 IL 转换成 C++，再编译为目标平台的原生代码。代码中存在 C# 类型名，并不意味着运行环境仍有一份与编辑器相同的托管程序集可直接调用。

**HybridCLR** 在 Unity IL2CPP 之上提供解释执行等能力，使部分热更新程序集在运行时工作。它同时引入一些不同于普通 IL2CPP 的类型与方法元数据生命周期问题。由此产生的 `Il2CppInterop` 兼容性差异，不应简单地归因于 C# 语法错误。

## 三层依赖

| 层级 | 示例 | 作用 |
|---|---|---|
| 编辑器 / 构建期 | Unity、.NET SDK、MSBuild | 开发并编译 C# 项目 |
| 类型代理 | `Il2Cppmscorlib.dll`、`UnityEngine.CoreModule.dll` | 供独立 C# 工程理解 IL2CPP 类型 |
| 运行时桥接 | BepInEx、Il2CppInterop Runtime | 实际运行时的对象与方法交互 |

仅有“能编译”的代理程序集，不足以证明运行时对象可以被安全调用。反之，运行时桥接成功也不能自动修复 Rider 中缺失的编译期引用。

## 常见误区

- 将 Mono 版插件框架用于 IL2CPP 运行时。
- 不记录 Unity / HybridCLR / 框架具体版本，只凭 DLL 文件名判断兼容。
- 把历史版本生成的代理程序集用于已升级的游戏。
- 在后台线程持有并直接操作 Unity 场景对象。

遇到这些情况，先回到[构建引用](unity/build-and-references.md)和[生命周期](sdk/lifecycle.md)检查。对第三方在线游戏，请先阅读[合规与账号风险](unity/safety.md)。

资料：[Unity IL2CPP](https://docs.unity3d.com/Manual/IL2CPP.html)、[HybridCLR](https://github.com/focus-creative-games/hybridclr)。
