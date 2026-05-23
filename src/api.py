import sys
import io
import os
import tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.exceptions import NotFound
import pandas as pd

from config import PROJECT_ROOT, PROCESSED_SONGS_CSV, DEFAULT_TOP_K
from scene_mapper import list_scenes, get_scene_profile
from recommender import recommend, recommend_by_image, recommend_by_attribute_scores
from attribute_mapper import list_scene_prototypes, get_scene_attribute_scores

app = Flask(__name__)

SONGS_DF = None
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"


def load_data():
    global SONGS_DF
    if SONGS_DF is None:
        processed_path = Path(PROCESSED_SONGS_CSV)
        if not processed_path.exists():
            raise FileNotFoundError(
                f"处理后数据文件不存在: {processed_path}\n"
                f"请先运行 python src/main.py 生成数据"
            )
        SONGS_DF = pd.read_csv(processed_path)
    return SONGS_DF


def df_to_response(df, scene):
    profile = get_scene_profile(scene)
    columns = [
        "rank", "title", "artist", "genre", "subgenre",
        "final_score", "feature_sim", "genre_match",
        "popularity", "danceability", "energy", "acousticness",
        "instrumentalness", "valence", "tempo",
    ]
    available_cols = [c for c in columns if c in df.columns]

    recommendations = []
    for _, row in df.iterrows():
        item = {}
        for c in available_cols:
            val = row[c]
            if hasattr(val, "item"):
                item[c] = round(float(val.item()), 4)
            elif isinstance(val, float):
                item[c] = round(val, 4)
            else:
                item[c] = val
        recommendations.append(item)

    return {
        "scene": scene,
        "description": profile.get("description", ""),
        "preferred_genres": profile.get("preferred_genres", []),
        "target_features": profile.get("target_features", {}),
        "count": len(recommendations),
        "recommendations": recommendations,
    }


def image_recommend_to_response(data: dict) -> dict:
    scene = data["scene"]
    df = data["results"]
    profile = get_scene_profile(scene)

    columns = [
        "rank", "title", "artist", "genre", "subgenre",
        "final_score", "feature_sim", "genre_match",
        "popularity", "danceability", "energy", "acousticness",
        "instrumentalness", "valence", "tempo",
    ]
    available_cols = [c for c in columns if c in df.columns]

    recommendations = []
    for _, row in df.iterrows():
        item = {}
        for c in available_cols:
            val = row[c]
            if hasattr(val, "item"):
                item[c] = round(float(val.item()), 4)
            elif isinstance(val, float):
                item[c] = round(val, 4)
            else:
                item[c] = val
        recommendations.append(item)

    response = {
        "scene": scene,
        "confidence": data["confidence"],
        "model": data["model"],
        "count": len(recommendations),
        "recommendations": recommendations,
    }

    if data.get("fallback_reason"):
        response["fallback_reason"] = data["fallback_reason"]

    if data.get("use_attributes"):
        response.update({
            "use_attributes": True,
            "attribute_scores": data.get("attribute_scores", {}),
            "attribute_summary": data.get("attribute_summary", []),
            "prototype_matches": data.get("prototype_matches", []),
            "preferred_genres": data.get("preferred_genres", []),
            "music_targets": data.get("music_targets", {}),
        })
    else:
        response.update({
            "classifier_prefer": data.get("classifier_prefer", "auto"),
            "clip_checkpoint_path": data.get("clip_checkpoint_path"),
            "description": profile.get("description", ""),
            "preferred_genres": profile.get("preferred_genres", []),
            "target_features": profile.get("target_features", {}),
        })

    return response


def attribute_recommend_to_response(data: dict) -> dict:
    if "results" not in data or not isinstance(data["results"], pd.DataFrame):
        return {"error": "Invalid results data structure"}
    df = data["results"]
    columns = [
        "rank", "title", "artist", "genre", "subgenre",
        "final_score", "feature_sim", "genre_match",
        "popularity", "danceability", "energy", "acousticness",
        "instrumentalness", "valence", "tempo",
    ]
    available_cols = [c for c in columns if c in df.columns]

    recommendations = []
    for _, row in df.iterrows():
        item = {}
        for c in available_cols:
            val = row[c]
            if hasattr(val, "item"):
                item[c] = round(float(val.item()), 4)
            elif isinstance(val, float):
                item[c] = round(val, 4)
            else:
                item[c] = val
        recommendations.append(item)

    return {
        "source_scene": data["source_scene"],
        "attribute_scores": data["attribute_scores"],
        "attribute_summary": data["attribute_summary"],
        "genre_priors": data["genre_priors"],
        "music_targets": data["music_targets"],
        "prototype_matches": data["prototype_matches"],
        "count": len(recommendations),
        "recommendations": recommendations,
    }


