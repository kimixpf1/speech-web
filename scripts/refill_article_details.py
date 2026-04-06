#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量重抓并清洗 article_details 的正文/摘要。

默认执行 dry-run，只输出待处理结果与样例。
传入 --apply 且配置管理员账号后，才会真正回写数据库。
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

requests.packages.urllib3.disable_warnings()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ejeiuqcmkznfbglvbkbe.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg",
)
ADMIN_EMAIL = os.getenv("SUPABASE_ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPABASE_ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE")

ROOT = Path(__file__).resolve().parent
DETAILS_TABLE = "article_details"
ARTICLES_TABLE = "articles"
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}
PLACEHOLDER_TEXTS = {"原文加载中...", "解读分析正在整理中...", "摘要正在整理中..."}
REFILL_TRIGGER_SUMMARY_LENGTH = 20
MIN_SUMMARY_LENGTH = 90
MAX_SUMMARY_LENGTH = 220
MAX_SUMMARY_SENTENCES = 3
MOJIBAKE_PATTERN = re.compile(r"[ÃÂÐÑØæåçéêëîïðñòóôõöøùúûüýþÿ]{3,}|�|&#xfffd;")


def normalize_article_url(url: str) -> str:
    trimmed = (url or "").strip()
    if not trimmed:
        return ""

    replacement_map = {
        "http://paper.people.com.cn/rmrb/pc/content/202603/08/content_30143971.html":
            "https://paper.people.com.cn/rmrb/pc/content/202603/08/content_30143971.html",
        "http://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145794.html":
            "https://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145794.html",
        "http://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html":
            "https://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html",
        "http://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html":
            "https://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html",
        "http://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html":
            "https://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html",
        "http://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml":
            "https://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml",
        "https://js.people.com.cn/n2/2026/0306/c358232-41516244.html":
            "http://jhsjk.people.cn/article/40675966",
        "http://js.people.com.cn/n2/2026/0306/c358232-41516244.html":
            "http://jhsjk.people.cn/article/40675966",
        "https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html":
            "http://jhsjk.people.cn/article/40675966",
        "http://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html":
            "http://jhsjk.people.cn/article/40675966",
        "https://lianghui.people.com.cn/2026/n1/2026/0306/c461827-40675801.html":
            "http://jhsjk.people.cn/article/40675966",
        "http://lianghui.people.com.cn/2026/n1/2026/0306/c461827-40675801.html":
            "http://jhsjk.people.cn/article/40675966",
        "http://paper.people.com.cn/rmrb/pc/content/20260306/content_30143971.html":
            "http://jhsjk.people.cn/article/40675966",
    }

    replaced = replacement_map.get(trimmed)
    if replaced:
        return replaced

    keep_http_prefixes = (
        "http://lianghui.people.com.cn/",
        "http://politics.people.com.cn/",
        "http://opinion.people.com.cn/",
        "http://cpc.people.com.cn/",
        "http://js.people.com.cn/",
    )
    if trimmed.startswith(keep_http_prefixes):
        return trimmed

    downgrade_https_prefixes = (
        "https://politics.people.com.cn/",
        "https://opinion.people.com.cn/",
        "https://cpc.people.com.cn/",
        "https://js.people.com.cn/",
    )
    if trimmed.startswith(downgrade_https_prefixes):
        return "http://" + trimmed[len("https://") :]

    if trimmed.startswith("http://"):
        return "https://" + trimmed[len("http://") :]

    return trimmed


def normalize_summary_text(summary: str, max_length: int = MAX_SUMMARY_LENGTH) -> str:
    cleaned = re.sub(r"^【摘要】[\s：:]*", "", summary or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"^\s*\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s*", "", cleaned)
    cleaned = re.sub(r"^(新华社|人民网|新华网|中新网|本报)[^。！？；]{0,30}(电|讯)\s*", "", cleaned)
    cleaned = re.sub(r"^(新华社记者|本报记者)[^。！？；]{0,30}", "", cleaned)
    cleaned = re.sub(r"^3月\d{1,2}日[，,]?", "", cleaned)
    if not cleaned:
        return ""
    if len(cleaned) <= max_length:
        return cleaned

    sentences = [item.strip() for item in re.split(r"(?<=[。！？；])", cleaned) if item.strip()]
    selected: List[str] = []
    current_length = 0

    for sentence in sentences:
        remaining = max_length - current_length
        if remaining <= 0:
            break
        if len(sentence) > remaining:
            if not selected:
                selected.append(sentence[:remaining].strip())
            break
        selected.append(sentence)
        current_length += len(sentence)
        if current_length >= MIN_SUMMARY_LENGTH or len(selected) >= MAX_SUMMARY_SENTENCES:
            break

    return "".join(selected).strip() or cleaned[:max_length].strip()


