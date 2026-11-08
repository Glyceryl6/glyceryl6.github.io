# 从旧版 SDK 迁移

> 以下是根据 v0.10.x 至 v0.12.0 历史变更整理的迁移清单，并非声明所有第三方程序集能无修改兼容。

| 旧组织方式 | v0.12.0 组织方式 | 需要进行的操作 |
|---|---|---|
| 独立 `AstralParty.Modding.SDK.Native.dll` | 合并到 `AstralParty.Modding.SDK.dll` | 删除旧项目引用，重新编译依赖者 |
| `SDK.Native.Interop` | `SDK.Native` | 更新 `using`、类型全名 |
| `SDK.Native.UI` | `SDK.Native` | 更新命名空间 |
| SDK 根目录零散 Interop / UI | `Native/Runtime`、`Controls`、`Widgets` 等 | 更新源文件路径及项目结构 |
| SDK 内空占位类 | 由宿主自行实现 | 不引用不存在的 SDK 类型 |

典型命名空间修改：

```diff
-using AstralParty.Modding.SDK.Native.Interop;
-using AstralParty.Modding.SDK.Native.UI;
+using AstralParty.Modding.SDK.Native;
```

## 更新检查

1. 备份旧版本并记录使用到的具体公共 API。
2. 同步更新 SDK 与依赖者的源代码和项目引用。
3. 清理旧的二进制副本，不要让同名类型以两个程序集版本同时出现。
4. 重新还原包、编译，并在有权使用的测试环境中验证生命周期。
5. 遇到 API 签名变化，回到 SDK 源码的 XML 注释与测试，不要只替换文件名。

因为类型**所属程序集和命名空间**都可能改变，直接覆盖旧 DLL 不能代替重新编译。
