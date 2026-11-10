# Glyceryl's Developer Hub

个人开发笔记与教程网站：**Unity IL2CPP + HybridCLR 游戏 MOD 开发、BepInEx 6 工程实践、AstralParty.Modding.SDK 公开知识及开发工具说明**。早期 Minecraft 教程仅作仓库归档，不再提供入口。

网站地址：<https://glyceryl6.github.io/>

> **非官方声明：** 本站与《吉星派对》等商业游戏的开发商、发行商无关联。未经许可的第三方插件可能违反游戏规则并导致封号，即使仅私下使用也不保证安全。本站不公开私有 MOD、游戏热更新源码的获取方式、未经授权的游戏资源或反作弊绕过方法。详见[完整风险声明](https://glyceryl6.github.io/#/unity/safety.md)。

## 重点内容

如果你是因为“IL2CPP + HybridCLR 的 MOD 到底怎么做”来的，按这个顺序读：

| 顺序 | 页面 | 内容 |
|---|---|---|
| 00 | [写这套笔记的初衷](https://glyceryl6.github.io/#/unity/motivation.md) | Mono 时代的教程为什么在这里失效，为什么拿这款游戏当例子 |
| 01 | [Unity MOD 生态](https://glyceryl6.github.io/#/unity/ecosystem.md) | Mono / IL2CPP / HybridCLR 三代技术栈与代表作品 |
| 02 | [为什么官方版还不支持 HybridCLR](https://glyceryl6.github.io/#/unity/hybridclr-support.md) | 启动崩溃发生在哪一层，修复改了什么 |
| 03 | [开发可行性分析](https://glyceryl6.github.io/#/unity/feasibility.md) | 资源层、代码层、注入层的边界 |
| 04 | [开发完整指南](https://glyceryl6.github.io/#/unity/full-guide.md) | 从空工程到第一个可用功能 |
| 05 | [实战案例](https://glyceryl6.github.io/#/unity/case-keybinds.md) | 快捷键、提示、窗口监听、设置面板 |
| 06 | [开发手记](https://glyceryl6.github.io/#/unity/dev-notes.md) | 被放弃的方案与取舍 |
| 07 | [实践中的坑](https://glyceryl6.github.io/#/unity/pitfalls.md) | 现象 → 根因 → 做法 |
| 08 | [工具与下载](https://glyceryl6.github.io/#/tools/downloads.md) | 各环节工具清单与版本对照 |

## 文档目录

| 专题 | 页面 |
|---|---|
| Unity / IL2CPP / HybridCLR | [专题首页](https://glyceryl6.github.io/#/unity/README.md) |
| SDK | [API 与接入文档](https://glyceryl6.github.io/#/sdk/README.md) |
| 开发工具 | [工具专题](https://glyceryl6.github.io/#/tools/README.md) · [下载清单](https://glyceryl6.github.io/#/tools/downloads.md) |
| 网站使用与发布原则 | [关于本站](https://glyceryl6.github.io/#/about/README.md) · [公开边界](https://glyceryl6.github.io/#/about/publication-policy.md) |

仓库中的 `docs/` 是文档源文件；`docs/home.md` 是首页。早期的 Minecraft 教程仍位于 `docs/0序章/`、`docs/1基础/`、`docs/2进阶/`、`docs/3杂七杂八/`，**文件按原样保留**，但已经过期，站点不再提供入口。

## 站点特性

- **配色**：顶部按钮提供“跟随系统 / 浅色 / 深色”三档；默认跟随系统，选择只保存在本机浏览器。
- **导航**：分类导航与 Logo 放在同一个容器里，右侧是搜索框与按钮；窄屏下导航收起，改用左侧目录。
- **搜索**：顶部搜索框内嵌图标，输入即同步到左侧搜索面板；`Ctrl + K` / `⌘ + K` 可直接聚焦。
- **侧边栏**：移动端的展开按钮位于左上角、导航栏下方，不再压在正文上。

## 本地预览

仓库仍使用 **Docsify 4**，无需 Node.js 构建或生成所有页面的 HTML：

```bash
python3 -m http.server 8000
```

浏览器访问 `http://localhost:8000`。Docsify 与代码高亮资源从 jsDelivr 加载，首次在线预览需要联网；若加载失败，先检查 CDN 连通性，再查看浏览器控制台。

## GitHub Pages 构建与发布

无需安装第三方 Python 包：

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/build_site.py --dest _site
python3 scripts/verify_site.py --dist _site
```

`_site/` 是**白名单发布目录**，仅包含 `index.html`、`.nojekyll`、`docs/` 和 `assets/`。不会把 `.git`、`.idea`、`scripts/`、`tests/`、本机配置或其他未列入白名单的文件发布到网站。

在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**；推送到 `main` 会运行测试并自动部署，PR 仅执行检查、不发布。具体工作流见 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)。

## 内容与版权

- 早期 Minecraft 稿件按原样保留在仓库中，但内容已过期，站点不提供入口。
- 新增的 Unity / IL2CPP / HybridCLR 文档是公开资料与工程经验的整理，不提供私有 AstralProbe 代码和商业游戏资源。
- 引用的第三方库、工具与文章均保留出处；不主张拥有其商标、源代码或文档版权。
- 重要安全边界参阅[公开内容政策](https://glyceryl6.github.io/#/about/publication-policy.md)。

网站的变更摘要放在[站点更新记录](https://glyceryl6.github.io/#/about/changelog.md)，不在 README 中持续堆积版本日志。
