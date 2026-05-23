# 音乐推荐系统项目对话总结

## 1. 项目目标

本项目要实现一个“视觉场景感知的音乐推荐系统”：

- 输入可以是场景标签，后续扩展为图片
- 输出是符合当前场景氛围的 Top-N 音乐推荐结果
- 项目当前以课程作业为背景，先做可运行的基础版本，再逐步扩展为多模态推荐系统

---

## 2. 已完成的总体方案设计

前期已基于 PPT 和概要方案文档，整理并落地为详细实现方案，明确了系统的建设路径：

- 第一阶段：MVP 推荐系统

  - 输入场景标签
  - 根据场景配置映射到音乐特征
  - 候选召回
  - 排序后输出推荐结果
- 第二阶段：服务化

  - 将推荐接口包装为 Flask API
- 第三阶段：视觉输入

  - 用视觉模块替代手工场景标签输入
  - 支持“图片 -> 场景 -> 推荐结果”

---

## 3. 当前数据情况

### 3.1 原始样例数据

用户提供了一个小型 Spotify 样例数据目录：

- `c:\0_code\01_music_recommendation\data\sample_spotify`

其中包含：

- `spotify_songs.csv`
- `readme.md`

### 3.2 已完成的数据处理

系统已经实现了原始 Spotify 数据的读取、字段标准化、去重和预处理，并生成处理后数据文件：

- `c:\0_code\01_music_recommendation\data\processed\songs_processed.csv`

当前可直接用于推荐的核心字段包括：

- `genre`
- `subgenre`
- `popularity`
- `danceability`
- `energy`
- `acousticness`
- `instrumentalness`
- `valence`
- `tempo`
- `tempo_norm`

---

## 4. 已完成的模块与能力

## 4.1 数据层

已实现：

- 原始数据读取
- 清洗和标准化
- 预处理结果保存

涉及模块：

- `src/config.py`
- `src/data_loader.py`
- `src/preprocess.py`
- `src/main.py`

### 4.2 场景配置

已定义第一版场景配置，场景包括：

- `cafe`
- `gym`
- `study_room`
- `night_street`
- `mountain`

配置内容包括：

- 场景描述
- 偏好流派 `preferred_genres`
- 偏好子流派 `preferred_subgenres`
- 目标音乐特征 `target_features`
- 容差范围 `tolerances`
- 排序权重 `ranking_weights`

配置文件：

- `c:\0_code\01_music_recommendation\configs\scene_profiles.json`

已实现对应场景映射模块：

- `src/scene_mapper.py`

### 4.3 推荐链路

已完成完整推荐链路：

- 场景标签输入
- 场景配置映射
- 按流派和特征召回候选歌曲
- 多因子排序
- 输出 Top-N 推荐结果

涉及模块：

- `src/recall.py`
- `src/ranker.py`
- `src/recommender.py`

当前推荐逻辑大致为：

1. 根据场景选取目标特征和偏好流派
2. 先按 `genre/subgenre` 做粗召回
3. 再按音乐特征容差过滤
4. 用综合得分排序

排序因子包括：

- 流派匹配分
- 特征相似度
- 热度分数
- 多样性惩罚

### 4.4 Flask API

已完成推荐服务的 API 封装，提供以下接口：

- `GET /health`
- `GET /scenes`
- `POST /recommend/by_scene`
- `POST /recommend/by_image`

API 文件：

- `src/api.py`

### 4.5 图片推荐入口

方向一已经完成工程接入，支持“图片 -> 场景 -> 推荐”：

涉及模块：

- `src/vision/scene_classifier.py`
- `src/vision/__init__.py`
- `src/recommender.py`
- `src/main.py`
- `src/api.py`

已经新增：

- `recommend_by_image()`
- CLI 参数 `--image`
- CLI 参数 `--classifier`
- API 参数 `classifier=auto|clip|mock`

---

## 5. 当前视觉模块状态

