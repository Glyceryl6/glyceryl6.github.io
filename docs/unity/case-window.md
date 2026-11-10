# 案例三：窗口与场景监听

**目标**：知道玩家现在在哪个界面、什么时候进入对局、什么时候回到大厅，从而决定显示什么、隐藏什么、暂停什么。

这类功能本身没有界面，却是所有常驻功能的基础：面板要在正确的时候出现，覆盖层不能盖住设置页，统计不能在大厅里空转。

## 一、用“轮询 + 变化检测”，不要每帧重建

最简单的做法是每帧问一次“当前最上层窗口是谁”。但每帧做字符串比较和反射很浪费，而且容易在窗口切换的瞬间重复触发。

实际可用的结构是：**低频率轮询 + 只在变化时执行**。

```csharp
private void Update()
{
    float now = Time.unscaledTime;
    if (now < _nextCheck) return;
    _nextCheck = now + 0.25f;               // 4 次/秒足够

    try
    {
        IntPtr current = CurrentVisibleWindow();   // 读原生窗口栈
        if (current != _lastWindow)
        {
            OnWindowChanged(_lastWindow, current);
            _lastWindow = current;
        }

        SetOverlayPaused(FightVisible() || ModWindowOpen() || PauseMenuVisible());
    }
    catch (Exception ex)
    {
        LogOnce(ex);                        // 同类异常只报一次
    }
}
```

两个要点：

- **轮询间隔不必太小。** 250ms 对“界面切换”完全够用；真正的即时响应应该交给原版事件或 Hook。
- **异常只报一次。** 如果方法签名变了，每帧刷同样的异常会把日志淹没。

## 二、判断“当前界面”时，跳过浮层

游戏的窗口栈里不只有“页面”，还有提示、加载、Toast 这类浮层。如果直接取最上层：

- 玩家看到提示的几秒里，你会以为当前界面是提示页；
- 加载过程中，所有依赖“当前界面”的逻辑都会停摆。

所以判断时要显式排除：

```csharp
// 结构示意：跳过浮层，取真正显示的页面
private static bool IsTransient(IntPtr window)
{
    string name = TypeNameOf(window);
    return name is "UI.TipsWindow" or "UI.TipsWindows" or "UI.LoadingWindow";
}
```

项目里这条规则写得比较直白：检查当前窗口时优先取“实际显示”的窗口，并把提示层排除在外。加这条规则之前，面板一直以为自己还停在提示界面。

## 三、对局检测

判断“是否在对局”，最稳的依据是原版的战斗窗口是否显示（例如 `UI.FightWindow`），而不是自己维护一个状态机：

```csharp
if (FightWindowVisible())
{
    // 对局内：显示战斗覆盖层，暂停大厅相关轮询
}
else
{
    // 对局外：隐藏覆盖层，恢复大厅逻辑
}
```

项目里把“暂停条件”作为参数传给每个功能，例如 `_replays.Tick(now, ModWindowOpen || PauseMenuVisible)`。这样每个功能不需要各自判断，也不会出现“面板关着但功能还在跑”的情况。

## 四、场景切换时要真正清理

只把字段置空是不够的。FairyGUI 对象挂在 `GRoot` 下，场景切换后旧对象仍然存在：

- 残留的标题会盖在新界面上；
- 下次打开时新旧两层叠在一起；
- 原版关闭设置窗口时，MOD 的滚动容器没有释放，再进入时滚动位置和分组框都会错位。

正确的做法是：**把自建控件挂在明确的父节点上，并在窗口关闭、场景切换时显式销毁**，而不是依赖“下次打开时重建”。

## 五、菜单类 UI 要“立即清理”，不要等下一帧

原版的标记/目标菜单在鼠标按下时就会关闭。如果你等到下一帧再检查 `selected`，菜单已经没了，清理逻辑永远不会执行，扩展列表就会残留。

结论是：**在点击回调里立即清理**，不要依赖轮询。

## 六、不要陷入“重建循环”

有一版为了“资源没就绪也能用”，每 0.2 秒重建整套原生模板。结果资源一直没就绪，重建一直继续，对象数量从两万级涨到几百万。

修正方式：

- 先复用一行已存在的原生控件，保证面板可用；
- 资源就绪后再重建一次，并保留开关状态；
- 重试要有上限和退避，不要无限循环。

<figure class="doc-figure">
  <img src="assets/images/overlay-in-battle.png" alt="对局中的 MOD 覆盖层" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：对局中的 MOD 覆盖层">
    <span class="doc-figure-tag">图片占位</span>
    <strong>对局中的覆盖层</strong>
    <span class="doc-figure-note">说明：进入战斗后出现的 MOD 面板或信息层，在大厅、设置页与暂停菜单中自动隐藏。</span>
    <span class="doc-figure-hint">后续替换为实际截图或 assets/images/ 下的图片</span>
  </div>
  <figcaption>图 1 · 建议配图：同一功能在“对局”和“大厅”两种状态下的对比。</figcaption>
</figure>

## 检查清单

- [ ] 轮询有间隔，不是每帧反射
- [ ] 窗口切换只在变化时处理
- [ ] 判断当前界面时跳过提示层与加载层
- [ ] 对局判断依赖原版窗口状态
- [ ] 场景切换/关窗时显式销毁自建控件
- [ ] 菜单类 UI 在点击回调里立即清理
- [ ] 重建有上限与退避，不会无限循环
