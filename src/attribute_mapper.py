import json
from pathlib import Path
from typing import Iterable, Optional

import numpy as np
import pandas as pd

from config import CONFIGS_DIR, FEATURE_KEYS


SCENE_ATTRIBUTES_JSON = CONFIGS_DIR / "scene_attributes.json"
DEFAULT_MIN_SCORE = 0.0
DEFAULT_MAX_SCORE = 1.0
DEFAULT_MIN_TEMPO = 60.0
DEFAULT_MAX_TEMPO = 170.0


def load_scene_attributes_config(path: Optional[Path] = None) -> dict:
    config_path = Path(path) if path else SCENE_ATTRIBUTES_JSON
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_mapping_rules(config: dict, key: str) -> dict:
    rules = config.get(key, {})
    if not isinstance(rules, dict):
        raise TypeError(f"配置项 '{key}' 必须为对象")
    return rules


def get_music_target_weight_rules(path: Optional[Path] = None) -> dict:
    config = load_scene_attributes_config(path)
    return _get_mapping_rules(config, "music_target_weight_rules")


def get_current_dataset_genre_prior_rules(path: Optional[Path] = None) -> dict:
    config = load_scene_attributes_config(path)
    return _get_mapping_rules(config, "current_dataset_genre_prior_rules")


def list_attributes(path: Optional[Path] = None) -> list[str]:
    config = load_scene_attributes_config(path)
    return list(config.get("attribute_order", []))


def list_scene_prototypes(path: Optional[Path] = None) -> list[str]:
    config = load_scene_attributes_config(path)
    return list(config.get("scene_prototypes", {}).keys())


def get_attribute_definition(attribute_name: str, path: Optional[Path] = None) -> dict:
    config = load_scene_attributes_config(path)
    definitions = config.get("attributes", {})
    if attribute_name not in definitions:
        raise KeyError(f"未知属性 '{attribute_name}'，可选：{list(definitions.keys())}")
    return definitions[attribute_name]


def get_scene_prototype(scene_name: str, path: Optional[Path] = None) -> dict:
    config = load_scene_attributes_config(path)
    prototypes = config.get("scene_prototypes", {})
    if scene_name not in prototypes:
        raise KeyError(f"未知场景原型 '{scene_name}'，可选：{list(prototypes.keys())}")
    return prototypes[scene_name]


def _get_score_range(config: dict) -> tuple[float, float]:
    score_range = config.get("score_range", [DEFAULT_MIN_SCORE, DEFAULT_MAX_SCORE])
    min_score = float(score_range[0])
    max_score = float(score_range[1])
    return min_score, max_score


def _clip_value(value: float, min_score: float, max_score: float) -> float:
    return float(np.clip(float(value), min_score, max_score))


def normalize_attribute_scores(
    attribute_scores: dict,
    path: Optional[Path] = None,
) -> dict:
    config = load_scene_attributes_config(path)
    ordered_attributes = config.get("attribute_order", [])
    min_score, max_score = _get_score_range(config)

    normalized = {}
    for name in ordered_attributes:
        value = float(attribute_scores.get(name, 0.0))
        normalized[name] = round(_clip_value(value, min_score, max_score), 6)
    return normalized


def get_scene_attribute_scores(scene_name: str, path: Optional[Path] = None) -> dict:
    prototype = get_scene_prototype(scene_name, path)
    return normalize_attribute_scores(prototype.get("attribute_scores", {}), path=path)


def attribute_scores_to_array(
    attribute_scores: dict,
    path: Optional[Path] = None,
) -> np.ndarray:
    normalized = normalize_attribute_scores(attribute_scores, path=path)
    ordered_names = list_attributes(path)
    return np.array([normalized[name] for name in ordered_names], dtype=float)


def _weighted_sum(attribute_scores: dict, rule: dict) -> float:
    total = float(rule.get("bias", 0.0))
    for key, weight in rule.get("weights", {}).items():
        total += float(attribute_scores.get(key, 0.0)) * float(weight)
    return total


def _tempo_to_norm(tempo: float, songs_df: Optional[pd.DataFrame] = None) -> float:
    if songs_df is not None and "tempo" in songs_df.columns and len(songs_df) > 0:
        min_tempo = float(songs_df["tempo"].min())
        max_tempo = float(songs_df["tempo"].max())
    else:
        min_tempo = DEFAULT_MIN_TEMPO
        max_tempo = DEFAULT_MAX_TEMPO

    if max_tempo <= min_tempo:
        return 0.5
    return (float(tempo) - min_tempo) / (max_tempo - min_tempo)


