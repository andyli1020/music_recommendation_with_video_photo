from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

from config import DEFAULT_CLIP_CHECKPOINT, DEFAULT_CLIP_MODEL_NAME, DEFAULT_CLIP_PRETRAINED_TAG, PROJECT_ROOT
from scene_mapper import list_scenes


class BaseSceneClassifier(ABC):
    @abstractmethod
    def classify(self, image_path: str) -> tuple[str, float]:
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass


class MockSceneClassifier(BaseSceneClassifier):
    SCENE_COLOR_PROFILES = {
        "cafe": {
            "hue_mean": (15, 50),
            "sat_pct": (15, 55),
            "val_pct": (30, 70),
        },
        "gym": {
            "hue_mean": (50, 150),
            "sat_pct": (20, 65),
            "val_pct": (40, 85),
        },
        "study_room": {
            "hue_mean": (20, 55),
            "sat_pct": (8, 40),
            "val_pct": (25, 60),
        },
        "night_street": {
            "hue_mean": (170, 260),
            "sat_pct": (30, 80),
            "val_pct": (10, 45),
        },
        "mountain": {
            "hue_mean": (80, 190),
            "sat_pct": (25, 70),
            "val_pct": (40, 80),
        },
    }

    @property
    def model_name(self) -> str:
        return "mock(基于图像颜色统计)"

    def _extract_color_stats(self, image: Image.Image) -> dict:
        img = image.resize((128, 128)).convert("HSV")
        arr = np.array(img, dtype=np.float32)
        h = arr[:, :, 0]
        s = arr[:, :, 1]
        v = arr[:, :, 2]
        return {
            "hue_mean": float(np.mean(h)),
            "sat_pct": float(np.mean(s)) / 255.0 * 100.0,
            "val_pct": float(np.mean(v)) / 255.0 * 100.0,
        }

    def _score_scene(self, stats: dict, scene: str) -> float:
        profile = self.SCENE_COLOR_PROFILES[scene]
        score = 0.0
        channels = ["hue_mean", "sat_pct", "val_pct"]
        for channel in channels:
            lo, hi = profile[channel]
            center = (lo + hi) / 2.0
            half_range = (hi - lo) / 2.0 or 1.0
            dist = abs(stats[channel] - center) / half_range
            score -= dist
        return float(score)

    def classify(self, image_path: str) -> tuple[str, float]:
        with open(PROJECT_ROOT / "debug_mock_classify.txt", "a") as df:
            df.write(f"MOCK_CLASSIFY_CALLED_V2 image={image_path}\n")
        image = Image.open(image_path).convert("RGB")
        stats = self._extract_color_stats(image)

        scores = {}
        for scene in list_scenes():
            scores[scene] = self._score_scene(stats, scene)

        best_scene = max(scores, key=scores.get)
        best_score = scores[best_scene]
        sorted_scores = sorted(scores.values(), reverse=True)
        top = sorted_scores[0]
        second = sorted_scores[1] if len(sorted_scores) > 1 else top
        margin = top - second
        confidence = 0.50 + 0.45 * min(abs(margin) / 3.0, 1.0)
        confidence = min(confidence, 0.95)
        confidence = max(confidence, 0.50)

        return best_scene, round(confidence, 4)


SCENE_PROMPT_TEMPLATES = {
    "cafe": [
        "a cozy cafe interior with warm lighting, coffee cups, and espresso machine",
        "a coffee shop with people drinking coffee, relaxing, and working on laptops",
        "an indoor cafe with barista counter, menu board, and pastries",
    ],
    "gym": [
        "a gym interior with exercise equipment, weights, and treadmills",
        "a fitness center with workout machines, barbells, and bright lights",
        "an indoor sports gymnasium with basketball hoops and wooden floor",
    ],
    "study_room": [
        "a quiet library reading room with tall bookshelves, reading desks, and lamps",
        "a study room with stacked books, notebooks, and reading atmosphere",
        "a university library hall with students studying silently at desks",
    ],
    "night_street": [
        "a city street at night with neon signs, streetlights, and reflections",
        "an urban street scene after dark with glowing windows and traffic",
        "a downtown night photography with illuminated buildings and wet pavement",
    ],
    "mountain": [
        "a wide mountain landscape with peaks, valleys, and rocky terrain",
        "a scenic mountain view with trees, hiking trails, and distant summits",
        "an outdoor mountain nature scene with dramatic ridges and sky",
    ],
}


