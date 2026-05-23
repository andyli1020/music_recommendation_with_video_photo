import pandas as pd

from config import RAW_SPOTIFY_CSV


def load_sample_spotify_data(csv_path=RAW_SPOTIFY_CSV) -> pd.DataFrame:
    """Load the sample Spotify dataset from disk."""
    return pd.read_csv(csv_path)
