#!/usr/bin/env python3
"""
自动循环执行 quality fix 批次，直到全部完成。
"""

import subprocess
import sys
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent

CHECKPOINT = ROOT / "_quality_fix_progress.json"
IDS_FILE = ROOT / "quality_fix_ids.json"
SUMMARY_DIR = ROOT / "quality_fix_runs"
KEY_FILE = ROOT / "_local_service_role.txt"
BATCH_SIZE = 5
TOTAL_TARGET = 455


def current_offset() -> int:
    if CHECKPOINT.exists():
        data = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        return int(data.get("next_offset", 0))
    return 0


def main():
    offset = current_offset()
    print(f"当前进度: {offset}/{TOTAL_TARGET}")

    while offset < TOTAL_TARGET:
        end = min(offset + BATCH_SIZE * 2, TOTAL_TARGET)
        cmd = [
            sys.executable,
            str(ROOT / "run_refill_batches.py"),
            "--ids-file", str(IDS_FILE),
            "--checkpoint-file", str(CHECKPOINT),
            "--summary-dir", str(SUMMARY_DIR),
            "--service-role-key-file", str(KEY_FILE),
            "--resume",
            "--end-offset", str(end),
            "--batch-size", str(BATCH_SIZE),
            "--workers", "1",
        ]
        print(f"\n--- 执行 {offset} -> {end} ---")
        result = subprocess.run(cmd, cwd=str(ROOT.parent), capture_output=True, text=True, encoding="utf-8")
        if result.stdout:
            print(result.stdout[-500:])
        if result.returncode != 0:
            print(f"错误 (returncode={result.returncode}):")
            if result.stderr:
                print(result.stderr[-500:])
            break

        new_offset = current_offset()
        if new_offset <= offset:
            print("进度未前进，停止")
            break
        offset = new_offset
        print(f"进度: {offset}/{TOTAL_TARGET}")
        time.sleep(1)

    print(f"\n最终进度: {offset}/{TOTAL_TARGET}")
    if offset >= TOTAL_TARGET:
        print("全部完成!")


if __name__ == "__main__":
    main()
