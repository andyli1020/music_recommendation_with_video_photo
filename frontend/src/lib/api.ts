import type {
  ImageRecommendationResponse,
  SceneKey,
  SceneRecommendationResponse,
  ScenesResponse,
} from "@/lib/types"

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init)
  const data = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(data.error ?? "请求失败，请稍后再试。")
  }

  if (typeof data === "object" && data !== null && "error" in data && data.error) {
    throw new Error(data.error)
  }

  return data as T
}

export function fetchScenes() {
  return readJson<ScenesResponse>("/scenes")
}

export function fetchSceneRecommendation(scene: SceneKey, topK = 10) {
  return readJson<SceneRecommendationResponse>("/recommend/by_scene_attributes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scene,
      top_k: topK,
    }),
  })
}

export function inferSceneFromImage(file: File, topK = 10) {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("classifier", "clip")
  formData.append("use_attributes", "true")
  formData.append("top_k", String(topK))

  return readJson<ImageRecommendationResponse>("/recommend/by_image", {
    method: "POST",
    body: formData,
  })
}
