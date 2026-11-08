# SDK 接入与项目组织

适用：获得 SDK 源代码使用许可、并在自己拥有或明确授权的 Unity IL2CPP 测试环境中开发。

## 项目结构建议

```text
MyWorkspace/
├── AstralParty.Modding.SDK/
│   ├── AstralParty.Modding.SDK.csproj
│   ├── Native/
│   │   ├── Runtime/
│   │   ├── Controls/
│   │   ├── Widgets/
│   │   └── Assets/
│   └── build/
└── MySampleMod/
    ├── MySampleMod.csproj
    └── Plugin.cs
```

统一 SDK 工程从 v0.11.0 起包含 Native 实现，**不再存在独立的 SDK.Native 项目或 DLL**。

## 自有项目的项目引用

```xml
<ItemGroup>
  <ProjectReference Include="..\AstralParty.Modding.SDK\AstralParty.Modding.SDK.csproj" />
</ItemGroup>
```

`ProjectReference` 只表示项目依赖关系。如果消费者直接使用 Unity/IL2CPP 类型，它自己的工程仍可能需要相应的编译期代理引用；不要假设 SDK 会自动传递任意外部文件引用。

## 构建前检查

```powershell
dotnet --info
dotnet restore .\MySampleMod.csproj
dotnet build .\MySampleMod.csproj -c Release --no-restore
```

- `TargetFramework`、NuGet 包和被引用 SDK 的目标框架必须兼容。
- 游戏相关 DLL / 代理库仅在有权使用和分发的范围内保管，不上传公共文档站。
- 本机绝对路径写在不跟踪的 `*.Local.props` 中，不进入 Git。
- 改动 Native SDK 后需要重新编译依赖它的项目。

参考：[构建引用排查](unity/build-and-references.md)和[统一命名空间迁移](sdk/migration.md)。