def mojibake_score(text: str) -> int:
    return len(MOJIBAKE_PATTERN.findall(text))


def detect_html_encoding(content: bytes, lowered_url: str, response: requests.Response) -> str:
    head = content[:4000]
    candidates: List[str] = []

    if response.encoding:
        candidates.append(response.encoding)

    content_type = response.headers.get("content-type", "")
    header_match = re.search(r"charset=([a-zA-Z0-9_\-]+)", content_type, re.I)
    if header_match:
        candidates.append(header_match.group(1))

    meta_match = re.search(br"charset=['\"]?([a-zA-Z0-9_\-]+)", head, re.I)
    if meta_match:
        candidates.append(meta_match.group(1).decode("ascii", errors="ignore"))

    if "people.com.cn/" in lowered_url or "cpc.people.com.cn/" in lowered_url:
        candidates.extend(["gb18030", "gbk", "gb2312", "utf-8"])
    else:
        candidates.extend(["utf-8", "gb18030", "gbk"])

    if response.apparent_encoding:
        candidates.append(response.apparent_encoding)

    normalized_candidates: List[str] = []
    for encoding in candidates:
        value = (encoding or "").strip().lower()
        if value and value not in normalized_candidates:
            normalized_candidates.append(value)

    best_encoding = normalized_candidates[0] if normalized_candidates else "utf-8"
    best_score: Optional[Tuple[int, int]] = None

    for encoding in normalized_candidates:
        try:
            decoded = content.decode(encoding, errors="replace")
        except Exception:
            continue
        score = (
            mojibake_score(decoded),
            -sum(1 for ch in decoded[:3000] if "\u4e00" <= ch <= "\u9fff"),
        )
        if best_score is None or score < best_score:
            best_score = score
            best_encoding = encoding

    return best_encoding


def build_extractive_summary(title: str, full_text: str) -> str:
    normalized_title = re.sub(r"\s+", "", title or "")
    paragraphs = [
        re.sub(r"\s+", " ", paragraph).strip()
        for paragraph in re.split(r"\n{2,}", full_text.replace("\r", ""))
        if paragraph.strip()
    ]

    filtered: List[str] = []
    for paragraph in paragraphs:
        normalized_paragraph = re.sub(r"^[■●•]\s*", "", paragraph).strip()
        compact = re.sub(r"\s+", "", normalized_paragraph)
        if len(normalized_paragraph) < 12:
            continue
        if compact == normalized_title:
            continue
        if re.match(r"^\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$", normalized_paragraph):
            continue
        if "新华社记者" in normalized_paragraph and "摄" in normalized_paragraph:
            continue
        if re.match(r"^这是\d{1,2}日", normalized_paragraph):
            continue
        if re.match(r"^(来源|原标题|责任编辑|编辑|打印|分享|微信|微博)", normalized_paragraph):
            continue
        if not re.search(r"[。！？；]", normalized_paragraph) and len(normalized_paragraph) <= 90:
            continue

        normalized_paragraph = re.sub(r"^(新华社|人民网|新华网|中新网|本报).{0,30}(电|讯)\s*", "", normalized_paragraph)
        normalized_paragraph = re.sub(r"^\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s*", "", normalized_paragraph)
        normalized_paragraph = re.sub(r"^\d{1,2}月\d{1,2}日[，,]?", "", normalized_paragraph).strip()
        if len(normalized_paragraph) < 12:
            continue
        filtered.append(normalized_paragraph)

    if not filtered:
        fallback = re.sub(r"\s+", " ", full_text).strip()
        return normalize_summary_text(fallback[:MAX_SUMMARY_LENGTH])

    summary = normalize_summary_text("".join(filtered[:2]), max_length=MAX_SUMMARY_LENGTH)
    for pattern in (
        r"(\d{1,2}月\d{1,2}日[，,].*)",
        r"((新华社|人民网|新华网|中新网|本报).{0,20}(电|讯).*)",
    ):
        match = re.search(pattern, summary)
        if match:
            prefix = summary[: match.start()].strip()
            if prefix and not re.search(r"[。！？；]", prefix) and len(prefix) <= 120:
                summary = match.group(1).strip()
                break
    return summary


