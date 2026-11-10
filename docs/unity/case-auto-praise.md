# 案例五：监听结算窗口并自动点赞

**目标**：在战斗结算界面出现时，自动点击原版的“点赞”按钮。既不改协议，也不伪造请求，只代替玩家按下那个按钮。

这个案例适合用来学习三件事：**怎么确认窗口出现、怎么从窗口对象里读到状态字段、怎么安全地触发一次原生点击。**

## 一、先看原版做了什么

热更新源码里，结算面板是 `UI.BattleSettlementPanel`，界面对象是 `UI.UIBattleSettlementPanel`。它用一个 `step` 控制器切换结算阶段：

| `step` 索引 | 阶段 | 相关控件 |
|---|---|---|
| 0 | 初始 | — |
| 1 | 胜利/失败展示 | `com_Winner`（`UIBattleSettlement_Com_ShowWiner`） |
| 2 | 玩家数据列表 | `com_ShowTime.com_Player1` ~ `com_Player4` |
| 3 | 结算/下一局 | `com_Balance` 等 |

点赞按钮有两处：

- 阶段 1 的胜利者卡片上：`com_Winner.btn_Praise`，是否显示由同级的 `isWinner` 控制器决定；
- 阶段 2 的每个玩家条目上：`com_PlayerN.btn_Praise`（`UIBattleSettlement_Com_Item`），每个按钮自带 `isFinish` 控制器记录“是否已点过”。

所以自动点赞不能只看“界面上有没有按钮”，还要看**当前在哪个阶段、按钮属于谁、是否已经完成**。

## 二、找到当前面板

```csharp
if (!Plugin.AutoPraisePlayers.Value) return;

if (!NativeGame.TryUiManager(out IntPtr manager)) return;
IntPtr panel = FairyBridge.GetObject(manager, "UI.UIManager", "currentPanel");
if (!NativeGame.IsInstanceOf(panel, "UI.BattleSettlementPanel")) return;
```

三个 SDK 方法的分工：

| 方法 | 为什么用它 |
|---|---|
| `NativeGame.TryUiManager` | 统一处理“UIManager 还没创建”的情况，返回 `false` 而不是抛异常 |
| `FairyBridge.GetObject` | 读取原生字段/属性；`UIManager.currentPanel` 是当前显示的面板 |
| `NativeGame.IsInstanceOf` | 判断面板类型，等价于 `panel is BattleSettlementPanel`，避免误把其它面板当结算页 |

**不要**用“类名里有没有 Settlement”之类的字符串匹配——原生对象可能被复用，类型判断才可靠。

## 三、读取阶段与状态

```csharp
IntPtr ui = FairyBridge.GetObject(panel, "UI.BattleSettlementPanel", "UIObject");
IntPtr step = FairyBridge.FieldValue(ui, "UI.UIBattleSettlementPanel", "step");
int index = NativeGame.ControllerIndex(step);
```

`FairyBridge.FieldValue` 与 `GetObject` 的区别：`FieldValue` 直接读字段（包括私有字段），`GetObject` 走属性/字段解析；这里 `step` 是 UI 对象的公开字段，用 `FieldValue` 更直接。`NativeGame.ControllerIndex` 把 FairyGUI 的 `Controller` 转成整数索引，省去手动读 `selectedIndex`。

阶段 1 还要判断“赢的是不是别人”：

```csharp
IntPtr winner = FairyBridge.FieldValue(ui, "UI.UIBattleSettlementPanel", "com_Winner");
IntPtr isWinner = FairyBridge.FieldValue(winner, "UI.UIBattleSettlement_Com_ShowWiner", "isWinner");
if (isWinner == IntPtr.Zero || NativeGame.ControllerIndex(isWinner) != 1) return;
```

`isWinner` 控制器为 1 时，界面展示的是“别人获胜”的卡片，才有可点赞对象；自己赢的时候不点。

阶段 2 要逐个玩家检查：

```csharp
IntPtr item = FairyBridge.FieldValue(showTime, "UI.UIBattleSettlement_Com_ShowTime", "com_Player" + i);
IntPtr praise = FairyBridge.FieldValue(item, "UI.UIBattleSettlement_Com_Item", "btn_Praise");
IntPtr state = FairyBridge.FieldValue(praise, "UI.UIBattleSettlement_Button_OperatePlayer", "isFinish");
if (state == IntPtr.Zero || NativeGame.ControllerIndex(state) != 0) continue;
```

`isFinish == 0` 表示“还没点过”。这个状态必须读，不能只靠“我点过了”的本地集合——玩家自己点过、或别的插件点过，控件状态都会变。

## 四、判断“真的能点”

```csharp
NativeGame.IsVisible(praise) && NativeGame.IsOnStage(praise) &&
!FairyBridge.GetBool(praise, "FairyGUI.GObject", "grayed")
```

- `IsVisible`：控件自身是否可见；
- `IsOnStage`：是否已经挂到舞台（FairyGUI 里“创建了”不等于“显示了”）；
- `grayed`：原版是否把它置灰（冷却、已完成等）。

三层都满足才调用 `NativeGame.Click(praise)`。`Click` 触发的是原版 `onClick`，也就是原版自己的点赞 RPC、冷却与动画流程——**不自己拼请求**，是这类功能最重要的边界。

## 五、节流与去重

```csharp
_clickedButtons.Add(praise);   // 同一控件只点一次
_nativeGame.Click(praise);
break;                          // 每个 tick 只点一个
```

- 记录 `IntPtr` 集合，避免同一按钮重复点击；
- 每 0.3 秒最多处理一次，且一次只点一个，给原版动画与请求留时间；
- 面板切换时清空集合（`panel != _lastPanel`）。

> 注意：原生对象指针可能被复用。集合只在“同一个面板实例”内有效，面板变化必须清空。

<figure class="doc-figure">
  <img src="assets/images/auto-praise.png" alt="结算界面自动点赞" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：结算界面自动点赞">
    <span class="doc-figure-tag">图片占位</span>
    <strong>结算界面自动点赞</strong>
    <span class="doc-figure-note">说明：结算页玩家列表与点赞按钮的位置，最好标出“已点赞/未点赞”两种状态。</span>
    <span class="doc-figure-hint">放到 assets/images/auto-praise.png 即可自动显示</span>
  </div>
  <figcaption>图 1 · 建议配图：结算界面的点赞按钮。</figcaption>
</figure>

## 六、检查清单

- [ ] 先判断 `currentPanel` 类型，不靠名字猜
- [ ] 读 `step` 与 `isWinner`/`isFinish` 状态，而不是只看按钮存在
- [ ] `IsVisible` + `IsOnStage` + `grayed` 三项都检查
- [ ] 用 `NativeGame.Click` 触发原版逻辑，不伪造 RPC
- [ ] 同一控件只点一次，面板切换清空记录
- [ ] 每个 tick 最多点一个，留出网络与动画时间
