import numpy as np
import pandas as pd
from typing import Optional

from config import FEATURE_KEYS


def compute_cosine_similarity(
    song_vectors: np.ndarray,
    target_vector: np.ndarray,
    feature_weights: Optional[np.ndarray] = None,
) -> np.ndarray:
    target = target_vector.reshape(1, -1)
    if feature_weights is not None:
        w = feature_weights.reshape(1, -1)
        dot = ((song_vectors * w) @ target.T)
        norm_songs = np.sqrt(((song_vectors ** 2) * w).sum(axis=1, keepdims=True))
        norm_target = np.sqrt(((target ** 2) * w).sum())
    else:
        dot = song_vectors @ target.T
        norm_songs = np.linalg.norm(song_vectors, axis=1, keepdims=True)
        norm_target = np.linalg.norm(target)
    denom = norm_songs * norm_target + 1e-9
    return (dot / denom).flatten()


def compute_genre_prior_score(
    songs_df: pd.DataFrame,
    genre_priors: dict,
) -> np.ndarray:
    scores = np.zeros(len(songs_df))
    for genre, prior in genre_priors.items():
        mask = songs_df["genre"].str.lower() == genre.lower()
        scores[mask] = float(prior)
    return scores


def compute_genre_match_score(
    songs_df: pd.DataFrame,
    preferred_genres: list,
    preferred_subgenres: list,
    genre_priors: Optional[dict] = None,
) -> np.ndarray:
    if genre_priors:
        return compute_genre_prior_score(songs_df, genre_priors)

    scores = np.zeros(len(songs_df))
    if preferred_genres:
        scores += songs_df["genre"].isin(preferred_genres).astype(float) * 0.6
    if preferred_subgenres:
        scores += songs_df["subgenre"].isin(preferred_subgenres).astype(float) * 0.4
    return np.clip(scores, 0.0, 1.0)


def compute_popularity_score(songs_df: pd.DataFrame) -> np.ndarray:
    pop = songs_df["popularity"].values.astype(float)
    return pop / 100.0


def compute_diversity_penalty(
    songs_df: pd.DataFrame,
    selected_indices: list,
    artist_penalty: float = 0.08,
    genre_penalty: float = 0.04,
) -> np.ndarray:
    penalties = np.zeros(len(songs_df))
    if not selected_indices:
        return penalties

    selected = songs_df.iloc[selected_indices]
    selected_artists = set(selected["artist"].values)
    selected_genres = set(selected["genre"].values)

    artist_counts = selected["artist"].value_counts().to_dict()
    genre_counts = selected["genre"].value_counts().to_dict()

    for i in range(len(songs_df)):
        artist = songs_df.iloc[i]["artist"]
        genre = songs_df.iloc[i]["genre"]
        if artist in artist_counts:
            penalties[i] += artist_counts[artist] * artist_penalty
        if genre in genre_counts:
            penalties[i] += genre_counts[genre] * genre_penalty

    return penalties


def generate_recommendation_reason(attribute_profile: dict) -> str:
    summary = attribute_profile.get("attribute_summary", [])
    if not summary:
        return ""

    desc_parts = []
    hint_parts = []
    for item in summary[:3]:
        score = item["score"]
        attr_name = item["attribute"]
        if score >= 0.70:
            level = "高"
        elif score >= 0.40:
            level = "中等"
        else:
            level = "低"
        desc_parts.append(f"{attr_name}{level}({score:.2f})")
        hint = item.get("music_effect_hint", "")
        if hint:
            hint_parts.append(hint)

    reason = "该场景" + "、".join(desc_parts)
    if hint_parts:
        reason += "，推荐" + "、".join(hint_parts) + "的歌曲"

    prototypes = attribute_profile.get("prototype_matches", [])
    if prototypes:
        top_proto = prototypes[0]["scene"]
        reason += f"，最接近原型场景「{top_proto}」"

    return reason


def rank(
    candidates: pd.DataFrame,
    target_vector: np.ndarray,
    preferred_genres: list,
    preferred_subgenres: list,
    weights: dict,
    top_k: int = 10,
    genre_priors: Optional[dict] = None,
    feature_weights: Optional[np.ndarray] = None,
) -> pd.DataFrame:
    if len(candidates) == 0:
        return candidates.copy()

    feature_cols = [k for k in FEATURE_KEYS if k in candidates.columns]
    song_vectors = candidates[feature_cols].values.astype(float)
    target_arr = np.array([target_vector[i] for i, k in enumerate(FEATURE_KEYS) if k in candidates.columns], dtype=float)

    if feature_weights is not None:
        fw = np.array([feature_weights[i] for i, k in enumerate(FEATURE_KEYS) if k in candidates.columns], dtype=float)
    else:
        fw = None

    sim_scores = compute_cosine_similarity(song_vectors, target_arr, fw)
    genre_scores = compute_genre_match_score(candidates, preferred_genres, preferred_subgenres, genre_priors)
    pop_scores = compute_popularity_score(candidates)

    w_genre = weights.get("genre_match", 0.30)
    w_feature = weights.get("feature_similarity", 0.50)
    w_pop = weights.get("popularity", 0.20)

    base_scores = (
        w_genre * genre_scores
        + w_feature * sim_scores
        + w_pop * pop_scores
    )

    ranked_indices = []
    result_scores = np.copy(base_scores)

    for _ in range(min(top_k, len(candidates))):
        penalties = compute_diversity_penalty(candidates, ranked_indices)
        adjusted = result_scores - penalties
        best_idx = int(np.argmax(adjusted))
        ranked_indices.append(best_idx)
        result_scores[best_idx] = -np.inf

    result_df = candidates.iloc[ranked_indices].copy()
    result_df["genre_match"] = genre_scores[ranked_indices].round(4)
    result_df["feature_sim"] = sim_scores[ranked_indices].round(4)
    result_df["popularity_score"] = pop_scores[ranked_indices].round(4)
    result_df["final_score"] = base_scores[ranked_indices].round(4)
    result_df["rank"] = range(1, len(result_df) + 1)

    display_cols = [
        "rank", "song_id", "title", "artist", "genre", "subgenre",
        "final_score", "feature_sim", "genre_match",
        "popularity", "danceability", "energy", "acousticness",
        "instrumentalness", "valence", "tempo",
    ]
    display_cols = [c for c in display_cols if c in result_df.columns]

    return result_df[display_cols]
