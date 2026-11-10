# 案例八：拦截与替换（截图提示、单人开局）

前七个案例都是“读状态 → 点原生按钮”。这一篇做两件更深入的事：

1. **替换原生流程的一部分**：截图后不使用原版提示，而是写文件成功后再显示自己的提示；
2. **拦截一个方法调用**：在房主点“开始”时改变参数，取消机器人补位。

两者都涉及 Hook 或私有方法调用，属于风险较高的操作。原则仍然是：**尽量复用原版，只在必要的一层做替换。**

## 一、自定义截图提示

### 原版做了什么

热更新源码 `UI.BattleSettlementPanel.ScreenShot()`：

```csharp
SimpleSingletonProvider<UIManager>.inst.systemTips.HideImmediately();
ScreenCapture.CaptureScreenshot(savePath + "/" + textureName);
await UniTask.DelayFrame(2);
SimpleSingletonProvider<UIManager>.inst.systemTips.ShowTips(
    string.Format(1008.GetLocal(UIStringType.Achieve), savePath + "/" + textureName), 2f);
```

三件事值得注意：

- **截图前先收起提示**，否则提示会被拍进截图；
- 截图是异步完成的，原版等两帧再提示；
- 原版提示直接显示完整路径，对玩家不友好。

### MOD 的做法

MOD 不替换 `ScreenShot()`，而是在自己的截图流程里复刻同样的顺序：

```csharp
ScreenshotToastService.HideCurrentTip();            // 先收起旧提示
ScreenCapture.CaptureScreenshot(_screenshotFile);   // 再截图
// 确认文件已经写好之后
ScreenshotToastService.TryShow(message, 5f, out string reason);
```

`ScreenshotToastService` 只负责“显示提示”，不负责截图；截图由 `HotfixWatcher` 在确认 `ScreenCaptureModule` 可用后发起。这样职责清晰，也避免为了改一句提示去 Hook 一个按钮回调。

### 为什么这样拿提示窗口

```csharp
IntPtr managerClass = Il2CppReflection.FindClass("UI.UIManager");
IntPtr provider = Il2CppAPI.GetParentClass(managerClass);
IntPtr manager = Il2CppReflection.GetStaticFieldValue(provider, "_inst");
IntPtr tips = Il2CppReflection.InvokeMethod(_getTips, manager, null);
```

| 细节 | 原因 |
|---|---|
| `_inst` 在父类上 | `UIManager` 继承自 `MonoSingletonProvider<UIManager>`，单例字段在父类，必须 `GetParentClass` 再找 |
| `get_systemTips` 而不是字段 | 提示窗口由属性懒加载，字段可能还没赋值 |
| `ShowTips` 用 `Args<string,float>` | 同名重载可能不止一个，按参数类型选，避免调错 |
| 先检查 `manager`/`tips` 非空 | 主界面还没创建时，不能替游戏初始化 UI |

`TryShow` 返回 `false` 时带 `reason`，调用方只记日志、不弹错误框——提示只是锦上添花，失败不应该影响截图本身。

<figure class="doc-figure">
  <img src="assets/images/screenshot-toast.png" alt="自定义截图提示" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：自定义截图提示">
    <span class="doc-figure-tag">图片占位</span>
    <strong>自定义截图提示</strong>
    <span class="doc-figure-note">说明：结算页截图完成后，屏幕上方显示“已保存”一类的提示，而不是完整路径。</span>
    <span class="doc-figure-hint">放到 assets/images/screenshot-toast.png 即可自动显示</span>
  </div>
  <figcaption>图 1 · 建议配图：截图后的自定义提示。</figcaption>
</figure>

## 二、单人开局：拦截开始请求

### 原版流程

`UI.RoomWaitPanel` 的“开始”按钮绑定的是 `RequsetStart()`（源码里就是这个拼写）：

- 房主/人数/时间检查；
- 弹出确认；
- 调用 `RoomLogic.RequestStartGameC2S(isAddBot)`。

机器人补位由参数 `isAddBot` 决定。也就是说，**只点击按钮无法取消补位**——它会走默认的 `true` 分支。

### 为什么要 Hook

目标不是“点一下开始”，而是“用 `isAddBot: false` 开始”。这只能替换调用路径：

