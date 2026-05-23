import numpy as np
import pandas as pd
from typing import Optional

from config import DEFAULT_TOP_K, RECALL_CANDIDATE_POOL_SIZE, FEATURE_KEYS, PROJECT_ROOT
from scene_mapper import (
    list_scenes,
    get_preferred_genres,
    get_preferred_subgenres,
    get_target_features,
    get_tolerances,
    get_ranking_weights,
    get_target_array,
    get_scene_profile,
)
from recall import recall
from ranker import rank, generate_recommendation_reason
from vision.scene_classifier import get_scene_classifier, BaseSceneClassifier

from attribute_mapper import (
    build_attribute_profile,
    list_scene_prototypes,
    get_feature_importance,
)


def recommend(
    scene: str,
    songs_df: pd.DataFrame,
    top_k: int = DEFAULT_TOP_K,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
) -> pd.DataFrame:
    profile = get_scene_profile(scene)

    preferred_genres = get_preferred_genres(scene)
    preferred_subgenres = get_preferred_subgenres(scene)
    target_features = get_target_features(scene, songs_df)
    tolerances = get_tolerances(scene, songs_df)
    weights = get_ranking_weights(scene)
    target_vector = get_target_array(scene, songs_df)

    candidates = recall(
        songs_df=songs_df,
        preferred_genres=preferred_genres,
        preferred_subgenres=preferred_subgenres,
        target_features=target_features,
        tolerances=tolerances,
        pool_size=pool_size,
    )

    results = rank(
        candidates=candidates,
        target_vector=target_vector,
        preferred_genres=preferred_genres,
        preferred_subgenres=preferred_subgenres,
        weights=weights,
        top_k=top_k,
    )

    return results


def recommend_all_scenes(
    songs_df: pd.DataFrame,
    top_k: int = DEFAULT_TOP_K,
) -> dict:
    results = {}
    for scene in list_scenes():
        results[scene] = recommend(scene, songs_df, top_k=top_k)
    return results


def recommend_by_attributes(
    attribute_profile: dict,
    songs_df: pd.DataFrame,
    top_k: int = DEFAULT_TOP_K,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
) -> pd.DataFrame:
    preferred_genres = attribute_profile["preferred_genres"]
    genre_priors = attribute_profile.get("genre_priors", {})
    feature_importance = attribute_profile.get("feature_importance", {})
    target_features = attribute_profile["music_targets"]
    tolerances = attribute_profile["tolerances"]
    weights = attribute_profile["ranking_weights"]
    target_vector = np.array(attribute_profile["target_array"], dtype=float)

    candidates = recall(
        songs_df=songs_df,
        preferred_genres=preferred_genres,
        preferred_subgenres=[],
        target_features=target_features,
        tolerances=tolerances,
        pool_size=pool_size,
        use_soft_scoring=True,
    )

    feature_weights_arr = np.array(
        [feature_importance.get(k, 1.0 / len(FEATURE_KEYS)) for k in FEATURE_KEYS],
        dtype=float,
    )

    results = rank(
        candidates=candidates,
        target_vector=target_vector,
        preferred_genres=preferred_genres,
        preferred_subgenres=[],
        weights=weights,
        top_k=top_k,
        genre_priors=genre_priors,
        feature_weights=feature_weights_arr,
    )

    return results


def recommend_by_attribute_scores(
    songs_df: pd.DataFrame,
    attribute_scores: Optional[dict] = None,
    scene_name: Optional[str] = None,
    top_k: int = DEFAULT_TOP_K,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
) -> dict:
    profile = build_attribute_profile(
        scene_name=scene_name,
        attribute_scores=attribute_scores,
        songs_df=songs_df,
    )
    results = recommend_by_attributes(profile, songs_df, top_k=top_k, pool_size=pool_size)
    return {
        "source_scene": profile["source_scene"],
        "attribute_scores": profile["attribute_scores"],
        "attribute_summary": profile["attribute_summary"],
        "genre_priors": profile["genre_priors"],
        "music_targets": profile["music_targets"],
        "prototype_matches": profile["prototype_matches"],
        "feature_importance": profile["feature_importance"],
        "recommendation_reason": generate_recommendation_reason(profile),
        "results": results,
    }


