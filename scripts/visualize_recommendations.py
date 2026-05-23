import sys
import io
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import numpy as np
import pandas as pd

from config import (
    PROJECT_ROOT, PROCESSED_SONGS_CSV, DEFAULT_TOP_K, FEATURE_KEYS,
)
from data_loader import load_sample_spotify_data
from preprocess import preprocess_songs
from recommender import (
    recommend, recommend_all_scenes,
    recommend_all_scenes_by_attributes,
)
from scene_mapper import list_scenes
from attribute_mapper import list_scene_prototypes

OUTPUT_DIR = PROJECT_ROOT / "reports" / "viz"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

import matplotlib.font_manager as fm

try:
    fm.findfont("SimHei", fallback_to_default=False)
    _CN_FONT = "SimHei"
except Exception:
    try:
        fm.findfont("Microsoft YaHei", fallback_to_default=False)
        _CN_FONT = "Microsoft YaHei"
    except Exception:
        _CN_FONT = "sans-serif"

sns.set_theme(style="whitegrid", font=_CN_FONT, font_scale=1.0)
plt.rcParams["axes.unicode_minus"] = False

try:
    fm.findfont(_CN_FONT, fallback_to_default=False)
except Exception:
    import warnings
    warnings.warn(f"中文字体 {_CN_FONT} 不可用，图表中文可能显示异常")

TOP_K = DEFAULT_TOP_K
SCENE_NAMES = sorted(list_scenes())
FEATURE_LABELS = {
    "danceability": "舞动感",
    "energy": "能量",
    "acousticness": "原声感",
    "instrumentalness": "器乐感",
    "valence": "情绪正向",
    "tempo_norm": "节奏(归一化)",
}


def load_data():
    processed_path = Path(PROCESSED_SONGS_CSV)
    if processed_path.exists():
        return pd.read_csv(processed_path)
    raw_df = load_sample_spotify_data()
    return preprocess_songs(raw_df)


def collect_results(songs_df, link_type="old"):
    if link_type == "new":
        all_data = recommend_all_scenes_by_attributes(songs_df, top_k=TOP_K)
        results_map = {scene: all_data[scene]["results"] for scene in all_data}
    else:
        results_map = recommend_all_scenes(songs_df, top_k=TOP_K)
    return results_map


def build_overlap_matrix(results_map):
    n = len(SCENE_NAMES)
    matrix = np.zeros((n, n))
    song_sets = {}
    for scene_name, df in results_map.items():
        song_sets[scene_name] = set(
            zip(df["title"].values, df["artist"].values)
        )
    for i, s1 in enumerate(SCENE_NAMES):
        for j, s2 in enumerate(SCENE_NAMES):
            set1 = song_sets[s1]
            set2 = song_sets[s2]
            if len(set1 | set2) == 0:
                matrix[i, j] = 0
            else:
                matrix[i, j] = len(set1 & set2) / len(set1 | set2)
    return matrix


def plot_overlap_heatmap(old_results, new_results, songs_df):
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))

    scene_labels_cn = {
        "cafe": "咖啡厅", "gym": "健身房", "study_room": "书房",
        "night_street": "夜晚街道", "mountain": "山野户外",
    }
    labels = [scene_labels_cn.get(s, s) for s in SCENE_NAMES]

    for ax, results_map, title in [
        (axes[0], old_results, "旧版链路 (scene_profiles)"),
        (axes[1], new_results, "新版链路 (属性层)"),
    ]:
        matrix = build_overlap_matrix(results_map)
        mask = np.eye(len(SCENE_NAMES), dtype=bool)
        annot = np.where(mask, 1.0, matrix)
        sns.heatmap(
            matrix, annot=np.round(annot, 2), fmt=".2f",
            xticklabels=labels, yticklabels=labels,
            cmap="YlOrRd", vmin=0, vmax=1, mask=mask,
            linewidths=1, linecolor="white",
            ax=ax, cbar_kws={"label": "重叠率 (Jaccard)"},
        )
        for i in range(len(SCENE_NAMES)):
            ax.add_patch(plt.Rectangle((i, i), 1, 1, fill=True, color="lightgray", ec="white", lw=1))
            ax.text(i + 0.5, i + 0.5, "1.00", ha="center", va="center", fontsize=10, fontweight="bold")
        ax.set_title(title, fontsize=14, fontweight="bold", pad=12)
        ax.set_xlabel("场景", fontsize=12)

    axes[0].set_ylabel("场景", fontsize=12)
    axes[1].set_ylabel("")
    fig.suptitle("场景间推荐歌曲重叠矩阵 (Top-{})".format(TOP_K), fontsize=16, fontweight="bold", y=1.02)
    plt.tight_layout()
    path = OUTPUT_DIR / "01_overlap_heatmap.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[✓] 重叠矩阵已保存: {path}")


