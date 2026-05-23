import sys
import os
import traceback
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

try:
    import pandas as pd
    from config import PROCESSED_SONGS_CSV
    from recommender import recommend_by_image

    df = pd.read_csv(PROCESSED_SONGS_CSV)

    with open("vision_result.txt", "w", encoding="utf-8") as f:
        for scene in ["cafe", "gym", "study_room", "night_street", "mountain"]:
            path = f"data/test_images/{scene}.jpg"
            data = recommend_by_image(path, df, top_k=3, classifier_prefer="mock")
            f.write(f"\n=== {scene} ===\n")
            f.write(f"  recognized: {data['scene']}\n")
            f.write(f"  confidence: {data['confidence']}\n")
            f.write(f"  model: {data['model']}\n")
            results = data["results"]
            for _, row in results.iterrows():
                f.write(f"  {int(row['rank'])}. {row['title']} - {row['artist']} "
                        f"({row['genre']}) score={row['final_score']:.4f} "
                        f"energy={row['energy']:.3f} valence={row['valence']:.3f}\n")
except Exception:
    with open("vision_result.txt", "w", encoding="utf-8") as f:
        f.write(traceback.format_exc())