class ContentExtractor(HTMLParser):
    TARGET_CLASS_KEYWORDS = {
        "rm_txt_con",
        "box_con",
        "show_text",
        "text_con",
        "article-content",
        "article_content",
        "articlecontent",
        "trs_editor",
        "content",
        "pages_content",
        "newscontent",
        "detailcontent",
        "article",
        "main-content",
        "post-content",
        "articleCon",
    }
    TARGET_IDS = {
        "p-detail",
        "article_content",
        "detailContent",
        "ozoom",
        "zoom",
        "topic_content",
        "rm_txt_zw",
    }
    BLOCK_TAGS = {"p", "div", "br", "section", "article", "li", "h1", "h2", "h3", "h4", "tr"}
    IGNORE_TAGS = {"script", "style", "noscript", "svg"}

    def __init__(self) -> None:
        super().__init__()
        self.captures: List[dict] = []
        self.finished: List[Tuple[int, str]] = []
        self.ignore_depth = 0
        self.document_parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        attrs_dict = {key.lower(): value or "" for key, value in attrs}
        if tag in self.IGNORE_TAGS:
            self.ignore_depth += 1
            return

        score = 0
        tag_lower = tag.lower()
        if tag_lower in {"article", "main"}:
            score += 2

        class_raw = attrs_dict.get("class", "").lower()
        class_tokens = re.split(r"[\s_:-]+", class_raw) if class_raw else []
        class_joined = " ".join(class_tokens)
        for keyword in self.TARGET_CLASS_KEYWORDS:
            lowered = keyword.lower()
            if lowered in class_raw or lowered in class_joined:
                score += 3
                break

        if attrs_dict.get("id", "").lower() in {item.lower() for item in self.TARGET_IDS}:
            score += 3

        for capture in self.captures:
            capture["depth"] += 1
            if tag_lower in self.BLOCK_TAGS:
                capture["parts"].append("\n")

        if score > 0:
            self.captures.append({"score": score, "depth": 1, "parts": []})

        if tag_lower in self.BLOCK_TAGS:
            self.document_parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.IGNORE_TAGS and self.ignore_depth:
            self.ignore_depth -= 1
            return

        completed: List[dict] = []
        for capture in self.captures:
            capture["depth"] -= 1
            if capture["depth"] == 0:
                completed.append(capture)

        for capture in completed:
            text = html.unescape("".join(capture["parts"])).strip()
            if text:
                self.finished.append((capture["score"], text))
            self.captures.remove(capture)

    def handle_data(self, data: str) -> None:
        if self.ignore_depth:
            return
        if not data.strip():
            return
        cleaned = html.unescape(data)
        self.document_parts.append(cleaned)
        for capture in self.captures:
            capture["parts"].append(cleaned)

    def get_best_text(self) -> str:
        ranked: List[Tuple[int, int, str]] = []
        for score, text in self.finished:
            cleaned = re.sub(r"\s+", " ", text).strip()
            if len(cleaned) >= 120:
                ranked.append((score, len(cleaned), text))
        if ranked:
            ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
            return ranked[0][2]
        return "".join(self.document_parts)