def plot_feature_comparison(old_results, new_results, songs_df):
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    axes = axes.flatten()

    from scene_mapper import get_scene_profile
    from attribute_mapper import build_attribute_profile

    feature_keys = ["energy", "acousticness", "danceability", "valence", "instrumentalness"]
    feature_labels = ["能量", "原声感", "舞动感", "情绪正向", "器乐感"]

    for idx, scene in enumerate(SCENE_NAMES):
        ax = axes[idx]

        old_df = old_results[scene]
        new_df = new_results[scene]

        old_avgs = [old_df[f].mean() for f in feature_keys]
        new_avgs = [new_df[f].mean() for f in feature_keys]

        profile = get_scene_profile(scene)
        old_targets_raw = dict(profile.get("target_features", {}))
        old_targets = [old_targets_raw.get(f, 0) for f in feature_keys]

        new_profile = build_attribute_profile(scene_name=scene)
        new_targets_raw = new_profile["music_targets"]
        new_targets = [new_targets_raw.get(f, 0) for f in feature_keys]

        x = np.arange(len(feature_keys))
        width = 0.25

        ax.bar(x - width, old_avgs, width, label="旧版推荐均值", color="#4C72B0", alpha=0.85)
        ax.bar(x, new_avgs, width, label="新版推荐均值", color="#55A868", alpha=0.85)
        ax.scatter(x - width, old_targets, color="#C44E52", marker="D", s=80, zorder=5, label="旧版目标值")
        ax.scatter(x, new_targets, color="#DD8452", marker="s", s=80, zorder=5, label="新版目标值")

        ax.set_xticks(x)
        ax.set_xticklabels(feature_labels, fontsize=9)
        ax.set_ylim(0, 1.05)
        scene_labels_cn_local = {"cafe": "咖啡厅", "gym": "健身房", "study_room": "书房", "night_street": "夜晚街道", "mountain": "山野户外"}
        ax.set_title(scene_labels_cn_local.get(scene, scene), fontsize=13, fontweight="bold")
        if idx == 0:
            ax.legend(fontsize=8, loc="upper right")

    axes[-1].axis("off")
    fig.suptitle("各场景推荐歌曲特征均值 vs 目标值 (新旧链路对比)", fontsize=16, fontweight="bold", y=1.01)
    plt.tight_layout()
    path = OUTPUT_DIR / "02_feature_comparison.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[✓] 特征对比已保存: {path}")


def plot_genre_distribution(old_results, new_results, songs_df):
    scene_labels_cn = {
        "cafe": "咖啡厅", "gym": "健身房", "study_room": "书房",
        "night_street": "夜晚街道", "mountain": "山野户外",
    }
    labels = [scene_labels_cn.get(s, s) for s in SCENE_NAMES]

    fig, axes = plt.subplots(2, 5, figsize=(22, 10))

    palette = {"pop": "#4C72B0", "rap": "#DD8452", "edm": "#55A868",
               "r&b": "#C44E52", "rock": "#8172B2", "latin": "#937860"}

    for row_idx, (results_map, title_prefix) in enumerate([
        (old_results, "旧版"),
        (new_results, "新版"),
    ]):
        for col_idx, scene in enumerate(SCENE_NAMES):
            ax = axes[row_idx, col_idx]
            df = results_map[scene]
            genre_counts = df["genre"].value_counts()
            all_genres = ["pop", "rap", "edm", "r&b", "rock", "latin"]
            values = [genre_counts.get(g, 0) for g in all_genres]
            colors = [palette[g] for g in all_genres]

            wedges, texts, autotexts = ax.pie(
                values, labels=None, autopct="%1.1f%%",
                colors=colors, startangle=90, pctdistance=0.75,
            )
            for t in autotexts:
                t.set_fontsize(8)
            ax.set_title(f"{title_prefix}-{labels[col_idx]}", fontsize=11, fontweight="bold")

    handles = [plt.Rectangle((0, 0), 1, 1, color=palette[g]) for g in all_genres]
    fig.legend(handles, all_genres, loc="lower center", ncol=6, fontsize=10, frameon=False)
    fig.suptitle("各场景 Top-{} 推荐歌曲流派分布".format(TOP_K), fontsize=16, fontweight="bold", y=1.02)
    plt.tight_layout(rect=[0, 0.06, 1, 1])
    path = OUTPUT_DIR / "03_genre_distribution.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[✓] 流派分布已保存: {path}")