def map_attributes_to_music_targets(
    attribute_scores: dict,
    songs_df: Optional[pd.DataFrame] = None,
    path: Optional[Path] = None,
) -> dict:
    normalized = normalize_attribute_scores(attribute_scores, path=path)
    music_target_weight_rules = get_music_target_weight_rules(path=path)

    targets = {}
    for feature_name, rule in music_target_weight_rules.items():
        targets[feature_name] = round(
            _clip_value(
                _weighted_sum(normalized, rule),
                DEFAULT_MIN_SCORE,
                DEFAULT_MAX_SCORE,
            ),
            6,
        )

    tempo = (
        70.0
        + 60.0 * normalized["arousal"]
        + 10.0 * normalized["urban"]
        - 12.0 * normalized["focus"]
        - 8.0 * normalized["relaxation"]
    )
    tempo = float(np.clip(tempo, DEFAULT_MIN_TEMPO, DEFAULT_MAX_TEMPO))
    targets["tempo"] = round(tempo, 6)
    targets["tempo_norm"] = round(
        _clip_value(_tempo_to_norm(tempo, songs_df=songs_df), DEFAULT_MIN_SCORE, DEFAULT_MAX_SCORE),
        6,
    )
    return targets


def map_attributes_to_tolerances(
    attribute_scores: dict,
    songs_df: Optional[pd.DataFrame] = None,
    path: Optional[Path] = None,
) -> dict:
    normalized = normalize_attribute_scores(attribute_scores, path=path)

    tolerances = {
        "danceability": 0.12 + 0.06 * normalized["socialness"],
        "energy": 0.12 + 0.08 * (1.0 - normalized["focus"]),
        "acousticness": 0.14 + 0.08 * normalized["relaxation"],
        "instrumentalness": 0.12 + 0.08 * normalized["focus"],
        "valence": 0.14 + 0.06 * normalized["warmth"],
        "tempo": 12.0 + 10.0 * normalized["arousal"],
    }

    tolerances["tempo_norm"] = _tempo_to_norm(tolerances["tempo"], songs_df=songs_df)
    return {key: round(float(value), 6) for key, value in tolerances.items()}


def map_attributes_to_genre_priors(
    attribute_scores: dict,
    available_genres: Optional[Iterable[str]] = None,
    path: Optional[Path] = None,
) -> dict:
    normalized = normalize_attribute_scores(attribute_scores, path=path)
    genre_prior_rules = get_current_dataset_genre_prior_rules(path=path)

    priors = {
        genre: _clip_value(
            _weighted_sum(normalized, rule),
            DEFAULT_MIN_SCORE,
            DEFAULT_MAX_SCORE,
        )
        for genre, rule in genre_prior_rules.items()
    }

    if available_genres is not None:
        allowed = {str(genre).lower() for genre in available_genres}
        priors = {genre: score for genre, score in priors.items() if genre.lower() in allowed}

    return dict(sorted(((genre, round(score, 6)) for genre, score in priors.items()), key=lambda x: x[1], reverse=True))


def select_preferred_genres(
    genre_priors: dict,
    top_n: int = 3,
    min_score: float = 0.15,
) -> list[str]:
    ranked = [(genre, score) for genre, score in genre_priors.items() if score >= min_score]
    if not ranked:
        ranked = list(genre_priors.items())
    ranked = sorted(ranked, key=lambda item: item[1], reverse=True)
    return [genre for genre, _ in ranked[:top_n]]


def get_attribute_ranking_weights(attribute_scores: dict, path: Optional[Path] = None) -> dict:
    normalized = normalize_attribute_scores(attribute_scores, path=path)
    genre_weight = 0.20 + 0.10 * max(normalized["socialness"], normalized["urban"], normalized["night"])
    popularity_weight = 0.15 + 0.10 * normalized["socialness"]
    genre_weight = min(genre_weight, 0.35)
    popularity_weight = min(popularity_weight, 0.25)
    feature_weight = max(0.40, 1.0 - genre_weight - popularity_weight)

    total = genre_weight + feature_weight + popularity_weight
    return {
        "genre_match": round(genre_weight / total, 6),
        "feature_similarity": round(feature_weight / total, 6),
        "popularity": round(popularity_weight / total, 6),
    }


def build_target_array(
    music_targets: dict,
    songs_df: Optional[pd.DataFrame] = None,
) -> list[float]:
    target = dict(music_targets)
    if "tempo_norm" not in target and "tempo" in target:
        target["tempo_norm"] = _tempo_to_norm(target["tempo"], songs_df=songs_df)
    return [float(target.get(key, 0.0)) for key in FEATURE_KEYS]