NOISE_PATTERNS = [
    r"^(首页|要闻|时政|国际|社会|军事|财经|观点|评论|图片|视频|热点)\s*[|｜>/]",
    r"^(人民网|新华网|央视网|光明网|中国网|中新网|中国政府网|求是网)\s*>>",
    r"^(来源|编辑|责编|责任编辑|记者|发稿|稿件|审核|校对)[：:]",
    r"^分享到[：:]?\s*(微信|微博|QQ|朋友圈)",
    r"^(上一篇|下一篇|相关新闻|相关阅读|推荐阅读|延伸阅读|热门推荐)[：:]?",
    r"^\s*(返回|回到顶部|版权所有|Copyright|©|All rights)",
    r"^(评论|留言|登录|注册|关注|订阅|扫码|二维码|APP下载)",
    r"^\s*\[.*\]\s*$",
    r"^(打印|收藏|关闭窗口|字号|大中小)",
    r"^字体[：:]?",
    r"^小中大$",
    r"^\s*(转发|点赞|在看|收藏)\s*\d*\s*$",
    r"^\d{4}年\d{1,2}月\d{1,2}日\d{1,2}:\d{2}\s*$",
    r"^\d{4}年\d{1,2}月\d{1,2}日\d{1,2}:\d{2}来源[：:]",
    r"^\d{4}-\d{2}-\d{2}来源[：:]?",
    r"^http[s]?://",
    r"^(原标题|分享|纠错|举报)[：:]",
    r"^\s*\(\s*\d+\s*\)\s*$",
    r"^《\s*人民日报\s*》",
    r"^新华社记者",
    r"^(视觉|制图)[：:]",
    r"^分享到[：:]?$",
    r"^(策划|统筹|执行|主笔|制作|监制|编导|剪辑|配音|设计|海报|文案|校审)[：/:]",
    r"^(新华社|新华网|人民网|国际在线).*(制作|出品)$",
    r"^新华社第一工作室出品$",
    r"^新华社新媒体中心制作$",
    r"^新华网制作$",
    r"^电脑版$",
    r"^网站无障碍$",
    r"^内部邮箱$",
    r"^旗下网站$",
    r"^创新服务平台$",
    r"^人民云$",
    r"^全国重点实验室",
    r"^写易智能创作引擎",
    r"^\(责编[:：].*\)$",
    r"^责编[:：]",
    r"^人\s*民\s*网.*版权.*$",
    r"^未\s*经\s*书\s*面\s*授\s*权.*$",
    r"^打开客户端.*$",
]

TAIL_CUTOFF_PATTERNS = [
    r"【纠错】[\s\S]*$",
    r"【责任编辑[:：].*?】[\s\S]*$",
    r"阅读下一篇[:：]?[\s\S]*$",
    r"新闻链接[\s\S]*$",
    r"扫描二维码分享到手机[\s\S]*$",
    r"标签\s*-[\s\S]*$",
    r"网站编辑\s*-[\s\S]*$",
    r"校对\s*-[\s\S]*$",
    r"审校\s*-[\s\S]*$",
    r"【网站声明】[\s\S]*$",
    r"人\s*民\s*网\s*股\s*份\s*有\s*限\s*公\s*司\s*版\s*权\s*所\s*有[\s\S]*$",
    r"分享到[:：]?[\s\S]*$",
    r"打开客户端[\s\S]*$",
]


PEOPLE_NAV_KEYWORDS = [
    "人民日报海外版",
    "中国汽车报",
    "中国能源报",
    "健康时报",
    "证券时报",
    "国际金融报",
    "中国城市报",
    "新闻战线",
    "人民论坛",
    "环球人物",
    "中国经济周刊",
    "民生周刊",
    "国家人文历史",
    "人民周刊",
    "人民数字",
    "环球网",
    "海外网",
    "人民图片",
    "人民网研究院",
    "人民慕课",
    "人民网智慧党建体验中心",
]


def is_navigation_line(line: str) -> bool:
    if not line:
        return False
    nav_hits = sum(1 for keyword in PEOPLE_NAV_KEYWORDS if keyword in line)
    if nav_hits >= 3:
        return True
    return (
        ("电脑版" in line and "网站无障碍" in line)
        or ("机构设置" in line and "最高人民检察院简介" in line)
        or ("检察新闻" in line and "权威发布" in line)
        or ("人民云" in line and "创新服务平台" in line)
    )


def is_credit_line(line: str) -> bool:
    return bool(
        re.match(
            r"^(策划|统筹|执行|主笔|制作|监制|编导|剪辑|配音|设计|海报|文案|校审)[：/:]",
            line,
        )
        or re.match(r"^(新华社|新华网|人民网|国际在线).*(制作|出品)$", line)
        or line in {"新华社第一工作室出品", "新华社新媒体中心制作", "新华网制作", "新华社出品"}
    )


def is_footer_line(line: str) -> bool:
    if not line:
        return False
    footer_patterns = [
        r"^分享让更多人看到$",
        r"^客户端下载$",
        r"^微信微博快手$",
        r"^第一时间为您推送权威资讯$",
        r"^报道全球\s*传播中国$",
        r"^人民日报社概况\|关于人民网",
        r"^人民日报违法和不良信息举报电话",
        r"^人民网服务邮箱",
        r"^互联网新闻信息服务许可证",
        r"^信息网络传播视听节目许可证",
        r"^人\s*民\s*网\s*股\s*份.*版\s*权",
    ]
    if any(re.match(pattern, line) for pattern in footer_patterns):
        return True
    return line in {
        "人民日报",
        "人民日报少年",
        "人民网+",
        "手机人民网",
        "领导留言板",
        "人民视频",
        "人民智作",
    }