@app.route("/scenes", methods=["GET"])
def get_scenes():
    scenes = []
    for name in list_scenes():
        profile = get_scene_profile(name)
        attr_scores = {}
        try:
            attr_scores = get_scene_attribute_scores(name)
        except Exception:
            pass
        scenes.append({
            "name": name,
            "description": profile.get("description", ""),
            "preferred_genres": profile.get("preferred_genres", []),
            "recommended_features": profile.get("target_features", {}),
            "attribute_scores": attr_scores,
        })
    return jsonify({"scenes": scenes, "count": len(scenes)})


@app.route("/recommend/by_scene", methods=["POST"])
def recommend_by_scene():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "请求体必须是 JSON"}), 400

    scene = data.get("scene", "").strip()
    if not scene:
        return jsonify({"error": "缺少 scene 参数"}), 400

    top_k = data.get("top_k", DEFAULT_TOP_K)
    if not isinstance(top_k, int) or top_k < 1 or top_k > 50:
        return jsonify({"error": "top_k 必须是 1 到 50 的整数"}), 400

    available = list_scenes()
    if scene not in available:
        return jsonify({
            "error": f"未知场景 '{scene}'",
            "available_scenes": available,
        }), 404

    try:
        songs_df = load_data()
        results = recommend(scene, songs_df, top_k=top_k)
        return jsonify(df_to_response(results, scene))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/recommend/by_scene_attributes", methods=["POST"])
def recommend_by_scene_attributes():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "请求体必须是 JSON"}), 400

    scene = data.get("scene", "").strip()
    attribute_scores = data.get("attribute_scores", None)

    if not scene and not attribute_scores:
        return jsonify({"error": "缺少 scene 或 attribute_scores 参数"}), 400

    top_k = data.get("top_k", DEFAULT_TOP_K)
    if not isinstance(top_k, int) or top_k < 1 or top_k > 50:
        return jsonify({"error": "top_k 必须是 1 到 50 的整数"}), 400

    if scene and scene not in list_scenes():
        return jsonify({
            "error": f"未知场景 '{scene}'",
            "available_scenes": list_scenes(),
        }), 404

    try:
        songs_df = load_data()
        data = recommend_by_attribute_scores(
            songs_df,
            scene_name=scene or None,
            attribute_scores=attribute_scores,
            top_k=top_k,
        )
        return jsonify(attribute_recommend_to_response(data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/recommend/by_image", methods=["POST"])
def recommend_by_image_endpoint():
    if "image" not in request.files:
        return jsonify({"error": "缺少 image 文件"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "文件名为空"}), 400

    top_k = DEFAULT_TOP_K
    classifier_prefer = request.form.get("classifier", "auto").strip().lower()
    clip_checkpoint = request.form.get("clip_checkpoint", "").strip() or None
    use_attributes = request.form.get("use_attributes", "false").strip().lower() in {"true", "1", "yes"}
    if "top_k" in request.form:
        try:
            top_k = int(request.form["top_k"])
        except ValueError:
            pass
    if not isinstance(top_k, int) or top_k < 1 or top_k > 50:
        return jsonify({"error": "top_k 必须是 1 到 50 的整数"}), 400
    if classifier_prefer not in {"auto", "clip", "mock"}:
        return jsonify({"error": "classifier 必须是 auto / clip / mock"}), 400

    try:
        songs_df = load_data()
        suffix = Path(file.filename).suffix or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        data = recommend_by_image(
            tmp_path,
            songs_df,
            top_k=top_k,
            classifier_prefer=None if classifier_prefer == "auto" else classifier_prefer,
            clip_checkpoint_path=clip_checkpoint,
            use_attributes=use_attributes,
        )
        os.unlink(tmp_path)
        return jsonify(image_recommend_to_response(data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def index(path):
    if FRONTEND_DIST_DIR.exists():
        if path:
            try:
                return send_from_directory(FRONTEND_DIST_DIR, path)
            except NotFound:
                pass
        index_file = FRONTEND_DIST_DIR / "index.html"
        if index_file.exists():
            return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return render_template("index.html")


if __name__ == "__main__":
    load_data()
    print("歌曲数据加载完成")
    print(f"可用场景 (scene_profiles): {list_scenes()}")
    print(f"可用场景原型 (attribute): {list_scene_prototypes()}")
    print("前端可视化页面: http://127.0.0.1:5000")
    print("API 服务启动: http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)
