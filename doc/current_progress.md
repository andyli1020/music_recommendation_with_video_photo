# 项目进度总结与下一步规划

---

## 一、当前已实现

### 1.1 数据与图片

| 模块             | 状态 | 说明                                                                                                         |
| ---------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| Spotify 歌曲数据 | ✅   | 28,356 首去重歌曲，6 个流派（pop/rap/edm/r&b/rock/latin）                                                    |
| 示例图片下载     | ✅   | [download_sample_images.py](../scripts/download_sample_images.py)，基于 Wikimedia Commons API，自动保存授权清单 |
| 测试图片集       | ✅   | `data/test_images_real/`，12 张真实图片，覆盖 5 个场景                                                     |

### 1.2 推荐系统核心链路

```
场景标签/图片/属性分数 → 场景识别 → 候选召回 → 多因子排序 → Top-N 推荐
```

当前推荐系统支持**两条并行链路**，通过 `--use-attributes` 参数切换：

- **旧版链路（默认）**：场景标签 → [scene_profiles.json](../configs/scene_profiles.json) → scene_mapper → 召回 + 排序
- **新版链路（属性层）**：场景标签/属性分数 → [scene_attributes.json](../configs/scene_attributes.json) → attribute_mapper → 召回 + 排序

| 模块               | 文件                                                   | 功能                                                                                                                                |
| ------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 配置               | [config.py](../src/config.py)                          | 路径、特征键、CLIP 默认参数                                                                                                         |
| 数据加载           | [data_loader.py](../src/data_loader.py)                | 读取 Spotify CSV                                                                                                                    |
| 数据预处理         | [preprocess.py](../src/preprocess.py)                  | 清洗、去重、标准化                                                                                                                  |
| 场景配置（旧）     | [scene_profiles.json](../configs/scene_profiles.json)  | 5 个场景的流派偏好、目标特征、容差、排序权重（手工配置）                                                                            |
| 场景属性配置（新） | [scene_attributes.json](../configs/scene_attributes.json) | 9 个属性维度定义、5 个原型场景属性向量、属性 prompt 草案                                                                            |
| 场景映射（旧）     | [scene_mapper.py](../src/scene_mapper.py)              | 读取 scene_profiles.json、提取目标向量                                                                                              |
| 属性映射（新）     | [attribute_mapper.py](../src/attribute_mapper.py)      | 属性向量 → 音乐目标/流派先验/容差/排序权重；原型匹配；自动生成 `feature_importance`                                                 |
| 召回               | [recall.py](../src/recall.py)                          | 旧版硬过滤召回 + 新版软打分召回（指数衰减 Top-K）                                                                                  |
| 排序               | [ranker.py](../src/ranker.py)                          | 流派软分数/二值匹配 + 加权特征相似度 + 热度 + 多样性惩罚；支持推荐理由生成                                                          |
| 推荐编排           | [recommender.py](../src/recommender.py)                | 双链路统一入口：`recommend()` / `recommend_by_attributes()` / `recommend_by_image()`；属性链路串联 `genre_priors` 与 `feature_importance` |
| CLI 入口           | [main.py](../src/main.py)                              | `--scene` / `--image` / `--use-attributes` / `--all-scenes-attributes` / `--classifier` / `--clip-checkpoint`；展示推荐理由与特征重要性 |
| API 服务           | [api.py](../src/api.py)                                | Flask，`/health`、`/scenes`、`/recommend/by_scene`、`/recommend/by_scene_attributes`、`/recommend/by_image`                       |

### 1.3 场景属性层

为了避免后续场景类别扩展时过度依赖固定场景标签和手工 prompt，引入了可扩展的「场景属性层」。

| 组件             | 说明                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------- |
| 属性维度         | 9 个：arousal, socialness, focus, relaxation, nature, urban, night, openness, warmth        |
| 原型场景         | 5 个（cafe/gym/study_room/night_street/mountain），不作为最终类别，仅作为属性空间中的原型点 |
| 属性 → 音乐目标 | 线性加权映射公式，自动生成 energy/valence/tempo/acousticness/instrumentalness/danceability  |
| 属性 → 流派先验 | 6 个流派的加权先验分数，自动筛选 Top-N preferred genres                                     |
| 属性 → 容差     | 自适应公式，根据属性值动态调整特征过滤容差                                                  |
| 属性 → 排序权重 | 根据 socialness/urban/night 自适应调整 genre_match / feature_similarity / popularity 权重   |
| 属性 → 特征重要性 | 根据属性偏离中性值的程度自动生成 6 个音乐特征权重，用于加权余弦排序                         |
| 原型匹配         | 余弦相似度最近邻匹配，Top-2 原型场景用于解释和展示                                          |
| 属性 prompt      | 每属性 3 条正向 + 3 条反向 prompt，用于后续 CLIP 属性打分                                   |