def plot_similarity_scores(old_results, new_results, songs_df):
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))

    scene_labels_cn = {
        "cafe": "咖啡厅", "gym": "健身房", "study_room": "书房",
        "night_street": "夜晚街道", "mountain": "山野户外",
    }
    labels = [scene_labels_cn.get(s, s) for s in SCENE_NAMES]

    for ax, results_map, title in [
        (axes[0], old_results, "旧版链路"),
        (axes[1], new_results, "新版链路 (属性层)"),
    ]:
        data = []
        scene_labels_data = []
        for scene in SCENE_NAMES:
            df = results_map[scene]
            if "feature_sim" in df.columns:
                values = df["feature_sim"].dropna().tolist()
            else:
                values = []
            data.append(values)
            scene_labels_data.append(scene_labels_cn.get(scene, scene))

        bp = ax.boxplot(data, tick_labels=labels, patch_artist=True, widths=0.6)
        for patch, color in zip(bp["boxes"], sns.color_palette("Set2", len(SCENE_NAMES))):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)

        ax.set_title(title, fontsize=14, fontweight="bold")
        ax.set_ylabel("特征相似度 (cosine)", fontsize=12)
        ax.tick_params(axis="x", rotation=15)
        ax.set_ylim(-0.1, 1.1)

    fig.suptitle("各场景推荐歌曲特征相似度分布", fontsize=16, fontweight="bold", y=1.02)
    plt.tight_layout()
    path = OUTPUT_DIR / "04_similarity_distribution.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[✓] 相似度分布已保存: {path}")


def plot_dashboard(old_results, new_results, songs_df):
    fig = plt.figure(figsize=(20, 14))

    scene_labels_cn = {
        "cafe": "咖啡厅", "gym": "健身房", "study_room": "书房",
        "night_street": "夜晚街道", "mountain": "山野户外",
    }

    gs = fig.add_gridspec(3, 3, hspace=0.35, wspace=0.30)

    ax_overlap = fig.add_subplot(gs[0, :])
    matrix = build_overlap_matrix(new_results)
    mask = np.eye(len(SCENE_NAMES), dtype=bool)
    labels = [scene_labels_cn.get(s, s) for s in SCENE_NAMES]
    sns.heatmap(
        matrix, annot=np.round(matrix, 2), fmt=".2f",
        xticklabels=labels, yticklabels=labels,
        cmap="YlOrRd", vmin=0, vmax=1, mask=mask,
        linewidths=1, linecolor="white",
        ax=ax_overlap, cbar_kws={"label": "重叠率"},
    )
    for i in range(len(SCENE_NAMES)):
        ax_overlap.add_patch(plt.Rectangle((i, i), 1, 1, fill=True, color="lightgray", ec="white", lw=1))
        ax_overlap.text(i + 0.5, i + 0.5, "1.00", ha="center", va="center", fontsize=9, fontweight="bold")
    ax_overlap.set_title("A. 场景推荐重叠矩阵 (属性层)", fontsize=14, fontweight="bold", loc="left")

    for idx, scene in enumerate(SCENE_NAMES):
        if idx < 3:
            row, col = 1, idx
        else:
            row, col = 2, idx - 3
        ax = fig.add_subplot(gs[row, col])

        old_df = old_results[scene]
        new_df = new_results[scene]

        feature_keys = ["energy", "acousticness", "danceability", "valence", "instrumentalness"]
        feature_labels = ["能量", "原声感", "舞动感", "情绪正向", "器乐感"]

        old_avgs = [old_df[f].mean() for f in feature_keys]
        new_avgs = [new_df[f].mean() for f in feature_keys]

        x = np.arange(len(feature_keys))
        width = 0.35
        ax.bar(x - width / 2, old_avgs, width, label="旧版", color="#4C72B0", alpha=0.8)
        ax.bar(x + width / 2, new_avgs, width, label="新版", color="#55A868", alpha=0.8)
        ax.set_xticks(x)
        ax.set_xticklabels(feature_labels, fontsize=8)
        ax.set_ylim(0, 1.05)
        ax.set_title(f"{scene_labels_cn.get(scene, scene)}", fontsize=12, fontweight="bold")
        if idx == 0:
            ax.legend(fontsize=8)

    ax_genre = fig.add_subplot(gs[2, 2])
    genre_data = []
    for scene in SCENE_NAMES:
        df = new_results[scene]
        for _, row in df.iterrows():
            genre_data.append({"场景": scene_labels_cn.get(scene, scene), "流派": row["genre"]})
    genre_df = pd.DataFrame(genre_data)
    genre_pivot = genre_df.groupby(["场景", "流派"]).size().unstack(fill_value=0)
    for col in ["pop", "rap", "edm", "r&b", "rock", "latin"]:
        if col not in genre_pivot.columns:
            genre_pivot[col] = 0
    genre_pivot = genre_pivot[["pop", "rap", "edm", "r&b", "rock", "latin"]]
    genre_pivot_pct = genre_pivot.div(genre_pivot.sum(axis=1), axis=0)
    genre_pivot_pct.plot(
        kind="barh", stacked=True, ax=ax_genre,
        color=["#4C72B0", "#DD8452", "#55A868", "#C44E52", "#8172B2", "#937860"],
    )
    ax_genre.set_title("D. 各场景推荐流派分布 (属性层)", fontsize=14, fontweight="bold", loc="left")
    ax_genre.set_xlabel("占比", fontsize=12)
    ax_genre.legend(loc="lower right", ncol=6, fontsize=9)
    ax_genre.set_xlim(0, 1)

    fig.suptitle("推荐系统可视化总览", fontsize=18, fontweight="bold", y=1.01)
    path = OUTPUT_DIR / "05_dashboard.png"
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[✓] 总览看板已保存: {path}")


