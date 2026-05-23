import pandas as pd
import numpy as np
from typing import Optional

from config import FEATURE_KEYS, RECALL_CANDIDATE_POOL_SIZE


def recall_by_genre(
    songs_df: pd.DataFrame,
    preferred_genres: list,
    preferred_subgenres: Optional[list] = None,
    min_candidates: int = 50,
) -> pd.DataFrame:
    if preferred_subgenres is None:
        preferred_subgenres = []

    genre_mask = songs_df["genre"].isin(preferred_genres)
    subgenre_mask = songs_df["subgenre"].isin(preferred_subgenres)
    candidates = songs_df[genre_mask | subgenre_mask].copy()

    if len(candidates) < min_candidates:
        candidates = songs_df.copy()

    return candidates


def recall_by_features(
    candidates: pd.DataFrame,
    target_features: dict,
    tolerances: dict,
    min_candidates: int = 10,
) -> pd.DataFrame:
    mask = pd.Series(True, index=candidates.index)

    for key in FEATURE_KEYS:
        if key not in target_features or key not in tolerances:
            continue
        target_val = target_features[key]
        tol = tolerances[key]
        col = candidates[key]
        mask = mask & (col >= target_val - tol) & (col <= target_val + tol)

    filtered = candidates[mask].copy()

    if len(filtered) < min_candidates:
        for key in FEATURE_KEYS:
            if key not in target_features or key not in tolerances:
                continue
            target_val = target_features[key]
            tol = tolerances[key] * 2
            col = candidates[key]
            mask = mask | ((col >= target_val - tol) & (col <= target_val + tol))
        filtered = candidates[mask].copy()

    return filtered


def recall_by_feature_scoring(
    candidates: pd.DataFrame,
    target_features: dict,
    tolerances: dict,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
) -> pd.DataFrame:
    if len(candidates) <= pool_size:
        return candidates.copy()

    scores = np.ones(len(candidates))
    for key in FEATURE_KEYS:
        if key not in target_features or key not in tolerances:
            continue
        target_val = target_features[key]
        tol = tolerances[key]
        col = candidates[key].values
        dist = np.abs(col - target_val)
        scores *= np.exp(-dist / max(tol, 0.01))

    candidates = candidates.copy()
    candidates["_recall_score"] = scores
    result = candidates.nlargest(pool_size, "_recall_score").drop(columns=["_recall_score"])
    return result


def select_recall_pool(
    candidates: pd.DataFrame,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
    seed: int = 42,
) -> pd.DataFrame:
    if len(candidates) <= pool_size:
        return candidates.copy()

    return candidates.sample(n=pool_size, random_state=seed).copy()


def recall(
    songs_df: pd.DataFrame,
    preferred_genres: list,
    preferred_subgenres: list,
    target_features: dict,
    tolerances: dict,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
    use_soft_scoring: bool = False,
) -> pd.DataFrame:
    candidates = recall_by_genre(songs_df, preferred_genres, preferred_subgenres)

    if use_soft_scoring:
        candidates = recall_by_feature_scoring(candidates, target_features, tolerances, pool_size)
    else:
        candidates = recall_by_features(candidates, target_features, tolerances)
        candidates = select_recall_pool(candidates, pool_size)

    return candidates.reset_index(drop=True)
