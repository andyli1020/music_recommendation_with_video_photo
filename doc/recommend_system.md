## 推荐系统技术分类

根据我对整个代码库的审查，你的音乐推荐系统在技术路线上属于 **基于内容的推荐（Content-Based Filtering）**，融合了 **知识驱动的多准则排序（Knowledge-Driven Multi-Criteria Ranking）**。具体拆解如下：

---

### 一、核心引擎：基于内容的推荐 (Content-Based Filtering)

这是系统的核心技术范式。推荐完全依赖歌曲自身的特征向量，**不使用任何用户行为数据**（无点击、无评分、无协同信号）。

**具体做法：**

```
歌曲特征向量 = [danceability, energy, acousticness, instrumentalness, valence, tempo_norm]
场景目标向量 = f(属性向量)
相似度 = 加权余弦相似度(song_vector, target_vector)
```

- 不依赖用户-物品交互矩阵
- 不存在冷启动问题（新歌只要有特征即可推荐）
- 完全可解释（为什么推荐这首歌？因为它的 energy/acousticness 接近目标值）

---

### 二、知识/规则驱动层 (Knowledge-Based / Constraint-Based)

这是系统区别于纯 CBF 的关键层——推荐的目标向量不是从用户历史中学到的，而是通过**先验领域知识**预先定义的。

**具体体现：**