def remove_duplicate_intro_paragraphs(lines: List[str]) -> List[str]:
    cleaned = list(lines)
    while len(cleaned) >= 3:
        first = cleaned[0].strip()
        second = cleaned[1].strip()
        rest = "\n".join(cleaned[2:])
        removed = False
        if first and len(first) <= 120 and first in rest:
            cleaned.pop(0)
            removed = True
        elif second and len(second) <= 120 and second in rest:
            cleaned.pop(1)
            removed = True
        if not removed:
            break
    return cleaned


def trim_related_link_tail(lines: List[str]) -> List[str]:
    cleaned = list(lines)
    while cleaned and cleaned[-1] == "":
        cleaned.pop()

    if cleaned and re.match(r"^（.*结束.*）$", cleaned[-1].strip()):
        cleaned.pop()

    trailer: List[str] = []
    index = len(cleaned) - 1
    while index >= 0:
        line = cleaned[index].strip()
        if not line:
            break
        is_short_headline = len(line) <= 40 and not re.search(r"[。！？；]", line)
        if not is_short_headline:
            break
        trailer.append(line)
        index -= 1

    if len(trailer) >= 2:
        cleaned = cleaned[: index + 1]
        while cleaned and cleaned[-1] == "":
            cleaned.pop()

    return cleaned


def trim_tail_markers(text: str) -> str:
    cleaned = text
    for pattern in TAIL_CUTOFF_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.I).strip()
    return cleaned


def clean_full_text(title: str, source: str, raw_text: str) -> str:
    value = raw_text or ""
    value = (
        value.replace("\xa0", " ")
        .replace("\u3000", " ")
        .replace("\u2002", " ")
        .replace("\u2003", " ")
        .replace("\u2009", " ")
        .replace("\ufeff", " ")
    )
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    lines = [line.strip() for line in value.split("\n")]

    cleaned_lines: List[str] = []
    title_compact = re.sub(r"\s+", "", title or "")
    source_compact = re.sub(r"\s+", "", source or "")

    for line in lines:
        line = re.sub(r"^[■●•]\s*", "", line).strip()
        if not line:
            if cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")
            continue

        compact = re.sub(r"\s+", "", line)
        if compact == title_compact or compact == source_compact:
            continue
        if title_compact and len(compact) <= 40 and compact and title_compact.startswith(compact):
            continue
        if len(compact) <= 2:
            continue
        if is_navigation_line(line):
            continue
        if is_credit_line(line):
            continue
        if is_footer_line(line):
            continue
        if any(re.match(pattern, line, flags=re.I) for pattern in NOISE_PATTERNS):
            continue
        cleaned_lines.append(line)

    # 去掉网页标题、栏目尾缀、来源时间等头部噪音，尽量让正文从首段开始。
    while cleaned_lines:
        line = cleaned_lines[0]
        if line == "":
            cleaned_lines.pop(0)
            continue
        compact = re.sub(r"\s+", "", line)
        if title_compact and len(compact) <= 40 and compact and title_compact.startswith(compact):
            cleaned_lines.pop(0)
            continue
        if (
            len(line) <= 80
            and ("人民网" in line or "新华网" in line or "全国两会" in line or "--" in line)
        ):
            cleaned_lines.pop(0)
            continue
        if "分享到" in line or "字体" in line:
            cleaned_lines.pop(0)
            continue
        if is_navigation_line(line) or is_credit_line(line) or is_footer_line(line):
            cleaned_lines.pop(0)
            continue
        if re.match(r"^\d{4}年\d{1,2}月\d{1,2}日\d{1,2}:\d{2}", line):
            cleaned_lines.pop(0)
            continue
        if re.match(r"^\d{4}[-/]\d{2}[-/]\d{2}", line):
            cleaned_lines.pop(0)
            continue
        if not re.search(r"[。！？；：]", line) and len(line) <= 30:
            cleaned_lines.pop(0)
            continue
        break

    deduped: List[str] = []
    prev = None
    for line in cleaned_lines:
        if line == "" and (not deduped or deduped[-1] == ""):
            continue
        if line == prev and line != "":
            continue
        deduped.append(line)
        prev = line

    while deduped:
        last = deduped[-1]
        if last == "":
            deduped.pop()
            continue
        if is_credit_line(last) or is_navigation_line(last) or is_footer_line(last):
            deduped.pop()
            continue
        if re.match(r"^(策划|统筹|执行|主笔|制作|监制|编导|剪辑|配音|设计|海报|文案|校审)", last):
            deduped.pop()
            continue
        break

    for index, line in enumerate(deduped):
        if is_footer_line(line):
            deduped = deduped[:index]
            break

    deduped = remove_duplicate_intro_paragraphs(deduped)
    deduped = trim_related_link_tail(deduped)

    result = "\n\n".join([line for line in deduped if line != ""]).strip()
    result = trim_tail_markers(result)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result


