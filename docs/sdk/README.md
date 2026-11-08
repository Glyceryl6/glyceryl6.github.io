# AstralParty.Modding.SDK 文档

本专题保留此前 SDK Wiki 中可公开的设计与使用知识：独立 C# 工程组织、Native API 的职责、对象生命周期和从旧版迁移的注意事项。

> 文档基于 **SDK v0.12.0 的历史结构**。SDK 原工程及部分游戏相关依赖尚未作为公共下载在本站发布；本文档不包含私有仓库源码和商业游戏 DLL。阅读示例不意味着目标游戏允许加载 MOD。

## 文档目录

- [基础接入与项目组织](sdk/getting-started.md)
- [Native API 设计与示例](sdk/native-api.md)
- [原生对象、主线程与异常](sdk/lifecycle.md)
- [从旧版 SDK 迁移](sdk/migration.md)

SDK 采用单程序集模式，Native 辅助代码并入 `AstralParty.Modding.SDK.dll`，公开类型集中在 `AstralParty.Modding.SDK.Native` 命名空间。历史上出现过的 `SDK.Native.dll` 和 `.Native.Interop` / `.Native.UI` 命名空间不应与新版混用。

**版本警告：** 任何 SDK Native 方法都依赖合法、匹配且可用的运行环境；阅读本页不能代替实际的 .NET 编译、授权环境加载或回归测试。