class CLIPSceneClassifier(BaseSceneClassifier):
    def __init__(
        self,
        model_name: str = DEFAULT_CLIP_MODEL_NAME,
        pretrained: str = DEFAULT_CLIP_PRETRAINED_TAG,
        checkpoint_path: Optional[str] = None,
        require_local: bool = True,
    ):
        self._model_name = model_name
        self._pretrained = pretrained
        self._checkpoint_path = self._resolve_checkpoint_path(checkpoint_path)
        self._require_local = require_local
        self._model = None
        self._tokenizer = None
        self._scene_prompts = {
            scene: list(prompts)
            for scene, prompts in SCENE_PROMPT_TEMPLATES.items()
        }

    def _resolve_checkpoint_path(self, checkpoint_path: Optional[str]) -> Optional[Path]:
        candidate = Path(checkpoint_path) if checkpoint_path else DEFAULT_CLIP_CHECKPOINT
        return candidate.expanduser().resolve()

    @property
    def model_name(self) -> str:
        if self._checkpoint_path:
            return f"CLIP({self._model_name}, local={self._checkpoint_path.name}, multi-prompt)"
        return f"CLIP({self._model_name}, multi-prompt)"

    def _lazy_load(self):
        if self._model is not None:
            return
        try:
            import open_clip
        except ImportError:
            raise ImportError(
                "CLIP 模型需要 open_clip_torch 库。请运行:\n"
                "  pip install open-clip-torch\n"
                "安装后重试。当前可使用 MockSceneClassifier 替代。"
            )
        if self._require_local and not self._checkpoint_path.is_file():
            raise FileNotFoundError(
                "未找到本地 CLIP 权重文件。\n"
                f"期望路径: {self._checkpoint_path}\n"
                "请先下载权重到该路径，或在命令行中通过 --clip-checkpoint 显式指定。"
            )

        pretrained_source = (
            str(self._checkpoint_path)
            if self._checkpoint_path and self._checkpoint_path.is_file()
            else self._pretrained
        )
        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            self._model_name,
            pretrained=pretrained_source,
        )
        self._tokenizer = open_clip.get_tokenizer(self._model_name)
        self._model.eval()

    def classify(self, image_path: str) -> tuple[str, float]:
        self._lazy_load()
        image = Image.open(image_path).convert("RGB")
        image_input = self._preprocess(image).unsqueeze(0)

        scenes = list(self._scene_prompts.keys())
        all_prompts: list[str] = []
        scene_boundaries: list[tuple[int, int]] = []
        offset = 0
        for scene in scenes:
            prompts = self._scene_prompts[scene]
            all_prompts.extend(prompts)
            scene_boundaries.append((offset, offset + len(prompts)))
            offset += len(prompts)

        text_tokens = self._tokenizer(all_prompts)

        import torch

        with torch.no_grad():
            image_features = self._model.encode_image(image_input)
            text_features = self._model.encode_text(text_tokens)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            similarities = (image_features @ text_features.T).squeeze(0)

        scene_scores = {}
        for scene, (start, end) in zip(scenes, scene_boundaries):
            scene_scores[scene] = float(similarities[start:end].max().item())

        best_scene = max(scene_scores, key=scene_scores.get)
        softmax_scores = torch.softmax(torch.tensor(list(scene_scores.values())), dim=0)
        best_idx = scenes.index(best_scene)
        confidence = float(softmax_scores[best_idx].item())

        return best_scene, round(confidence, 4)


def get_scene_classifier(
    prefer: Optional[str] = None,
    clip_checkpoint_path: Optional[str] = None,
) -> BaseSceneClassifier:
    if prefer == "mock":
        return MockSceneClassifier()

    if prefer == "clip":
        return CLIPSceneClassifier(checkpoint_path=clip_checkpoint_path, require_local=True)

    try:
        with open(PROJECT_ROOT / "debug_auto_path.txt", "a") as df:
            df.write("AUTO_PATH_ATTEMPTING_CLIP\n")
        cls = CLIPSceneClassifier(checkpoint_path=clip_checkpoint_path, require_local=True)
        cls._lazy_load()
        cls._fallback_reason = None
        with open(PROJECT_ROOT / "debug_auto_path.txt", "a") as df:
            df.write("AUTO_PATH_CLIP_SUCCESS\n")
        return cls
    except (ImportError, Exception) as exc:
        import traceback
        with open(PROJECT_ROOT / "debug_auto_path.txt", "a") as df:
            df.write(f"AUTO_PATH_CLIP_FAILED: {exc}\n{traceback.format_exc()}\n")
        fallback = MockSceneClassifier()
        fallback._fallback_reason = (
            f"CLIP 模型加载失败，已自动回退到 {fallback.model_name}。"
            f"原因: {exc}。"
            f"请安装 open-clip-torch 并确认权重文件存在后重试，"
            f"或通过 classifier=clip 强制使用 CLIP。"
        )
        return fallback
