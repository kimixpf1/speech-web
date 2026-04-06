#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re

import requests

url = "http://cpc.people.com.cn/GB/64192/105996/352008/"
r = requests.get(url, timeout=20)
r.encoding = r.apparent_encoding or r.encoding or "utf-8"
t = r.text
key = "习近平向第39届非洲联盟峰会致贺电"
i = t.find(key)
hrefs = re.findall(r'href="([^"]+)"[^>]*>\s*' + re.escape(key), t)

with open("scripts/_au39_href_probe.json", "w", encoding="utf-8") as f:
    json.dump(
        {
            "index": i,
            "snippet": t[max(0, i - 800) : i + 1200],
            "hrefs": hrefs,
        },
        f,
        ensure_ascii=False,
        indent=2,
    )