```csharp
IntPtr target = FairyBridge.TryMethod("UI.RoomWaitPanel", "RequsetStart", 0);
if (!HybridCLRCompat.IsInterpreterMethod(target) || HookEngine.IsHooked(target)) return;

HookHandle handle = HookEngine.Hook(target, StartDetour, "AstralProbe.RoomSoloStart");
if (!handle.IsValid || handle.Strategy != HookStrategy.InterpreterBridgeDetour) {
    handle.Unhook();
    return;
}
```

每一行都在防一件事：

| 检查 | 防什么 |
|---|---|
| `TryMethod` | 方法名/参数个数随版本变化，找不到就放弃 |
| `IsInterpreterMethod` | 热更新方法才适用解释器 Hook；AOT 方法要用原生签名 |
| `IsHooked` | 别人已经装过，重复安装会互相覆盖 |
| `Strategy == InterpreterBridgeDetour` | 只有这个策略是按方法隔离的，其它策略可能改到共享入口 |
| `Unhook` | 安装失败必须回滚，不能留下半装状态 |

拦截后：

```csharp
private static void InterceptStart(IntPtr panel) {
    if (_active != null && _active.TrySoloStart(panel)) return;
    _originalStart!(panel);
}
```

- 条件不满足（不是房主、房间人数不对、不是单人模式）→ 调用原方法，行为完全不变；
- 条件满足 → `CancelTime()` 取消倒计时，然后直接调用：

```csharp
NativeReferenceFields.Call(room, "RequestStartGameC2S",
    Il2CppReflection.BoxValue(FairyBridge.Class("System.Boolean"), false));
```

`RequestStartGameC2S` 是私有方法，没有公开包装，只能按签名反射调用；`false` 表示不补机器人。**不伪造响应**：请求失败就提示用户，状态仍由服务器决定。

### Hook 不可用时的退路

Hook 可能因为版本、策略或已被占用而失败。此时不能假装功能可用，也不能让“开始”仍然补机器人：

- 代码用 `NativeButtonPolling` 监听原生 `btn_Start` 的点击；
- 一旦检测到点击，直接走 `StartNoBots`，不再调用原按钮逻辑；
- 如果连这条路也不可用，就把开关恢复为“关闭”，而不是留下一个会误导人的选项。

### 界面与前置条件

- 在原生房间设置列表里追加一行（复用 `UIRoomSetting_Com_SetItem` 与下拉弹窗），而不是自建窗口；
- 只有房主能改：比较 `RoomInfo._MasterId` 与 `AccountLogic.GetPlayerID()`；
- 只对非匹配房间生效：`RoomInfo.IsMatchRoom == false`；
- 单人模式下把玩家列表缩到 1（`NativePreviewList.SetCount(list, 1)`），避免留下可点击的空位；
- 每次操作前用 `SafeToTouchRoom()` 确认当前面板仍是这个房间，防止指针被回收后误操作。

<figure class="doc-figure">
  <img src="assets/images/room-solo.png" alt="房间设置中的机器人补位开关" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：房间机器人补位开关">
    <span class="doc-figure-tag">图片占位</span>
    <strong>房间机器人补位开关</strong>
    <span class="doc-figure-note">说明：房间设置列表末尾的“机器人补位”行，以及设为“否”后只剩房主一行的玩家列表。</span>
    <span class="doc-figure-hint">放到 assets/images/room-solo.png 即可自动显示</span>
  </div>
  <figcaption>图 2 · 建议配图：房间设置中的机器人补位开关。</figcaption>
</figure>

## 三、这类操作的共同原则

1. **能复用就不替换**：截图只是换提示，不必 Hook 原版按钮；
2. **必须替换时，只改一层**：只改 `RequsetStart` 的分支，不动房间状态与网络层；
3. **失败要可回退**：Hook 失败有轮询退路，再失败就关闭功能；
4. **不伪造服务器结果**：请求由原版 RPC 发出，成功与否以服务器为准；
5. **不碰公平性**：单人开局只影响自己的房间，不修改他人对局与结算。

## 四、检查清单

- [ ] Hook 前验证解释器方法与策略，安装失败立即回滚
- [ ] 条件不满足时调用原方法，保持原版行为
- [ ] 私有方法调用带参数类型，失败有提示
- [ ] 有 Hook 不可用时的退路，且不会静默失效
- [ ] 每次触控前确认面板仍然存活
- [ ] 不修改服务器权威状态，不伪造响应
