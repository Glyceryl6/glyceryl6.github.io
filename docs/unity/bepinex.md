# BepInEx 与插件工程边界

BepInEx 是开源插件框架，并不意味着所有采用 Unity 的商业游戏都允许安装第三方插件。**先确认目标环境是自己开发、取得授权的测试项目或明确允许扩展的游戏。** 对于禁止第三方工具的在线游戏，不应将一般性安装教程当作使用许可。

## 类型和依赖边界

- Unity Mono 与 Unity IL2CPP 有不同的插件运行时与打包类型。
- BepInEx 6 的 IL2CPP 构建、Il2CppInterop 和框架关键程序集需要相互兼容。
- 编译期 NuGet 引用与运行时实际加载的 DLL 可能不是同一个文件；使用 `dotnet restore` 成功不等于运行时兼容。
- 使用 `BasePlugin.Load()` 时，能创建插件入口不代表 UI 或游戏对象已经初始化。

## 建议的版本记录

在本地受控工程中记录如下信息，而不是只存放一个“可用 DLL”目录：

| 字段 | 建议记录内容 |
|---|---|
| Unity 后端 | Mono / IL2CPP，目标架构 |
| 游戏／测试宿主 | 版本与构建日期 |
| BepInEx | 完整构建编号、哈希或发行标签 |
| Il2CppInterop | 源仓库、提交 SHA、Runtime / Common 兼容版本 |
| NuGet | 锁定包版本和包源 |
| 工程 | `TargetFramework`、.NET SDK 版本 |

生产环境与测试环境尽量隔离，不公开第三方游戏的专有二进制或未授权资源。需要原生桥接扩展时请先阅读[兼容性专题](unity/interop-compatibility.md)。

参考：[BepInEx 项目文档](https://docs.bepinex.dev/)及[Unity IL2CPP 官方安装说明](https://docs.bepinex.dev/master/articles/user_guide/installation/unity_il2cpp.html)。
