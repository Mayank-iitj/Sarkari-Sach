from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
rep_json_path = root_dir / "eval" / "report.json"
rep_md_path = root_dir / "eval" / "report.md"


def print_report():
    if not rep_json_path.exists():
        print(f"Report {rep_json_path} not found. Running evaluation...")
        import asyncio
        from eval.run import evaluate
        asyncio.run(evaluate(split="test", write_report=True))

    with open(rep_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    hm = data.get("headline_metrics", {})
    print("\n" + "=" * 55)
    print("                 BENCHMARK SCORECARD")
    print("=" * 55)
    print(f" Macro-F1                : {hm.get('macro_f1', 0):.1f}%")
    print(f" FORGED Precision        : {hm.get('forged_precision', 0):.1f}%")
    print(f" False-FORGED on Controls: {hm.get('false_forged_rate', 0):.1f}% (Gate: 0.0%)")
    print(f" Citation Validity       : {hm.get('citation_validity', 0):.1f}%")
    print(f" Hallucinated Sources    : {hm.get('hallucinated_sources', 0):.1f}%")
    print(f" Abstention Rate         : {hm.get('abstention_rate', 0):.1f}%")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", action="store_true", default=True)
    args = parser.parse_args()
    print_report()

