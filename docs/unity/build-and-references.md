# Rider、NuGet 和 Unity 代理程序集引用

这一章介绍**已获授权的开发环境**中最常见的工程问题。项目能在 Rider 中打开，并不意味着其 MSBuild 项目引用或编译器所需的 DLL 已加载。

## 建议的开发工具

- .NET SDK：使用与项目 `TargetFramework` 对应的版本；在终端执行 `dotnet --info`。
- Rider 或 Visual Studio：打开 `.sln` / `.csproj`，而不只是浏览源码文件夹。
- Git：记录工作状态和可复现的依赖版本。
- 官方 NuGet 包源与项目指定的额外包源；避免为了消除错误而随意删掉依赖。

## 最小的依赖检查

```powershell
# 在你有权构建的项目目录执行
dotnet --info
dotnet restore .\Example.sln
dotnet build .\Example.sln -c Release --no-restore
```

如果 Unity 类型全部标红，先检查实际使用的互操作代理程序集目录、`Directory.Build.props` / `.targets` 的导入顺序和 Rider 的设计时构建日志。对 IL2CPP 项目，代理 DLL 可能生成于受控运行环境的 `BepInEx/interop`，但不能把另一个游戏或另一个版本的 DLL 硬塞进当前项目。

## NuGet 的 `NU1101`

错误示例：`Unable to find package BepInEx.PluginInfoProps`。这通常意味着当前包源不包含指定 ID、无法访问、或版本不匹配。首先检查 `NuGet.Config` 与实际的源列表：

```powershell
dotnet nuget list source
```

对于存在于 BepInEx 官方源的包，保留该包源，而不是依赖本机的 `Microsoft Visual Studio Offline Packages` 缓存。

## MSBuild 的非法顶层 Error

`<Error>` 不是 `<Project>` 下的直接子元素；必须放在 `<Target>` 中。以下是**用于自有项目的合法结构示例**：

```xml
<Project>
  <Target Name="ValidateDependencies" BeforeTargets="ResolveReferences">
    <Error Condition="'$(RequiredDll)' == ''"
           Text="请配置 RequiredDll。" />
  </Target>
</Project>
```

如果项目需要更早的检查，可使用 `InitialTargets` 指定目标。不要通过禁用所有错误提示掩盖路径问题。

## 不应混合的引用

- `BepInEx/interop` 中**当前目标版本的类型代理 DLL**；
- `BepInEx/core` 中实际加载的**运行时组件**；
- NuGet 包中的**编译期引用**；
- 热更新源码或游戏未经授权的原始文件。

这些文件的角色不同。项目里出现几千处红线时，优先排查一个核心引用是否缺失，而不是逐个改类。

延伸：[常见问题](unity/troubleshooting.md)、[SDK 入门](sdk/getting-started.md)。