| 组件                                                                                                         | 说明                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [scene_attributes.json](file:///c:/0_code/01_music_recommendation/configs/scene_attributes.json)                | 9 维属性空间（arousal, socialness, focus, relaxation, nature, urban, night, openness, warmth），5 个原型场景的属性向量 |
| [MUSIC_TARGET_WEIGHT_RULES](file:///c:/0_code/01_music_recommendation/src/attribute_mapper.py#L22-L79)          | 硬编码的属性→音乐特征映射权重（如 `arousal → energy=0.45`，`focus → instrumentalness=0.35`）                    |
| [CURRENT_DATASET_GENRE_PRIOR_RULES](file:///c:/0_code/01_music_recommendation/src/attribute_mapper.py#L81-L161) | 硬编码的属性→流派先验映射（如 `socialness → pop=0.35`，`night → r&b=0.30`）                                     |

这层本质上是一个**手工设计的推理系统**：

```
输入：场景属性向量 → 线性加权映射 → 音乐目标特征 + 流派先验 + 容差 + 排序权重
```

---

### 三、排序层：多准则线性加权 (Multi-Criteria Scoring / Linear Weighted Sum)

[ranker.py](file:///c:/0_code/01_music_recommendation/src/ranker.py) 的排序公式：

```python
final_score = w_genre × genre_match_score        # 流派匹配分（软分数）
            + w_feature × weighted_cosine_sim     # 加权特征余弦相似度
            + w_pop × (popularity/100)            # 流行度归一化
            - diversity_penalty                   # 贪心重排惩罚
```

这是经典的多准则决策（MCDM）方法——不是机器学习训练的，而是手工设定权重的线性组合。

贪心重排（Greedy Re-ranking）保证了推荐列表的**多样性**：同一歌手出现多次时惩罚递增 `-0.08/次`，同流派 `-0.04/次`。

---

### 四、召回层：两级级联过滤 (Two-Stage Cascaded Filtering)

[recall.py](file:///c:/0_code/01_music_recommendation/src/recall.py) 的召回策略：

| 阶段   | 方法                | 说明                            |
| ------ | ------------------- | ------------------------------- |
| 粗召回 | 流派 OR + 子流派 IN | → 约 15,000 首（以 cafe 为例） |
| 精召回 | 软打分 Top-K        | `exp(-                          |
| 回退   | 放宽条件            | 候选不足时 2× 放宽或回退全量   |

---

### 五、视觉侧：零样本 CLIP 图像分类 (Zero-Shot Image Classification)

图片不直接参与推荐排序，而是作为**场景识别的入口**：

```
图片 → CLIP ViT-B-32 → 场景标签 → 属性向量查表 → 推荐引擎
```

使用的是 [OpenCLIP](https://github.com/mlfoundations/open_clip) 的 `ViT-B-32` + `laion2b_s34b_b79k` 预训练权重，本地加载。每场景 3 条 prompt 取 max 相似度。

---

### 六、技术总结对比

| 技术类别                           | 是否使用         | 说明                              |
| ---------------------------------- | ---------------- | --------------------------------- |
| 协同过滤 (Collaborative Filtering) | ❌               | 无用户-物品交互数据               |
| 矩阵分解 (SVD/ALS)                 | ❌               | 无评分矩阵                        |
| 基于内容的推荐 (CBF)               | ✅**核心** | 歌曲特征向量 + 目标向量余弦相似度 |
| 知识驱动 (Knowledge-Based)         | ✅               | 手工定义的属性→音乐映射规则      |
| 多准则排序 (MCDM)                  | ✅               | 流派+特征+流行度+多样性的加权组合 |
| 深度学习端到端排序                 | ❌               | 未使用神经网络做排序              |
| 零样本图像分类 (CLIP)              | ✅               | 场景识别入口                      |
| 强化学习 / Bandit                  | ❌               | 无在线学习/探索-利用机制          |

---

### 一句话概括

**这是一个「基于内容的 + 知识驱动的 + 多准则线性排序」推荐系统，以零样本 CLIP 作为视觉入口。** 它不属于协同过滤家族，更接近早期 Pandora 音乐基因组计划的思路（人工定义音乐属性维度 + 规则匹配），但用属性层替代了完全手写规则，用 CLIP 替代了人工标注场景标签。

---



这是一个很好的方向性问题。让我先快速确认一下当前的数据结构，然后给你一个完整的协同过滤引入方案。

toolName: view_files

status: success

filePath: c:\0_code\01_music_recommendation\src\data_loader.py

toolName: view_files

status: success

filePath: c:\0_code\01_music_recommendation\src\preprocess.py

## 协同过滤引入方案

你的系统目前最大的约束是：**没有任何用户-物品交互数据**。所以协同过滤不能直接套用，需要分阶段建设。以下是一个三阶段路线图：

---

### 阶段一：零数据起步 —— 模拟交互矩阵（立即可做）

用现有的 5 个场景原型 + 歌曲特征，**模拟出虚拟用户交互数据**：

```
5 个场景 → 每个场景生成 N 个虚拟用户 → 每个用户有略微扰动的偏好
                                          ↓
                               user_song_interaction 矩阵
```

**具体做法：**

```
对每个场景（如 cafe），生成 20 个虚拟用户：
  - 每个用户在 cafe 属性向量的基础上加随机噪声（±0.1）
  - 用现有加权余弦相似度给所有歌曲打分
  - 取 Top-200 作为"听过/喜欢"的正样本
  - 随机采样 50 首远距离歌曲作为负样本

结果：5 × 20 = 100 个虚拟用户，每个用户 ~250 条交互记录
     共 ~25,000 条 user-song 评分
```

有了这个矩阵后，就可以上经典的协同过滤算法。

---

### 阶段二：经典 CF 模型 —— 三选一

| 方法                                     | 原理                                              | 优点                                 | 缺点                 | 推荐度 |
| ---------------------------------------- | ------------------------------------------------- | ------------------------------------ | -------------------- | ------ |
| **Item-Based CF**                  | 歌曲相似度 = 被同一用户喜欢的重叠度               | 可解释、稳定、适合歌曲多用户少的场景 | 新歌冷启动           | ⭐⭐⭐ |
| **Matrix Factorization (SVD/ALS)** | 将 user-song 矩阵分解为 user latent + song latent | 发现潜在模式、补全缺失评分           | 需要调参、可解释性弱 | ⭐⭐   |
| **User-Based CF**                  | 找到相似用户 → 推荐他们喜欢的歌                  | 发现意外惊喜                         | 用户稀疏时效果差     | ⭐     |

**推荐用 Item-Based CF 作为首选**，因为：

- 你的歌曲有 `song_id`，天然适合构建 item-item 相似度矩阵
- Item-based 可以**预计算**相似度矩阵，推理时 O(1) 查表
- 与现有 CBF 的加权求和逻辑天然兼容

**SVD (FunkSVD) 作为备选**，好处是能学到歌曲的隐语义向量（latent factors），这些向量可以和你现有的 `FEATURE_KEYS` 交叉验证，看 CF 学到的隐维度是否对应 acousticness/energy 等已知特征。

---

### 阶段三：混合推荐架构 —— 与现有 CBF 融合

这是最关键的工程问题。推荐三种融合策略：

#### 策略 A：加权融合（Weighted Hybrid）— 最简单

```python
# 在 ranker.py 的 base_scores 中增加一个 CF 项
base_scores = (
    w_cf    × cf_score(song, user_history)      # 协同过滤分
  + w_genre × genre_match_score                  # 流派匹配分
  + w_feat  × weighted_cosine_sim                # 特征相似度
  + w_pop   × popularity / 100                   # 流行度
)
```

- `cf_score` = 用户历史中喜欢过的歌曲与被推荐歌曲的平均 item-item 相似度
- 权重 `w_cf` 随用户交互量动态调整（冷启动时降为 0，交互越多权重越大）

#### 策略 B：级联混合（Cascade）— 最稳定

```python
# 先 CBF 粗排 Top-200
cbf_pool = content_based_recall(scene_attributes, top=200)
# 再 CF 精排
final = collaborative_re_rank(cbf_pool, user_history, top_k=10)
```

CF 不参与召回，只在 CBF 的候选池里做重排序。好处是不会因为 CF 把完全不匹配场景的歌曲推到前面。

#### 策略 C：切换式（Switching）— 最激进

```python
if user_interaction_count > THRESHOLD:
    return cf_recommend(user)
else:
    return cbf_recommend(scene)  # 现有逻辑
```

---

### 具体实现路径建议

| 步骤 | 内容                                                                     | 涉及文件 | 工作量 |
| ---- | ------------------------------------------------------------------------ | -------- | ------ |
| 1    | 新建 `cf_simulator.py`，从 `scene_attributes.json` 生成虚拟交互矩阵  | 新文件   | 半天   |
| 2    | 新建 `item_cf.py`，实现 item-item 相似度矩阵 + 基于历史推荐            | 新文件   | 半天   |
| 3    | 修改 `ranker.py`，增加 `cf_score` 分项 + 混合权重                    | 修改     | 1小时  |
| 4    | 修改 `recommender.py`，增加 `recommend_with_cf(user_history, scene)` | 修改     | 1小时  |
| 5    | 新建 `matrix_factorization.py`，SVD 训练 + 歌曲隐向量导出              | 新文件   | 半天   |
| 6    | 新建评测脚本，对比 CBF-only vs CF-only vs Hybrid                         | 新脚本   | 半天   |

---

### 架构图（融合后）

```
                    ┌─────────────────────┐
                    │   图片 / 场景标签    │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │   属性层 (9 维)      │
                    └────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │  CBF 内容召回     │          │  CF 协同召回      │
     │  genre + 软打分   │          │  item-item 相似度  │
     │  → Top-200        │          │  → Top-200        │
     └────────┬────────┘          └────────┬────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │   候选池合并      │
                    │   (union/merge)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   混合排序        │
                    │   w_cf + w_cbf   │
                    │   + diversity    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Top-N 推荐     │
                    └─────────────────┘
```

---

### 一个关键建议

由于你没有真实用户数据，**虚拟模拟只能验证工程链路是否跑通，不能验证 CF 的实际推荐质量**。所以：

> **短期**：用虚拟数据把 Item-CF + 混合排序的工程架子搭好
> **中期**：在 Flask API 中埋一个「👍/👎」反馈端点，积累真实交互数据
> **长期**：当真实交互量超过 ~5000 条后，重新训练 CF 模型，对比虚拟版

---

要我按照这个方案开始搭建 CF 模块的代码架子吗？可以先从虚拟交互数据生成器 + Item-CF 核心开始。