def extract_text_from_html(html_text: str) -> str:
    primary_patterns = [
        r"<div[^>]+class=['\"][^'\"]*show_text[^'\"]*['\"][^>]*>([\s\S]*?)</div>\s*(?:<div|</article|</section)",
        r"<div[^>]+class=['\"][^'\"]*show_text[^'\"]*['\"][^>]+id=['\"]rm_txt_zw['\"][^>]*>([\s\S]*?)<div[^>]+class=['\"]edit['\"]",
        r"<div[^>]+id=['\"]rm_txt_zw['\"][^>]*>([\s\S]*?)<div[^>]+class=['\"]edit['\"]",
        r"<div[^>]+id=['\"]ozoom['\"][^>]*>([\s\S]*?)<div[^>]+class=['\"]edit['\"]",
        r"<div[^>]+id=['\"]fontzoom['\"][^>]*>([\s\S]*?)</div>",
        r"<div[^>]+id=['\"]zoom['\"][^>]*>([\s\S]*?)</div>",
        r"<div[^>]+class=['\"][^'\"]*rm_txt_con[^'\"]*['\"][^>]*>([\s\S]*?)<div[^>]+class=['\"]edit['\"]",
        r"<div[^>]+class=['\"][^'\"]*article[^'\"]*['\"][^>]*>([\s\S]*?)<div[^>]+class=['\"]edit['\"]",
        r"<div[^>]+id=['\"]detailContent['\"][^>]*>([\s\S]*?)</div>",
    ]
    for pattern in primary_patterns:
        match = re.search(pattern, html_text, flags=re.I)
        if match:
            text = match.group(1)
            text = re.sub(r"<table[^>]+class=\"[^\"]*pci_c[^\"]*\"[\s\S]*?</table>", " ", text, flags=re.I)
            text = re.sub(r"<img[^>]*>", " ", text, flags=re.I)
            text = re.sub(r"data-original-title=\"[^\"]*\"", " ", text, flags=re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            text = html.unescape(text)
            text = re.sub(r"\n{3,}", "\n\n", text)
            text = re.sub(r"[ \t]+", " ", text)
            return text.strip()

    parser = ContentExtractor()
    parser.feed(html_text)
    text = parser.get_best_text()
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def fetch_html(url: str) -> str:
    normalized = normalize_article_url(url)
    lowered = normalized.lower()
    disable_verify = (
        lowered.startswith("http://lianghui.people.com.cn/")
        or "people.com.cn/" in lowered
        or "cppcc.gov.cn/" in lowered
        or "spp.gov.cn/" in lowered
    )
    verify = not disable_verify
    last_error: Optional[Exception] = None
    for attempt in range(3):
        try:
            response = requests.get(normalized, headers=REQUEST_HEADERS, timeout=20, verify=verify)
            response.raise_for_status()
            response.encoding = detect_html_encoding(response.content, lowered, response)
            return response.text
        except Exception as exc:
            last_error = exc
            if attempt < 2 and ("cppcc.gov.cn/" in lowered or "people.com.cn/" in lowered):
                time.sleep(1.0)
                continue
            raise
    raise last_error or RuntimeError("抓取失败")


def supabase_request(path: str, method: str = "GET", data=None, token: Optional[str] = None):
    url = f"{SUPABASE_URL}{path}"
    auth_key = token or SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    api_key = SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    headers = {
        "apikey": api_key,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_key}",
    }
    response = requests.request(
        method,
        url,
        headers=headers,
        json=data,
        timeout=120,
    )
    response.raise_for_status()
    if not response.text:
        return None
    return response.json()


