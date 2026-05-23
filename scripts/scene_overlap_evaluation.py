import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import pandas as pd
import numpy as np

from config import PROJECT_ROOT
from data_loader import load_sample_spotify_data
from preprocess import preprocess_songs
from recommender import recommend_all_scenes, recommend_all_scenes_by_attributes


REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


FEATURE_COLUMNS = ["danceability", "energy", "acousticness", "instrumentalness", "valence", "tempo"]


def compute_overlap_matrix(all_results: dict, top_k: int = 10) -> pd.DataFrame:
    scenes = list(all_results.keys())
    matrix = np.zeros((len(scenes), len(scenes)))
    for i, scene_a in enumerate(scenes):
        ids_a = set(all_results[scene_a]["song_id"].head(top_k).values)
        for j, scene_b in enumerate(scenes):
            ids_b = set(all_results[scene_b]["song_id"].head(top_k).values)
            matrix[i, j] = 0.0 if not (ids_a | ids_b) else round(len(ids_a & ids_b) / len(ids_a | ids_b), 4)
    return pd.DataFrame(matrix, index=scenes, columns=scenes)


def summarize_per_scene_quality(all_results: dict, top_k: int = 10) -> pd.DataFrame:
    rows = []
    for scene, df in all_results.items():
        top_df = df.head(top_k).copy()
        genre_counts = top_df["genre"].value_counts(normalize=True)
        genre_entropy = float(-(genre_counts * np.log2(genre_counts + 1e-12)).sum())
        rows.append({
            "scene": scene,
            "unique_genres": int(top_df["genre"].nunique()),
            "unique_artists": int(top_df["artist"].nunique()),
            "genre_entropy": round(genre_entropy, 4),
            "avg_popularity": round(float(top_df["popularity"].mean()), 4),
            "avg_final_score": round(float(top_df["final_score"].mean()), 4),
        })
    return pd.DataFrame(rows).set_index("scene")


def compute_feature_distance_matrix(all_results: dict, top_k: int = 10) -> pd.DataFrame:
    scenes = list(all_results.keys())
    centroids = {scene: all_results[scene].head(top_k)[FEATURE_COLUMNS].mean().values.astype(float) for scene in scenes}
    matrix = np.zeros((len(scenes), len(scenes)))
    for i, scene_a in enumerate(scenes):
        for j, scene_b in enumerate(scenes):
            matrix[i, j] = round(float(np.linalg.norm(centroids[scene_a] - centroids[scene_b])), 4)
    return pd.DataFrame(matrix, index=scenes, columns=scenes)


def compute_same_scene_drift(old_results: dict, new_results: dict, top_k: int = 10) -> pd.DataFrame:
    rows = []
    for scene in old_results:
        old_top = old_results[scene].head(top_k)
        new_top = new_results[scene].head(top_k)
        overlap = len(set(old_top["song_id"]) & set(new_top["song_id"])) / max(len(set(old_top["song_id"]) | set(new_top["song_id"])), 1)
        feature_shift = float(np.linalg.norm(old_top[FEATURE_COLUMNS].mean().values - new_top[FEATURE_COLUMNS].mean().values))
        rows.append({"scene": scene, "same_scene_overlap": round(overlap, 4), "feature_shift": round(feature_shift, 4)})
    return pd.DataFrame(rows).set_index("scene")


