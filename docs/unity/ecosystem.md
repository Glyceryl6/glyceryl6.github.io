# Unity MOD 生态：从 Mono 到 HybridCLR

要理解“为什么这套教程看起来和别处不一样”，先要知道这些教程各自站在哪个年代。同样是 Unity 游戏，脚本后端不同、热更新方案不同，可用的工具链就完全不同——**网上流传的绝大多数教程，仍然停留在第一代。**

## 三代技术栈

| 代际 | 脚本后端 | 代码在哪 | 主流框架 | 典型教程写法 |
|---|---|---|---|---|
| 第一代 · Mono | Mono | `Assembly-CSharp.dll` 等托管程序集 | BepInEx 5、MelonLoader | dnSpy 打开 DLL → 改 IL / 挂 Harmony |
| 第二代 · IL2CPP | IL2CPP（AOT） | 编译进 `GameAssembly.dll`，另有 `global-metadata.dat` | BepInEx 6 + Il2CppInterop、MelonLoader | 生成 interop 代理程序集 → 用代理类型写插件 |
| 第三代 · IL2CPP + HybridCLR | IL2CPP + 解释器 | AOT 代码 + 运行时加载的热更新程序集 | BepInEx 6 + 兼容 HybridCLR 的 Il2CppInterop | **几乎没有公开教程**，本书要补的就是这一段 |

三代之间不是平滑升级：第一代的“改 DLL 里的 IL”到了第二代就失效，第二代的“生成代理程序集”到了第三代又要额外处理解释器方法和后加载程序集。

<figure class="doc-figure">
  <img src="assets/images/stack-generations.png" alt="三代 Unity MOD 技术栈示意" loading="lazy"
       onload="this.parentNode.classList.add('is-loaded')"
       onerror="this.style.display='none'">
  <div class="doc-figure-frame" role="img" aria-label="占位图：三代技术栈示意">
    <span class="doc-figure-tag">图片占位</span>
    <strong>三代技术栈示意</strong>
    <span class="doc-figure-note">说明：Mono → IL2CPP → IL2CPP + HybridCLR 三层结构图，标注代码位置、加载器与代理程序集的关系。</span>
    <span class="doc-figure-hint">放到 docs/assets/images/stack-generations.png 即可自动显示</span>
  </div>
  <figcaption>图 1 · 建议配图：三代技术栈的结构对比。</figcaption>
</figure>


## 代表性游戏与框架

下面这些例子用来说明“每一代长什么样”，不构成对任何游戏 MOD 行为的评价或授权。

### Mono 时代

- **《Cities: Skylines》**：社区模组生态成熟，BepInEx 5 是常见加载器，经典模组如 *TM:PE*（交通管理）、*Move It*（批量移动）。
- **《Risk of Rain 2》**：BepInEx + R2API 的组合，*BetterUI* 之类的界面增强是常见入门项目。
- **《Valheim》**：BepInEx 生态，*Valheim Plus* 这类“改一组数值与规则”的模组很典型。
- 非 Unity 但常被拿来对照的：**《Stardew Valley》** 的 SMAPI、**《Terraria》** 的 tModLoader、**《Minecraft》** 的 Forge / Fabric / NeoForge。

Mono 时代的共同点是：**游戏逻辑以托管 DLL 形式躺在游戏目录里**，反编译、改 IL、运行时 Harmony 补丁都非常直接，所以教程多、门槛低。

### IL2CPP 时代

游戏把托管代码提前编译成原生代码，`Assembly-CSharp.dll` 不再存在。要做代码级 MOD，就必须借助中间层：

- **BepInEx 6 + Il2CppInterop**：生成一套“看起来像托管程序集”的代理，再把调用转发到原生运行时。
- **MelonLoader**：另一套支持 IL2CPP 的加载器。
- **Cpp2IL / Il2CppDumper**：还原类型与方法结构，是生成代理的前置工具。

这一代的代表作品里，不少是 IL2CPP 且 MOD 社区活跃的联机游戏，例如 **《Among Us》** 与 **《Lethal Company》**：社区主流方案已经是 BepInEx 6 的 IL2CPP 构建，经典模组如 *Town of Us*、*The Other Roles* 都属于“大量 Hook + 自定义界面”的类型。

