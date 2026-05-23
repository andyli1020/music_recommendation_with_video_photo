# 系统架构图（供 AI 绘图的精简描述）

---

## 整体结构：6 层自上而下，数据从顶层流向底层

---

### 第 1 层：输入层

支持三种输入模式：
- 模式 A：场景标签（例如 --scene cafe）
- 模式 B：图片上传（例如 --image cafe.jpg）
- 模式 C：属性分数（POST attribute_scores）

↓ 数据向下流入

---

### 第 2 层：场景理解层

本层包含两个并列子模块：

**子模块 A：视觉分类器**
- MockClassifier（HSV 颜色统计，仅用于调试，准确率 8.3%）
- CLIPSceneClassifier（ViT-B-32 模型，多 prompt 集成，准确率 91.67%）

**子模块 B：属性映射器（attribute_mapper.py）**
- 读取配置文件 scene_attributes.json
- 包含 9 个属性维度定义
- 包含 5 个原型场景的属性向量
- 属性到音乐目标的映射规则
- 属性到流派先验的映射规则
- 原型场景匹配逻辑

**本层有两条并行链路：**
- 旧版链路：图片 → 场景标签 → scene_profiles.json → 音乐目标特征
- 新版链路：图片 → 场景标签 → scene_attributes.json → 属性向量 → 音乐目标特征

↓ 数据向下流入

---

### 第 3 层：推荐引擎层

本层为流水线结构，包含三个串联模块：

**模块 1：recall.py（候选召回）**
- 步骤 ①：按流派筛选
- 步骤 ②：按特征容差过滤
- 步骤 ③：候选池随机采样（pool_size=100）

**模块 2：ranker.py（多因子排序）**
- 步骤 ①：余弦相似度计算
- 步骤 ②：流派匹配打分
- 步骤 ③：流行度归一化
- 步骤 ④：多样性惩罚（贪心重排）

**模块 3：recommender.py（推荐编排）**
- recommend() 旧版链路入口
- recommend_by_attributes() 属性层链路入口
- recommend_by_image() 图片推荐入口

数据流向：recall → ranker → recommender → 输出

↓ 数据向下流入

---

### 第 4 层：音乐特征层

数据源：spotify_songs.csv（28,356 首去重歌曲）

每首歌曲包含字段：
- 标识字段：song_id, title, artist, genre, subgenre
- 音频特征：danceability, energy, acousticness, instrumentalness
- 情感特征：valence
- 节奏特征：tempo, tempo_norm
- 热度：popularity

流派分布（6 类）：pop, rap, edm, r&b, rock, latin

↓ 数据向下流入

---

### 第 5 层：服务与展示层

**CLI 命令行入口：python src/main.py**
- --scene：按场景标签推荐
- --image：按图片推荐
- --use-attributes：启用属性层链路（新功能）
- --all-scenes-attributes：全场景属性层对比（新功能）
- --classifier：指定分类器（clip 或 mock）
- --top_k：返回推荐数量

**Flask API 服务：python src/api.py**
- GET  /health：健康检查
- GET  /scenes：场景列表（含属性分数）
- POST /recommend/by_scene：旧版场景推荐
- POST /recommend/by_scene_attributes：属性层场景推荐（新功能）
- POST /recommend/by_image：图片推荐（支持 use_attributes 参数）

---

## 补充说明（供绘图参考）

### 数据流向（整体）

```
输入层 → 场景理解层 → 推荐引擎层 → 音乐特征层 → 服务与展示层
```

### 双链路对比

- 旧版链路（默认）：依赖手工配置的 scene_profiles.json，每个场景需手动指定流派、目标特征、容差、排序权重
- 新版链路（use-attributes 启用）：依赖 scene_attributes.json 中的属性向量，流派/特征/容差/权重均由属性公式自动生成

### 模块依赖关系

- scene_mapper.py（旧版）和 attribute_mapper.py（新版）是平行的中间层模块
- recall.py 和 ranker.py 为两条链路共用
- recommender.py 通过不同函数入口区分两条链路
- 视觉分类器（scene_classifier.py）在图片输入时被调用，输出场景标签供两条链路使用

### 技术栈

Python 3.12, Flask, PyTorch, OpenCLIP (ViT-B-32), pandas, numpy, Pillow