def recommend_all_scenes_by_attributes(
    songs_df: pd.DataFrame,
    top_k: int = DEFAULT_TOP_K,
) -> dict:
    results = {}
    for scene in list_scene_prototypes():
        data = recommend_by_attribute_scores(songs_df, scene_name=scene, top_k=top_k)
        results[scene] = data
    return results


_classifier_cache: Optional[BaseSceneClassifier] = None
_classifier_cache_key: Optional[str] = None


def _get_classifier(clip_checkpoint_path: Optional[str] = None) -> BaseSceneClassifier:
    global _classifier_cache, _classifier_cache_key
    cache_key = clip_checkpoint_path or "__default__"
    if _classifier_cache is None or _classifier_cache_key != cache_key:
        _classifier_cache = get_scene_classifier(clip_checkpoint_path=clip_checkpoint_path)
        _classifier_cache_key = cache_key
        try:
            with open(PROJECT_ROOT / "debug_get_classifier.txt", "a") as df:
                df.write(f"_get_classifier CREATED model={_classifier_cache.model_name} cache_key={cache_key}\n")
        except Exception:
            pass
    else:
        try:
            with open(PROJECT_ROOT / "debug_get_classifier.txt", "a") as df:
                df.write(f"_get_classifier CACHED model={_classifier_cache.model_name} cache_key={cache_key}\n")
        except Exception:
            pass
    return _classifier_cache


def recommend_by_image(
    image_path: str,
    songs_df: pd.DataFrame,
    top_k: int = DEFAULT_TOP_K,
    pool_size: int = RECALL_CANDIDATE_POOL_SIZE,
    classifier_prefer: Optional[str] = None,
    clip_checkpoint_path: Optional[str] = None,
    use_attributes: bool = False,
) -> dict:
    classifier = (
        get_scene_classifier(
            prefer=classifier_prefer,
            clip_checkpoint_path=clip_checkpoint_path,
        )
        if classifier_prefer
        else _get_classifier(clip_checkpoint_path=clip_checkpoint_path)
    )
    try:
        with open(PROJECT_ROOT / "debug_recommend_by_image.txt", "a") as df:
            df.write(f"recommend_by_image classifier_prefer={classifier_prefer} model={classifier.model_name}\n")
    except Exception:
        pass
    scene, confidence = classifier.classify(image_path)
    fallback_reason = getattr(classifier, "_fallback_reason", None)

    if use_attributes:
        profile = build_attribute_profile(scene_name=scene, songs_df=songs_df)
        results = recommend_by_attributes(profile, songs_df, top_k=top_k, pool_size=pool_size)
        output = {
            "scene": scene,
            "confidence": confidence,
            "model": classifier.model_name,
            "use_attributes": True,
            "attribute_scores": profile["attribute_scores"],
            "attribute_summary": profile["attribute_summary"],
            "prototype_matches": profile["prototype_matches"],
            "recommendation_reason": generate_recommendation_reason(profile),
            "preferred_genres": profile["preferred_genres"],
            "genre_priors": profile["genre_priors"],
            "feature_importance": profile["feature_importance"],
            "music_targets": profile["music_targets"],
            "image_path": image_path,
            "results": results,
        }
        if fallback_reason:
            output["fallback_reason"] = fallback_reason
        return output

    results = recommend(scene, songs_df, top_k=top_k, pool_size=pool_size)
    output = {
        "scene": scene,
        "confidence": confidence,
        "model": classifier.model_name,
        "classifier_prefer": classifier_prefer or "auto",
        "clip_checkpoint_path": clip_checkpoint_path,
        "image_path": image_path,
        "results": results,
    }
    if fallback_reason:
        output["fallback_reason"] = fallback_reason
    return output
