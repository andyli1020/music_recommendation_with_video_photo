# 视界伴音推荐系统详细实现方案

## 1. 文档目标

本文档基于 [proposal.md](file:///c:/0_code/01_music_recommendation/doc/proposal.md) 中的总体构想，进一步拆解出一个可在当前仓库中逐步落地的基础推荐系统实现方案。目标不是一次性完成完整研究系统，而是先搭建一个可运行、可验证、可扩展的 MVP（Minimum Viable Product），再逐步演进到包含视觉理解、跨模态检索和重排序的完整方案。

当前仓库现状如下：

- 已有基础依赖：`pandas`、`numpy`、`scikit-learn`、`surprise`、`flask`、`requests`
- 已有基础代码入口：[main.py](file:///c:/0_code/01_music_recommendation/src/main.py)
- 当前代码仍处于环境验证阶段，尚未建立数据处理、训练、召回、排序和服务化模块

因此，本方案重点解决以下问题：

- 先实现什么，后实现什么
- 每个模块需要输入什么，输出什么
- 现阶段哪些能力可以用简化版替代
- 如何在当前项目目录中组织代码
- 如何定义阶段性验收标准

## 2. 建设目标与阶段划分

### 2.1 总体目标

构建一个“视觉场景驱动的音乐推荐系统”，输入为场景图像或场景标签，输出为符合当前场景氛围的 Top-N 歌曲推荐结果。

### 2.2 分阶段目标

为了降低实现复杂度，建议分为四个阶段推进：

#### 第一阶段：基础推荐 MVP

目标：在没有真实视觉模型的前提下，先用“场景标签原型”替代图像输入，打通推荐链路，并为后续属性层预留统一接口。

- 输入：场景标签，如 `mountain`、`cafe`、`gym`、`night_street`
- 处理：将场景标签映射为场景属性向量，再生成目标音乐特征
- 输出：返回 Top-N 候选歌曲

这一阶段的价值：

- 先验证“场景 -> 音乐”映射逻辑是否合理
- 建立完整的数据处理、召回和排序框架
- 为后续接入 CLIP 图像编码器预留接口

#### 第二阶段：加入图像场景理解

目标：将真实图片作为输入，通过预训练模型提取场景语义特征，并输出可扩展的属性向量，而不是只输出单一场景标签。

- 输入：用户上传图片或摄像头截图
- 处理：图像编码、属性打分、Top-N 原型场景匹配、场景向量生成
- 输出：用于召回和排序的视觉场景表示

#### 第三阶段：跨模态检索

目标：将图像特征与音乐特征映射到统一向量空间中，提高匹配质量。

- 使用双塔结构分别编码图像和音乐
- 使用余弦相似度进行召回
- 使用 FAISS 构建近似最近邻检索索引

#### 第四阶段：服务化与交互展示

目标：封装为本地 API 或简易 Web 页面，支持上传图片并返回推荐结果。

- Flask 提供推理接口
- 支持返回推荐歌曲、匹配分数、场景解释

## 3. MVP 范围定义

当前建议优先实现第一阶段 MVP，明确不做以下高复杂度内容：

- 暂不训练完整 CLIP 微调模型
- 暂不接入真实 Spotify 在线鉴权和大规模抓取
- 暂不实现视频流连续推荐
- 暂不做复杂用户画像和长期行为建模

MVP 聚焦以下核心闭环：

1. 准备一个本地歌曲特征数据集
2. 定义若干场景原型及其属性向量
3. 根据属性生成目标音乐特征与流派先验
4. 再结合简单相似度排序
5. 输出可解释的推荐结果

## 4. 系统总体架构

建议系统分为六层：

### 4.1 输入层

负责接收外部输入，分两种模式：

- 模式 A：直接输入场景标签，便于调试和快速验证
- 模式 B：输入图片路径，供后续视觉模型接入

### 4.2 场景理解层

负责把输入转换为统一的场景表示。

本方案建议将“场景表示”拆成三层：

1. 场景原型层：如 `cafe`、`gym`、`mountain`，用于调试和展示解释
2. 属性向量层：如 `arousal`、`focus`、`nature`、`night` 等连续维度，作为系统核心中间表示
3. 音乐目标层：由属性向量生成 `valence`、`energy`、`tempo`、`acousticness` 等目标音乐特征

第一阶段可用规则方式实现：

- 输入 `cafe`
- 输出场景属性向量，再映射得到目标音乐属性

后续可替换为视觉模型推断：

- 图片 -> 属性分数
- 图片 -> Top-N 原型场景
- 图片 -> 视觉向量

### 4.3 音乐特征层

负责管理歌曲元数据和音乐特征，建议每首歌曲至少包含：

- `song_id`
- `title`
- `artist`
- `genre`
- `valence`
- `energy`
- `tempo`
- `danceability`
- `acousticness`
- `instrumentalness`
- `popularity`

### 4.4 候选召回层

负责从全量歌曲中快速筛出候选集。

MVP 召回策略建议如下：

- 基于属性生成的流派先验过滤一部分候选歌曲
- 基于目标音乐特征过滤，如 `tempo in [70, 110]`
- 可选叠加原型场景的弱约束，但不再把场景标签作为唯一过滤条件

### 4.5 排序层

负责对召回结果进行打分和排序。

建议第一版评分公式：

```text
final_score =
0.40 * scene_or_attribute_match_score +
0.30 * feature_similarity_score +
0.20 * popularity_score +
0.10 * diversity_adjustment
```

其中：

- `scene_or_attribute_match_score`：歌曲风格与场景原型或属性先验的匹配程度
- `feature_similarity_score`：歌曲特征和目标场景特征的距离相似度
- `popularity_score`：歌曲流行度归一化结果
- `diversity_adjustment`：避免 Top-N 结果全是同风格或同歌手

### 4.6 服务与展示层

第一阶段可以只提供命令行输出：

- 输入场景标签
- 输出推荐列表、分数、推荐理由

第二阶段再补充 Flask API：

- `POST /recommend/by_scene`
- `POST /recommend/by_image`

## 5. 推荐策略设计

## 5.1 场景属性层设计

为了避免后续场景类别扩展时过度依赖固定场景标签和手工 prompt，本方案建议在“场景标签”和“音乐特征”之间引入一层可扩展的“场景属性层”。

核心思想如下：

- 现有 `cafe`、`gym`、`mountain` 等不再视为最终类别全集，而视为原型场景
- 系统真正稳定的中间表示不是单一标签，而是连续属性向量
- 推荐系统优先消费属性向量，再由属性向量生成目标音乐特征和流派先验
- 原型场景主要用于调试、初始化和解释，不再作为长期唯一决策入口

推荐链路从：

```text
图片 -> 场景标签 -> scene_profiles -> 推荐
```

升级为：

```text
图片 -> 属性向量 -> 音乐目标向量/流派先验 -> 召回 + 排序
```

### 5.1.1 属性维度定义

V1 建议先固定以下 9 个属性维度，兼顾视觉可感知性、与音乐特征的相关性和后续扩展性：

| 属性名 | 含义 | 取值范围 | 对音乐的直觉影响 |
| --- | --- | --- | --- |
| `arousal` | 场景唤醒度/动感强度 | 0-1 | 越高越偏高 `energy`、高 `tempo`、高 `danceability` |
| `socialness` | 社交密度/互动感 | 0-1 | 越高越偏流行、律动、更少器乐独奏 |
| `focus` | 专注导向 | 0-1 | 越高越偏低 `energy`、高 `instrumentalness` |
| `relaxation` | 放松感/舒缓感 | 0-1 | 越高越偏低节奏、高 `acousticness` |
| `nature` | 自然感 | 0-1 | 越高越偏 `acoustic`、`folk`、`ambient` |
| `urban` | 都市感/人造环境感 | 0-1 | 越高越偏 `pop`、`r&b`、`edm`、`rap` |
| `night` | 夜晚感/暗色氛围 | 0-1 | 越高越偏 `r&b`、`chill`、`synthwave` |
| `openness` | 空间开阔度 | 0-1 | 越高越适合更铺展、更开阔的听感 |
| `warmth` | 温暖亲和感 | 0-1 | 越高越提升 `valence`，偏柔和舒适 |

### 5.1.2 现有 5 个场景的原型属性表示

下面给出一版初始化原型表，作为后续调参与解释的起点，而不作为不可更改的真值：

| 场景 | arousal | socialness | focus | relaxation | nature | urban | night | openness | warmth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cafe` | 0.35 | 0.55 | 0.45 | 0.72 | 0.05 | 0.75 | 0.20 | 0.30 | 0.78 |
| `study_room` | 0.12 | 0.08 | 0.95 | 0.80 | 0.05 | 0.40 | 0.15 | 0.20 | 0.55 |
| `gym` | 0.95 | 0.70 | 0.25 | 0.10 | 0.00 | 0.65 | 0.10 | 0.45 | 0.45 |
| `night_street` | 0.58 | 0.42 | 0.18 | 0.22 | 0.00 | 0.95 | 0.96 | 0.62 | 0.28 |
| `mountain` | 0.45 | 0.05 | 0.35 | 0.68 | 0.98 | 0.00 | 0.08 | 0.95 | 0.60 |

这张表的主要用途有三点：

- 作为第一阶段无图像输入时的原型场景配置
- 作为视觉模型输出后的最近邻原型解释
- 作为后续新增场景的初始化模板

### 5.1.3 属性到音乐目标的映射

推荐系统不再只依赖手工写死的 `scene -> target_features` 配置，而改为：

```text
scene prototype / image
-> attribute vector
-> target music features + genre priors
-> recall + rank
```

建议第一版使用可解释的线性启发式映射。下面给出一组可直接落地的初始公式：

```text
target_energy =
0.55 * arousal +
0.15 * socialness -
0.20 * focus +
0.05 * urban

target_valence =
0.30 * relaxation +
0.20 * warmth +
0.15 * nature +
0.10 * socialness -
0.10 * night +
0.10 * arousal

target_tempo_bpm =
70 +
60 * arousal +
10 * urban -
12 * focus -
8 * relaxation

target_acousticness =
0.35 * nature +
0.25 * relaxation +
0.20 * focus -
0.20 * urban -
0.15 * arousal

target_instrumentalness =
0.35 * focus +
0.20 * relaxation +
0.15 * nature -
0.20 * socialness -
0.15 * arousal

target_danceability =
0.40 * arousal +
0.25 * socialness +
0.15 * urban -
0.15 * focus
```

实现时可对结果进行 `clamp(0, 1)`，并将 `tempo` 限定在合理区间，如 `60-170 BPM`。

### 5.1.4 属性到流派先验的映射

为了减少“每个场景固定若干流派”的刚性，本方案进一步引入属性驱动的流派先验。示意如下：

```text
ambient_score = 0.35*relaxation + 0.30*focus + 0.20*nature - 0.20*arousal
classical_score = 0.35*focus + 0.20*relaxation + 0.15*warmth - 0.15*socialness
acoustic_score = 0.30*nature + 0.25*warmth + 0.20*relaxation - 0.15*urban
folk_score = 0.30*nature + 0.20*openness + 0.15*warmth
pop_score = 0.30*socialness + 0.25*urban + 0.20*warmth + 0.15*arousal
rnb_score = 0.30*night + 0.25*urban + 0.15*relaxation + 0.10*warmth
edm_score = 0.45*arousal + 0.20*socialness + 0.20*urban - 0.15*focus
rap_score = 0.30*urban + 0.25*arousal + 0.20*socialness + 0.10*night
rock_score = 0.25*arousal + 0.20*openness + 0.20*nature
```

这类流派分数可以转为排序加权项，也可以在召回阶段作为候选保留概率或过滤阈值。

## 5.2 候选召回策略

召回可分为三步：

### 第一步：按属性生成的流派先验预筛选

根据属性生成的流派得分筛出候选歌曲，例如：

- 高 `focus`、高 `relaxation` 时，优先保留 `ambient`、`classical`、`acoustic`
- 高 `arousal`、高 `socialness` 时，优先保留 `edm`、`pop`、`rap`

### 第二步：按数值特征过滤

用属性生成的目标特征构造阈值范围，例如：

- `abs(song.energy - target.energy) < threshold`
- `abs(song.valence - target.valence) < threshold`
- `song.tempo` 落在目标区间内

### 第三步：保留召回池

将过滤后的前 `K=50` 或 `K=100` 首歌曲作为候选池，供排序模块使用。

## 5.3 排序策略

排序阶段建议使用可解释的加权打分，而不是一开始就上复杂模型。

### 5.3.1 特征相似度

将歌曲特征和目标场景特征构造成向量：

```text
song_vector = [valence, energy, tempo_norm, acousticness, instrumentalness]
scene_vector = [target_valence, target_energy, target_tempo_norm, target_acousticness, target_instrumentalness]
```

使用以下两种方案之一：

- 余弦相似度
- 欧氏距离转换为相似度分数

推荐优先使用余弦相似度，便于后续与向量检索统一。

### 5.3.2 流行度平衡

完全依赖相似度时，容易推荐冷门歌且结果不稳定，因此加入流行度辅助分：

```text
popularity_score = popularity / 100
```

### 5.3.3 多样性约束

防止前 10 首推荐出现以下问题：

- 同一个歌手过多
- 同一种流派过多
- 节奏过于单一

简单实现方式：

- 若当前歌曲歌手已出现，则减去一定惩罚
- 若当前歌曲流派与前面重复次数过高，则减分

## 6. 数据方案设计

## 6.1 第一阶段数据来源建议

由于当前重点是先跑通系统，建议使用“自建小型实验数据集”。

### 图像侧

第一阶段不强依赖真实图像数据，可直接准备若干场景标签：

- `mountain`
- `cafe`
- `gym`
- `study_room`
- `night_street`

### 音乐侧

准备一个 CSV 文件作为本地歌曲库，规模建议 200 到 1000 首。

字段建议如下：

| 字段名 | 类型 | 含义 |
| --- | --- | --- |
| song_id | int | 歌曲唯一标识 |
| title | str | 歌名 |
| artist | str | 歌手 |
| genre | str | 流派 |
| valence | float | 情绪正向程度 |
| energy | float | 能量感 |
| tempo | float | 节奏速度 |
| danceability | float | 可舞动性 |
| acousticness | float | 原声感 |
| instrumentalness | float | 器乐倾向 |
| popularity | float | 流行度 |

如果暂时没有现成数据，可手工构造小规模样例数据，先验证逻辑。

## 6.2 数据预处理

预处理流程建议如下：

1. 读取歌曲原始 CSV
2. 缺失值处理
3. 数值特征归一化
4. 类别字段标准化，如 genre 小写化
5. 输出处理后的训练/检索数据文件

其中 `tempo` 建议做归一化：

```text
tempo_norm = (tempo - min_tempo) / (max_tempo - min_tempo)
```

## 6.3 数据目录规划

建议新增如下目录结构：

```text
data/
  raw/
    songs.csv
  processed/
    songs_processed.csv
configs/
  scene_profiles.json
  scene_attributes.json
  attribute_music_mapping.json
models/
  faiss/
outputs/
  recommendations/
```

## 7. 代码结构设计

建议将 `src/` 目录重构为模块化结构：

```text
src/
  main.py
  config.py
  data_loader.py
  preprocess.py
  scene_mapper.py
  attribute_mapper.py
  recall.py
  ranker.py
  recommender.py
  utils.py
  api.py
  vision/
    scene_classifier.py
  tests/
    test_scene_mapper.py
    test_recall.py
    test_ranker.py
```

各模块职责如下：

- `main.py`：命令行入口，负责串联完整推荐流程
- `config.py`：路径、参数、阈值、默认 Top-K 等配置
- `data_loader.py`：加载歌曲数据和场景配置
- `preprocess.py`：数据清洗和特征归一化
- `scene_mapper.py`：场景原型读取与原型场景管理
- `attribute_mapper.py`：场景原型或图像属性分数到目标音乐特征的映射
- `recall.py`：候选召回逻辑
- `ranker.py`：候选打分和排序
- `recommender.py`：整合召回和排序，对外提供统一接口
- `api.py`：Flask 服务接口
- `vision/scene_classifier.py`：后续接入图像理解模型

## 8. 核心模块实现细节

## 8.1 `scene_mapper.py` 与 `attribute_mapper.py`

输入：

- 场景标签字符串，例如 `cafe`
- 或属性向量，例如 `{"focus": 0.8, "relaxation": 0.7, ...}`

输出：

- 场景原型配置字典
- 属性向量
- 目标音乐向量

建议接口：

```python
def get_scene_prototype(scene_name: str) -> dict:
    ...

def get_attribute_vector(scene_name: str) -> dict:
    ...

def map_attributes_to_music_targets(attribute_scores: dict) -> dict:
    ...
```

返回结果示例：

```python
{
    "scene": "cafe",
    "attributes": {
        "arousal": 0.35,
        "socialness": 0.55,
        "focus": 0.45,
        "relaxation": 0.72,
        "nature": 0.05,
        "urban": 0.75,
        "night": 0.20,
        "openness": 0.30,
        "warmth": 0.78
    },
    "target_features": {
        "valence": 0.63,
        "energy": 0.27,
        "tempo": 81,
        "acousticness": 0.24,
        "instrumentalness": 0.17,
        "danceability": 0.26
    }
}
```

## 8.2 `recall.py`

输入：

- 场景原型配置或属性映射结果
- 歌曲数据表

输出：

- 候选歌曲 DataFrame

建议逻辑：

1. 根据属性生成的流派先验筛选
2. 按目标特征范围筛选
3. 若结果过少，则逐步放宽阈值

建议接口：

```python
def recall_candidates(songs_df, music_targets, genre_priors, top_k=100):
    ...
```

## 8.3 `ranker.py`

输入：

- 候选歌曲
- 由属性映射得到的目标音乐特征
- 可选的原型场景信息，用于解释

输出：

- 带分数的排序结果

建议接口：

```python
def rank_candidates(candidates_df, music_targets, genre_priors=None, top_n=10):
    ...
```

建议在输出中保留解释字段：

- `final_score`
- `feature_similarity_score`
- `popularity_score`
- `reason`

例如：

```text
该图片呈现较高放松度、中等社交感和较强温暖感，因此推荐更柔和、原声感较强、节奏较平稳的歌曲
```

## 8.4 `recommender.py`

这是系统主服务层，对外只暴露一个统一接口：

```python
def recommend_by_scene(scene_name: str, top_n: int = 10):
    ...
```

后续扩展：

```python
def recommend_by_image(image_path: str, top_n: int = 10):
    ...
```

其中 `recommend_by_image()` 的内部流程建议为：

```text
image
-> attribute_scores
-> music_targets + genre_priors
-> recall
-> rank
-> top2 prototype scenes for explanation
```

## 8.5 `api.py`

当 CLI 版本可用后，再加 Flask 服务。

建议接口：

### `POST /recommend/by_scene`

请求：

```json
{
  "scene": "cafe",
  "top_n": 5
}
```

响应：

```json
{
  "scene": "cafe",
  "recommendations": [
    {
      "song_id": 12,
      "title": "Late Afternoon",
      "artist": "Artist A",
      "score": 0.91,
      "reason": "适合咖啡馆场景，节奏平稳，原声感较强"
    }
  ]
}
```

## 9. 视觉模块接入方案

第一阶段先预留接口，不强制实现。

## 9.1 简化方案

先使用图片文件名或人工输入的场景标签模拟视觉识别结果，例如：

- `cafe_01.jpg -> cafe`
- `gym_03.jpg -> gym`

这样可以在没有深度模型的情况下先联调“场景原型 -> 属性向量 -> 推荐”的后续流程。

## 9.2 后续真实接入方案

第二阶段建议优先采用“CLIP 编码 + 属性打分”的路线，而不是长期固化为固定类别分类器。可选两条路线如下：

### 路线 A：图像分类

使用预训练图像分类模型预测场景类别：

- ResNet / EfficientNet
- 在 Places365 预训练模型基础上微调

输出：

- 场景类别概率分布

该路线适合封闭场景集合，但在后续类别持续扩展时，维护成本和过拟合风险会逐步升高。

### 路线 B：CLIP 编码

直接使用 CLIP 的图文对齐能力，但不再只围绕固定场景名写 prompt，而是围绕属性维度进行正反 prompt 打分：

- 图像编码为向量
- 属性文本提示词编码为向量
- 计算属性正向 prompt 与反向 prompt 的相似度差
- 输出属性分数、Top-N 原型场景和解释信息

例如：

- `focus`
  - 正向：`a quiet place for reading, studying, or concentrated work`
  - 反向：`a noisy and distracting place for social activity`
- `nature`
  - 正向：`a natural outdoor environment with mountains, trees, sky, and landscape`
  - 反向：`an indoor or highly artificial man-made environment`
- `arousal`
  - 正向：`an energetic, dynamic, active environment`
  - 反向：`a calm, still, low-energy environment`
- `night`
  - 正向：`a dark nighttime scene with artificial lights`
  - 反向：`a bright daytime scene under natural light`

属性分数可按如下方式计算：

```text
score(attr) = sigmoid(alpha * (max_sim(pos_prompts) - max_sim(neg_prompts)))
```

该路线的优势在于：

- 不强依赖固定类别集合
- 新场景扩展时只需复用已有属性维度
- 更贴近“视觉氛围 -> 音乐氛围”的真实任务目标
- 后续可以平滑升级为属性回归模型，而不破坏推荐接口

## 10. 跨模态检索演进方案

当第一阶段稳定后，可以从规则推荐升级到向量检索。

## 10.1 音乐向量构建

先将音乐的结构化特征拼成向量：

```text
[valence, energy, tempo_norm, acousticness, instrumentalness, danceability]
```

## 10.2 图像向量构建

由 CLIP 或其他视觉编码器输出图像向量。

## 10.3 向量空间对齐

初期可先使用启发式投影：

- 将属性向量映射为目标音乐向量
- 不立即训练真正的双塔模型

后期再使用成对数据训练：

- 输入：`(scene_image, matched_song)`
- 目标：拉近正样本距离，拉远负样本距离

## 10.4 FAISS 检索

当音乐库较大时，使用 FAISS 索引提升召回效率。

适合在以下阶段引入：

- 歌曲规模超过 1 万
- 需要实时返回推荐结果

## 11. 开发步骤建议

建议按如下顺序实现：

### 第一步：整理基础数据与属性配置

- 新建歌曲样例数据集
- 新建场景原型配置文件
- 新建属性到音乐映射配置文件
- 完成预处理脚本

### 第二步：实现基于属性层的推荐主链路

- 实现 `scene_mapper.py`
- 实现 `attribute_mapper.py`
- 实现 `recall.py`
- 实现 `ranker.py`
- 在 `main.py` 中打通场景推荐流程

### 第三步：补充测试

- 测试场景映射是否正确
- 测试召回结果是否非空
- 测试排序结果是否按分数降序输出

### 第四步：封装 API

- 增加 Flask 服务
- 提供 `by_scene` 接口

### 第五步：接入图像输入

- 先做图像路径到场景原型的简化映射
- 再逐步替换为真实视觉模型的属性打分

## 12. 验收标准

第一阶段 MVP 的最低验收标准建议如下：

- 输入一个场景标签后，系统能返回 Top-5 或 Top-10 歌曲
- 能输出该场景对应的属性向量和目标音乐特征
- 输出中包含歌曲名、歌手、分数和推荐理由
- 不同场景下推荐结果有明显差异
- 代码结构清晰，模块职责明确
- 能通过基础单元测试

第二阶段验收标准：

- 输入一张场景图片，可自动输出属性分数和 Top-N 原型场景
- 图像输入与标签输入的推荐链路统一
- 对新增场景具备一定的开放扩展能力，而非完全依赖封闭标签集合

## 13. 风险与应对

### 风险 1：没有高质量歌曲特征数据

应对：

- 先构建小规模人工样例数据
- 后续再接入真实 API 或公开数据集

### 风险 2：场景和音乐的映射过于主观

应对：

- 把场景配置表做成可调参数
- 用实验结果不断修正映射关系

### 风险 3：第一版结果不够智能

应对：

- 接受第一版以“可运行”和“可解释”为主
- 后续通过视觉模型和向量检索逐步提升效果

### 风险 4：CLIP 提示词对少量示例场景过拟合

应对：

- 不把 CLIP 长期固定为“5 类场景分类器”
- 将视觉层的主输出从单一场景标签升级为属性向量
- 使用属性正反 prompt，而不是只对比场景名 prompt
- 新增场景时优先复用属性空间，而不是无限增加手工类别词表

## 14. 下一步落地建议

基于当前仓库，建议下一步直接开始以下工作：

1. 在 `data/` 下准备一份小型歌曲样例数据
2. 在 `configs/` 下定义场景原型配置与属性映射配置
3. 重构 `src/main.py`，使其支持按场景原型输出属性和推荐结果
4. 增加 `scene_mapper.py`、`attribute_mapper.py`、`recall.py`、`ranker.py` 四个核心模块
5. 用 3 到 5 个场景先完成第一版原型演示系统

如果后续按这个方案推进，推荐优先实现的最小可运行版本是：

```text
场景标签输入 -> 场景属性映射 -> 候选召回 -> 排序 -> Top-N 推荐输出
```

这条链路一旦跑通，整个项目就从“课题构想”正式进入“可执行开发”阶段；后续再将图像输入接到属性层，就可以自然过渡到更可扩展的视觉场景推荐系统。