核心思想：

- 真正的稳定中间表示不是单一场景标签，而是连续属性向量
- 图片 → 属性向量 → 音乐目标，而不是 图片 → 场景标签 → 写死的目标特征
- 新增场景只需定义属性向量，无需重写完整配置

### 1.4 视觉场景识别

| 组件                | 说明                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| 架构                | `BaseSceneClassifier` 抽象基类，支持多实现                           |
| MockClassifier      | 基于 HSV 颜色统计，仅用于链路调试                                      |
| CLIPSceneClassifier | `ViT-B-32` + `laion2b_s34b_b79k` 本地权重                          |
| 权重加载            | 完全本地化，不依赖 Hugging Face 在线下载                               |
| 默认路径            | `models/clip/ViT-B-32-laion2b_s34b_b79k/open_clip_pytorch_model.bin` |
| 多 prompt 集成      | 每场景 3 句描述性 prompt，取 max 相似度作为场景得分                    |

### 1.5 评测工具

| 工具                                                                 | 说明                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| [batch_clip_stability_test.py](../scripts/batch_clip_stability_test.py) | 进程内一次加载模型，逐张推理，自动落盘 JSON + CSV 报告  |
| [scene_overlap_evaluation.py](../scripts/scene_overlap_evaluation.py) | 新旧链路对比评测：重叠矩阵、每场景质量摘要、特征中心距离、同场景漂移 |
| 输出                                                                 | `reports/{classifier}_stability_test.json` + `.csv`；`reports/scene_overlap_comparison.json` + `.csv` |

### 1.6 推荐系统优化进展（已完成）

围绕「属性层推荐质量是否优于旧版手工配置」这一核心问题，已经完成一轮针对推荐引擎的实质性优化。

| 优化项 | 状态 | 说明 |
| ---- | ---- | ---- |
| 流派软分数接入排序层 | ✅ | 将 `genre_priors` 从属性层完整传入 ranker，不再只保留 top-N 二值流派列表 |
| 加权特征相似度 | ✅ | 用 `feature_importance` 替代 6 维等权余弦，使不同场景对 energy/acousticness/instrumentalness/tempo 等的敏感度不同 |
| 软打分召回 | ✅ | 新增指数衰减召回 `exp(-dist/tol)`，替代“硬区间过滤 + 随机采样”的信息损失 |
| 推荐解释生成 | ✅ | 为属性层推荐输出 `recommendation_reason`，可直接用于 CLI/API/课程展示 |
| 评测脚本增强 | ✅ | 输出重叠矩阵之外的多样性、多场景分离度、同场景新旧链路漂移分析 |

### 1.7 推荐层实测结论

- 属性层链路已完成端到端验证，可正常输出：
  - `genre_priors`
  - `feature_importance`
  - `recommendation_reason`
  - Top-N 推荐结果
- 对 `cafe` 与 `study_room` 的 Top-5 对比测试中，**新版属性层链路重叠降至 0/5**
- 全场景 Top-10 重叠矩阵对比中，新旧链路的平均非对角重叠都较低（约 0.0053），说明当前两套链路都具备一定区分度；新版属性层的主要优势体现在：
  - 可解释性更强
  - 属性空间更稳定
  - 后续扩展新场景时维护成本更低

### 1.8 CLIP 识别实测结果（12/12 全量）

|              | mock（颜色统计） | CLIP（多 prompt）         |
| ------------ | ---------------- | ------------------------- |
| 准确率       | 8.3%（1/12）     | **91.67%（11/12）** |
| cafe         | 0/3              | 2/3                       |
| gym          | 1/3              | 3/3                       |
| study_room   | 0/2              | 2/2                       |
| night_street | 0/3              | 3/3                       |
| mountain     | 0/1              | 1/1                       |
| 单张耗时     | ~0.02s           | ~0.5s（加载后）           |

**结论：零样本 CLIP 在场景识别上已达到 91.67%。视觉识别能力已验证充分。**

### 1.9 文档

