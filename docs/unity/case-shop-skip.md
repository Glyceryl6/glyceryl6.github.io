# 案例六：商店跳过（数据优先，不读界面文字）

**目标**：在卡牌商店/遗物购买窗口中，如果**所有未售出的商品都买不起**，自动离开或取消；只要还买得起一件，就什么都不做。

难点不在“点按钮”，而在**判断该不该点**。这个案例说明什么时候该读数据结构、什么时候必须读渲染后的界面文本，以及为什么不能靠正则扫界面。

## 一、卡牌商店：读数据

热更新源码 `UI.LandShopWindow` 里有几个关键字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `shoppingPlayer` | `BattlePlayerData` | 正在购物的玩家 |
| `CardGoods` | `List<(int cardId, int gold)>` | 当前货架：卡牌 ID 与价格 |
| `alreadyCards` | `RepeatedField<bool>` | 每一项是否已售出 |

界面上的 `btn_Leave` 绑定的是原版 `OnRequestLeaveShop`，内部会走 `RequestShopBuy(isClose: true)`——**这是正常的“离开商店”请求，不是强行隐藏窗口**。

```csharp
IntPtr ui = NativeGame.WindowPane(window);
IntPtr leave = FairyBridge.FieldValue(ui, "UI.UILandShopWindow", "btn_Leave");
IntPtr player = FairyBridge.FieldValue(window, "UI.LandShopWindow", "shoppingPlayer");
IntPtr offers = FairyBridge.FieldValue(window, "UI.LandShopWindow", "CardGoods");
if (leave == IntPtr.Zero || offers == IntPtr.Zero ||
    !NativeGame.TryReadGold(player, out int gold)) return;
```

`NativeGame.TryReadGold` 封装了 `Property.gold.Value` 的读取，并处理空引用；比直接链式取值安全。

### 读取泛型 List

`CardGoods` 是 `List<ValueTuple<int,int>>`，没有专门的包装类型，所以用底层反射：

```csharp
IntPtr listClass = Il2CppReflection.GetObjectClass(offers);
int count = Il2CppReflection.GetPropertyValue<int>(offers, listClass, "Count");
if (count <= 0 || count > 32) return;

IntPtr indexMethod = Il2CppReflection.FindMethodInHierarchy(listClass, "get_Item", 1);
if (indexMethod == IntPtr.Zero) return;
```

- `GetPropertyValue<int>`：读 `Count` 属性；
- `FindMethodInHierarchy`：`get_Item` 可能定义在父类/接口上，必须沿继承链找；
- `count` 范围检查：防止异常数据导致越界或卡死。

取每一项：

```csharp
IntPtr boxedIndex = Il2CppReflection.BoxValue(FairyBridge.Class("System.Int32"), i);
CardPrice offer = Il2CppReflection.InvokeGet<CardPrice>(indexMethod, offers, new[] { boxedIndex });
if (offer.Gold < 0 || offer.Gold > 100000000) return;
```

`CardPrice` 是本地定义的顺序布局结构（两个 `int`），与 `ValueTuple<int,int>` 的内存布局一致。**不要**把返回值当字符串或对象指针解释——这是 IL2CPP 里值类型返回值的常见坑。

### 跳过已售出的项

```csharp
IntPtr sold = FairyBridge.FieldValue(window, "UI.LandShopWindow", "alreadyCards");
```

`alreadyCards` 是 `RepeatedField<bool>`，用同样的 `Count`/`get_Item` 方式读取；如果售出列表比货架短，直接返回，不猜测。

### 决策

```csharp
if (remaining == 0 || gold >= minPrice) return;  // 还买得起，或者没有可买项
_handledShop = window;
NativeGame.Click(leave);
```

只记录“这个窗口已经处理过”，防止每 0.22 秒重复发离开请求。**买得起就不动**，这是和“自动购买”最关键的区别。

## 二、遗物购买：为什么必须读渲染文本

遗物窗口 `UI.LandRelicWindow` 的确认/取消按钮在 `UILandRelicWindow` 上：

```csharp
IntPtr sure = FairyBridge.FieldValue(ui, "UI.UILandRelicWindow", "btn_Sure");
IntPtr cancel = FairyBridge.FieldValue(ui, "UI.UILandRelicWindow", "btn_Cancel");
IntPtr desc = FairyBridge.FieldValue(sure, "UI.UILandRelic_Button_Sure", "txt_Desc");
```

原版 `ShowPurchase` 并不是把价格写进普通 `text`，而是通过 `SetVar` 填充模板。直接读 `GTextField.text` 可能拿到 `{needGold}` 这样的模板串，而不是数字。

正确做法是读 `GRichTextField` 渲染后的 HTML：

```csharp
IntPtr rendered = FairyBridge.GetObject(desc, "FairyGUI.GRichTextField", "richTextField");
string html = Il2CppReflection.InvokeGetString(
    FairyBridge.Method("FairyGUI.RichTextField", "get_htmlText", 0), rendered);

MatchCollection amounts = Regex.Matches(Regex.Replace(html ?? "", "<[^>]+>", ""), @"\d+");
if (amounts.Count != 1 || !int.TryParse(amounts[0].Value, out int cost)) return;
```

为什么要限制“只有一个数字”？因为文本里可能还有折扣、原价、说明等数字；解析不唯一时宁可放弃，也不猜价格。

然后拿**自己**的金币：

```csharp
if (!NativeGame.TrySelfPlayer(out IntPtr self) || !NativeGame.TryReadGold(self, out int gold)) return;
if (gold >= cost) return;
NativeGame.Click(cancel);
```

`TrySelfPlayer` 对应原版 `BattleLogic.GetSelfPlayerData()`；这里不能用 `shoppingPlayer`，因为遗物购买是“自己的购买”，`LandLogic.DealAskPurchaseRelic` 也只对 `IsSelf` 调用 `ShowPurchase`。

## 三、为什么不用正则扫界面文字

- 商店界面有折扣、已售罄、货币类型、数量等文本，正则很容易把“原价”当成“现价”；
- 界面文本是本地化过的，换语言就失效；
- 数据结构里有权威价格和售出状态，能直接判断。

例外是遗物窗口：价格只存在于渲染后的模板里，没有独立字段可读，所以才退一步解析 HTML——但仍然要求“数字唯一”才行动。

<figure class="doc-figure">
  <img src="assets/images/shop-skip.png" alt="卡牌商店与自动离开" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：卡牌商店货架">
    <span class="doc-figure-tag">图片占位</span>
    <strong>卡牌商店货架</strong>
    <span class="doc-figure-note">说明：商店界面中货架、价格、已售出状态与“离开”按钮的位置。</span>
    <span class="doc-figure-hint">放到 assets/images/shop-skip.png 即可自动显示</span>
  </div>
  <figcaption>图 1 · 建议配图：卡牌商店的货架与离开按钮。</figcaption>
</figure>

## 四、检查清单

- [ ] 价格从数据结构读，不从 UI 文本猜（遗物窗口例外，且要求数字唯一）
- [ ] 先排除已售出的项，再计算最低价
- [ ] 金币读取失败、数量异常、价格越界时直接返回
- [ ] 离开/取消用原版按钮的 `onClick`，不伪造 RPC
- [ ] 每个窗口只处理一次，避免重复请求
- [ ] 买得起时绝不自动操作
