#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
执行一次全量链接扫描，并将结果同时写到固定文件和带时间戳的新文件。
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import scan_article_links as scan


def main() -> None:
    scan.main()
    fixed_path = ROOT / "_link_scan_recheck.json"
    data = json.loads(fixed_path.read_text(encoding="utf-8"))
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    fresh_path = ROOT / f"_link_scan_recheck_{timestamp}.json"
    fresh_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(fresh_path))


if __name__ == "__main__":
    main()