### 5.1 已实现的视觉分类器结构

视觉分类模块支持两种模式：

- `mock`

  - 不依赖真实大模型
  - 用于打通链路和本地快速验证
- `clip`

  - 真实 CLIP 模型路径
  - 代码已接入
  - 适合在本机联网环境继续测试

### 5.2 当前实际验证情况

已经完成：

- `mock` 模式下的图片推荐链路验证
- `main.py --image ... --classifier mock` 验证
- `/recommend/by_image` 接口验证

当前限制：

- 在当前 IDE/沙箱环境中，真实 `CLIP` 初始化时会静默退出，无法在该环境完成 `clip` 的最终闭环验证
- 但代码入口已经保留，用户可以在本机直接继续执行 `clip` 模式测试

---

## 6. 当前可用的使用方式

### 6.1 场景标签推荐

命令行示例：

```bash
python src/main.py --scene cafe --top_k 5
```

API 示例：

```bash
curl -X POST http://127.0.0.1:5000/recommend/by_scene \
  -H "Content-Type: application/json" \
  -d "{\"scene\":\"cafe\",\"top_k\":5}"
```

### 6.2 图片推荐

命令行示例：

```bash
python src/main.py --image data/test_images/gym.jpg --top_k 3 --classifier mock
```

API 示例：

```bash
curl -X POST http://127.0.0.1:5000/recommend/by_image \
  -F "image=@data/test_images/gym.jpg" \
  -F "top_k=3" \
  -F "classifier=mock"
```

如果要测试真实 CLIP，可使用：

```bash
python src/main.py --image your_real_photo.jpg --top_k 5 --classifier clip
```

---

## 7. 已生成的测试资源

已生成测试图片目录：

- `data/test_images`

这些图片主要用于打通流程，不代表真实场景质量。

下一步建议用户准备一批真实测试图片，用于真实 CLIP 识别验证。

---

## 8. 下一步建议

当前最推荐的下一步工作：

### 8.1 下载或准备真实测试图片

建议建立目录：

- `data/test_images_real/cafe`
- `data/test_images_real/gym`
- `data/test_images_real/study_room`
- `data/test_images_real/night_street`
- `data/test_images_real/mountain`

建议每个场景准备 2 到 4 张图片，第一轮共 10 到 20 张即可。

### 8.2 用真实图片测试 `clip` 模式

重点观察：

- 场景识别是否正确
- 置信度是否合理
- 推荐歌曲是否符合该场景

### 8.3 根据测试结果优化

后续可继续做：

- 优化 CLIP prompt
- 返回候选场景 Top-N 分数
- 调整场景配置参数
- 优化召回和排序逻辑
- 将图片批量测试结果写成评估报告

---

## 9. 当前项目核心文件清单

### 文档

- `doc/proposal.md`
- `doc/detailed_proposal.md`

### 配置

- `configs/scene_profiles.json`

### 数据

- `data/sample_spotify/spotify_songs.csv`
- `data/processed/songs_processed.csv`

### 核心代码

- `src/config.py`
- `src/data_loader.py`
- `src/preprocess.py`
- `src/scene_mapper.py`
- `src/recall.py`
- `src/ranker.py`
- `src/recommender.py`
- `src/main.py`
- `src/api.py`

### 视觉模块

- `src/vision/scene_classifier.py`
- `src/vision/__init__.py`

---

## 10. 当前项目状态总结

项目已经从“方案讨论”进入“基础系统已跑通”的阶段，具体状态如下：

- 数据预处理已完成
- 场景配置已完成
- 场景标签推荐已完成
- Flask API 已完成
- 图片推荐入口已完成
- `mock` 图片推荐链路已验证
- 真实 `clip` 模式等待本机真实图片进一步测试

当前最重要的下一步不是继续加新功能，而是：

- 准备真实场景图片
- 用 `clip` 进行实测
- 根据结果优化视觉识别与场景定义
