from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ROOT = PROJECT_ROOT / "outputs" / "agent-demo-gif"
MANIFEST_PATH = OUTPUT_ROOT / "frame-manifest.json"
GIF_PATH = OUTPUT_ROOT / "music-recommendation-demo.gif"

MAX_WIDTH = 1200


def fit_frame(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    if image.width <= MAX_WIDTH:
        return image

    target_height = round(image.height * (MAX_WIDTH / image.width))
    return image.resize((MAX_WIDTH, target_height), Image.Resampling.LANCZOS)


def to_palette(image: Image.Image) -> Image.Image:
    return image.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)


def build_gif() -> Path:
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    frame_items = manifest.get("frames", [])
    if not frame_items:
        raise ValueError("No frames found in manifest")

    prepared_frames = []
    durations = []
    for item in frame_items:
        image_path = Path(item["path"])
        if not image_path.exists():
            raise FileNotFoundError(f"Frame not found: {image_path}")

        with Image.open(image_path) as image:
            prepared_frames.append(to_palette(fit_frame(image)))
        durations.append(int(item.get("duration_ms", 900)))

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    first, *rest = prepared_frames
    first.save(
        GIF_PATH,
        save_all=True,
        append_images=rest,
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )
    return GIF_PATH


if __name__ == "__main__":
    output_path = build_gif()
    print(f"GIF written to: {output_path}")
