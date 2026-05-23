import pandas as pd

from config import NUMERIC_FEATURES, PROCESSED_SONGS_CSV, STANDARD_COLUMNS


RENAME_MAP = {
    "track_id": "song_id",
    "track_name": "title",
    "track_artist": "artist",
    "playlist_genre": "genre",
    "playlist_subgenre": "subgenre",
    "track_popularity": "popularity",
}


def preprocess_songs(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Convert the raw Spotify dataset into a smaller standardized song table."""
    df = raw_df.rename(columns=RENAME_MAP).copy()

    required_columns = [
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
    ]
    df = df[required_columns]

    df["genre"] = df["genre"].fillna("unknown").str.strip().str.lower()
    df["subgenre"] = df["subgenre"].fillna("unknown").str.strip().str.lower()
    df["title"] = df["title"].fillna("unknown").str.strip()
    df["artist"] = df["artist"].fillna("unknown").str.strip()

    for column in NUMERIC_FEATURES:
        df[column] = pd.to_numeric(df[column], errors="coerce")
        df[column] = df[column].fillna(df[column].median())

    df = df.drop_duplicates(subset=["song_id"]).reset_index(drop=True)

    tempo_min = df["tempo"].min()
    tempo_max = df["tempo"].max()
    if tempo_max == tempo_min:
        df["tempo_norm"] = 0.0
    else:
        df["tempo_norm"] = (df["tempo"] - tempo_min) / (tempo_max - tempo_min)

    return df[STANDARD_COLUMNS].sort_values(by="popularity", ascending=False).reset_index(drop=True)


def save_processed_songs(df: pd.DataFrame, output_path=PROCESSED_SONGS_CSV) -> None:
    """Save processed songs to a CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
