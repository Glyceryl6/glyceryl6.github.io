# SDK Native API 一览

下面依据历史 SDK v0.12.0 的公开文档进行整理。类型名称与成员签名会随版本变化；**实际使用前应以已获得的 SDK 源码 XML 注释和编译器提示为准**。

| 类型 / 所在目录 | 职责 | 使用时注意 |
|---|---|---|
| `Il2CppNative`、`NativeTypedFields`（Runtime） | IL2CPP 方法、字段与 ABI 相关访问 | 校验类型布局；不要随意转换原生指针 |
| `NativeObjectLease`、`NativeGame`（Runtime） | 临时对象保活与状态查询 | 场景改变后重新检查有效性 |
| `NativeAssetLookup`、`NativeCatalogLookup`（Assets） | 资源名与索引查询 | 资源和类型元数据会随版本变化 |
| `NativeActionButton`、`NativeToggleControl`（Controls） | 原生按钮和交互控件 | 在 UI 主线程、资源加载之后访问 |
| `FairyBridge`、`NativeUiLayout`（Widgets） | FairyGUI 就绪检测与布局计算 | `Ready()` 不代表具体页面已经创建 |
| `NativeSdkServices`（Native） | 提供翻译、日志和样式回调 | 历史版本是进程级共享配置，避免竞争覆盖 |

## 示例：不依赖进程内对象的布局计算

```csharp
using AstralParty.Modding.SDK.Native;

// 示例仅用于说明托管的尺寸计算，不访问游戏进程。
float scale = NativeUiLayout.UniformScale(1280, 720, 640, 360);
float captionWidth = NativeUiLayout.EstimateCaptionWidth("开始", 28f);
```

## 示例：状态检查的思路

```csharp
using AstralParty.Modding.SDK.Native;

// 仅在合法的测试环境、适当的 UI 生命周期调用。
if (!FairyBridge.Ready())
{
    return;
}

// 再检查所需资源包及窗口；不要缓存跨场景的指针。
```

这两段是历史 API 用法示意，不构成可直接加载任意游戏的完整插件，也不包含游戏资源定位或注入操作。

继续阅读：[生命周期与常见错误](sdk/lifecycle.md)。
