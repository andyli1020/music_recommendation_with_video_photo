export type SceneKey =
  | "cafe"
  | "study_room"
  | "gym"
  | "night_street"
  | "mountain"

export type NumericRecord = Record<string, number>

export interface SceneSummary {
  name: SceneKey
  description: string
  preferred_genres: string[]
  recommended_features: NumericRecord
  attribute_scores: NumericRecord
}

export interface ScenesResponse {
  count: number
  scenes: SceneSummary[]
}

export interface AttributeSummaryItem {
  attribute: string
  description: string
  music_effect_hint: string
  score: number
}

export interface PrototypeMatch {
  description: string
  prototype_tags: string[]
  scene: SceneKey
  similarity: number
}

export interface Recommendation {
  acousticness: number
  artist: string
  danceability: number
  energy: number
  feature_sim: number
  final_score: number
  genre: string
  genre_match: number
  instrumentalness: number
  popularity: number
  rank: number
  subgenre: string
  tempo: number
  title: string
  valence: number
}

export interface SceneRecommendationResponse {
  source_scene: SceneKey
  attribute_scores: NumericRecord
  attribute_summary: AttributeSummaryItem[]
  genre_priors: NumericRecord
  music_targets: NumericRecord
  prototype_matches: PrototypeMatch[]
  count: number
  recommendations: Recommendation[]
}

export interface ImageRecommendationResponse {
  scene: SceneKey
  confidence: number
  model: string
  count: number
  recommendations: Recommendation[]
  fallback_reason?: string
  use_attributes?: boolean
  attribute_scores?: NumericRecord
  attribute_summary?: AttributeSummaryItem[]
  prototype_matches?: PrototypeMatch[]
  preferred_genres?: string[]
  music_targets?: NumericRecord
}
