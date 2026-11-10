# 案例二：自定义提示

**目标**：用游戏自带的提示条显示一句 MOD 消息，样式和原版一致，不需要自己做 UI。

这是最适合作为“第一个真正有用的功能”的案例：它只调用、不拦截，成功与否立刻可见，而且几乎不碰游戏规则。

## 一、找对入口

这类游戏通常有一个全局提示窗口，例如 `UI.SystemTipsWindow`，带一个 `ShowTips(string, float)` 方法。提示条会自己淡出，也会自动排队/覆盖。

要拿到它，需要两样东西：

| 需要的东西 | 从哪里来 |
|---|---|
| `UI.SystemTipsWindow` 的类指针 | 按类名查找 |
| 一个已经存在的提示窗口实例 | 从 `UIManager` 的单例静态字段取，再读它的 `systemTips` 属性 |

**关键前提：不要替游戏初始化 `UIManager`。** 单例不存在时说明游戏还没进入主界面，这时候应该直接返回，而不是自己 new 一个出来。

## 二、最小实现

```csharp
internal static class NativeTip
{
    private static IntPtr _managerClass;
    private static IntPtr _getSystemTips;
    private static IntPtr _showTips;

    private static bool Resolve(out string reason)
    {
        reason = "";
        _managerClass ??= Il2CppReflection.FindClass("UI.UIManager");
        if (_managerClass == IntPtr.Zero) { reason = "找不到 UI.UIManager"; return false; }

        _getSystemTips ??= Il2CppReflection.FindMethod(_managerClass, "get_systemTips", 0);
        if (_getSystemTips == IntPtr.Zero) { reason = "找不到 systemTips 属性"; return false; }

        var tipsClass = Il2CppReflection.FindClass("UI.SystemTipsWindow");
        if (tipsClass == IntPtr.Zero) { reason = "找不到 UI.SystemTipsWindow"; return false; }

        _showTips ??= Il2CppReflection.FindMethod(tipsClass, "ShowTips", 2);
        if (_showTips == IntPtr.Zero) { reason = "找不到 ShowTips"; return false; }
        return true;
    }

    internal static bool TryShow(string message, float seconds, out string reason)
    {
        if (!Resolve(out reason)) return false;

        IntPtr manager = Il2CppReflection.GetStaticFieldValue(_managerClass, "_inst");
        if (manager == IntPtr.Zero) { reason = "UIManager 尚未创建"; return false; }

        IntPtr tips = Il2CppReflection.InvokeMethod(_getSystemTips, manager, null);
        if (tips == IntPtr.Zero) { reason = "systemTips 尚未创建"; return false; }

        if (!IL2CPP.Method(_showTips).TryInvoke(tips, out _, message, seconds))
        {
            reason = "ShowTips 调用失败";
            return false;
        }
        return true;
    }
}
```

调用处只关心结果和原因：

```csharp
if (!NativeTip.TryShow("已保存", 2.5f, out string reason))
    Logger.LogWarning("提示不可用：" + reason);
```

## 三、四件必须处理的小事

### 1. 失败要说明原因

`TryShow` 返回 `false` 时把 `reason` 写进日志。否则你只会看到“没有提示”，无法判断是类名变了、单例没创建，还是方法签名不对。

### 2. 提示会互相覆盖

同一时间只有一条提示。连续触发多个功能时，要么合并成一条，要么排队；不要指望它们依次显示。

### 3. 截图前先清掉提示

如果功能是“截图”，要先收起当前提示再截，否则截图里会带上上一句提示。项目复用了原版的 `HideImmediately()`：

```csharp
// 结构示意：截图前清掉旧提示
IntPtr tips = Il2CppReflection.InvokeMethod(_getSystemTips, manager, null);
if (tips != IntPtr.Zero)
    Il2CppReflection.InvokeMethod(FairyBridge.Method("FairyGUI.Window", "HideImmediately", 0),
        tips, Array.Empty<IntPtr>());
```

### 4. 提示窗口会干扰“当前界面”的判断

如果你用“最上层窗口是谁”来判断当前界面，提示层（`UI.TipsWindow` / `TipsWindows`）会让你永远停在提示上。判断时要**显式跳过提示层与加载层**。

## 四、关于文字显示

有段时间，提示里的个别汉字不显示，第一反应是“字库缺字”或“MOD 写坏了字体”。后来确认：**这个游戏的字体是按需补字形的**——只有某个字第一次被用到时，才补进字体图集，所以个别字短暂缺失属于游戏自身行为，不是 MOD 缺陷。

真正需要 MOD 注意的是：

- **不要改写共享的字体、材质与字距参数。** 一旦共享对象被改坏，缺字会从“个别字”扩大成“整片文字消失”。
- 需要描边、阴影时，**在单个文字对象上复制一份参数**，而不是改全局字体。
- 如果发现“同一个字在 A 处正常、在 B 处消失”，优先检查 B 处的裁剪区域、文本框宽度与描边宽度，而不是换字体。

<figure class="doc-figure">
  <img src="images/native-tip.png" alt="游戏内自定义提示效果" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：游戏内自定义提示效果">
    <span class="doc-figure-tag">图片占位</span>
    <strong>游戏内提示效果</strong>
    <span class="doc-figure-note">说明：屏幕上方出现一条 MOD 消息，样式与游戏原生提示一致，并在数秒后淡出。</span>
    <span class="doc-figure-hint">后续替换为实际截图或 assets/images/ 下的图片</span>
  </div>
  <figcaption>图 1 · 建议配图：触发一次提示的完整画面。</figcaption>
</figure>

## 检查清单

- [ ] 类名、方法名、参数个数与当前版本一致
- [ ] 单例不存在时直接返回，不自行初始化
- [ ] 失败原因写入日志
- [ ] 连续提示有合并或排队策略
- [ ] 截图功能会先清掉提示
- [ ] 判断当前界面时跳过提示层
- [ ] 没有修改共享字体或材质
