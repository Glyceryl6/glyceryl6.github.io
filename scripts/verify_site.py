#!/usr/bin/env python3
"""Basic site integrity and migration checks, without network access."""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROUTE_PATTERN = re.compile(r"\]\(([^)]+)\)")
BASE_DOCS = ROOT / "docs"


def verify_legacy() -> int:
    manifest = json.loads((ROOT / "tests/legacy-sha256.json").read_text(encoding="utf-8"))
    for rel, expected in manifest.items():
        path = ROOT / rel
        if not path.is_file():
            raise AssertionError(f"历史教程丢失：{rel}")
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            raise AssertionError(f"历史教程内容被修改：{rel}")
    return len(manifest)


def verify_navigation() -> int:
    sidebar = (BASE_DOCS / "_sidebar.md").read_text(encoding="utf-8")
    links = ROUTE_PATTERN.findall(sidebar)
    for route in links:
        route = route.split(" ", 1)[0].split("?", 1)[0].split("#", 1)[0].strip("/")
        if not route:
            continue
        p = BASE_DOCS / route
        if not p.is_file():
            raise AssertionError(f"导航中的页面不存在：{route}")
    return len(links)


def verify_new_links() -> int:
    checked = 0
    for p in BASE_DOCS.rglob("*.md"):
        rel = p.relative_to(BASE_DOCS)
        if str(rel).startswith(("0序章/", "1基础/", "2进阶/", "3杂七杂八/")):
            continue  # preserve historical articles verbatim, including old links
        for target in ROUTE_PATTERN.findall(p.read_text(encoding="utf-8")):
            target = target.split(" ", 1)[0]
            if target.startswith(("http:", "https:", "mailto:", "tel:")):
                continue
            if target.startswith("#/mes/"):
                raise AssertionError(f"无效内部路由：{target}")
            if target.startswith("#/"):
                route = target[2:].split("#", 1)[0].split("?", 1)[0]
            elif target.startswith("#") or target.startswith("data:"):
                continue
            else:
                route = target.lstrip("/").split("#", 1)[0].split("?", 1)[0]
            if not route:
                continue
            if not (BASE_DOCS / route).is_file():
                raise AssertionError(f"{rel}: 找不到文档链接 {target}")
            checked += 1
    return checked


def verify_built_output(dist: Path) -> int:
    required = ["index.html", ".nojekyll", "docs/home.md", "docs/_sidebar.md", "assets/css/site.css", "assets/js/site.js"]
    for name in required:
        if not (dist / name).is_file():
            raise AssertionError(f"发布产物缺少：{name}")
    for p in dist.rglob("*"):
        if ".git" in p.parts or ".idea" in p.parts or p.suffix in {".dll", ".jar", ".zip", ".props", ".exe"}:
            raise AssertionError(f"发布产物包含非公开文件：{p}")
    if (dist / "README.md").exists() or (dist / "start.cmd").exists():
        raise AssertionError("发布产物混入仓库管理文件")
    return sum(1 for p in dist.rglob("*") if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description="验证文档站发布前内容")
    parser.add_argument("--dist", type=Path, help="检查指定的构建输出目录")
    args = parser.parse_args()
    try:
        legacy = verify_legacy()
        links = verify_navigation()
        new_links = verify_new_links()
        print(f"[OK] 历史文件哈希校验：{legacy} 个文件")
        print(f"[OK] 导航路由：{links} 个；新版文章内部链接：{new_links} 个")
        if args.dist:
            dist = args.dist if args.dist.is_absolute() else ROOT / args.dist
            count = verify_built_output(dist)
            print(f"[OK] 发布内容检查：{count} 个文件，无 Git 与敏感格式")
    except (AssertionError, OSError, ValueError) as exc:
        print(f"[ERROR] 文档验证失败：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