def print_stats(old_results, new_results, songs_df):
    print("\n" + "=" * 70)
    print("推荐引擎层统计报告")
    print("=" * 70)

    print(f"\n数据集: {len(songs_df)} 首歌曲, {songs_df['genre'].nunique()} 个流派")
    print(f"每个场景推荐 Top-{TOP_K}\n")

    scene_labels_cn = {
        "cafe": "咖啡厅", "gym": "健身房", "study_room": "书房",
        "night_street": "夜晚街道", "mountain": "山野户外",
    }

    for link_name, results_map, tag in [
        ("旧版 (scene_profiles)", old_results, "[旧]"),
        ("新版 (属性层)", new_results, "[新]"),
    ]:
        print(f"\n--- {link_name} ---")
        print(f"{'场景':<12} {'流派Top-2':<22} {'能量均值':>8} {'原声均值':>8} {'情绪均值':>8}")
        print("-" * 65)
        for scene in SCENE_NAMES:
            df = results_map[scene]
            top_genres = df["genre"].value_counts().head(2).index.tolist()
            avg_energy = df["energy"].mean()
            avg_acoustic = df["acousticness"].mean()
            avg_valence = df["valence"].mean()
            print(
                f"{scene_labels_cn.get(scene, scene):<12} "
                f"{', '.join(top_genres):<22} "
                f"{avg_energy:>8.3f} {avg_acoustic:>8.3f} {avg_valence:>8.3f}"
            )

    print("\n--- 新旧链路推荐重叠率 ---")
    old_matrix = build_overlap_matrix(old_results)
    new_matrix = build_overlap_matrix(new_results)
    for i, s1 in enumerate(SCENE_NAMES):
        for j, s2 in enumerate(SCENE_NAMES):
            if i >= j:
                continue
            print(
                f"  {scene_labels_cn.get(s1, s1)} vs {scene_labels_cn.get(s2, s2)}: "
                f"旧版={old_matrix[i, j]:.2%}, 新版={new_matrix[i, j]:.2%}"
            )


def main():
    print("加载数据...")
    songs_df = load_data()
    print(f"已加载 {len(songs_df)} 首歌曲")

    print("\n运行旧版链路推荐...")
    old_results = collect_results(songs_df, link_type="old")

    print("运行新版链路推荐...")
    new_results = collect_results(songs_df, link_type="new")

    print(f"\n使用字体: {_CN_FONT}")
    print("生成可视化图表...\n")

    plot_funcs = [
        ("重叠矩阵", plot_overlap_heatmap),
        ("特征对比", plot_feature_comparison),
        ("流派分布", plot_genre_distribution),
        ("相似度分布", plot_similarity_scores),
        ("总览看板", plot_dashboard),
    ]

    for name, func in plot_funcs:
        try:
            func(old_results, new_results, songs_df)
        except Exception as e:
            print(f"[✗] {name} 生成失败: {e}")
            import traceback
            traceback.print_exc()

    print_stats(old_results, new_results, songs_df)

    print(f"\n所有图表已保存至: {OUTPUT_DIR}")
    print("完成!")


if __name__ == "__main__":
    main()
