#!/usr/bin/env python
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, Iterable, List
from urllib.parse import unquote, urlparse

import requests


COMMONS_API = "https://commons.wikimedia.org/w/api.php"
DEFAULT_OUTPUT_DIR = Path("data/test_images_real")
USER_AGENT = "music-scene-recommender-image-downloader/1.0"
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


SCENE_QUERIES: Dict[str, List[str]] = {
    "cafe": [
        "cafe interior",
        "coffee shop interior",
        "coffeehouse seating",
    ],
    "gym": [
        "gym interior",
        "fitness center interior",
        "weight room",
    ],
    "study_room": [
        "library reading room",
        "study room interior",
        "university library interior",
    ],
    "night_street": [
        "city street at night",
        "urban street night",
        "night street photography",
    ],
    "mountain": [
        "mountain landscape",
        "mountain trail",
        "mountain scenic view",
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="从 Wikimedia Commons 下载场景示例图片并保存授权信息。"
    )
    parser.add_argument(
        "--scene",
        choices=sorted(SCENE_QUERIES.keys()),
        help="仅下载指定场景；不传时下载全部场景。",
    )
    parser.add_argument(
        "--per-scene",
        type=int,
        default=3,
        help="每个场景下载的图片数量，默认 3。",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="图片输出目录，默认 data/test_images_real。",
    )
    parser.add_argument(
        "--max-results-per-query",
        type=int,
        default=12,
        help="每个检索词向 Commons 请求的最大候选数，默认 12。",
    )
    parser.add_argument(
        "--thumb-width",
        type=int,
        default=1280,
        help="下载缩略图宽度，默认 1280，可减少文件体积。",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.5,
        help="每次下载后的等待秒数，默认 0.5。",
    )
    return parser.parse_args()


def build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[\\/:*?\"<>|]+", "_", name)
    cleaned = re.sub(r"\s+", "_", cleaned).strip("._")
    return cleaned[:100] or "image"


def strip_title_prefix(title: str) -> str:
    if title.lower().startswith("file:"):
        return title[5:]
    return title


def strip_known_suffix(name: str) -> str:
    lower_name = name.lower()
    for ext in VALID_EXTENSIONS:
        if lower_name.endswith(ext):
            return name[: -len(ext)]
    return name


def clean_html_text(value: str) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", "", value)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def choose_image_url(imageinfo: dict) -> str | None:
    url = imageinfo.get("thumburl") or imageinfo.get("url")
    if not url:
        return None
    path = unquote(urlparse(url).path).lower()
    if any(path.endswith(ext) for ext in VALID_EXTENSIONS):
        return url
    return None


def extract_license(imageinfo: dict) -> dict:
    meta = imageinfo.get("extmetadata", {})
    return {
        "license": clean_html_text(meta.get("LicenseShortName", {}).get("value", "")),
        "license_url": clean_html_text(meta.get("LicenseUrl", {}).get("value", "")),
        "artist": clean_html_text(meta.get("Artist", {}).get("value", "")),
        "credit": clean_html_text(meta.get("Credit", {}).get("value", "")),
        "image_description": clean_html_text(meta.get("ImageDescription", {}).get("value", "")),
        "usage_terms": clean_html_text(meta.get("UsageTerms", {}).get("value", "")),
    }


def search_commons(
    session: requests.Session, query: str, limit: int, thumb_width: int
) -> Iterable[dict]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo|info",
        "inprop": "url",
        "iiprop": "url|extmetadata",
        "iiurlwidth": thumb_width,
    }
    response = session.get(COMMONS_API, params=params, timeout=30)
    response.raise_for_status()
    pages = response.json().get("query", {}).get("pages", {})
    return pages.values()


def download_file(session: requests.Session, url: str, output_path: Path) -> None:
    with session.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with output_path.open("wb") as fh:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    fh.write(chunk)


def make_manifest_record(scene: str, item: dict, image_url: str, local_path: Path) -> dict:
    imageinfo = item["imageinfo"][0]
    license_info = extract_license(imageinfo)
    return {
        "scene": scene,
        "title": item.get("title", ""),
        "pageid": item.get("pageid"),
        "source_page": item.get("fullurl", ""),
        "download_url": image_url,
        "local_path": str(local_path.as_posix()),
        **license_info,
    }


def download_scene_images(
    session: requests.Session,
    scene: str,
    queries: List[str],
    per_scene: int,
    output_dir: Path,
    max_results_per_query: int,
    thumb_width: int,
    sleep_seconds: float,
) -> list[dict]:
    scene_dir = output_dir / scene
    scene_dir.mkdir(parents=True, exist_ok=True)

    downloaded: list[dict] = []
    seen_page_ids = set()

    for query in queries:
        if len(downloaded) >= per_scene:
            break

        print(f"[{scene}] 检索: {query}")
        try:
            candidates = search_commons(session, query, max_results_per_query, thumb_width)
        except requests.RequestException as exc:
            print(f"[{scene}] 检索失败: {exc}", file=sys.stderr)
            continue

        for item in candidates:
            if len(downloaded) >= per_scene:
                break

            page_id = item.get("pageid")
            if page_id in seen_page_ids:
                continue
            seen_page_ids.add(page_id)

            image_infos = item.get("imageinfo") or []
            if not image_infos:
                continue

            image_url = choose_image_url(image_infos[0])
            if not image_url:
                continue

            suffix = Path(unquote(urlparse(image_url).path)).suffix.lower()
            raw_title = strip_title_prefix(item.get("title", f"{scene}_{page_id}"))
            base_name = sanitize_filename(strip_known_suffix(raw_title))
            output_path = scene_dir / f"{base_name}{suffix}"

            if output_path.exists():
                record = make_manifest_record(scene, item, image_url, output_path)
                downloaded.append(record)
                print(f"[{scene}] 已存在，跳过下载: {output_path.name}")
                continue

            try:
                download_file(session, image_url, output_path)
            except requests.RequestException as exc:
                print(f"[{scene}] 下载失败 {item.get('title')}: {exc}", file=sys.stderr)
                continue

            record = make_manifest_record(scene, item, image_url, output_path)
            downloaded.append(record)
            print(f"[{scene}] 已下载: {output_path.name}")
            time.sleep(sleep_seconds)

    return downloaded


def save_manifest(output_dir: Path, records: list[dict]) -> Path:
    manifest_path = output_dir / "download_manifest.json"
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest_path


def main() -> int:
    args = parse_args()
    session = build_session()

    scenes = (
        {args.scene: SCENE_QUERIES[args.scene]}
        if args.scene
        else SCENE_QUERIES
    )

    all_records: list[dict] = []
    for scene, queries in scenes.items():
        records = download_scene_images(
            session=session,
            scene=scene,
            queries=queries,
            per_scene=args.per_scene,
            output_dir=args.output_dir,
            max_results_per_query=args.max_results_per_query,
            thumb_width=args.thumb_width,
            sleep_seconds=args.sleep,
        )
        all_records.extend(records)
        print(f"[{scene}] 完成，共收集 {len(records)} 张图片")

    manifest_path = save_manifest(args.output_dir, all_records)
    print(f"总计收集 {len(all_records)} 张图片")
    print(f"元数据清单已保存到: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
