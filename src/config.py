from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
SAMPLE_SPOTIFY_DIR = DATA_DIR / "sample_spotify"
RAW_SPOTIFY_CSV = SAMPLE_SPOTIFY_DIR / "spotify_songs.csv"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
PROCESSED_SONGS_CSV = PROCESSED_DATA_DIR / "songs_processed.csv"
CONFIGS_DIR = PROJECT_ROOT / "configs"
SCENE_PROFILES_JSON = CONFIGS_DIR / "scene_profiles.json"
CLIP_MODELS_DIR = MODELS_DIR / "clip"
DEFAULT_CLIP_MODEL_NAME = "ViT-B-32"
DEFAULT_CLIP_PRETRAINED_TAG = "laion2b_s34b_b79k"
DEFAULT_CLIP_CHECKPOINT = (
    CLIP_MODELS_DIR
    / "ViT-B-32-laion2b_s34b_b79k"
    / "open_clip_pytorch_model.bin"
)

DEFAULT_TOP_K = 10
RECALL_CANDIDATE_POOL_SIZE = 100

FEATURE_KEYS = [
    "danceability",
    "energy",
    "acousticness",
    "instrumentalness",
    "valence",
    "tempo_norm",
]

NUMERIC_FEATURES = [
    "danceability",
    "energy",
    "acousticness",
    "instrumentalness",
    "valence",
    "tempo",
    "popularity",
]

STANDARD_COLUMNS = [
    "song_id",
    "title",
    "artist",
    "genre",
    "subgenre",
    "popularity",
    "danceability",
    "energy",
    "acousticness",
    "instrumentalness",
    "valence",
    "tempo",
    "tempo_norm",
]
