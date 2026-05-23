import sys
import io
import argparse
import traceback

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import pandas as pd

from config import PROCESSED_SONGS_CSV, RAW_SPOTIFY_CSV, DEFAULT_TOP_K
from data_loader import load_sample_spotify_data
from preprocess import preprocess_songs, save_processed_songs
from recommender import (
    recommend_all_scenes,
    recommend,
    recommend_by_image,
    recommend_by_attribute_scores,
    recommend_all_scenes_by_attributes,
)


def print_summary(df):
    print("=" * 60)
    print("视界伴音 — 视觉场景感知的音乐推荐系统")
    print("=" * 60)
    print(f"原始数据: {RAW_SPOTIFY_CSV}")
    print(f"处理后数据: {PROCESSED_SONGS_CSV}")
    print(f"原始记录: 32833 → 去重后歌曲: {len(df)}")
    print(f"流派数量: {df['genre'].nunique()}")

    summary = (
        df.groupby("genre")
        .agg(
            songs=("song_id", "count"),
            avg_popularity=("popularity", "mean"),
            avg_energy=("energy", "mean"),
            avg_valence=("valence", "mean"),
        )
        .sort_values(by="songs", ascending=False)
        .round(3)
    )
    print("\n按流派统计：")
    print(summary)


def print_recommendations(results, title=""):
    print(f"\n{'─' * 60}")
    print(f"【{title}】")
    print(f"{'─' * 60}")
    print(
        results.to_string(
            index=False,
            columns=[
                "rank", "title", "artist", "genre",
                "final_score", "popularity", "energy", "valence",
            ],
        )
    )


def mode_all_scenes(processed_df):
    print_summary(processed_df)
    print(f"\n{'=' * 60}")
    print(f"Top-{DEFAULT_TOP_K} 推荐结果")
    print("=" * 60)
    all_results = recommend_all_scenes(processed_df, top_k=DEFAULT_TOP_K)
    for scene, results in all_results.items():
        print_recommendations(results, title=scene)


def mode_scene(processed_df, scene, top_k, use_attributes=False):
    print_summary(processed_df)
    if use_attributes:
        data = recommend_by_attribute_scores(processed_df, scene_name=scene, top_k=top_k)
        results = data["results"]
        print(f"\n{'=' * 60}")
        print(f"场景推荐（属性层）: {scene}  Top-{top_k}")
        print("=" * 60)
        print(f"  推荐理由: {data.get('recommendation_reason', '')}")
        print(f"  特征重要性: {data.get('feature_importance', {})}")
        print(f"  属性摘要:")
        for item in data["attribute_summary"]:
            print(f"    {item['attribute']}: {item['score']}  ({item['description']})")
        print(f"  流派先验: {data['genre_priors']}")
        print(f"  目标音乐特征: {data['music_targets']}")
        print(f"  最近原型场景:")
        for match in data["prototype_matches"]:
            print(f"    {match['scene']}: {match['similarity']}  ({match['description']})")
    else:
        results = recommend(scene, processed_df, top_k=top_k)
        print(f"\n{'=' * 60}")
        print(f"场景推荐: {scene}  Top-{top_k}")
        print("=" * 60)
    print_recommendations(results, title=scene)


def mode_image(processed_df, image_path, top_k, classifier=None, clip_checkpoint=None, use_attributes=False):
    print_summary(processed_df)
    data = recommend_by_image(
        image_path,
        processed_df,
        top_k=top_k,
        classifier_prefer=classifier,
        clip_checkpoint_path=clip_checkpoint,
        use_attributes=use_attributes,
    )
    print(f"\n{'=' * 60}")
    print(f"图片推荐结果{'（属性层）' if use_attributes else ''}")
    print("=" * 60)
    print(f"  图片路径: {data['image_path']}")
    print(f"  识别场景: {data['scene']}")
    print(f"  置信度:   {data['confidence']}")
    print(f"  使用模型: {data['model']}")
    if not use_attributes:
        print(f"  指定模式: {data['classifier_prefer']}")
        if data.get("clip_checkpoint_path"):
            print(f"  权重路径: {data['clip_checkpoint_path']}")
    if use_attributes:
        print(f"  推荐理由: {data.get('recommendation_reason', '')}")
        print(f"  特征重要性: {data.get('feature_importance', {})}")
        print(f"  属性摘要:")
        for item in data["attribute_summary"]:
            print(f"    {item['attribute']}: {item['score']}  ({item['description']})")
        print(f"  流派先验: {data['preferred_genres']}")
        print(f"  目标音乐特征: {data['music_targets']}")
        print(f"  最近原型场景:")
        for match in data["prototype_matches"]:
            print(f"    {match['scene']}: {match['similarity']}  ({match['description']})")
    print_recommendations(data["results"], title=data["scene"])


def main():
    parser = argparse.ArgumentParser(description="视界伴音 — 视觉场景感知的音乐推荐系统")
    parser.add_argument("--scene", type=str, help="按场景标签推荐 (cafe/gym/study_room/night_street/mountain)")
    parser.add_argument("--image", type=str, help="按图片推荐 (传入图片路径)")
    parser.add_argument("--top_k", type=int, default=DEFAULT_TOP_K, help=f"返回推荐数量 (默认: {DEFAULT_TOP_K})")
    parser.add_argument("--classifier", type=str, choices=["clip", "mock"], help="图片推荐时指定分类器")
    parser.add_argument("--clip-checkpoint", type=str, help="本地 CLIP 权重文件路径")
    parser.add_argument("--use-attributes", action="store_true", help="使用属性层链路（替代旧版 scene_profiles 配置）")
    parser.add_argument("--all-scenes-attributes", action="store_true", help="属性层模式下列出所有场景的推荐结果")
    args = parser.parse_args()

    try:
        raw_df = load_sample_spotify_data()
        processed_df = preprocess_songs(raw_df)
        save_processed_songs(processed_df)

        if args.all_scenes_attributes:
            print_summary(processed_df)
            print(f"\n{'=' * 60}")
            print(f"Top-{DEFAULT_TOP_K} 推荐结果（属性层）")
            print("=" * 60)
            all_results = recommend_all_scenes_by_attributes(processed_df, top_k=args.top_k)
            for scene, data in all_results.items():
                results = data["results"]
                print(f"\n{'─' * 60}")
                print(f"【{scene}】（属性层）")
                print(f"{'─' * 60}")
                print(f"  推荐理由: {data.get('recommendation_reason', '')}")
                print(f"  特征重要性: {data.get('feature_importance', {})}")
                print(f"  属性摘要:")
                for item in data["attribute_summary"]:
                    print(f"    {item['attribute']}: {item['score']}  ({item['description']})")
                print(f"  流派先验: {data['genre_priors']}")
                print(f"  目标音乐特征: {data['music_targets']}")
                print_recommendations(results, title=scene)
        elif args.image:
            mode_image(
                processed_df,
                args.image,
                args.top_k,
                args.classifier,
                args.clip_checkpoint,
                use_attributes=args.use_attributes,
            )
        elif args.scene:
            mode_scene(processed_df, args.scene, args.top_k, use_attributes=args.use_attributes)
        else:
            mode_all_scenes(processed_df)
    except Exception as exc:
        print(f"运行失败: {exc}", file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1)


if __name__ == "__main__":
    main()
