"""Public site regression tests; run with python3 -m unittest discover -s tests."""

import tempfile
import unittest
from pathlib import Path

from scripts.build_site import ROOT, build
from scripts.verify_site import (verify_legacy, verify_navigation, verify_new_links, verify_built_output)


class PublicSiteTests(unittest.TestCase):

    def test_legacy_files_are_preserved_byte_for_byte(self):
        self.assertGreaterEqual(verify_legacy(), 90)

    def test_navigation_routes_are_real_files(self):
        self.assertGreaterEqual(verify_navigation(), 20)

    def test_new_document_links_resolve(self):
        self.assertGreaterEqual(verify_new_links(), 25)

    def test_publication_excludes_repository_and_sensitive_files(self):
        with tempfile.TemporaryDirectory(prefix="glyceryl-preview-") as temp:
            dist = Path(temp) / "public"
            result = build(dist)
            self.assertGreaterEqual(result["docs"], 100)
            self.assertGreaterEqual(result["assets"], 3)
            self.assertGreaterEqual(verify_built_output(dist), 100)
            self.assertFalse((dist / ".git").exists())
            self.assertFalse((dist / "tests").exists())
            self.assertFalse((dist / "scripts").exists())

    def test_docsify_router_and_ui_assets(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("basePath: 'docs/'", html)
        self.assertIn("homepage: 'home.md'", html)
        self.assertIn('id="theme-toggle"', html)
        self.assertIn('id="search-shortcut"', html)
        self.assertIn('assets/js/site.js', html)

    def test_public_docs_include_caution_and_do_not_offer_hotfix_sources(self):
        warning = (ROOT / "docs/unity/safety.md").read_text(encoding="utf-8")
        self.assertIn("永久封禁", warning)
        self.assertIn("不公开", warning)
        intro = (ROOT / "docs/unity/README.md").read_text(encoding="utf-8")
        self.assertNotIn("热更新源码下载地址", intro)


if __name__ == "__main__":
    unittest.main()
