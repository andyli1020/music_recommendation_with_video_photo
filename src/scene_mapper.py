import json
import pandas as pd
from pathlib import Path
from typing import Optional

from config import SCENE_PROFILES_JSON, FEATURE_KEYS


def load_scene_profiles(path: Optional[Path] = None) -> dict:
    path = path or SCENE_PROFILES_JSON
    with open(path, "r", encoding="utf-8") as f:
        profiles = json.load(f)
    return profiles


def list_scenes() -> list:
    profiles = load_scene_profiles()
    return list(profiles.keys())


def get_scene_profile(scene: str) -> dict:
    profiles = load_scene_profiles()
    if scene not in profiles:
        available = list(profiles.keys())
        raise KeyError(f"未知场景 '{scene}'，可选：{available}")
    return profiles[scene]


def get_target_features(scene: str, songs_df: pd.DataFrame) -> dict:
    profile = get_scene_profile(scene)
    target = dict(profile["target_features"])

    if "tempo" in target and "tempo" in songs_df.columns:
        min_t = songs_df["tempo"].min()
        max_t = songs_df["tempo"].max()
        target["tempo_norm"] = (target["tempo"] - min_t) / (max_t - min_t) if max_t > min_t else 0.5
        target.pop("tempo")

    return target


def get_preferred_genres(scene: str) -> list:
    profile = get_scene_profile(scene)
    return profile.get("preferred_genres", [])


def get_preferred_subgenres(scene: str) -> list:
    profile = get_scene_profile(scene)
    return profile.get("preferred_subgenres", [])


def get_tolerances(scene: str, songs_df: pd.DataFrame) -> dict:
    profile = get_scene_profile(scene)
    tolerances = dict(profile.get("tolerances", {}))

    if "tempo" in tolerances and "tempo" in songs_df.columns:
        min_t = songs_df["tempo"].min()
        max_t = songs_df["tempo"].max()
        tolerances["tempo_norm"] = tolerances["tempo"] / (max_t - min_t) if max_t > min_t else 0.1
        tolerances.pop("tempo")

    return tolerances


def get_ranking_weights(scene: str) -> dict:
    profile = get_scene_profile(scene)
    return profile.get("ranking_weights", {})


def get_target_array(scene: str, songs_df: pd.DataFrame) -> list:
    target = get_target_features(scene, songs_df)
    return [target.get(k, 0.0) for k in FEATURE_KEYS]
