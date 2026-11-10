# 案例七：快捷键打开快捷短语 / 表情

**目标**：在对局中按下一个键，展开游戏原生的快捷短语（或表情）列表。不新建窗口，也不自己发聊天请求。

这是[案例一：快捷键](unity/case-keybinds.md)的延伸：按键本身不复杂，**难的是确认“现在能不能开”**。

## 一、原版窗口是异步出现的

热更新源码里，`UI.ExpressionWindow` 由 `BattleLogic.ReadyBattleUI` 异步创建并显示。也就是说：

- 战斗还没加载完时，缓存字段可能是 `IntPtr.Zero`；
- 即使字段有值，窗口也可能还没 `Show`；
- 某些模式/场景会禁用聊天，窗口根本不会出现。

所以顺序必须是：**先确认在对局里 → 再确认窗口正在显示 → 最后确认按钮可点。**

```csharp
if (!NativeGame.TryUiManager(out IntPtr manager) ||
    !NativeGame.IsBattlePanel(manager)) {
    Warn("No active battle panel/scene");
    return;
}

IntPtr window = NativeGame.CachedWindow(manager, "_cachedExpressionWindow");
if (!NativeGame.IsShowing(window)) {
    Warn("Native ExpressionWindow is not showing (battle UI loading or mode restricts chat)");
    return;
}
```

| 方法 | 为什么用它 |
|---|---|
| `NativeGame.IsBattlePanel` | 判断当前 UI 是否属于战斗场景，避免在大厅按 F7 也尝试打开 |
| `CachedWindow(manager, "_cachedExpressionWindow")` | 读取 `UIManager` 里缓存的窗口字段；不同版本字段名可能变化，集中在这里便于维护 |
| `NativeGame.IsShowing` | 同时处理空指针、未显示、已销毁三种情况 |

**不要**把 `CachedWindow` 的非空当成“窗口存在且可用”——这正是它被单独封装的点。

## 二、按原版按钮，而不是自己展开列表

```csharp
IntPtr button = FairyBridge.FieldValue(window, "UI.ExpressionWindow",
    expression ? "_btn_OpenExpr" : "_btn_OpenChat");
```

这两个是 `ExpressionWindow` 的私有字段：

| 字段 | 作用 |
|---|---|
| `_btn_OpenExpr` | 展开表情列表 |
| `_btn_OpenChat` | 展开快捷短语列表 |

它们是原版已经绑定好事件的 `GButton`。点击它会走原版的展开动画、列表填充、输入焦点处理；如果自己创建 `GList` 或直接改 `visible`，很容易出现列表空白、焦点丢失、与地图操作抢输入。

```csharp
if (!NativeGame.IsVisible(button) || !NativeGame.IsOnStage(button) ||
    FairyBridge.GetBool(button, "FairyGUI.GObject", "grayed")) {
    Warn("Native chat/emoji control is hidden, disabled, or off stage");
    return;
}
NativeGame.Click(button);
```

三项检查缺一不可：

- `IsVisible`：窗口显示不代表按钮显示（不同平台布局不同）；
- `IsOnStage`：FairyGUI 对象可能已创建但未挂到舞台；
- `grayed`：禁用/冷却状态，点了也不会展开。

## 三、失败了要告诉用户原因

```csharp
private void Warn(string detail) {
    float now = Time.realtimeSinceStartup;
    if (now < _nextWarning) return;
    _nextWarning = now + 8f;
    Plugin.ModLog.LogWarning("MOD chat shortcut skipped: " + detail);
}
```

快捷键“没反应”是最难排查的反馈。把原因写进日志，并且做 8 秒节流，既能让用户查日志，也不会刷屏。

## 四、和快捷键分发的关系

`HotfixWatcher.PollHotkeys()` 里用 `WasPressed(Plugin.KeyQuickChat.Value)` 判断按键，然后调用 `TryOpen(false)`。分发层只负责“哪个键被按下”，`QuickChatService` 只负责“现在能不能开”：

- 按键解析失败 → 分发层日志；
- 场景不对/窗口没就绪/按钮不可用 → 本服务的 `Warn` 日志。

两层分开之后，排查时能一眼看出问题在哪一层。

<figure class="doc-figure">
  <img src="assets/images/quickchat.png" alt="快捷短语与表情界面" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：快捷短语与表情界面">
    <span class="doc-figure-tag">图片占位</span>
    <strong>快捷短语与表情界面</strong>
    <span class="doc-figure-note">说明：对局中展开的快捷短语列表，以及对应的表情页签与按钮位置。</span>
    <span class="doc-figure-hint">放到 assets/images/quickchat.png 即可自动显示</span>
  </div>
  <figcaption>图 1 · 建议配图：原生快捷短语/表情面板。</figcaption>
</figure>

## 五、检查清单

- [ ] 先判断是否在战斗场景
- [ ] 用 `IsShowing` 判断窗口，而不是字段非空
- [ ] 读取原版 `_btn_OpenExpr` / `_btn_OpenChat`，不自己造列表
- [ ] `IsVisible` + `IsOnStage` + `grayed` 都检查
- [ ] 失败原因写日志且节流
- [ ] 不伪造聊天或表情请求
