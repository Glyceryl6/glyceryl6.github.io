# Unity、IL2CPP 与 MOD 工程笔记

本专题从工程实践出发，介绍 Unity 的编译模型、BepInEx、IL2CPP + HybridCLR 的兼容性、.NET 项目引用和常见运行时错误。内容来自公开资料和可复用的开发经验，并不代表任何游戏官方提供或认可 MOD 接口。

> **阅读前请确认目标软件允许修改或扩展。** 某些在线游戏禁止使用未经许可的第三方工具；本专题不会讲解游戏热更新源码的获取、反作弊绕过或在线对抗性功能。

## 从哪里开始

先读背景三页，再进入操作步骤：

| 顺序 | 文档 | 你会学到什么 |
|---|---|---|
| 00 | [写这套笔记的初衷](unity/motivation.md) | 为什么 Mono 时代的教程在这里失效 |
| 01 | [Unity MOD 生态](unity/ecosystem.md) | Mono / IL2CPP / HybridCLR 三代技术栈、代表作品与现状 |
| 02 | [为什么官方版还不支持 HybridCLR](unity/hybridclr-support.md) | 启动崩溃到底发生在哪一层 |
| 03 | [开发可行性分析](unity/feasibility.md) | 资源层、代码层、注入层分别能做什么 |
| 04 | [开发完整指南](unity/full-guide.md) | 从空工程到第一个可用功能 |

## 实战案例

按“从简单到复杂”排列，每篇都可以单独跟着做：

| 案例 | 内容 |
|---|---|
| [快捷键](unity/case-keybinds.md) | 配置绑定、轮询输入、ESC 冲突与输入不可用 |
| [自定义提示](unity/case-tips.md) | 调用原版提示窗口，处理失败原因与文字显示 |
| [窗口与场景监听](unity/case-window.md) | 判断当前界面、对局状态与清理时机 |
| [设置面板与配置](unity/case-settings.md) | 原生设置页、配置校验与迁移 |

## 经验与排错

| 文档 | 你会学到什么 |
|---|---|
| [开发手记](unity/dev-notes.md) | 哪些方案被放弃，以及为什么 |
| [实践中的坑](unity/pitfalls.md) | 现象 → 根因 → 做法 |
| [IL2CPP 与 HybridCLR](unity/il2cpp-hybridclr.md) | AOT、解释执行及程序集身份概念 |
| [BepInEx 与工程边界](unity/bepinex.md) | 为什么框架与插件版本必须匹配 |
| [Il2CppInterop 兼容性](unity/interop-compatibility.md) | 如何记录和核验依赖组合 |
| [Rider 与构建引用](unity/build-and-references.md) | NuGet、MSBuild、Unity 类型解析 |
| [常见问题](unity/troubleshooting.md) | 从第一条真正的构建错误入手 |
| [风险及使用声明](unity/safety.md) | 第三方插件的账号与合规风险 |

工具清单见[工具与下载](tools/downloads.md)；SDK 相关的原生调用约定见 [SDK 专题](sdk/README.md)。

## 官方和开源资料

- [Unity：IL2CPP scripting backend](https://docs.unity3d.com/Manual/IL2CPP.html)
- [HybridCLR 开源项目](https://github.com/focus-creative-games/hybridclr) · [官方文档](https://www.hybridclr.cn/docs/intro) · [商业项目案例](https://www.hybridclr.cn/docs/8.15.0/other/businesscase)
- [BepInEx 官方文档](https://docs.bepinex.dev/) · [Bleeding Edge 构建](https://builds.bepinex.dev/projects/bepinex_be)
- [Il2CppInterop](https://github.com/BepInEx/Il2CppInterop) · [HybridCLR 兼容 PR #251](https://github.com/BepInEx/Il2CppInterop/pull/251)
- [SNWCreations/IL2CppSharp](https://github.com/SNWCreations/IL2CppSharp) · [IL2CppSharp.Hooking](https://github.com/SNWCreations/IL2CppSharp.Hooking)

AstralProbe 目前仍在私有开发，作者计划逐步公开源码；公开前不提供仓库访问，热更新资源、游戏完整代理 DLL 与未授权数据始终不会公开。