def match_scene_prototypes(
    attribute_scores: dict,
    top_k: Optional[int] = None,
    path: Optional[Path] = None,
) -> list[dict]:
    config = load_scene_attributes_config(path)
    prototypes = config.get("scene_prototypes", {})
    if not prototypes:
        return []

    normalized = normalize_attribute_scores(attribute_scores, path=path)
    query = attribute_scores_to_array(normalized, path=path)
    query_norm = np.linalg.norm(query) + 1e-9

    if top_k is None:
        top_k = int(config.get("prototype_match", {}).get("top_k", 2))

    matches = []
    for scene_name, scene_data in prototypes.items():
        prototype_scores = normalize_attribute_scores(scene_data.get("attribute_scores", {}), path=path)
        prototype_arr = attribute_scores_to_array(prototype_scores, path=path)
        similarity = float((query @ prototype_arr) / (query_norm * (np.linalg.norm(prototype_arr) + 1e-9)))
        matches.append(
            {
                "scene": scene_name,
                "similarity": round(similarity, 6),
                "description": scene_data.get("description", ""),
                "prototype_tags": scene_data.get("prototype_tags", []),
            }
        )

    matches.sort(key=lambda item: item["similarity"], reverse=True)
    return matches[:top_k]


def summarize_attribute_scores(
    attribute_scores: dict,
    top_n: int = 3,
    path: Optional[Path] = None,
) -> list[dict]:
    config = load_scene_attributes_config(path)
    definitions = config.get("attributes", {})
    normalized = normalize_attribute_scores(attribute_scores, path=path)

    ranked = sorted(normalized.items(), key=lambda item: item[1], reverse=True)[:top_n]
    summary = []
    for name, score in ranked:
        definition = definitions.get(name, {})
        summary.append(
            {
                "attribute": name,
                "score": round(float(score), 6),
                "description": definition.get("description", ""),
                "music_effect_hint": definition.get("music_effect_hint", ""),
            }
        )
    return summary


def get_feature_importance(
    attribute_scores: dict,
    path: Optional[Path] = None,
) -> dict:
    normalized = normalize_attribute_scores(attribute_scores, path=path)
    music_target_weight_rules = get_music_target_weight_rules(path=path)

    raw = {key: 0.0 for key in FEATURE_KEYS}

    for feature_name, rule in music_target_weight_rules.items():
        if feature_name not in raw:
            continue
        for attr_key, weight in rule.get("weights", {}).items():
            attr_score = normalized.get(attr_key, 0.5)
            deviation = abs(attr_score - 0.5)
            raw[feature_name] += deviation * abs(float(weight))

    raw["tempo_norm"] = (
        abs(normalized.get("arousal", 0.5) - 0.5) * 0.45
        + abs(normalized.get("focus", 0.5) - 0.5) * 0.15
        + abs(normalized.get("relaxation", 0.5) - 0.5) * 0.10
        + abs(normalized.get("urban", 0.5) - 0.5) * 0.05
    )

    for key in raw:
        raw[key] = max(raw[key], 0.05)

    total = sum(raw.values()) + 1e-9
    return {k: round(v / total, 6) for k, v in raw.items()}


def build_attribute_profile(
    scene_name: Optional[str] = None,
    attribute_scores: Optional[dict] = None,
    songs_df: Optional[pd.DataFrame] = None,
    top_genres: int = 3,
    path: Optional[Path] = None,
) -> dict:
    if scene_name is None and attribute_scores is None:
        raise ValueError("scene_name 和 attribute_scores 不能同时为空")

    if attribute_scores is None:
        attribute_scores = get_scene_attribute_scores(scene_name, path=path)

    available_genres = None
    if songs_df is not None and "genre" in songs_df.columns:
        available_genres = songs_df["genre"].dropna().astype(str).tolist()

    normalized = normalize_attribute_scores(attribute_scores, path=path)
    music_targets = map_attributes_to_music_targets(normalized, songs_df=songs_df, path=path)
    genre_priors = map_attributes_to_genre_priors(normalized, available_genres=available_genres, path=path)
    preferred_genres = select_preferred_genres(genre_priors, top_n=top_genres)

    return {
        "source_scene": scene_name,
        "attribute_scores": normalized,
        "attribute_summary": summarize_attribute_scores(normalized, path=path),
        "music_targets": music_targets,
        "tolerances": map_attributes_to_tolerances(normalized, songs_df=songs_df, path=path),
        "genre_priors": genre_priors,
        "preferred_genres": preferred_genres,
        "ranking_weights": get_attribute_ranking_weights(normalized, path=path),
        "target_array": build_target_array(music_targets, songs_df=songs_df),
        "prototype_matches": match_scene_prototypes(normalized, path=path),
        "feature_importance": get_feature_importance(normalized, path=path),
    }
