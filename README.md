# Glyceryl's Developer Hub

个人开发笔记与教程网站：**Minecraft 模组开发、Unity / IL2CPP 基础、AstralParty.Modding.SDK 公开知识及开发工具说明**。

网站地址：<https://glyceryl6.github.io/>

> **非官方声明：** 本站与《吉星派对》等商业游戏的开发商、发行商无关联。未经许可的第三方插件可能违反游戏规则并导致封号，即使仅私下使用也不保证安全。本站不公开私有 MOD、游戏热更新源码的获取方式、未经授权的游戏资源或反作弊绕过方法。详见[完整风险声明](https://glyceryl6.github.io/#/unity/safety.md)。

## 文档目录

| 专题 | 页面 |
|---|---|
| Minecraft 旧教程（1.19.2 / Forge 43.2.0） | [历史入口](https://glyceryl6.github.io/#/minecraft/README.md) · [完整目录](https://glyceryl6.github.io/#/minecraft/目录.md) |
| Unity、IL2CPP、HybridCLR | [专题首页](https://glyceryl6.github.io/#/unity/README.md) |
| SDK | [API 与接入文档](https://glyceryl6.github.io/#/sdk/README.md) |
| 开发工具 | [工具专题](https://glyceryl6.github.io/#/tools/README.md) |
| 网站使用与发布原则 | [关于本站](https://glyceryl6.github.io/#/about/README.md) · [公开边界](https://glyceryl6.github.io/#/about/publication-policy.md) |

仓库中的 `docs/` 是文档源文件；`docs/home.md` 是新首页。旧教程仍位于 `docs/0序章/`、`docs/1基础/`、`docs/2进阶/`、`docs/3杂七杂八/`，**目录和历史链接不变**。其中有一些原本尚未写作的 0 字节页面，并未擅自替换成虚构内容。

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

- Minecraft 历史稿件按原样保留；旧 API 与链接可能失效，开发前核对对应版本。
- 新增的 Unity / SDK 文档是公开通用知识的整理，不提供私有 AstralProbe 代码和商业游戏资源。
- 代码和截图的许可请以各自原始仓库与上游声明为准；引用第三方资料请保留出处，不主张拥有其商标或源代码。
- 重要安全边界参阅[公开内容政策](https://glyceryl6.github.io/#/about/publication-policy.md)。

网站的变更摘要放在[站点更新记录](https://glyceryl6.github.io/#/about/changelog.md)，不在 README 中持续堆积版本日志。
