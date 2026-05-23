#!/usr/bin/env python
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import traceback
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="进程内批量测试 CLIP 场景识别稳定性，模型只加载一次。"
    )
    parser.add_argument(
        "--image-root",
        type=Path,
        default=Path("data/test_images_real"),
        help="待测试图片根目录，默认 data/test_images_real。",
    )
    parser.add_argument(
        "--classifier",
        choices=["clip", "mock"],
        default="clip",
        help="指定使用的分类器，默认 clip。",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=3,
        help="推荐结果数量，默认 3。",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("reports"),
        help="评估结果输出目录，默认 reports。",
    )
    parser.add_argument(
        "--clip-checkpoint",
        type=Path,
        help="本地 CLIP 权重文件路径。",
    )
    return parser.parse_args()


def find_images(image_root: Path) -> list[Path]:
    images: list[Path] = []
    for path in image_root.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(path)
    return sorted(images)


def build_summary(results: list[dict], classifier: str, image_root: Path) -> dict:
    total = len(results)
    ok_results = [r for r in results if r["status"] == "ok"]
    matched_results = [r for r in ok_results if r["match"]]
    status_counts: dict[str, int] = {}
    for result in results:
        status = result["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "classifier": classifier,
        "image_root": str(image_root.as_posix()),
        "total_images": total,
        "successful_runs": len(ok_results),
        "successful_accuracy": round(len(matched_results) / len(ok_results), 4) if ok_results else None,
        "overall_accuracy": round(len(matched_results) / total, 4) if total else None,
        "status_counts": status_counts,
    }


def write_json(output_path: Path, payload: dict) -> None:
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_csv(output_path: Path, results: list[dict]) -> None:
    fields = [
        "image_path",
        "expected_scene",
        "status",
        "elapsed_seconds",
        "recognized_scene",
        "confidence",
        "model",
        "match",
    ]
    with output_path.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in results:
            writer.writerow({field: row.get(field, "") for field in fields})


def save_reports(output_dir: Path, classifier: str, summary: dict, results: list[dict]) -> tuple[Path, Path]:
    payload = {"summary": summary, "results": results}
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{classifier}_stability_test"
    json_path = output_dir / f"{stem}.json"
    csv_path = output_dir / f"{stem}.csv"
    write_json(json_path, payload)
    write_csv(csv_path, results)
    return json_path, csv_path


def main() -> int:
    args = parse_args()
    image_root = args.image_root.resolve()
    if not image_root.exists():
        print(f"图片目录不存在: {image_root}", file=sys.stderr)
        return 1

    images = find_images(image_root)
    if not images:
        print(f"目录下没有可测试图片: {image_root}", file=sys.stderr)
        return 1

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
    from vision.scene_classifier import get_scene_classifier, BaseSceneClassifier

    classifier: BaseSceneClassifier
    clip_checkpoint = args.clip_checkpoint.resolve() if args.clip_checkpoint else None

    if args.classifier == "mock":
        classifier = get_scene_classifier(prefer="mock")
    else:
        from vision.scene_classifier import CLIPSceneClassifier
        checkpoint_path = clip_checkpoint or (
            Path(__file__).resolve().parent.parent / "models" / "clip" / "ViT-B-32-laion2b_s34b_b79k" / "open_clip_pytorch_model.bin"
        )
        classifier = CLIPSceneClassifier(checkpoint_path=str(checkpoint_path))

    print(f"加载分类器: {classifier.model_name}")
    if hasattr(classifier, "_lazy_load"):
        classifier._lazy_load()
    print(f"分类器就绪，共 {len(images)} 张图片待测试")

    results: list[dict] = []
    for index, image_path in enumerate(images, start=1):
        expected_scene = image_path.parent.name
        print(f"[{index}/{len(images)}] {image_path.name}")

        start = time.perf_counter()
        try:
            recognized_scene, confidence = classifier.classify(str(image_path))
            elapsed = round(time.perf_counter() - start, 3)
            status = "ok"
            error_message = ""
        except Exception:
            elapsed = round(time.perf_counter() - start, 3)
            recognized_scene = ""
            confidence = 0.0
            status = "error"
            error_message = traceback.format_exc()

        match = recognized_scene == expected_scene if recognized_scene else False
        result = {
            "image_path": str(image_path.as_posix()),
            "expected_scene": expected_scene,
            "status": status,
            "elapsed_seconds": elapsed,
            "recognized_scene": recognized_scene,
            "confidence": confidence,
            "model": classifier.model_name,
            "match": match,
            "error": error_message,
        }
        results.append(result)
        interim_summary = build_summary(results, args.classifier, image_root)
        save_reports(args.output_dir, args.classifier, interim_summary, results)
        print(
            f"  status={status} "
            f"expected={expected_scene} "
            f"recognized={recognized_scene or '-'} "
            f"confidence={round(confidence, 4) if isinstance(confidence, float) else confidence} "
            f"match={match} "
            f"elapsed={elapsed}s"
        )

    summary = build_summary(results, args.classifier, image_root)
    json_path, csv_path = save_reports(args.output_dir, args.classifier, summary, results)

    print("\n汇总结果:")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"JSON 报告: {json_path}")
    print(f"CSV 报告:  {csv_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