def login() -> str:
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("请先设置环境变量 SUPABASE_ADMIN_EMAIL 和 SUPABASE_ADMIN_PASSWORD")
        sys.exit(1)

    result = supabase_request(
        "/auth/v1/token?grant_type=password",
        method="POST",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    token = result.get("access_token") if isinstance(result, dict) else None
    if not token:
        print("管理员登录失败")
        sys.exit(1)
    return token


def get_write_token() -> str:
    if SERVICE_ROLE_KEY:
        return SERVICE_ROLE_KEY
    return login()


def fetch_all_rows(table: str, select_fields: str, order: str, batch_size: int = 1000) -> List[dict]:
    rows: List[dict] = []
    offset = 0

    while True:
        query = urllib.parse.urlencode(
            {
                "select": select_fields,
                "order": order,
                "offset": offset,
                "limit": batch_size,
            }
        )
        batch = supabase_request(f"/rest/v1/{table}?{query}") or []
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < batch_size:
            break
        offset += batch_size
    return rows


def fetch_rows_by_ids(table: str, select_fields: str, ids: List[str]) -> List[dict]:
    if not ids:
        return []
    quoted_ids = ",".join(f'"{item}"' for item in ids)
    query = urllib.parse.urlencode(
        {
            "select": select_fields,
            "id": f"in.({quoted_ids})",
        }
    )
    return supabase_request(f"/rest/v1/{table}?{query}") or []


def patch_article_summary(token: str, article_id: str, summary: str) -> None:
    encoded_id = urllib.parse.quote(article_id, safe="")
    supabase_request(
        f"/rest/v1/{ARTICLES_TABLE}?id=eq.{encoded_id}",
        method="PATCH",
        data={"summary": summary},
        token=token,
    )


def patch_article_detail(token: str, article_id: str, payload: dict) -> None:
    encoded_id = urllib.parse.quote(article_id, safe="")
    supabase_request(
        f"/rest/v1/{DETAILS_TABLE}?id=eq.{encoded_id}",
        method="PATCH",
        data=payload,
        token=token,
    )


def needs_refill(article: dict, detail: Optional[dict]) -> bool:
    summary = (article.get("summary") or "").strip()
    abstract = ((detail or {}).get("abstract") or "").strip()
    full_text = ((detail or {}).get("full_text") or "").strip()

    return (
        not summary
        or len(summary) < REFILL_TRIGGER_SUMMARY_LENGTH
        or not abstract
        or len(abstract) < REFILL_TRIGGER_SUMMARY_LENGTH
        or not full_text
        or full_text in PLACEHOLDER_TEXTS
        or "加载中" in full_text
    )


@dataclass
class RefillResult:
    id: str
    title: str
    source: str
    original_url: str
    normalized_url: str
    old_summary_len: int
    new_summary_len: int
    old_full_text_len: int
    new_full_text_len: int
    status: str
    note: str = ""
    new_summary: str = ""
    new_full_text: str = ""
    new_full_text_preview: str = ""


def process_article(article: dict, detail: Optional[dict]) -> RefillResult:
    article_id = article.get("id") or ""
    title = article.get("title") or ""
    source = article.get("source") or ""
    original_url = (article.get("url") or "").strip()
    normalized_url = normalize_article_url(original_url)
    old_summary = (article.get("summary") or "").strip()
    old_full_text = ((detail or {}).get("full_text") or "").strip()

    if not normalized_url:
        return RefillResult(
            id=article_id,
            title=title,
            source=source,
            original_url=original_url,
            normalized_url=normalized_url,
            old_summary_len=len(old_summary),
            new_summary_len=0,
            old_full_text_len=len(old_full_text),
            new_full_text_len=0,
            status="skipped",
            note="链接为空",
        )

    try:
        page_html = fetch_html(normalized_url)
        extracted = extract_text_from_html(page_html)
        cleaned_full_text = clean_full_text(title, source, extracted)
        if len(cleaned_full_text) < 40:
            return RefillResult(
                id=article_id,
                title=title,
                source=source,
                original_url=original_url,
                normalized_url=normalized_url,
                old_summary_len=len(old_summary),
                new_summary_len=0,
                old_full_text_len=len(old_full_text),
                new_full_text_len=0,
                status="error",
                note="正文提取后仍过短",
            )
        if len(cleaned_full_text) < 120 and not re.search(r"[。！？；]", cleaned_full_text):
            return RefillResult(
                id=article_id,
                title=title,
                source=source,
                original_url=original_url,
                normalized_url=normalized_url,
                old_summary_len=len(old_summary),
                new_summary_len=0,
                old_full_text_len=len(old_full_text),
                new_full_text_len=0,
                status="error",
                note="正文提取后仍过短",
            )

        summary = build_extractive_summary(title, cleaned_full_text)
        return RefillResult(
            id=article_id,
            title=title,
            source=source,
            original_url=original_url,
            normalized_url=normalized_url,
            old_summary_len=len(old_summary),
            new_summary_len=len(summary),
            old_full_text_len=len(old_full_text),
            new_full_text_len=len(cleaned_full_text),
            status="ready",
            new_summary=summary,
            new_full_text=cleaned_full_text,
            new_full_text_preview=cleaned_full_text[:220],
            note="已抓取并清洗正文",
        )
    except Exception as exc:
        return RefillResult(
            id=article_id,
            title=title,
            source=source,
            original_url=original_url,
            normalized_url=normalized_url,
            old_summary_len=len(old_summary),
            new_summary_len=0,
            old_full_text_len=len(old_full_text),
            new_full_text_len=0,
            status="error",
            note=str(exc),
        )


def write_report(results: List[RefillResult], apply_mode: bool) -> Path:
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = ROOT / f"article_refill_report_{timestamp}.md"
    ready = [item for item in results if item.status == "ready"]
    errors = [item for item in results if item.status == "error"]
    skipped = [item for item in results if item.status == "skipped"]

    lines: List[str] = []
    lines.append("# article_details 批量补齐报告")
    lines.append("")
    lines.append(f"- 时间：{dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- 模式：{'apply' if apply_mode else 'dry-run'}")
    lines.append(f"- 可处理：{len(ready)}")
    lines.append(f"- 错误：{len(errors)}")
    lines.append(f"- 跳过：{len(skipped)}")
    lines.append("")

    if ready:
        lines.append("## 可处理样本")
        for item in ready[:20]:
            lines.append(
                f"- `{item.id}` {item.title} | 摘要 {item.old_summary_len}->{item.new_summary_len} | "
                f"正文 {item.old_full_text_len}->{item.new_full_text_len}"
            )
            lines.append(f"  - 链接：{item.normalized_url}")
            lines.append(f"  - 新摘要：{item.new_summary}")
            lines.append(f"  - 正文预览：{item.new_full_text_preview}")
        lines.append("")

    if errors:
        lines.append("## 错误样本")
        for item in errors[:30]:
            lines.append(f"- `{item.id}` {item.title} | {item.note}")
        lines.append("")

    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="真正写回数据库")
    parser.add_argument("--limit", type=int, default=0, help="仅处理前 N 条候选")
    parser.add_argument("--workers", type=int, default=6, help="并发抓取数")
    parser.add_argument("--id", action="append", default=[], help="仅处理指定文章 ID，可重复传入")
    args = parser.parse_args()

    if args.id:
        articles = fetch_rows_by_ids(
            ARTICLES_TABLE,
            "id,title,date,source,url,summary",
            args.id,
        )
        details = fetch_rows_by_ids(
            DETAILS_TABLE,
            "id,abstract,full_text,analysis",
            args.id,
        )
    else:
        articles = fetch_all_rows(
            ARTICLES_TABLE,
            "id,title,date,source,url,summary",
            "date.desc",
            batch_size=500,
        )
        details = fetch_all_rows(
            DETAILS_TABLE,
            "id,abstract,full_text,analysis",
            "id.asc",
            batch_size=500,
        )
    detail_map = {detail["id"]: detail for detail in details}

    candidates = []
    for article in articles:
        if args.id and article["id"] not in args.id:
            continue
        detail = detail_map.get(article["id"])
        if needs_refill(article, detail):
            candidates.append((article, detail))

    if args.limit > 0:
        candidates = candidates[: args.limit]

    print(f"候选文章数: {len(candidates)}")
    results: List[RefillResult] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(args.workers, 1)) as executor:
        future_map = {
            executor.submit(process_article, article, detail): (article, detail)
            for article, detail in candidates
        }
        for future in concurrent.futures.as_completed(future_map):
            results.append(future.result())

    results.sort(key=lambda item: item.id)
    report_path = write_report(results, args.apply)

    ready_results = [item for item in results if item.status == "ready"]
    print(f"可处理: {len(ready_results)}")
    print(f"报告: {report_path}")

    if args.apply:
        token = get_write_token()
        for result in ready_results:
            patch_article_summary(token, result.id, result.new_summary)
            patch_article_detail(
                token,
                result.id,
                {
                    "abstract": result.new_summary,
                    "full_text": result.new_full_text,
                },
            )
        print("已执行数据库回写")


if __name__ == "__main__":
    main()
