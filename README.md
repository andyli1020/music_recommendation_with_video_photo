<div align="center">

<img src="frontend/public/favicon.svg" alt="视界伴音" width="80" />

# 视界伴音 · Immersive Scene-to-Music Explorer

**视觉场景感知 × 智能音乐推荐 × 沉浸式数据叙事**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![CLIP](https://img.shields.io/badge/CLIP-OpenAI-412991?style=flat-square&logo=openai&logoColor=white)](https://github.com/mlfoundations/open_clip)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

<br />

> 🎵 上传一张照片，让 AI 读懂你所在的空间，然后为你推荐一段刚刚好的音乐。
>
> ☕ 咖啡厅的松弛、🏋️ 健身房的爆发、📚 书房的专注、🌃 夜街的霓虹、⛰️ 山野的呼吸——五种场景，五组声景。

<br />

---

## ✨ 项目预览

<div align="center">

### 🏠 场景探索主页

<p>
  <em>（截图占位 — 运行项目后截图替换此处）</em>
  <br />
  <sub>按场景卡片切换 → 左侧展示推荐结果 + 右侧展示音乐特征雷达图与流派分布</sub>
</p>

<br />

### 📊 音乐特征雷达图 & 流派分布

<p>
  <em>（截图占位 — 运行项目后截图替换此处）</em>
  <br />
  <sub>ECharts 交互式图表：energy · danceability · valence · acousticness · instrumentalness</sub>
</p>

<br />

### 🖼️ 图片上传 & AI 场景识别

<p>
  <em>（截图占位 — 运行项目后截图替换此处）</em>
  <br />
  <sub>拖拽或点击上传 → CLIP / Mock 分类器推断场景 → 即时推荐</sub>
</p>

</div>

> 💡 **添加真实截图的方法**：启动项目后访问 `http://127.0.0.1:5000`，截取上述三个页面的屏幕截图，上传到仓库 `doc/screenshots/` 目录，然后将上面的 `（截图占位 …）` 替换为 `![描述](doc/screenshots/xxx.png)` 即可。

---

## 🎯 核心亮点

| 🌐 | |
|:---:|---|
| **多模态场景感知** | 支持 CLIP 视觉模型 + 色彩统计双重分类路径，上传图片即可自动识别场景 |
| **双层推荐引擎** | 场景层（规则 + 特征匹配）+ 属性层（9 维场景属性向量），两条链路互补 |
| **沉浸式前端** | React 19 + Tailwind CSS 4 + ECharts + GSAP 动画，暗色主题专业数据叙事 |
| **一键分享** | 生成纯静态分享页，不依赖后端，可部署到 GitHub Pages |
| **跨平台兼容** | 路径使用 `pathlib.Path` 构建，Windows / macOS / Linux 统一运行 |

---

## 🧱 技术架构

```
┌────────────────────────────────────────────────────────┐
│                    前端 (React 19)                      │
│  场景卡片 · 上传拖拽 · 雷达图 · 流派分布 · 动画叙事      │
│  Tailwind CSS + ECharts + GSAP + Lucide Icons          │
└──────────────────────┬─────────────────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼─────────────────────────────────┐
│                  Flask API Server                       │
│  /scenes · /recommend/by_scene · /recommend/by_image    │
│  /recommend/by_scene_attributes · /health               │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│                  推荐引擎 (Python)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ 召回层   │  │ 排序层   │  │ 场景 → 特征映射       │  │
│  │ recall   │→ │ ranker   │  │ scene_mapper          │  │
│  │ 流派筛选  │  │ 加权打分  │  │ 偏好流派 / 目标音色    │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              视觉场景分类器                        │  │
│  │  CLIPSceneClassifier  ←→  MockSceneClassifier     │  │
│  │  (open_clip ViT-B-32)     (色彩直方图匹配)         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## ⚡ 快速开始

### 1. 克隆 & 安装

```powershell
git clone <your-repo-url>
cd 01_music_recommendation

# 创建虚拟环境
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate     # macOS / Linux

# 安装依赖
pip install -r requirements.txt
```

### 2. 启动服务

```powershell
python src/api.py
```

打开浏览器访问 **http://127.0.0.1:5000** 即可看到完整前端页面。

### 3. 命令行推荐

```powershell
# 按场景推荐
python src/main.py --scene cafe --top_k 5

# 按图片推荐（使用 Mock 分类器）
python src/main.py --image data/test_images/cafe.jpg --classifier mock

# 按图片推荐（使用 CLIP 模型）
python src/main.py --image data/test_images/cafe.jpg --classifier clip
```

---

## 🔌 API 接口

### 场景列表

```http
GET /scenes
```

### 场景推荐

```http
POST /recommend/by_scene
Content-Type: application/json

{ "scene": "cafe", "top_k": 5 }
```

### 属性层推荐

```http
POST /recommend/by_scene_attributes
Content-Type: application/json

{ "scene": "gym", "top_k": 5 }
```

### 图片推荐

```http
POST /recommend/by_image
Content-Type: multipart/form-data

image: <file>
top_k: 5
classifier: auto | clip | mock
use_attributes: true | false
```

---

## 📁 目录结构

```text
01_music_recommendation/
├── configs/                    场景 & 属性 JSON 配置
├── data/
│   ├── sample_spotify/         Spotify 歌曲数据集 (≈30K)
│   ├── test_images/            示例测试图片
│   └── test_images_real/       真实场景照片
├── doc/                        项目文档 & 架构图
├── frontend/                   React 前端项目
│   ├── src/
│   │   ├── components/ui/      shadcn/ui 组件
│   │   ├── lib/                API 客户端 & 类型定义
│   │   └── App.tsx             主页面（含数据可视化）
│   └── public/scenes/          场景插图
├── reports/                    分析报告 & 可视化
├── scripts/                    构建、评估、启动脚本
├── share/                      纯静态分享版
└── src/                        后端核心
    ├── api.py                  Flask API 入口
    ├── recommender.py          推荐主逻辑
    ├── recall.py / ranker.py   召回 & 排序
    ├── scene_mapper.py         场景 → 音乐特征映射
    └── vision/                 视觉场景分类器
```

---

## 🎨 视觉设计

前端基于 **深色科幻主题**，采用 okLCH 色彩空间构建统一的暗色调色板：

- `Space Grotesk` + `Manrope` 字体组合
- GSAP 驱动的入场动画（卡片渐现、数据揭示）
- ECharts 雷达图 & 玫瑰图展示音乐特征
- `BorderBeam` / `GridPattern` / `BlurFade` 等微交互组件
- 拖拽上传 + 实时预览 + 置信度进度环

---

## 📊 支持的场景

| 场景 | 图标 | 氛围 | 偏好流派 | 音乐特征 |
|:---|:---:|:---|:---|:---|
| ☕ **咖啡厅** | `Coffee` | 柔和、温暖、轻社交 | pop, r&b | 中低声、高原声、慢节奏 |
| 🏋️ **健身房** | `Dumbbell` | 高能、快节奏、激励型 | edm, rap, rock | 高能量、快节奏、强律动 |
| 📚 **书房** | `LibraryBig` | 专注、克制、可持续 | r&b, pop, rock | 低能量、中高原声、稳定节奏 |
| 🌃 **夜街** | `MoonStar` | 霓虹、沉浸、冷感 | rap, r&b, pop | 中能量、强律动、低器乐感 |
| ⛰️ **山野** | `Mountain` | 开阔、呼吸感、向前 | rock, edm, pop | 中高能量、开放感、正向情绪 |

---

## 🚀 生成静态分享页

不依赖后端和 Python 环境，直接打开即可展示：

```powershell
python scripts/build_share_bundle.py
# 打开 share/index.html
```

适合：
- 发给非技术同事预览
- 部署到 GitHub Pages
- 会议演示

---

## ✅ 已验证路径

- [x] `src/main.py --scene cafe` — 命令行推荐
- [x] `src/api.py` — Flask API 启动
- [x] `GET /health` — 健康检查
- [x] `GET /scenes` — 场景列表
- [x] `POST /recommend/by_scene` — 场景推荐
- [x] `POST /recommend/by_image` — 图片推荐
- [x] 路径遍历安全防护
- [x] 前端 SPA 路由 & API 联调
- [x] 跨平台路径兼容（Windows / macOS / Linux）

---

## 🧭 后续计划

- [ ] 更多场景类别（酒吧、海滩、森林…）
- [ ] 用户反馈闭环（👍👎 优化推荐权重）
- [ ] Spotify Web API 集成（直接生成播放列表）
- [ ] 自动化测试 & CI/CD
- [ ] GitHub Pages 部署静态版

---

<div align="center">

**Built with ❤️ by the 视界伴音 team**

<sub>Python · Flask · React · TypeScript · Tailwind CSS · ECharts · CLIP</sub>

</div>
