# Unity、IL2CPP 与 MOD 工程笔记

本专题从工程实践出发，介绍 Unity 的编译模型、BepInEx、.NET 项目引用和常见运行时错误。内容来自公开资料和可复用的开发经验，并不代表任何游戏官方提供或认可 MOD 接口。

> **阅读前请确认目标软件允许修改或扩展。** 某些在线游戏禁止使用未经许可的第三方工具；本专题不会讲解游戏热更新源码的获取、反作弊绕过或在线对抗性功能。

## 阅读路线

| 顺序 | 文档 | 你会学到什么 |
|---|---|---|
| 01 | [IL2CPP 与 HybridCLR](unity/il2cpp-hybridclr.md) | AOT、解释执行及程序集身份概念 |
| 02 | [BepInEx 与工程边界](unity/bepinex.md) | 为什么框架与插件版本必须匹配 |
| 03 | [Il2CppInterop 兼容性](unity/interop-compatibility.md) | 如何记录和核验依赖组合 |
| 04 | [Rider 与构建引用](unity/build-and-references.md) | NuGet、MSBuild、Unity 类型解析 |
| 05 | [常见问题](unity/troubleshooting.md) | 从第一条真正的构建错误入手 |
| 必读 | [风险及使用声明](unity/safety.md) | 第三方插件的账号与合规风险 |

## 官方和开源资料

- [Unity：IL2CPP scripting backend](https://docs.unity3d.com/Manual/IL2CPP.html)
- [HybridCLR 开源项目](https://github.com/focus-creative-games/hybridclr)
- [BepInEx 官方文档](https://docs.bepinex.dev/)
- [Il2CppInterop](https://github.com/BepInEx/Il2CppInterop)

不公开 AstralProbe 私有源码、热更新资源、游戏完整代理 DLL 或未授权的数据。未来的公开示例会选择可合法分发的最小工程。
