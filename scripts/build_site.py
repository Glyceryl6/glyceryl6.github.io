#!/usr/bin/env python3
"""Build an explicit public-file allowlist for GitHub Pages (no pip dependencies).

Only Markdown and self-owned static assets can be published. A repository-wide
copy would accidentally expose unrelated attachments and config files.
"""

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_DOC_SUFFIXES = {".md", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"}
ALLOWED_ASSET_SUFFIXES = {".css", ".js", ".svg", ".png", ".webp", ".woff2"}
PUBLIC_ROOT_FILES = {"index.html", ".nojekyll"}


def copy_tree(src: Path, dst: Path, allowed_suffixes: set[str]) -> int:
    """Copy allowed files, reject unexpected formats and symlinks."""
    count = 0
    for path in sorted(src.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"发布目录包含符号链接，已阻止：{path.relative_to(ROOT)}")
        if path.is_dir():
            continue
        rel = path.relative_to(src)
        if any(part.startswith(".") for part in rel.parts):
            raise ValueError(f"发布目录不允许隐藏文件：{path.relative_to(ROOT)}")
        if path.suffix.lower() not in allowed_suffixes:
            raise ValueError(f"发布目录发现非白名单文件：{path.relative_to(ROOT)}")
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        count += 1
    return count


def build(destination: Path) -> dict[str, int]:
    destination = destination.resolve()
    if destination == ROOT or destination in ROOT.parents:
        raise ValueError("输出目录不能覆盖项目根目录或其父目录。")
    if destination.exists():
        if not destination.is_dir() or destination.is_symlink():
            raise ValueError(f"输出目标不安全：{destination}")
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    for name in PUBLIC_ROOT_FILES:
        src = ROOT / name
        if not src.is_file() or src.is_symlink():
            raise ValueError(f"缺少公开站点文件：{name}")
        shutil.copy2(src, destination / name)
    stats = {
        "docs": copy_tree(ROOT / "docs", destination / "docs", ALLOWED_DOC_SUFFIXES),
        "assets": copy_tree(ROOT / "assets", destination / "assets", ALLOWED_ASSET_SUFFIXES),
    }
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="构建 Glyceryl 静态文档站")
    parser.add_argument("--dest", default="_site", type=Path, help="构建输出目录（默认 _site）")
    args = parser.parse_args()
    output = args.dest if args.dest.is_absolute() else ROOT / args.dest
    try:
        stats = build(output)
    except (ValueError, OSError) as exc:
        print(f"[ERROR] 无法构建公开站点：{exc}", file=sys.stderr)
        return 1
    print(f"[OK] 站点已生成：{output.resolve()}")
    print(f"[OK] 发布文档及图片 {stats['docs']} 个，站点资源 {stats['assets']} 个")
    print("[OK] .git、.idea、tests、scripts、私有配置等均不在发布清单中")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
