# 当前系统架构图

以下架构图基于当前代码实现整理，重点反映系统已经落地的双链路推荐结构、视觉识别模块、共享推荐引擎，以及 CLI / API 两种使用方式。

## 1. 系统总览图

```mermaid
flowchart LR
    subgraph A["1. 输入层"]
        A1["场景标签<br/>CLI: --scene<br/>API: by_scene"]
        A2["图片输入<br/>CLI: --image<br/>API: by_image"]
        A3["属性分数<br/>API: by_scene_attributes"]
    end

    subgraph B["2. 场景理解层"]
        B1["scene_classifier.py"]
        B2["MockSceneClassifier"]
        B3["CLIPSceneClassifier"]
    end

    subgraph C["3. 场景与属性映射层"]
        C1["旧版链路<br/>scene_mapper.py<br/>scene_profiles.json"]
        C2["新版属性链路<br/>attribute_mapper.py<br/>scene_attributes.json"]
        C3["生成推荐参数<br/>music_targets | genre_priors | tolerances<br/>ranking_weights | feature_importance"]
    end

    subgraph D["4. 推荐编排层"]
        D1["recommender.py"]
        D2["recommend()"]
        D3["recommend_by_attributes()"]
        D4["recommend_by_attribute_scores()"]
        D5["recommend_by_image()"]
    end

    subgraph E["5. 共享推荐引擎"]
        E1["recall.py"]
        E2["旧版召回<br/>硬过滤 + 候选池采样"]
        E3["新版召回<br/>软打分 Top-K"]
        E4["ranker.py"]
        E5["排序信号<br/>feature similarity | genre match | popularity | diversity"]
        E6["输出<br/>Top-N results + recommendation_reason"]
    end

    subgraph F["6. 音乐数据层"]
        F1["data_loader.py"]
        F2["preprocess.py"]
        F3["spotify_songs.csv"]
        F4["songs_processed.csv"]
        F5["歌曲特征<br/>genre | subgenre | danceability | energy | acousticness<br/>instrumentalness | valence | tempo | popularity"]
    end

    subgraph G["7. 服务与展示层"]
        G1["CLI<br/>src/main.py"]
        G2["Flask API<br/>src/api.py"]
        G3["index.html"]
    end

    subgraph H["8. 评测与分析"]
        H1["batch_clip_stability_test.py"]
        H2["scene_overlap_evaluation.py"]
        H3["reports json 与 csv"]
    end

    A2 --> B1
    B1 --> B2
    B1 --> B3
    B1 --> C

    A1 --> C1
    A3 --> C2
    C1 --> C3
    C2 --> C3

    A1 --> D1
    A2 --> D5
    A3 --> D4
    C3 --> D1
    D1 --> D2
    D1 --> D3
    D1 --> D4
    D1 --> D5

    D1 --> E1
    E1 --> E2
    E1 --> E3
    E2 --> E4
    E3 --> E4
    E4 --> E5
    E5 --> E6

    F1 --> F2
    F2 --> F4
    F3 --> F1
    F4 --> F5
    F5 --> E1
    F5 --> E4

    E6 --> G1
    E6 --> G2
    G2 --> G3

    B1 --> H1
    E6 --> H2
    H1 --> H3
    H2 --> H3
```

## 2. 双链路细化图

```mermaid
flowchart LR
    I1["图片 / 场景 / 属性分数输入"]

    subgraph OLD["旧版链路 default"]
        O1["图片输入时先做场景识别"]
        O2["scene_mapper.py"]
        O3["scene_profiles.json"]
        O4["生成参数<br/>preferred_genres | target_features<br/>tolerances | ranking_weights"]
        O5["recall.py<br/>硬过滤召回"]
        O6["ranker.py<br/>多因子排序"]
        O7["Top-N 推荐结果"]
    end

    subgraph NEW["新版属性链路 use_attributes"]
        N1["图片输入时先做场景识别"]
        N2["attribute_mapper.py"]
        N3["scene_attributes.json"]
        N4["生成参数<br/>attribute_scores | music_targets | genre_priors<br/>preferred_genres | tolerances | ranking_weights<br/>feature_importance | prototype_matches"]
        N5["recall.py<br/>软打分召回"]
        N6["ranker.py<br/>weighted cosine + genre_priors + popularity + diversity"]
        N7["recommendation_reason"]
        N8["Top-N 推荐结果"]
    end

    I1 --> O1
    I1 --> O2
    O1 --> O2
    O2 --> O3
    O3 --> O4
    O4 --> O5
    O4 --> O6
    O5 --> O6
    O6 --> O7

    I1 --> N1
    I1 --> N2
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N4 --> N6
    N5 --> N6
    N6 --> N7
    N6 --> N8
```

## 3. 一句话说明

- 图片输入时，系统先经过 `scene_classifier.py` 做场景识别，再进入旧版场景映射链路或新版属性映射链路。
- 两条链路共享 `recall.py` 和 `ranker.py`，差别主要在于中间表示是否使用连续属性向量，以及召回和排序是否使用软分数。
- 当前新版属性链路已经接入 `genre_priors`、`feature_importance`、`recommendation_reason`，是项目后续继续优化的主线。
