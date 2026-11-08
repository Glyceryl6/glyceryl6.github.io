# 开发工具与工程效率

工具项目服务于**源代码组织与可重现构建**。与游戏运行时本身是两回事：一个插件能够生成 C# 工程，不代表该项目已经通过目标 .NET 编译或获准在某款游戏里运行。

## 现有工具

- [Astral Mod Forge：独立 MOD 导出设计](tools/mod-forge.md) — Rider 插件与 CLI 的源码选择、依赖分析、资源裁剪、日志与构建流程。
- Rider / MSBuild — 查看项目依赖图和首个真正的编译错误。
- Git — 补丁、版本标签、回滚和可复现构建。

## 下载与推荐

框架、反编译、资源、音视频、调试工具的分组清单和版本对照，整理在[工具与下载](tools/downloads.md)。

几个挑选原则：

- **优先官方源。** BepInEx 用 [Bleeding Edge 构建](https://builds.bepinex.dev/projects/bepinex_be)，NuGet 包用 [nuget.org 上的原始发布](https://www.nuget.org/profiles/SNWCreations)。
- **记录版本。** 只保留“一个能跑的 DLL 目录”，下次出问题就无法归因。
- **区分角色。** 编译期引用、运行时宿主、代理程序集不是同一种文件，不要互相替代。

工具项目的公开下载和可验证安装包将以未来实际公开的仓库 Release 为准。本网站不会把未经真实 Rider SDK 编译的候选 ZIP 宣称为正式安装包。
