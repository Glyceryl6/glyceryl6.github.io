# 案例一：快捷键

**目标**：在对局中按下一个组合键，打开 MOD 面板或触发一个功能，并且不和游戏原有按键打架。

这是最容易做、也最容易做坏的一类功能。做完之后你会同时踩到三个问题：按键在什么时候被读取、读不到输入怎么办、以及按键录入本身和游戏 UI 的冲突。

## 一、把按键存成字符串，而不是枚举

配置里存 `"Ctrl+Shift+B"` 这样的文本，比存 `KeyCode` 枚举值更稳：

- 配置可读，用户能直接看懂；
- 不受不同 Unity 版本枚举值变化影响；
- 用 `"None"` 表示禁用，语义清晰。

```csharp
internal static class ModHotkeys
{
    internal static ConfigEntry<string> KeyQuickChat = null!;

    internal static void Bind(ConfigFile config)
    {
        KeyQuickChat = config.Bind(
            "Hotkeys", "QuickChat", "F7",
            "打开局内快捷短语；None 表示禁用。");
    }
}
```

解析交给一个小工具（项目内的 `HotkeyBinding`，不是公开库）：

```csharp
if (!HotkeyBinding.TryParse(raw, out HotkeyBinding binding)) return false;
return binding.IsDown();
```

## 二、在 Update 里轮询，而不是注册事件

Unity 的 `Input.GetKeyDown` 只在“按下的那一帧”为真，所以必须在每帧调用的位置读取。项目里放到常驻组件的 `Update`：

```csharp
private void PollHotkeys()
{
    if (!_legacyInputAvailable) return;          // 输入不可用时直接退出
    if (_model.IsCapturing) { _model.UpdateCapture(); return; }  // 正在录入按键

    if (WasPressed(ModHotkeys.KeyQuickChat.Value))
        RunFeature("quick-chat", OpenQuickChat);
}
```

三个细节：

1. **录入中的按键不能同帧触发。** 否则用户按下新键的瞬间，功能就被打开了。
2. **MOD 设置页打开时不要分发。** 否则输入框里的字母会触发功能，返回即可。
3. **先判断“在不在对局”，再判断按键。** 很多快捷键只在对局内有效，不对局时按下去应该静默跳过，但要写日志说明原因。

## 三、输入读不到时，要能优雅退出

在 IL2CPP 环境里，`Input.GetKeyDown` 有可能整体不可用（例如项目禁用了旧输入系统）。这时不该每帧抛异常刷屏，而是**关闭一次、记录一次、以后不再调用**：

```csharp
private bool WasPressed(string raw)
{
    if (!HotkeyBinding.TryParse(raw, out var binding)) return false;
    try
    {
        return binding.IsDown();
    }
    catch (Exception ex)
    {
        _legacyInputAvailable = false;
        Logger.LogWarning("Legacy Input.GetKeyDown is unavailable: " + ex.Message);
        return false;
    }
}
```

日志里出现这一行，就说明后面的“按键没反应”不是你的功能坏了，而是输入层根本拿不到。

## 四、分清“按键没识别”和“功能失败”

在真正执行功能之前打一行日志：

```csharp
private static void RunFeature(string name, Action action)
{
    Logger.LogInfo("MOD shortcut recognized: " + name);
    CrashBreadcrumbs.Mark("shortcut-before: " + name);
    try { action(); CrashBreadcrumbs.Mark("shortcut-after: " + name); }
    catch (Exception ex) { Logger.LogError(name + " failed: " + ex); }
}
```

没有这行日志时，“按了没反应”会有两种完全相反的解读；有了它，就能一眼区分：

- 日志有 `recognized`，功能没出来 → 问题在原生 UI 或功能逻辑；
- 日志没有 `recognized` → 问题在按键解析、输入层或当前场景判断。

## 五、最麻烦的一处：ESC

用户要改键，就得先“录入按键”。而 ESC 在这类游戏里通常已经被设置窗口占用：`SettingWindow.OnKeyDown` 会把它解释成“关闭设置”。

所以录制 ESC 的前提是：**能安全地拦截这一个按键，同时不影响原版行为。** 项目的做法是：

1. 只在“正在录制”时拦截，平时完全不碰；
2. 只 Hook 确认过的 HybridCLR 解释器方法，且安装前检查是否已被占用；
3. 安装失败就放弃拦截，保留原版 ESC 行为，并把“清除绑定”改到 Backspace。

```csharp
// 结构示意：先验证，再安装，失败就退回原版行为
IntPtr method = FairyBridge.TryMethod("UI.SettingWindow", "OnKeyDown", 1);
if (method == IntPtr.Zero ||
    !HybridCLRCompat.IsInterpreterMethod(method) ||
    HookEngine.IsHooked(method))
{
    Logger.LogWarning("ESC 拦截不可用，保留原版行为；Backspace 仍可清除绑定。");
    return;
}
```

这背后就是[安装 Hook 的判断顺序](unity/pitfalls.md)：**先确认方法就绪且是解释执行，再安装；安装失败不要重试到天荒地老。**

## 六、还有两个容易被忽略的冲突

- **和原版功能抢键。** 曾经把镜头辅助绑在 Alt 上，和原版的标记输入撞车，最后换成更冷门的右 Ctrl。绑键前先翻一遍游戏的按键设置页。
- **输入热区太大。** 为了“点哪都能操作”而铺一层全屏热区，结果地图拖不动了。热区只应覆盖真正需要响应的区域，列表内的滚轮只滚列表。

<figure class="doc-figure">
  <div class="doc-figure-frame" role="img" aria-label="占位图：MOD 快捷键设置界面">
    <span class="doc-figure-tag">图片占位</span>
    <strong>快捷键设置界面</strong>
    <span class="doc-figure-note">说明：设置页中的按键绑定列表，展示组合键、未绑定状态，以及“恢复默认”按钮。</span>
    <span class="doc-figure-hint">后续替换为实际截图或 assets/images/ 下的图片</span>
  </div>
  <figcaption>图 1 · 建议配图：快捷键分页（含“未绑定”与冲突提示）。</figcaption>
</figure>

## 检查清单

- [ ] 快捷键写在配置里，支持 `None` 禁用
- [ ] 录入中的按键不会同帧触发
- [ ] 设置页打开时不分发按键
- [ ] 输入不可用只报一次警告，不刷屏
- [ ] 每次命中都有 `recognized` 日志
- [ ] 功能异常不会连带其它快捷键失效
- [ ] ESC / 原版按键冲突有回退方案