| 文档                                      | 说明                                                     |
| ----------------------------------------- | -------------------------------------------------------- |
| [proposal.md](proposal.md)                   | 项目总体构想                                             |
| [detailed_proposal.md](detailed_proposal.md) | 详细实现方案（含场景属性层设计）                         |
| [current_progress.md](current_progress.md)   | 本文档：进度总结与下一步规划                             |
| [structure.md](structure.md)                 | 项目架构文档（目录结构、系统架构图、数据流、双链路对比） |
| [structure_picture.md](structure_picture.md) | 架构图精简描述（供 AI 绘图使用）                         |
| [cf_datasets_evaluation.md](cf_datasets_evaluation.md) | 协同过滤可用开源数据集评估与选型总结                     |

---

## 二、关键反思

### 2.1 不要在 prompt 微调上花时间

之前尝试单独优化某几个场景的 prompt 词，结果是 mountain 调好了、cafe 又新错一张——本质是过拟合到 12 张测试集，没有泛化价值。

正确方向：**接受 90%+ 的零样本准确率，把注意力转移到推荐质量本身。**

### 2.2 从「固定场景标签」转向「可扩展属性层」

CLIP + 手工 prompt 的场景分类方式有以下长期风险：

- 语义边界依赖人工定义，类别一多维护成本激增
- prompt 容易对少量示例过拟合
- 场景标签不一定是推荐所需的最佳中间表示

因此引入场景属性层，将系统从「图片 → 固定场景标签 → 写死的推荐配置」升级为「图片 → 连续属性向量 → 公式驱动的推荐参数」，提升可扩展性。

### 2.3 项目真正的核心

```
图片 → CLIP → 场景/属性   ← 这一步已经够好
          ↓
      推荐系统              ← 这才是需要深挖的
```

当前双链路均已打通，并且推荐层第一轮优化已经落地。新版属性层链路不再只是“概念上更灵活”，而是已经具备以下实际优势：

- 流派偏好使用连续先验分数，而不是粗糙二值命中
- 特征相似度使用场景自适应权重，而不是固定 6 维等权
- 召回阶段由硬过滤升级为软打分 Top-K
- 输出层具备人类可读解释，可直接用于演示

因此，当前项目的主战场已经明确是：**继续提高推荐质量、丰富评测维度，并为后续混合推荐做准备。**

### 2.4 混合推荐是下一阶段自然方向

从推荐系统技术角度看，当前系统属于：

- 基于内容的推荐（Content-Based Filtering）
- 知识/规则驱动推荐（Knowledge-Based Recommendation）
- 多因子线性排序（Multi-Criteria Ranking）

它还**不是协同过滤系统**，因为目前没有用户-歌曲交互矩阵。

已经完成的结论性分析：

- 后续最值得引入的是**混合推荐（内容推荐 + 协同过滤）**
- 原计划优先考虑基于公开歌单/听歌数据构建 Item-CF
- 但由于当前网络条件不稳定、外部数据集尚未下载，协同过滤部分暂时停留在方案设计阶段，先继续做离线可推进的推荐质量优化

---

## 三、下一步规划

### 🔴 P0：继续增强推荐质量评测与人工 review

第一轮评测脚本已经完成，但仍需要更系统地判断“推荐是否真的合理”。

**具体任务：**

1. **对增强评测结果做人工解读**

   - 对 `scene_overlap_evaluation.py` 输出的质量摘要、特征距离矩阵、同场景漂移做逐场景分析
   - 重点检查 `cafe`、`study_room`、`mountain` 三类相对安静场景的合理性
2. **做 Top-5 / Top-10 人工 review**

   - 对每个场景新版属性层推荐做主观审查
   - 判断是否出现“分数高但听感不符合场景”的歌曲
3. **继续微调属性原型与映射权重**

   - 只在评测信号明确支持时才调 `scene_attributes.json`
   - 避免回到早期“围绕少量样本过拟合”的问题

### 🟡 P1：CLIP 输出属性分数

当前 CLIP 仍输出单一场景标签，然后通过原型查表获取属性向量。目标改为直接输出属性分数：

- CLIP 对 9 个属性逐一定向打分（正反 prompt 对比）
- 图片直接映射到属性向量，不再经过场景标签中转
- 原型场景仅用于最近邻解释，不作为必经节点

**收益：**

- 消除「场景标签分类错误 → 属性完全错误」的刚性传导
- 开放世界图片也能给出合理的属性估计
- 与属性层架构完全对齐

### 🟡 P2：classify() 输出全场景置信度

当前 `classify()` 只返回最佳场景。改为返回每个场景的得分：

```
cafe: 0.224, study_room: 0.213, mountain: 0.195, night_street: 0.190, gym: 0.178
```

**收益：**

- 可以取 Top-2 场景做混合召回
- 对课程报告，置信度分布比单一标签更有说服力
- 不需要改模型，只是返回值的扩展

### 🟡 P3：为混合推荐做离线准备