但要注意：**IL2CPP 只是提高了门槛，并没有改变“代码在客户端”这个前提**。真正让教程断代的，是第三代。

### HybridCLR 时代

HybridCLR 在国内游戏团队里已经是常规方案：它扩展 IL2CPP 运行时，让游戏可以在启动后加载并**解释执行**新的托管程序集，从而获得接近 Mono 的热更新体验。

按 HybridCLR 官方[商业项目案例](https://www.hybridclr.cn/docs/8.15.0/other/businesscase)页的统计（数据截至 2024-02-02）：

- 使用 HybridCLR 的国内外商业游戏有数千款，已上线（App Store / Google Play）的超过一千款；
- App Store 中国区畅销榜前 200 名中，有 15 款使用 HybridCLR；
- 免费榜前 500 名中，有 51 款使用 HybridCLR；
- 在使用热更新技术的头部 Unity 游戏中，HybridCLR 占比约 **25%–35%**。

官方页面列出的项目包括《球球大作战》《月圆之夜》《三国杀 OL》《无期迷途》《元气骑士前传》《少女前线 2：追放》《深空之眼》《摩尔庄园》《流浪地球》《钢岚》《JUMP：群星集结》等；海外项目如 FunPlus 的 *Bingo Aloha* 也在其中。

**这意味着什么？** 大量“看起来是普通 Unity 游戏”的作品，其实同时具备两套代码：AOT 编译的原生部分，和启动后才加载的热更新程序集。传统 IL2CPP 教程只覆盖前者，于是出现了本文开头描述的现象：教程照着做，插件能编译，游戏一启动就崩。

## 国内与海外的差距

从公开资料看，HybridCLR 的文档与社区讨论以中文为主，官方文档提供了英文翻译，但英文世界的第三方教程、问答与案例明显更少。原因并不神秘：

1. HybridCLR 诞生于国内团队，早期使用者集中在国内手游团队；
2. 热更新需求在国内外发行环境中的紧迫程度不同；
3. 海外 MOD 社区更习惯 Mono 时代的老游戏，或者干脆转向资产替换类 MOD。

结果是：**当海外玩家遇到 HybridCLR 游戏时，能查到的资料反而更少**；而国内虽然用的人多，讨论也多集中在“怎么让热更新跑起来”，很少有人写“第三方插件怎么在它上面工作”。

至于 BepInEx 一侧，官方对 HybridCLR 的支持至今仍停留在未合并的 PR 上，这也是[为什么官方版还不能支持 HybridCLR](unity/hybridclr-support.md) 的直接原因。

## 对 MOD 开发者的实际影响

| 你的目标 | Mono 游戏 | 普通 IL2CPP 游戏 | HybridCLR 游戏 |
|---|---|---|---|
| 换贴图 / 音频 | 简单 | 简单 | 简单（与后端无关） |
| 改数值 | 改 DLL 或 Hook | Hook 原生方法 | 要看目标方法在 AOT 还是热更新程序集 |
| 加界面 | 直接写 UGUI | 借助代理程序集 | 需要先解决宿主兼容，再处理热更新类型加载 |
| 加新玩法 | 相对自由 | 受 AOT 限制 | 可 Hook 解释器方法，但工具链新、资料少 |
| 教程数量 | 多 | 中等 | 极少 |

一句话总结：**资产层是三代的共同点，代码层才是分水岭。** 如果你只做资源替换，完全不需要关心 HybridCLR；但只要想 Hook 游戏逻辑，就必须先弄清楚目标方法属于哪一层。

## 为什么这仍然值得做

HybridCLR 让“热更新”变得便宜，也让“代码型 MOD”第一次在 IL2CPP 游戏上变得现实——代价是工具链还没跟上。这部分空白正是本专题存在的原因：把已经验证过的路径、踩过的坑和可复用的代码结构写下来，让后来的人不用再从崩溃日志的第一行开始猜。

下一步：读[为什么官方版还不能支持 HybridCLR](unity/hybridclr-support.md) 了解技术缺口，或直接看[开发完整指南](unity/full-guide.md)开始动手。
