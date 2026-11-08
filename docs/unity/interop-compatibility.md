# 定制 Il2CppInterop：版本核对与兼容性边界

一些 HybridCLR 环境的桥接行为与普通 IL2CPP 不同。SNWCreations 在公开的 [Il2CppInterop PR #251](https://github.com/BepInEx/Il2CppInterop/pull/251) 讨论了这类兼容性问题，包括解释执行方法的处理及增量代理程序集。它是**技术讨论和开源实现**，不是针对任何商业游戏的使用授权。

本页保留旧 Wiki 中具有普遍意义的兼容性经验；**不会公开私有项目的注入流程、游戏热更新源代码、规避保护机制的操作步骤或未授权二进制**。

## 重点核对的内容

| 范围 | 需要确认 |
|---|---|
| Runtime | 实际加载的 `Il2CppInterop.Runtime` 版本和 API |
| Common | `Il2CppInterop.Common` 与 Runtime 的依赖是否匹配 |
| HarmonySupport | Hook 桥接的兼容性、版本和调用约定 |
| Generator | 代理生成逻辑是否对应目标运行时与元数据结构 |
| BepInEx | 插件宿主和上述程序集是否来自兼容的构建集合 |

**同名 DLL 不等于同一个程序集身份**；同名程序集同时从不同目录加载也可能引发 `TypeLoadException` / `MissingMethodException`。记录版本、哈希、依赖树和原始构建日志有助于复现问题。

## 对自有或明确授权的测试项目

1. 固定软件依赖的源码提交 SHA 与构建环境。
2. 在隔离的测试目录完成开源库构建，并核验产物的程序集身份。
3. 逐层测试类型加载、对象生命周期、异常恢复与基本日志。
4. 出现原生内存访问异常时停止测试，恢复已验证的依赖组合。

不要把不同版本的核心库随意混合，也不要将编译成功当成运行安全。关于依赖工程的错误，请看[构建指南](unity/build-and-references.md)。

参考：[SNWCreations Il2CppInterop](https://github.com/SNWCreations/Il2CppInterop)、[PR #251](https://github.com/BepInEx/Il2CppInterop/pull/251)。