协同过滤模块尚未开始实现，当前主要限制是外部交互数据集尚未稳定下载。

**可以先做的准备：**

- 预留 `cf_score` 在排序层中的接入位置
- 设计统一的交互表结构（如 `user_id/playlist_id, song_id, weight`）
- 设计混合排序方案：`content_score + cf_score + popularity - diversity_penalty`
- 先完成代码结构设计，再等待后续下载公开数据集

### 🟡 P4：扩展测试数据集

**图片侧：**

- 当前 12 张，mountain 只有 1 张，study_room 只有 2 张
- 补全到每场景 5 张（共 25 张），让评测更有统计意义

**歌曲侧：**

- 当前只有 6 个流派（pop/rap/edm/r&b/rock/latin）
- 考虑引入更大数据集或补充流派（jazz、classical、ambient）
- 对于 cafe/study_room 这类安静场景，缺少 jazz/classical/ambient 会限制推荐质量

### 🟢 P5：课程演示准备

1. **Flask API 完整测试**

   - 确认 `/recommend/by_image` 和 `/recommend/by_scene_attributes` 在真实环境中稳定运行
   - 添加请求日志与错误处理
2. **演示流程设计**

   - 准备 3-5 张有代表性的场景图片
   - 对每张图展示：原图 → 场景识别 → 属性分析 → 推荐歌曲列表
   - 同时展示新旧链路对比，突出属性层的可解释性优势
3. **可选：简单前端**

   - 一个 HTML 页面，上传图片 → 展示结果
   - 可用 Flask 模板渲染，不引入额外前端框架

### ⚪ P6：可选扩展

- 扩展场景类型（sunset、rainy_city、forest、subway）
- 引入多模态推荐（图片特征 + 歌曲音频特征直接匹配）
- 用户反馈闭环（"这首歌不适合这个场景"→ 调整排序参数）
- 推荐结果可视化（雷达图、场景匹配度仪表盘）
- 将映射权重从代码移至配置文件（attribute_music_mapping.json）

---

## 四、建议执行顺序

| 优先级 | 任务                                     | 预计产出                                       |
| ------ | ---------------------------------------- | ---------------------------------------------- |
| P0     | 增强评测结果解读 + 人工 review           | 推荐合理性结论 + 下一轮调参方向                |
| P1     | CLIP 直接输出属性分数                    | 端到端属性层视觉输入                           |
| P2     | classify() 输出全场景置信度              | Top-N 场景分布 + Top-2 场景混合推荐基础        |
| P3     | 为混合推荐预留代码结构                   | `cf_score` 接口 + 混合排序方案                 |
| P4     | 补全测试集与补充流派                     | 更稳健的评测基线                               |
| P5     | Flask API 演示 + 报告材料                | 可展示的完整链路                               |

---

*最后更新：2026-05-03*

---

## 五、最近一次阶段性成果（2026-05-03）

### 5.1 已完成代码改动

本轮已完成的核心代码修改如下：

1. **排序层**

   - `ranker.py` 支持 `genre_priors` 软分数
   - `ranker.py` 支持带 `feature_weights` 的加权余弦相似度
   - 输出 `song_id`，便于评测脚本直接做重叠分析
   - 新增 `generate_recommendation_reason()`，生成可读的推荐理由
2. **属性层**

   - `attribute_mapper.py` 新增 `get_feature_importance()`
   - `build_attribute_profile()` 现在会返回 `feature_importance`
3. **召回层**

   - `recall.py` 新增 `recall_by_feature_scoring()`
   - 属性链路已改为使用软打分召回
4. **推荐编排层**

   - `recommender.py` 已将 `genre_priors`、`feature_importance`、`recommendation_reason` 接入完整返回结果
5. **CLI**

   - `main.py` 已展示推荐理由和特征重要性
6. **评测脚本**

   - `scene_overlap_evaluation.py` 已支持：
     - 场景间重叠矩阵
     - 每场景质量摘要
     - 场景特征中心距离矩阵
     - 同场景新旧链路漂移分析

### 5.2 当前关键结论

- 推荐系统已从“能跑通”进入“可解释地优化推荐质量”的阶段
- 新版属性层链路已具备足够稳定的工程形态，可继续迭代
- 协同过滤/混合推荐已经确定为后续方向，但当前先不依赖外部数据下载推进

### 5.3 当前最合理的短期路线

1. 继续利用现有数据完成推荐质量分析与调参
2. 扩展视觉侧输出，使图像输入更适合属性层
3. 为未来的混合推荐预留结构
4. 等网络稳定后，再接入外部协同过滤数据集