def run_comparison(top_k: int = 10):
    print("=" * 70)
    print("场景推荐重叠矩阵评测 — 新旧链路对比")
    print("=" * 70)

    raw_df = load_sample_spotify_data()
    processed_df = preprocess_songs(raw_df)
    print(f"歌曲总数: {len(processed_df)}")

    print("\n[1/3] 运行旧版链路 (scene_profiles)...")
    old_results_raw = recommend_all_scenes(processed_df, top_k=top_k)
    old_results = {}
    for scene, df in old_results_raw.items():
        old_results[scene] = df

    print("[2/3] 运行新版属性层链路 (scene_attributes)...")
    new_results_raw = recommend_all_scenes_by_attributes(processed_df, top_k=top_k)
    new_results = {}
    for scene, data in new_results_raw.items():
        new_results[scene] = data["results"]

    print("[3/3] 计算重叠矩阵...\n")

    old_overlap = compute_overlap_matrix(old_results, top_k=top_k)
    new_overlap = compute_overlap_matrix(new_results, top_k=top_k)
    old_quality = summarize_per_scene_quality(old_results, top_k=top_k)
    new_quality = summarize_per_scene_quality(new_results, top_k=top_k)
    old_feature_distance = compute_feature_distance_matrix(old_results, top_k=top_k)
    new_feature_distance = compute_feature_distance_matrix(new_results, top_k=top_k)
    same_scene_drift = compute_same_scene_drift(old_results, new_results, top_k=top_k)

    print(f"旧版链路 Top-{top_k} 推荐重叠矩阵 (Jaccard):")
    print(old_overlap.to_string())
    print(f"\n  平均非对角重叠: {old_overlap.values[~np.eye(len(old_overlap), dtype=bool)].mean():.4f}")

    print(f"\n新版属性层链路 Top-{top_k} 推荐重叠矩阵 (Jaccard):")
    print(new_overlap.to_string())
    print(f"\n  平均非对角重叠: {new_overlap.values[~np.eye(len(new_overlap), dtype=bool)].mean():.4f}")

    print(f"\n旧版链路 Top-{top_k} 每场景质量摘要:")
    print(old_quality.to_string())
    print(f"\n新版属性层链路 Top-{top_k} 每场景质量摘要:")
    print(new_quality.to_string())

    print(f"\n旧版链路场景特征中心距离矩阵:")
    print(old_feature_distance.to_string())
    print(f"\n新版属性层链路场景特征中心距离矩阵:")
    print(new_feature_distance.to_string())

    print(f"\n同场景新旧链路漂移:")
    print(same_scene_drift.to_string())

    improvement = (
        old_overlap.values[~np.eye(len(old_overlap), dtype=bool)].mean()
        - new_overlap.values[~np.eye(len(new_overlap), dtype=bool)].mean()
    )
    print(f"\n  区分度提升: {improvement:.4f} ({improvement / max(old_overlap.values[~np.eye(len(old_overlap), dtype=bool)].mean(), 1e-9) * 100:.1f}%)")

    report = {
        "top_k": top_k,
        "old_link_overlap_matrix": old_overlap.to_dict(),
        "new_link_overlap_matrix": new_overlap.to_dict(),
        "old_mean_off_diagonal": round(old_overlap.values[~np.eye(len(old_overlap), dtype=bool)].mean(), 6),
        "new_mean_off_diagonal": round(new_overlap.values[~np.eye(len(new_overlap), dtype=bool)].mean(), 6),
        "improvement": round(improvement, 6),
        "old_quality_summary": old_quality.reset_index().to_dict(orient="records"),
        "new_quality_summary": new_quality.reset_index().to_dict(orient="records"),
        "old_feature_distance_matrix": old_feature_distance.to_dict(),
        "new_feature_distance_matrix": new_feature_distance.to_dict(),
        "same_scene_drift": same_scene_drift.reset_index().to_dict(orient="records"),
        "old_per_scene_details": {},
        "new_per_scene_details": {},
    }

    for scene in old_results:
        report["old_per_scene_details"][scene] = {
            "top_songs": old_results[scene][["title", "artist", "genre", "final_score"]]
            .head(top_k)
            .to_dict(orient="records"),
        }
    for scene in new_results:
        report["new_per_scene_details"][scene] = {
            "top_songs": new_results[scene][["title", "artist", "genre", "final_score"]]
            .head(top_k)
            .to_dict(orient="records"),
            "feature_importance": new_results_raw[scene].get("feature_importance", {}),
            "recommendation_reason": new_results_raw[scene].get("recommendation_reason", ""),
            "genre_priors": new_results_raw[scene].get("genre_priors", {}),
        }

    report_path = REPORTS_DIR / "scene_overlap_comparison.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n完整报告已保存到: {report_path}")

    csv_rows = []
    for scene_a in old_overlap.index:
        for scene_b in old_overlap.columns:
            csv_rows.append({
                "scene_a": scene_a,
                "scene_b": scene_b,
                "old_overlap": old_overlap.loc[scene_a, scene_b],
                "new_overlap": new_overlap.loc[scene_a, scene_b],
            })
    csv_path = REPORTS_DIR / "scene_overlap_comparison.csv"
    pd.DataFrame(csv_rows).to_csv(csv_path, index=False)
    print(f"CSV 报告已保存到: {csv_path}")

    print("\n" + "=" * 70)
    print("各场景属性层推荐理由:")
    print("=" * 70)
    for scene, data in new_results_raw.items():
        reason = data.get("recommendation_reason", "")
        importance = data.get("feature_importance", {})
        print(f"\n  [{scene}]")
        print(f"    理由: {reason}")
        print(f"    特征重要性: {importance}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="场景推荐重叠矩阵评测")
    parser.add_argument("--top_k", type=int, default=10, help="Top-N 推荐数量 (默认: 10)")
    args = parser.parse_args()
    run_comparison(top_k=args.top_k)
