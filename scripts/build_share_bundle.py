from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
SHARE_DIR = PROJECT_ROOT / "share"
SHARE_DATA_DIR = SHARE_DIR / "data"
SHARE_ASSETS_DIR = SHARE_DIR / "assets" / "images"
SOURCE_IMAGE_DIR = PROJECT_ROOT / "data" / "test_images"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from config import DEFAULT_TOP_K, PROCESSED_SONGS_CSV  # noqa: E402
from attribute_mapper import get_scene_prototype, list_scene_prototypes  # noqa: E402
from recommender import recommend_by_attribute_scores  # noqa: E402


SCENE_LABELS = {
    "cafe": "咖啡厅",
    "study_room": "书房",
    "gym": "健身房",
    "night_street": "夜晚街道",
    "mountain": "山野户外",
}

SCENE_ICONS = {
    "cafe": "☕",
    "study_room": "📚",
    "gym": "💪",
    "night_street": "🌃",
    "mountain": "🏔️",
}

RECOMMENDATION_COLUMNS = [
    "rank",
    "title",
    "artist",
    "genre",
    "subgenre",
    "final_score",
    "feature_sim",
    "genre_match",
    "popularity",
    "danceability",
    "energy",
    "acousticness",
    "instrumentalness",
    "valence",
    "tempo",
]


def _ensure_share_dirs() -> None:
    SHARE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    SHARE_ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def _normalize_value(value):
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float):
        return round(value, 6)
    return value


def _serialize_recommendations(df: pd.DataFrame) -> list[dict]:
    available_columns = [col for col in RECOMMENDATION_COLUMNS if col in df.columns]
    results = []
    for _, row in df.iterrows():
        item = {}
        for col in available_columns:
            item[col] = _normalize_value(row[col])
        results.append(item)
    return results


def _build_scene_payload(scene_name: str, songs_df: pd.DataFrame, top_k: int) -> dict:
    result = recommend_by_attribute_scores(songs_df=songs_df, scene_name=scene_name, top_k=top_k)
    prototype = get_scene_prototype(scene_name)
    return {
        "id": scene_name,
        "label": SCENE_LABELS.get(scene_name, scene_name),
        "icon": SCENE_ICONS.get(scene_name, ""),
        "description": prototype.get("description", ""),
        "prototype_tags": prototype.get("prototype_tags", []),
        "recommendation_reason": result.get("recommendation_reason", ""),
        "attribute_scores": result.get("attribute_scores", {}),
        "attribute_summary": result.get("attribute_summary", []),
        "feature_importance": result.get("feature_importance", {}),
        "genre_priors": result.get("genre_priors", {}),
        "music_targets": result.get("music_targets", {}),
        "prototype_matches": result.get("prototype_matches", []),
        "recommendations": _serialize_recommendations(result["results"]),
    }


def _copy_scene_image(scene_name: str) -> str | None:
    source = SOURCE_IMAGE_DIR / f"{scene_name}.jpg"
    if not source.exists():
        return None
    target = SHARE_ASSETS_DIR / source.name
    shutil.copy2(source, target)
    return f"assets/images/{target.name}"


def _build_samples(scene_payloads: list[dict]) -> list[dict]:
    samples = []
    for scene in scene_payloads:
        image_path = _copy_scene_image(scene["id"])
        if not image_path:
            continue
        samples.append(
            {
                "id": scene["id"],
                "label": f"{scene['icon']} {scene['label']}",
                "scene_id": scene["id"],
                "image": image_path,
                "description": f"示例图片，对应场景：{scene['label']}",
            }
        )
    return samples


def build_share_bundle(top_k: int = DEFAULT_TOP_K) -> Path:
    _ensure_share_dirs()

    if not PROCESSED_SONGS_CSV.exists():
        raise FileNotFoundError(
            f"未找到处理后歌曲数据: {PROCESSED_SONGS_CSV}\n"
            "请先运行 `python src/main.py` 生成数据。"
        )

    songs_df = pd.read_csv(PROCESSED_SONGS_CSV)
    scene_names = list_scene_prototypes()
    scene_payloads = [_build_scene_payload(scene_name, songs_df, top_k) for scene_name in scene_names]
    payload = {
        "meta": {
            "project_name": "视界伴音",
            "subtitle": "视觉场景感知的音乐推荐系统",
            "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
            "top_k": top_k,
            "songs_count": int(len(songs_df)),
            "share_mode": "static-demo",
            "notes": [
                "这是静态分享版页面，适合直接发给朋友预览。",
                "页面内展示的是预生成推荐结果，不依赖 Flask 服务。",
                "若需实时上传图片推理，请继续使用原 Flask 应用。",
            ],
        },
        "scenes": scene_payloads,
        "samples": _build_samples(scene_payloads),
    }

    output_path = SHARE_DATA_DIR / "share-data.js"
    output_text = "window.SHARE_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    output_path.write_text(output_text, encoding="utf-8")
    return output_path


if __name__ == "__main__":
    result_path = build_share_bundle()
    print(f"分享数据已生成: {result_path}")
