import {
  type CSSProperties,
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type DragEvent,
} from "react"
import type { EChartsOption } from "echarts"
import { gsap } from "gsap"
import ReactECharts from "echarts-for-react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  BarChart3,
  BrainCircuit,
  Camera,
  CircleAlert,
  Coffee,
  Database,
  Disc3,
  Dumbbell,
  Gauge,
  ImageUp,
  Layers3,
  LibraryBig,
  ListMusic,
  LoaderCircle,
  Mountain,
  MoonStar,
  Music2,
  Network,
  Orbit,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Wand2,
} from "lucide-react"

import { fetchSceneRecommendation, fetchScenes, inferSceneFromImage } from "@/lib/api"
import type {
  AttributeSummaryItem,
  ImageRecommendationResponse,
  NumericRecord,
  Recommendation,
  SceneKey,
  SceneRecommendationResponse,
  SceneSummary,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GridPattern } from "@/components/ui/grid-pattern"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Separator } from "@/components/ui/separator"

type UploadContext = {
  confidence: number
  fallbackReason?: string
  fileName: string
  model: string
  previewUrl: string
}

type SceneMeta = {
  accent: string
  accentAlt: string
  blurb: string
  cue: string
  image: string
  imageClassName?: string
  label: string
  mood: string
  tags: string[]
  icon: ComponentType<{ className?: string }>
}

const SCENE_ORDER: SceneKey[] = [
  "cafe",
  "study_room",
  "gym",
  "night_street",
  "mountain",
]

const SCENE_META: Record<SceneKey, SceneMeta> = {
  cafe: {
    accent: "#f4c56f",
    accentAlt: "#f88f6b",
    image: "/scenes/cafe-muji.jpg",
    imageClassName: "object-[center_52%] scale-[1.03]",
    label: "咖啡厅",
    mood: "柔和、温暖、适合交谈与轻工作",
    blurb: "适合需要松弛感、都市氛围和温暖节奏的播放列表。",
    cue: "先把人放松下来，再慢慢把专注和社交感拉起来。",
    tags: ["暖光", "低压", "轻社交"],
    icon: Coffee,
  },
  study_room: {
    accent: "#8fd7ff",
    accentAlt: "#8ff0d2",
    image: "/scenes/study-room-library.jpg",
    imageClassName: "object-[center_44%]",
    label: "书房",
    mood: "专注、克制、适合沉入任务",
    blurb: "更安静的能量曲线，更适合长时间阅读、写作和思考。",
    cue: "压低噪点和情绪起伏，让注意力一直留在任务上。",
    tags: ["专注", "干净", "持续输出"],
    icon: LibraryBig,
  },
  gym: {
    accent: "#ff8c62",
    accentAlt: "#ffd166",
    image: "/scenes/gym-interior.jpg",
    imageClassName: "object-[center_40%] scale-[1.02]",
    label: "健身房",
    mood: "高唤醒、高冲击、推动身体节奏",
    blurb: "偏高能量、强律动和更直接的推进感。",
    cue: "把节拍和动能顶在前面，让身体先进入状态。",
    tags: ["高能", "推进", "出汗感"],
    icon: Dumbbell,
  },
  night_street: {
    accent: "#7ea8ff",
    accentAlt: "#bf8cff",
    image: "/scenes/night-dotonbori.jpg",
    imageClassName: "object-center scale-[1.01]",
    label: "夜街",
    mood: "霓虹、都市、带一点冷感和沉浸感",
    blurb: "更适合电子、另类和带有夜间空间感的声音选择。",
    cue: "保留一点冷空气和距离感，让情绪更有夜色纹理。",
    tags: ["霓虹", "冷调", "沉浸"],
    icon: MoonStar,
  },
  mountain: {
    accent: "#8fe38f",
    accentAlt: "#74d8c8",
    image: "/scenes/mountain-catoctin.jpg",
    imageClassName: "object-[center_58%] scale-[1.02]",
    label: "山野户外",
    mood: "开阔、透气、带自然呼吸感",
    blurb: "偏向自然、开阔和更有向前感的音乐轮廓。",
    cue: "让呼吸感和空间感先出现，像走进更大的空气里。",
    tags: ["开阔", "自然", "向前"],
    icon: Mountain,
  },
}

const ATTR_ORDER = [
  "arousal",
  "socialness",
  "focus",
  "relaxation",
  "nature",
  "urban",
  "night",
  "openness",
  "warmth",
]

const ATTR_LABELS: Record<string, string> = {
  arousal: "唤醒度",
  socialness: "社交感",
  focus: "专注度",
  relaxation: "放松感",
  nature: "自然感",
  urban: "都市感",
  night: "夜间感",
  openness: "开阔度",
  warmth: "温暖感",
}

const FEATURE_ORDER = [
  "energy",
  "danceability",
  "valence",
  "acousticness",
  "instrumentalness",
]

const FEATURE_LABELS: Record<string, string> = {
  energy: "能量",
  danceability: "律动",
  valence: "情绪亮度",
  acousticness: "原声感",
  instrumentalness: "器乐感",
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function App() {
  const pathname = window.location.pathname

  if (pathname === "/product-design" || pathname === "/requirements-design") {
    return <ProductDesignPage />
  }

  if (pathname === "/technology" || pathname === "/recommendation-tech") {
    return <TechnologyPage />
  }

  return <RecommendationApp />
}

function RecommendationApp() {
  const appRef = useRef<HTMLDivElement | null>(null)
  const insightsRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [scenes, setScenes] = useState<SceneSummary[]>([])
  const [selectedScene, setSelectedScene] = useState<SceneKey>("cafe")
  const [sceneResult, setSceneResult] = useState<SceneRecommendationResponse | null>(null)
  const [uploadContext, setUploadContext] = useState<UploadContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deferredSceneResult = useDeferredValue(sceneResult)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-shell-item]", {
        delay: 0.08,
        duration: 0.8,
        opacity: 0,
        y: 28,
        stagger: 0.06,
        ease: "power3.out",
      })
    }, appRef)

    return () => ctx.revert()
  }, [])

  const animateInsights = useEffectEvent(() => {
    if (!insightsRef.current) {
      return
    }

    gsap.fromTo(
      insightsRef.current.querySelectorAll("[data-reveal]"),
      {
        opacity: 0,
        y: 22,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.68,
        stagger: 0.05,
        ease: "power3.out",
        clearProps: "all",
      }
    )
  })

  useEffect(() => {
    if (deferredSceneResult) {
      animateInsights()
    }
  }, [animateInsights, deferredSceneResult])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        setLoading(true)
        const [sceneResponse, initialScene] = await Promise.all([
          fetchScenes(),
          fetchSceneRecommendation("cafe"),
        ])

        if (cancelled) {
          return
        }

        startTransition(() => {
          setScenes(sceneResponse.scenes)
          setSceneResult(initialScene)
          setSelectedScene("cafe")
        })
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(getErrorMessage(bootstrapError))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (uploadContext?.previewUrl) {
        URL.revokeObjectURL(uploadContext.previewUrl)
      }
    }
  }, [uploadContext?.previewUrl])

  async function loadScene(scene: SceneKey) {
    try {
      setLoading(true)
      setError(null)
      const nextScene = await fetchSceneRecommendation(scene)
      startTransition(() => {
        setSelectedScene(scene)
        setSceneResult(nextScene)
      })
    } catch (sceneError) {
      setError(getErrorMessage(sceneError))
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectScene(scene: SceneKey) {
    if (uploadContext?.previewUrl) {
      URL.revokeObjectURL(uploadContext.previewUrl)
    }
    setUploadContext(null)
    await loadScene(scene)
  }

  async function processImageFile(file: File) {
    const previewUrl = URL.createObjectURL(file)

    try {
      setUploading(true)
      setError(null)

      const imageResponse = await inferSceneFromImage(file)
      const sceneResponse = await fetchSceneRecommendation(imageResponse.scene)
      const mergedResponse = mergeImageResponse(sceneResponse, imageResponse)

      if (uploadContext?.previewUrl) {
        URL.revokeObjectURL(uploadContext.previewUrl)
      }

      startTransition(() => {
        setSelectedScene(imageResponse.scene)
        setSceneResult(mergedResponse)
        setUploadContext({
          confidence: imageResponse.confidence,
          fallbackReason: imageResponse.fallback_reason,
          fileName: file.name,
          model: imageResponse.model,
          previewUrl,
        })
      })
    } catch (imageError) {
      URL.revokeObjectURL(previewUrl)
      setError(getErrorMessage(imageError))
    } finally {
      setUploading(false)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    await processImageFile(file)
    event.target.value = ""
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragActive(false)
  }

  async function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }

    await processImageFile(file)
  }

  const sceneSummary = scenes.find((scene) => scene.name === selectedScene) ?? null
  const sceneMeta = SCENE_META[selectedScene]
  const SceneIcon = sceneMeta.icon
  const heroImage = sceneMeta.image
  const uploadPreviewImage = uploadContext?.previewUrl ?? null
  const topGenres = getTopGenres(deferredSceneResult?.genre_priors)
  const dominantAttribute = deferredSceneResult?.attribute_summary?.[0] ?? null
  const leadTracks = deferredSceneResult?.recommendations.slice(0, 5) ?? []
  const leadTrack = leadTracks[0] ?? null
  const allTracks = deferredSceneResult?.recommendations ?? []
  const prototypeMatches = deferredSceneResult?.prototype_matches.slice(0, 3) ?? []
  const confidenceLabel = getConfidenceLabel(uploadContext?.confidence ?? 0)
  const modelDisplayName = getModelDisplayName(uploadContext?.model)
  const sceneTheme = {
    "--scene-accent": sceneMeta.accent,
    "--scene-accent-alt": sceneMeta.accentAlt,
    "--scene-accent-soft": hexToRgba(sceneMeta.accent, 0.18),
    "--scene-accent-strong": hexToRgba(sceneMeta.accent, 0.28),
    "--scene-accent-alt-soft": hexToRgba(sceneMeta.accentAlt, 0.18),
    "--scene-outline": hexToRgba(sceneMeta.accent, 0.34),
    "--scene-shadow": hexToRgba(sceneMeta.accent, 0.16),
  } as CSSProperties

  return (
    <div ref={appRef} className="relative min-h-screen overflow-hidden" style={sceneTheme}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,9,0.92)_0%,rgba(6,9,8,0.98)_52%,rgba(4,6,5,1)_100%)]" />
        <div
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage: [
              `radial-gradient(circle at 14% 18%, ${hexToRgba(sceneMeta.accent, 0.24)}, transparent 24%)`,
              `radial-gradient(circle at 86% 12%, ${hexToRgba(sceneMeta.accentAlt, 0.2)}, transparent 26%)`,
              `radial-gradient(circle at 50% 100%, ${hexToRgba(sceneMeta.accent, 0.16)}, transparent 34%)`,
            ].join(","),
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-3 py-3 sm:px-5 sm:py-5">
        <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)_320px]">
          <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
            <Card
              data-shell-item
              className="overflow-hidden border-white/8 bg-[#0d1110]/90 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            >
              <CardContent className="relative p-5">
                <GridPattern
                  width={56}
                  height={56}
                  x={-1}
                  y={-1}
                  className="opacity-25 [mask-image:radial-gradient(circle_at_top_left,white,transparent_74%)]"
                />
                <div className="relative space-y-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 items-center justify-center rounded-2xl shadow-[0_0_40px_var(--scene-shadow)]"
                      style={{
                        backgroundColor: "var(--scene-accent-soft)",
                        color: "var(--scene-accent)",
                      }}
                    >
                      <Disc3 className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Scene Radio</div>
                      <div className="text-xs tracking-[0.22em] uppercase text-white/40">
                        Music Recommendation
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-white">
                      把场景做成一张正在播放的音乐界面
                    </h1>
                    <p className="text-sm leading-7 text-[#b5c2b8]">
                      先理解空间气质，再把匹配到的音乐偏好、风格和推荐结果组织成一段连续体验。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sceneMeta.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-white/10 bg-white/[0.04] text-white/78"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    <a
                      href="/technology"
                      className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-white/82 transition hover:border-emerald-300/24 hover:bg-emerald-300/8"
                    >
                      <span>了解推荐技术</span>
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </a>
                    <a
                      href="/product-design"
                      className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-white/82 transition hover:border-[#f1cf7a]/28 hover:bg-[#f1cf7a]/10"
                    >
                      <span>查看产品需求设计</span>
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric label="场景库" value={scenes.length} suffix="" />
                    <MiniMetric label="上传识别" value={uploadContext ? 1 : 0} suffix="" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-shell-item className="border-white/8 bg-[#111615]/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Scene Library</CardTitle>
                <CardDescription>
                  像挑选播放列表一样切换不同氛围。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SCENE_ORDER.map((scene) => {
                  const meta = SCENE_META[scene]
                  const Icon = meta.icon
                  const active = selectedScene === scene

                  return (
                    <button
                      key={scene}
                      type="button"
                      onClick={() => void handleSelectScene(scene)}
                      style={
                        active
                          ? {
                              borderColor: hexToRgba(meta.accent, 0.34),
                              background: `linear-gradient(135deg, ${hexToRgba(meta.accent, 0.16)}, rgba(255,255,255,0.04))`,
                              boxShadow: `0 18px 50px ${hexToRgba(meta.accent, 0.12)}`,
                            }
                          : undefined
                      }
                      className={cn(
                        "w-full rounded-[1.2rem] border px-4 py-3 text-left transition",
                        active
                          ? ""
                          : "border-white/7 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-black/20">
                          <img
                            src={meta.image}
                            alt={meta.label}
                            className={cn("h-full w-full object-cover", meta.imageClassName)}
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,7,0.08)_0%,rgba(5,9,7,0.7)_100%)]" />
                          <div
                            className="absolute bottom-2 left-2 flex size-8 items-center justify-center rounded-xl backdrop-blur-sm"
                            style={{
                              backgroundColor: active ? hexToRgba(meta.accent, 0.22) : "rgba(255,255,255,0.1)",
                              color: active ? meta.accent : "rgba(255,255,255,0.78)",
                            }}
                          >
                            <Icon className="size-4" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-white">{meta.label}</div>
                            {active ? (
                              <Badge
                                className="text-[#102515]"
                                style={{ backgroundColor: meta.accent }}
                              >
                                Now
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs leading-6 text-[#8d9b91]">
                            {meta.mood}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {meta.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            <button
              data-shell-item
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(event) => void handleDrop(event)}
              style={
                dragActive
                  ? {
                      borderColor: "var(--scene-outline)",
                      background: `linear-gradient(135deg, ${hexToRgba(sceneMeta.accent, 0.16)}, rgba(255,255,255,0.04))`,
                    }
                  : undefined
              }
              className={cn(
                "group relative w-full overflow-hidden rounded-[1.6rem] border p-5 text-left transition",
                dragActive
                  ? ""
                  : "border-white/8 bg-[#121816]/92 hover:border-white/16 hover:bg-white/[0.05]"
              )}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at top right, ${hexToRgba(sceneMeta.accent, 0.14)}, transparent 34%)`,
                }}
              />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex size-12 items-center justify-center rounded-2xl bg-white/8"
                    style={{ color: sceneMeta.accent }}
                  >
                    {uploading ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <ImageUp className="size-5" />
                    )}
                  </div>
                  <Badge variant="outline" className="border-white/12 text-white/70">
                    Drag & drop
                  </Badge>
                </div>
                <div>
                  <div className="text-lg font-medium text-white">Upload to match</div>
                  <p className="mt-2 text-sm leading-7 text-[#afbeb3]">
                    上传一张空间图片，让识别结果接管当前的音乐语境。
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                  支持 JPG / PNG。上传后会展示识别来源、置信度和推荐轨道。
                </div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
            />
          </aside>

          <main className="space-y-4">
            {error ? <AlertCard message={error} /> : null}

            <section
              data-shell-item
              className="overflow-hidden rounded-[2rem] border border-white/8 bg-[#111614]/92 shadow-[0_30px_90px_rgba(0,0,0,0.32)]"
              style={{ boxShadow: `0 30px 90px ${hexToRgba(sceneMeta.accent, 0.11)}` }}
            >
              <div className="grid gap-0 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="relative min-h-[420px] overflow-hidden border-b border-white/8 xl:border-r xl:border-b-0">
                  <img
                    src={heroImage}
                    alt={sceneMeta.label}
                    className={cn("absolute inset-0 h-full w-full object-cover", sceneMeta.imageClassName)}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,8,0.08)_0%,rgba(8,10,9,0.32)_38%,rgba(8,10,9,0.92)_100%)]" />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at top right, ${hexToRgba(sceneMeta.accent, 0.26)}, transparent 26%)`,
                    }}
                  />

                  <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="text-[#102515]" style={{ backgroundColor: sceneMeta.accent }}>
                        {uploadContext ? "Image-driven Mix" : "Scene Curated"}
                      </Badge>
                      <Badge variant="outline" className="border-white/14 bg-black/15 text-white/80">
                        {sceneMeta.label}
                      </Badge>
                    </div>

                    <div className="max-w-xl space-y-3">
                      <div className="text-xs tracking-[0.24em] uppercase text-white/55">
                        Made for this atmosphere
                      </div>
                      <h2 className="text-4xl font-semibold text-white sm:text-5xl">
                        {sceneMeta.label}
                      </h2>
                      <p className="max-w-lg text-sm leading-7 text-[#dae5dd] sm:text-base">
                        {sceneMeta.mood}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {sceneMeta.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/72 backdrop-blur-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div
                        className="max-w-xl rounded-[1.35rem] border border-white/10 bg-black/22 p-4 backdrop-blur-md"
                        style={{
                          boxShadow: `inset 0 1px 0 ${hexToRgba(sceneMeta.accent, 0.18)}`,
                        }}
                      >
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/48">
                          Scene cue
                        </div>
                        <p className="mt-2 text-sm leading-7 text-[#eef4ef]">{sceneMeta.cue}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex h-full flex-col justify-between gap-7">
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <div className="text-xs tracking-[0.22em] uppercase text-white/45">
                          Match summary
                        </div>
                        <div className="flex items-start gap-3">
                          <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor: hexToRgba(sceneMeta.accent, 0.16),
                              color: sceneMeta.accent,
                            }}
                          >
                            <SceneIcon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-2xl font-semibold text-white">
                              {uploadContext ? `这张图像更像 ${sceneMeta.label}` : sceneMeta.label}
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#9fb0a4]">
                              {uploadContext
                                ? "推荐结果来自你上传的图片识别，再映射到当前的场景与音乐偏好。"
                                : sceneMeta.blurb}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sceneMeta.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="border-white/10 bg-white/[0.03] text-white/72"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {uploadPreviewImage ? (
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/30 sm:w-28">
                              <img
                                src={uploadPreviewImage}
                                alt={uploadContext?.fileName ?? "uploaded scene"}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                                Upload
                              </div>
                            </div>

                            <div className="min-w-0 flex-1 space-y-3">
                              <div>
                                <div className="text-xs tracking-[0.18em] uppercase text-white/42">
                                  Upload evidence
                                </div>
                                <div className="mt-1 truncate text-base font-medium text-white">
                                  {uploadContext?.fileName}
                                </div>
                                <div className="mt-1 text-sm leading-6 text-[#aebcb1]">
                                  由你上传的图片识别，并作为本次推荐的场景依据。
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  className="text-[#102515]"
                                  style={{ backgroundColor: sceneMeta.accent }}
                                >
                                  {modelDisplayName}
                                </Badge>
                                <Badge variant="outline" className="border-white/12 bg-black/18 text-white/75">
                                  {confidenceLabel}
                                </Badge>
                                <Badge variant="outline" className="border-white/12 bg-black/18 text-white/75">
                                  置信度 {formatPercent(uploadContext?.confidence ?? 0)}
                                </Badge>
                              </div>

                              {uploadContext?.fallbackReason ? (
                                <div className="rounded-2xl border border-amber-300/16 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                                  {uploadContext.fallbackReason}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="max-w-xl">
                              <div className="text-xs tracking-[0.18em] uppercase text-white/42">
                                Upload evidence
                              </div>
                              <div className="mt-2 text-sm leading-7 text-[#aebcb1]">
                                上传图片后，这里会保留缩略图、识别方式和置信度，提醒你推荐结果来自哪张图。
                              </div>
                            </div>
                            <Badge variant="outline" className="w-fit border-white/12 bg-black/18 text-white/70">
                              Preset mode
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1.08fr_0.92fr]">
                        <div
                          className="rounded-[1.45rem] border border-white/8 p-4"
                          style={{
                            background: `linear-gradient(135deg, ${hexToRgba(sceneMeta.accent, 0.16)}, rgba(255,255,255,0.035))`,
                          }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.2em] text-white/48">
                            On cue now
                          </div>
                          {leadTrack ? (
                            <div className="mt-3 space-y-3">
                              <div>
                                <div className="text-lg font-semibold text-white">{leadTrack.title}</div>
                                <div className="mt-1 text-sm text-white/60">{leadTrack.artist}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-white/12 bg-black/18 text-white/75">
                                  {leadTrack.genre}
                                </Badge>
                                <Badge variant="outline" className="border-white/12 bg-black/18 text-white/75">
                                  score {leadTrack.final_score.toFixed(3)}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm leading-7 text-white/65">
                              推荐列表加载后，这里会突出当前最适合先播放的那首歌。
                            </p>
                          )}
                        </div>

                        <div className="rounded-[1.45rem] border border-white/8 bg-black/18 p-4">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-white/48">
                            Atmosphere notes
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[#dce8de]">{sceneMeta.cue}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {sceneMeta.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/68"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="lg"
                          className="text-[#102515] transition-transform hover:-translate-y-0.5"
                          style={{ backgroundColor: sceneMeta.accent }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <ImageUp className="size-4" />
                          )}
                          上传图片识别
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-white/14 bg-black/18 text-white hover:bg-white/10"
                          onClick={() =>
                            document.getElementById("track-list")?.scrollIntoView({ behavior: "smooth" })
                          }
                        >
                          <Wand2 className="size-4" />
                          查看推荐列表
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <SummaryMetric label="场景数量" value={scenes.length} suffix="" />
                        <SummaryMetric
                          label="主导属性"
                          value={Math.round((dominantAttribute?.score ?? 0) * 100)}
                          suffix="%"
                        />
                        <SummaryMetric
                          label="推荐曲目"
                          value={deferredSceneResult?.count ?? 0}
                          suffix=""
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div ref={insightsRef} className="space-y-4">
              {loading || !deferredSceneResult ? (
                <LoadingGrid />
              ) : (
                <>
                  <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
                    <BlurFade delay={0.08} inView>
                      <Card
                        data-reveal
                        className="overflow-hidden border-white/8 bg-[#121715]/92"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-white">
                            <Music2 className="size-4" style={{ color: sceneMeta.accent }} />
                            Made for this scene
                          </CardTitle>
                          <CardDescription>
                            用更像歌单队列的方式展示当前最先推荐的曲目。
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {leadTracks.map((track) => (
                            <TrackQueueItem key={`${track.rank}-${track.title}`} track={track} />
                          ))}
                        </CardContent>
                      </Card>
                    </BlurFade>

                    <BlurFade delay={0.12} inView>
                      <Card
                        data-reveal
                        className="relative overflow-hidden border-white/8 bg-[#121715]/92"
                      >
                        <BorderBeam
                          size={210}
                          duration={9}
                          colorFrom={sceneMeta.accent}
                          colorTo={sceneMeta.accentAlt}
                          borderWidth={1.2}
                        />
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                            <Orbit className="size-4" style={{ color: sceneMeta.accent }} />
                            Scene fingerprint
                          </CardTitle>
                          <CardDescription>
                            这是当前场景转译后的属性画像，更像一张音乐人格指纹。
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ReactECharts
                            notMerge
                            lazyUpdate
                            option={buildRadarOption(
                              deferredSceneResult.attribute_scores,
                              sceneMeta.accent,
                              sceneMeta.accentAlt
                            )}
                            style={{ height: 340 }}
                          />
                        </CardContent>
                      </Card>
                    </BlurFade>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <BlurFade delay={0.16} inView>
                        <Card data-reveal className="border-white/8 bg-[#121715]/92">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                            <Sparkles className="size-4" style={{ color: sceneMeta.accentAlt }} />
                            Why this works
                          </CardTitle>
                          <CardDescription>
                            把属性映射和音乐目标翻译成更好读的解释层。
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                            <div className="text-sm leading-7 text-[#d6e1d8]">
                              {sceneSummary?.description ?? sceneMeta.blurb}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {FEATURE_ORDER.map((feature) => (
                              <MetricBar
                                key={feature}
                                label={FEATURE_LABELS[feature]}
                                value={deferredSceneResult.music_targets[feature] ?? 0}
                                tone={feature === "valence" ? "gold" : "green"}
                              />
                            ))}
                          </div>

                          <Separator className="bg-white/8" />

                          <div className="grid gap-3 md:grid-cols-2">
                            {prototypeMatches.map((prototype) => {
                              const meta = SCENE_META[prototype.scene]
                              const Icon = meta.icon

                              return (
                                <div
                                  key={`${prototype.scene}-${prototype.similarity}`}
                                  className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-white">
                                      <span style={{ color: meta.accent }}>
                                        <Icon className="size-4" />
                                      </span>
                                      {meta.label}
                                    </div>
                                    <Badge variant="outline" className="border-white/12 text-white/80">
                                      {formatPercent(prototype.similarity)}
                                    </Badge>
                                  </div>
                                  <p className="mt-3 text-xs leading-6 text-[#95a69a]">
                                    {prototype.description}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </BlurFade>

                    <BlurFade delay={0.2} inView>
                        <Card data-reveal className="border-white/8 bg-[#121715]/92">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                            <BarChart3 className="size-4" style={{ color: sceneMeta.accent }} />
                            Genre balance
                          </CardTitle>
                          <CardDescription>
                            展示这一场景下最先被放大的音乐流派倾向。
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ReactECharts
                            notMerge
                            lazyUpdate
                            option={buildGenreOption(
                              deferredSceneResult.genre_priors,
                              sceneMeta.accent,
                              sceneMeta.accentAlt
                            )}
                            style={{ height: 340 }}
                          />
                        </CardContent>
                      </Card>
                    </BlurFade>
                  </div>

                  <BlurFade delay={0.24} inView>
                    <Card
                      id="track-list"
                      data-reveal
                      className="border-white/8 bg-[#121715]/92"
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <ListMusic className="size-4" style={{ color: sceneMeta.accent }} />
                          Recommended queue
                        </CardTitle>
                        <CardDescription>
                          更像播放器队列，而不是传统数据表格。
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {allTracks.map((track) => (
                          <TrackListRow key={`${track.rank}-${track.title}`} track={track} />
                        ))}
                      </CardContent>
                    </Card>
                  </BlurFade>
                </>
              )}
            </div>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
            <Card data-shell-item className="border-white/8 bg-[#101513]/92">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Now Playing</CardTitle>
                <CardDescription>
                  持续显示当前场景、来源和推荐语气。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="overflow-hidden rounded-[1.6rem] border border-white/8">
                  <img
                    src={heroImage}
                    alt={sceneMeta.label}
                    className={cn("h-48 w-full object-cover", sceneMeta.imageClassName)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-semibold text-white">{sceneMeta.label}</div>
                  <div className="text-sm leading-7 text-[#9fb0a4]">{sceneMeta.mood}</div>
                </div>

                <div className="rounded-[1.3rem] border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs tracking-[0.18em] uppercase text-white/45">
                      Source
                    </div>
                    <Badge variant="outline" className="border-white/12 text-white/80">
                      {uploadContext ? "Image matched" : "Scene preset"}
                    </Badge>
                    </div>
                    <div className="mt-3 text-sm text-white">
                      {uploadContext ? modelDisplayName : "Attribute profile recommendation"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sceneMeta.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-white/10 bg-white/[0.03] text-white/70"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {uploadPreviewImage ? (
                      <div className="mt-4 flex items-center gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-3">
                        <img
                          src={uploadPreviewImage}
                          alt={uploadContext?.fileName ?? "uploaded scene"}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-white">{uploadContext?.fileName}</div>
                        <div className="text-xs text-white/45">
                          由上传图片识别后映射到当前场景
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="text-xs tracking-[0.18em] uppercase text-white/45">
                    Quick genre cues
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topGenres.map(([genre]) => (
                      <Badge
                        key={genre}
                        variant="outline"
                        className="border-white/10 text-[#e6efe8]"
                        style={{ backgroundColor: hexToRgba(sceneMeta.accent, 0.12) }}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-shell-item className="border-white/8 bg-[#101513]/92">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Atmosphere board</CardTitle>
                <CardDescription>
                  把当前场景的 cue、属性和推荐方向收成一张更像 moodboard 的说明卡。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="rounded-[1.3rem] border border-white/8 p-4"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(sceneMeta.accent, 0.16)}, rgba(255,255,255,0.03))`,
                  }}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Scene cue
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#eff4f0]">{sceneMeta.cue}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sceneMeta.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/68"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <SideNote title="当前氛围" body={sceneMeta.blurb} />
                <SideNote title="主导属性" body={buildAttributeSummary(dominantAttribute)} />
                <SideNote title="推荐方向" body={buildGenreSummary(topGenres)} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}

type TechFlowStep = {
  copy: string
  eyebrow: string
  icon: ComponentType<{ className?: string }>
  title: string
}

type ScoreSignal = {
  description: string
  label: string
  value: string
}

type ArchitectureLayer = {
  accent: string
  nodes: Array<{
    body: string
    icon: ComponentType<{ className?: string }>
    title: string
  }>
  subtitle: string
  title: string
}

type ProductPillar = {
  body: string
  icon: ComponentType<{ className?: string }>
  title: string
}

type RequirementStage = {
  points: string[]
  step: string
  title: string
}

type ScopeColumn = {
  accent: string
  items: string[]
  title: string
}

type MetricItem = {
  label: string
  note: string
  value: string
}

const TECH_FLOW: TechFlowStep[] = [
  {
    eyebrow: "01 Input",
    title: "图片或场景进入系统",
    copy: "用户可以直接选择场景，也可以上传一张空间图片。图片路径会进入本地识别流程，场景选择则直接读取预设画像。",
    icon: Camera,
  },
  {
    eyebrow: "02 Perception",
    title: "AI 场景识别",
    copy: "优先使用本地 CLIP ViT-B/32 多提示词识别，将图片与咖啡厅、书房、健身房、夜街、山野户外等场景语义做匹配。",
    icon: BrainCircuit,
  },
  {
    eyebrow: "03 Atmosphere",
    title: "场景属性画像",
    copy: "识别出的场景会被映射到唤醒度、社交感、专注度、自然感、都市感等属性，形成可解释的氛围指纹。",
    icon: SlidersHorizontal,
  },
  {
    eyebrow: "04 Music Target",
    title: "翻译成音乐偏好",
    copy: "属性画像再转换成能量、律动、情绪亮度、原声感、器乐感和 tempo 等 Spotify 音频特征目标。",
    icon: RadioTower,
  },
  {
    eyebrow: "05 Ranking",
    title: "召回、排序与去重",
    copy: "系统先召回候选歌曲，再融合特征相似度、流派匹配和热度排序，同时加入艺人和流派多样性惩罚。",
    icon: Gauge,
  },
]

const SCORE_SIGNALS: ScoreSignal[] = [
  {
    label: "Feature similarity",
    value: "核心匹配",
    description: "用候选歌曲音频特征向量与目标向量计算余弦相似度，回答“声音气质像不像”。",
  },
  {
    label: "Genre match",
    value: "语境校准",
    description: "用场景偏好的 genre / subgenre 或属性生成的流派先验，控制推荐结果的音乐语境。",
  },
  {
    label: "Popularity",
    value: "可听性补偿",
    description: "把歌曲热度作为轻量信号，避免结果过于冷门，同时不会压过场景匹配。",
  },
  {
    label: "Diversity penalty",
    value: "队列整理",
    description: "最终选择 Top K 时惩罚重复艺人和重复流派，让歌单更像真实可听的播放队列。",
  },
]

const ARCHITECTURE_LAYERS: ArchitectureLayer[] = [
  {
    title: "体验层",
    subtitle: "Vite / React / Tailwind",
    accent: "from-emerald-300 to-[#b7f58e]",
    nodes: [
      {
        title: "场景选择",
        body: "用户切换咖啡厅、书房、健身房、夜街、山野户外等原型场景。",
        icon: Layers3,
      },
      {
        title: "图片上传",
        body: "上传图片后保留缩略图、识别结果、置信度和推荐来源。",
        icon: ImageUp,
      },
    ],
  },
  {
    title: "API 编排层",
    subtitle: "Flask endpoints",
    accent: "from-[#f1cf7a] to-[#f7a95b]",
    nodes: [
      {
        title: "/recommend/by_scene",
        body: "按预设场景读取画像并生成推荐。",
        icon: RadioTower,
      },
      {
        title: "/recommend/by_image",
        body: "接收图片文件，调用识别器并把结果合并为统一响应。",
        icon: Network,
      },
    ],
  },
  {
    title: "场景智能层",
    subtitle: "Vision + Attribute profile",
    accent: "from-[#80f8b0] to-[#6bc7ff]",
    nodes: [
      {
        title: "AI 场景识别",
        body: "优先用本地 CLIP 多提示词识别，失败时回退到图像颜色统计模式。",
        icon: BrainCircuit,
      },
      {
        title: "属性画像",
        body: "把场景映射为唤醒度、专注度、社交感、自然感等可解释属性。",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: "推荐计算层",
    subtitle: "Recall + Rank",
    accent: "from-[#b7f58e] to-[#f1cf7a]",
    nodes: [
      {
        title: "候选召回",
        body: "先按流派与音乐特征容忍区间筛选候选池。",
        icon: Database,
      },
      {
        title: "多信号排序",
        body: "融合特征相似度、流派匹配、热度，并加入多样性惩罚。",
        icon: Gauge,
      },
    ],
  },
  {
    title: "结果表达层",
    subtitle: "Explainable UI",
    accent: "from-[#6bc7ff] to-emerald-300",
    nodes: [
      {
        title: "推荐列表",
        body: "返回 Top K 曲目、艺人、流派与最终分数。",
        icon: ListMusic,
      },
      {
        title: "解释面板",
        body: "展示识别来源、属性雷达、音乐目标和推荐原因。",
        icon: Sparkles,
      },
    ],
  },
]

const PRODUCT_PILLARS: ProductPillar[] = [
  {
    title: "目标用户",
    body: "想快速找到当下氛围配乐的人，不想先理解复杂音乐标签，只想从场景直接开始。",
    icon: Users,
  },
  {
    title: "核心问题",
    body: "用户知道自己身处什么环境，却很难立刻把这种空间感觉翻译成适合的音乐选择。",
    icon: Target,
  },
  {
    title: "产品主张",
    body: "先说这是哪种场景、适合什么音乐，再展开推荐列表和解释层，像一款真正可用的音乐产品。",
    icon: Sparkles,
  },
]

const REQUIREMENT_STAGES: RequirementStage[] = [
  {
    step: "01",
    title: "进入产品",
    points: [
      "用户可以先选场景，也可以直接上传图片。",
      "首页需要在 3 秒内讲清这是什么产品、可以怎么开始。",
    ],
  },
  {
    step: "02",
    title: "得到结论",
    points: [
      "首屏必须优先告诉用户这张图像更像什么场景。",
      "保留上传图片缩略图，提醒推荐来源来自用户自己的输入。",
    ],
  },
  {
    step: "03",
    title: "浏览推荐",
    points: [
      "推荐列表应像播放器队列，而不是技术报表或研究页面。",
      "前 5 首要有足够的可读性，让用户快速决定是否继续听。",
    ],
  },
  {
    step: "04",
    title: "建立信任",
    points: [
      "通过属性画像、流派倾向和推荐原因解释“为什么是这些歌”。",
      "解释层要服务理解，不要抢走主推荐结果的注意力。",
    ],
  },
]

const PRODUCT_SCOPE: ScopeColumn[] = [
  {
    title: "MVP 必须有",
    accent: "from-emerald-300 to-[#b7f58e]",
    items: [
      "场景切换与图片上传双入口",
      "首屏场景结论与上传证据行",
      "推荐队列、属性解释、流派图表",
      "技术说明页与产品说明页",
    ],
  },
  {
    title: "下一阶段增强",
    accent: "from-[#f1cf7a] to-[#f8b96a]",
    items: [
      "播放预览、收藏、重新抽取推荐",
      "用户口味记忆与个性化偏好权重",
      "更多场景原型与情境模版",
      "移动端专属手势与卡片流",
    ],
  },
  {
    title: "暂不进入",
    accent: "from-[#6bc7ff] to-[#80f8b0]",
    items: [
      "复杂社交功能和多人协同歌单",
      "后台内容运营系统",
      "重型账户体系和付费设计",
      "过深的算法调参入口给终端用户",
    ],
  },
]

const PRODUCT_METRICS: MetricItem[] = [
  {
    label: "首次理解率",
    value: "< 3 秒",
    note: "用户进入首页后，能否立刻明白这是“场景到音乐”的推荐产品。",
  },
  {
    label: "首屏交互完成率",
    value: "高优先",
    note: "至少完成一次场景切换或图片上传，说明入口设计足够明确。",
  },
  {
    label: "推荐继续浏览率",
    value: "Top 5 驱动",
    note: "用户是否会继续查看队列和解释层，验证结果是否足够有吸引力。",
  },
  {
    label: "推荐信任感",
    value: "解释可读",
    note: "用户能否理解推荐原因，而不是只觉得结果“碰巧像”。",
  },
]

function ProductDesignPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090d0c] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(241,207,122,0.16),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(107,199,255,0.12),transparent_26%),linear-gradient(180deg,#0a0f0d_0%,#090d0c_45%,#0d1210_100%)]" />

      <main className="relative mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/[0.035] px-4 py-3 backdrop-blur-xl">
          <a href="/" className="group flex items-center gap-2 text-sm text-white/75 transition hover:text-white">
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            返回推荐页面
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/technology"
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/8 hover:text-white"
            >
              推荐技术
            </a>
            <Badge className="bg-[#f1cf7a] text-[#1f1605]">Product Design</Badge>
          </div>
        </nav>

        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/8 bg-[#101512]/88 p-6 shadow-[0_36px_110px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">
          <GridPattern
            width={64}
            height={64}
            x={-1}
            y={-1}
            className="opacity-25 [mask-image:radial-gradient(circle_at_top_left,white,transparent_70%)]"
          />
          <BorderBeam
            size={260}
            duration={10}
            colorFrom="#f1cf7a"
            colorTo="#80f8b0"
            borderWidth={1.2}
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-end">
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/12 bg-black/20 text-white/75">
                  产品需求设计
                </Badge>
                <Badge variant="outline" className="border-white/12 bg-black/20 text-white/75">
                  用户场景优先
                </Badge>
                <Badge variant="outline" className="border-white/12 bg-black/20 text-white/75">
                  MVP 范围清晰
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="text-xs uppercase tracking-[0.28em] text-[#f1cf7a]/75">
                  Product requirements view
                </div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                  把“我现在适合听什么”设计成一段顺滑的产品体验。
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#b6c5bb] sm:text-lg">
                  这个页面不解释模型，而是解释为什么这个产品值得做、用户如何进入、首屏该先说什么、MVP 应该收敛到哪里。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-[#f1cf7a] text-[#1f1605] hover:bg-[#f5d992]"
                  onClick={() => {
                    window.location.href = "/"
                  }}
                >
                  回到推荐体验
                  <ArrowRight className="size-4" />
                </Button>
                <a
                  href="#requirements"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-white/14 bg-black/18 px-5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  查看需求结构
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TechHeroStat label="产品核心" value="Scene to Music" />
              <TechHeroStat label="首屏目标" value="先给结论" />
              <TechHeroStat label="主要入口" value="选场景 / 传图片" />
              <TechHeroStat label="设计原则" value="结果先于解释" />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          {PRODUCT_PILLARS.map((pillar) => (
            <ProductPillarCard key={pillar.title} pillar={pillar} />
          ))}
        </section>

        <section id="requirements" className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Layers3 className="size-4 text-[#f1cf7a]" />
                核心需求流程
              </CardTitle>
              <CardDescription>
                从进入产品到建立推荐信任感，需求设计更像一条连续路径，而不是离散功能点。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {REQUIREMENT_STAGES.map((stage) => (
                <RequirementStageCard key={stage.step} stage={stage} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCheck className="size-4 text-emerald-300" />
                需求判断准则
              </CardTitle>
              <CardDescription>
                新需求是否该进来，优先看它是不是在强化产品主路径，而不是单纯增加页面热闹程度。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProductGuideline
                title="结论优先"
                body="首屏先告诉用户当前是什么场景、适合什么音乐，解释层放在后面承接。"
              />
              <ProductGuideline
                title="输入可见"
                body="上传图片要持续保留，用户需要知道推荐结果确实是基于自己的输入产生。"
              />
              <ProductGuideline
                title="解释不过载"
                body="解释层要帮助理解，不要把技术说明直接端给普通用户。"
              />
              <ProductGuideline
                title="播放器感"
                body="推荐结果更像歌单与播放队列，而不是分析平台或实验页面。"
              />
            </CardContent>
          </Card>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-3">
          {PRODUCT_SCOPE.map((column) => (
            <ScopeCard key={column.title} column={column} />
          ))}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="size-4 text-emerald-300" />
                成功指标
              </CardTitle>
              <CardDescription>
                这里优先看产品是否被理解、是否被继续使用，而不是一上来就沉进模型指标。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {PRODUCT_METRICS.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShieldCheck className="size-4 text-[#f1cf7a]" />
                风险与设计边界
              </CardTitle>
              <CardDescription>
                提前讲清边界，能帮助我们避免产品后面越做越像工具箱，失去体验主线。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProductGuideline
                title="风险 1"
                body="如果技术解释抢到首屏，用户会先看到系统复杂，而不是先感受到产品价值。"
              />
              <ProductGuideline
                title="风险 2"
                body="如果入口过多、功能过散，用户无法迅速进入“上传图片并拿到结果”这条主线。"
              />
              <ProductGuideline
                title="边界 1"
                body="当前阶段重点是推荐体验闭环，不把后台运营、重社交、重账户体系一起拉进来。"
              />
              <ProductGuideline
                title="边界 2"
                body="算法可解释性应该以用户能读懂为准，不追求把全部工程细节直接展示在产品层。"
              />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

function TechnologyPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#070b0a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,255,174,0.18),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(240,209,122,0.12),transparent_28%),linear-gradient(180deg,#07110d_0%,#070b0a_48%,#0d1210_100%)]" />

      <main className="relative mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/[0.035] px-4 py-3 backdrop-blur-xl">
          <a href="/" className="group flex items-center gap-2 text-sm text-white/75 transition hover:text-white">
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            返回推荐页面
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/product-design"
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/8 hover:text-white"
            >
              产品需求设计
            </a>
            <Badge className="bg-emerald-300 text-[#102515]">Recommendation Tech</Badge>
          </div>
        </nav>

        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/8 bg-[#101512]/88 p-6 shadow-[0_36px_110px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">
          <GridPattern
            width={64}
            height={64}
            x={-1}
            y={-1}
            className="opacity-25 [mask-image:radial-gradient(circle_at_top_left,white,transparent_70%)]"
          />
          <BorderBeam
            size={260}
            duration={10}
            colorFrom="#80f8b0"
            colorTo="#f1cf7a"
            borderWidth={1.2}
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/12 bg-black/20 text-white/75">
                  AI 场景识别
                </Badge>
                <Badge variant="outline" className="border-white/12 bg-black/20 text-white/75">
                  属性映射
                </Badge>
                <Badge variant="outline" className="border-white/12 bg-black/20 text-white/75">
                  多信号排序
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="text-xs uppercase tracking-[0.28em] text-emerald-200/70">
                  How recommendation works
                </div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                  从一张场景图片，到一组更合拍的歌曲。
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#b6c5bb] sm:text-lg">
                  这个项目不是只按标签筛歌，而是先把视觉场景翻译成“空间气质”，再把气质落到音乐特征、流派先验和排序权重上。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-emerald-300 text-[#102515] hover:bg-emerald-200"
                  onClick={() => {
                    window.location.href = "/"
                  }}
                >
                  体验图片推荐
                  <ArrowRight className="size-4" />
                </Button>
                <a
                  href="#architecture"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-white/14 bg-black/18 px-5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  查看架构图
                </a>
                <a
                  href="/product-design"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-white/14 bg-black/18 px-5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  查看产品设计
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TechHeroStat label="识别入口" value="Image / Scene" />
              <TechHeroStat label="场景原型" value={`${SCENE_ORDER.length} 类`} />
              <TechHeroStat label="属性维度" value={`${ATTR_ORDER.length} 维`} />
              <TechHeroStat label="排序信号" value="3 + Diversity" />
            </div>
          </div>
        </section>

        <section id="architecture" className="mt-5">
          <Card className="overflow-hidden border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Network className="size-4 text-emerald-300" />
                推荐技术架构图
              </CardTitle>
              <CardDescription>
                从用户交互到 API 编排、AI 场景理解、推荐计算，再到前端可解释展示的完整路径。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchitectureDiagram />
            </CardContent>
          </Card>
        </section>

        <section id="pipeline" className="mt-5 grid gap-4 xl:grid-cols-5">
          {TECH_FLOW.map((step, index) => (
            <TechFlowCard key={step.eyebrow} step={step} index={index} />
          ))}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Network className="size-4 text-emerald-300" />
                推荐链路
              </CardTitle>
              <CardDescription>
                前端看到的是一句“这张图像更像某个场景”，背后实际经过了五层翻译。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TechLayer
                icon={Database}
                title="数据层"
                body="使用处理后的歌曲数据，保留 genre、subgenre、popularity 和 Spotify 音频特征。"
              />
              <TechLayer
                icon={Layers3}
                title="画像层"
                body="场景原型被写成属性向量，既能解释“为什么推荐”，也能生成音乐目标。"
              />
              <TechLayer
                icon={BarChart3}
                title="排序层"
                body="最终分数来自特征相似度、流派匹配和热度；Top K 选择阶段再做多样性整理。"
              />
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <SlidersHorizontal className="size-4 text-[#f1cf7a]" />
                排序公式怎么读
              </CardTitle>
              <CardDescription>
                推荐结果不是单一模型黑箱，而是一组可以调节、可以解释的排序信号。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {SCORE_SIGNALS.map((signal) => (
                <TechScoreCard key={signal.label} signal={signal} />
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="text-white">场景属性如何影响音乐</CardTitle>
              <CardDescription>
                属性不是给用户看的技术参数，而是系统把“空间感觉”翻译成音乐选择的中间语言。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ATTR_ORDER.map((attribute) => (
                <div
                  key={attribute}
                  className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3"
                >
                  <div className="text-sm font-medium text-white">
                    {ATTR_LABELS[attribute] ?? attribute}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-white/45">{attribute}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[#101512]/90">
            <CardHeader>
              <CardTitle className="text-white">音乐目标特征</CardTitle>
              <CardDescription>
                排序时主要对齐这些声音特征，而不是只看歌曲标题或人工标签。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FEATURE_ORDER.map((feature, index) => (
                <div key={feature} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white">{FEATURE_LABELS[feature]}</span>
                    <span className="text-xs text-white/42">{feature}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-[#b7f58e] to-[#f1cf7a]"
                      style={{ width: `${92 - index * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

function TechHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.045] p-4 backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

function ProductPillarCard({ pillar }: { pillar: ProductPillar }) {
  const Icon = pillar.icon

  return (
    <Card className="overflow-hidden border-white/8 bg-[#101512]/90">
      <CardContent className="p-5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f1cf7a]/12 text-[#f1cf7a]">
          <Icon className="size-5" />
        </div>
        <div className="mt-5 text-lg font-semibold text-white">{pillar.title}</div>
        <p className="mt-3 text-sm leading-7 text-[#b4c2b8]">{pillar.body}</p>
      </CardContent>
    </Card>
  )
}

function RequirementStageCard({ stage }: { stage: RequirementStage }) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#f1cf7a]/12 text-sm font-semibold text-[#f1cf7a]">
          {stage.step}
        </div>
        <div className="space-y-3">
          <div className="text-base font-semibold text-white">{stage.title}</div>
          <div className="space-y-2">
            {stage.points.map((point) => (
              <div key={point} className="flex gap-3 text-sm leading-7 text-[#b4c2b8]">
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f1cf7a]" />
                <div>{point}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductGuideline({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="text-sm font-medium text-white">{title}</div>
      <p className="mt-2 text-sm leading-7 text-[#b4c2b8]">{body}</p>
    </div>
  )
}

function ScopeCard({ column }: { column: ScopeColumn }) {
  return (
    <Card className="overflow-hidden border-white/8 bg-[#101512]/90">
      <CardContent className="p-5">
        <div className={cn("h-1.5 w-16 rounded-full bg-gradient-to-r", column.accent)} />
        <div className="mt-5 text-lg font-semibold text-white">{column.title}</div>
        <div className="mt-4 space-y-3">
          {column.items.map((item) => (
            <div key={item} className="flex gap-3 text-sm leading-7 text-[#b4c2b8]">
              <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/55" />
              <div>{item}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ metric }: { metric: MetricItem }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">{metric.label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{metric.value}</div>
      <p className="mt-3 text-sm leading-7 text-[#b4c2b8]">{metric.note}</p>
    </div>
  )
}

function ArchitectureDiagram() {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/8 bg-black/18 p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(128,248,176,0.13),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(241,207,122,0.1),transparent_30%)]" />

        <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)_34px_minmax(0,1fr)_34px_minmax(0,1fr)_34px_minmax(0,1fr)]">
          {ARCHITECTURE_LAYERS.map((layer, index) => (
            <ArchitectureLayerGroup key={layer.title} layer={layer} index={index} />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ArchitectureDependency
          icon={Database}
          label="歌曲数据"
          title="processed_songs.csv"
          body="提供流派、热度、tempo 与 Spotify 音频特征，是召回和排序的主数据表。"
        />
        <ArchitectureDependency
          icon={SlidersHorizontal}
          label="场景配置"
          title="scene_attributes.json"
          body="定义场景原型、属性维度、属性到音乐目标的映射规则。"
        />
        <ArchitectureDependency
          icon={BrainCircuit}
          label="视觉模型"
          title="open_clip checkpoint"
          body="本地 CLIP 权重用于图片与多提示词场景语义的相似度匹配。"
        />
      </div>
    </div>
  )
}

function ArchitectureLayerGroup({
  index,
  layer,
}: {
  index: number
  layer: ArchitectureLayer
}) {
  return (
    <>
      <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.035] p-4">
        <div className={cn("h-1.5 w-16 rounded-full bg-gradient-to-r", layer.accent)} />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">{layer.title}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/38">
              {layer.subtitle}
            </div>
          </div>
          <div className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/38">
            L{index + 1}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {layer.nodes.map((node) => (
            <ArchitectureNode key={node.title} node={node} />
          ))}
        </div>
      </div>

      {index < ARCHITECTURE_LAYERS.length - 1 ? <ArchitectureArrow /> : null}
    </>
  )
}

function ArchitectureNode({
  node,
}: {
  node: ArchitectureLayer["nodes"][number]
}) {
  const Icon = node.icon

  return (
    <div className="rounded-2xl border border-white/7 bg-black/18 p-3">
      <div className="flex flex-col items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-medium leading-5 text-white">
            {node.title}
          </div>
          <p className="mt-1 break-words text-xs leading-6 text-[#aebcb1]">
            {node.body}
          </p>
        </div>
      </div>
    </div>
  )
}

function ArchitectureArrow() {
  return (
    <div className="hidden items-center justify-center xl:flex">
      <div className="relative h-px w-full bg-gradient-to-r from-white/10 via-emerald-200/55 to-white/10">
        <div className="absolute -right-1 -top-[5px] h-3 w-3 rotate-45 border-r border-t border-emerald-200/70" />
      </div>
    </div>
  )
}

function ArchitectureDependency({
  body,
  icon: Icon,
  label,
  title,
}: {
  body: string
  icon: ComponentType<{ className?: string }>
  label: string
  title: string
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-white/8 text-[#f1cf7a]">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</div>
          <div className="mt-1 font-medium text-white">{title}</div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#aebcb1]">{body}</p>
    </div>
  )
}

function TechFlowCard({ index, step }: { index: number; step: TechFlowStep }) {
  const Icon = step.icon

  return (
    <Card className="group relative overflow-hidden border-white/8 bg-[#101512]/90 transition hover:-translate-y-0.5 hover:border-emerald-300/20">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(112,255,181,0.16),transparent_64%)]" />
      </div>
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-300/12 text-emerald-200">
            <Icon className="size-5" />
          </div>
          <div className="text-xs text-white/30">{String(index + 1).padStart(2, "0")}</div>
        </div>
        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-white/38">{step.eyebrow}</div>
        <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
        <p className="mt-3 text-sm leading-7 text-[#aebcb1]">{step.copy}</p>
      </CardContent>
    </Card>
  )
}

function TechLayer({
  body,
  icon: Icon,
  title,
}: {
  body: string
  icon: ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <div className="flex gap-4 rounded-[1.35rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-emerald-200">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="font-medium text-white">{title}</div>
        <p className="mt-1 text-sm leading-7 text-[#aebcb1]">{body}</p>
      </div>
    </div>
  )
}

function TechScoreCard({ signal }: { signal: ScoreSignal }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-white">{signal.label}</div>
        <Badge variant="outline" className="border-white/12 bg-black/18 text-white/70">
          {signal.value}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#aebcb1]">{signal.description}</p>
    </div>
  )
}

function MiniMetric({
  label,
  suffix,
  value,
}: {
  label: string
  suffix: string
  value: number
}) {
  return (
    <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.04] px-3 py-3">
      <div className="text-[11px] tracking-[0.18em] uppercase text-white/45">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">
        <NumberTicker value={value} className="text-white" />
        <span>{suffix}</span>
      </div>
    </div>
  )
}

function SummaryMetric({
  label,
  suffix,
  value,
}: {
  label: string
  suffix: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
      <div className="text-[10px] tracking-[0.18em] uppercase text-white/42">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">
        <NumberTicker value={value} className="text-white" />
        <span>{suffix}</span>
      </div>
    </div>
  )
}

function MetricBar({
  compact = false,
  hint,
  label,
  tone = "green",
  value,
}: {
  compact?: boolean
  hint?: string
  label: string
  tone?: "gold" | "green"
  value: number
}) {
  const barColor =
    tone === "gold"
      ? "from-[#f0d17a] via-[#dcae52] to-[#c78b31]"
      : "from-[#7ff6b0] via-[#4ddb91] to-[#178a58]"

  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-sm text-[#edf3ee]", compact && "text-xs")}>{label}</span>
        <span className={cn("text-xs text-white/45", compact && "text-[11px]")}>
          {formatPercent(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", barColor)}
          style={{ width: `${Math.max(6, value * 100)}%` }}
        />
      </div>
      {hint && !compact ? <p className="text-xs text-white/35">{hint}</p> : null}
    </div>
  )
}

function TrackQueueItem({ track }: { track: Recommendation }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-300/12 text-sm font-medium text-emerald-200">
        {track.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{track.title}</div>
        <div className="truncate text-xs text-white/45">{track.artist}</div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-xs tracking-[0.14em] uppercase text-white/35">Genre</div>
        <div className="mt-1 text-sm text-[#dfe8e0]">{track.genre}</div>
      </div>
      <div className="text-right">
        <div className="text-xs tracking-[0.14em] uppercase text-white/35">Score</div>
        <div className="mt-1 text-sm text-emerald-200">{track.final_score.toFixed(3)}</div>
      </div>
    </div>
  )
}

function TrackListRow({ track }: { track: Recommendation }) {
  return (
    <div className="grid gap-3 rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-4 lg:grid-cols-[56px_minmax(0,1.2fr)_0.75fr_0.75fr_0.6fr] lg:items-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-black/20 text-sm font-medium text-white">
        {track.rank}
      </div>

      <div className="min-w-0">
        <div className="truncate font-medium text-white">{track.title}</div>
        <div className="mt-1 truncate text-sm text-white/45">{track.artist}</div>
      </div>

      <div>
        <div className="text-xs tracking-[0.16em] uppercase text-white/35">Genre</div>
        <div className="mt-1 text-sm text-[#e4ede5]">{track.genre}</div>
      </div>

      <div>
        <div className="text-xs tracking-[0.16em] uppercase text-white/35">Blend</div>
        <div className="mt-1 flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/10 text-white/75">
            sim {track.feature_sim.toFixed(3)}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-white/75">
            energy {track.energy.toFixed(2)}
          </Badge>
        </div>
      </div>

      <div className="text-left lg:text-right">
        <div className="text-xs tracking-[0.16em] uppercase text-white/35">Score</div>
        <div className="mt-1 text-sm text-emerald-200">{track.final_score.toFixed(3)}</div>
      </div>
    </div>
  )
}

function SideNote({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-[#a8b6ac]">{body}</div>
    </div>
  )
}

function AlertCard({ message }: { message: string }) {
  return (
    <Card className="border-amber-400/25 bg-amber-300/8">
      <CardContent className="flex items-start gap-3 p-4 text-amber-100">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="text-sm leading-7">{message}</div>
      </CardContent>
    </Card>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <LoadingCard className="min-h-[24rem]" />
        <LoadingCard className="min-h-[24rem]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <LoadingCard className="min-h-[24rem]" />
        <LoadingCard className="min-h-[24rem]" />
      </div>
      <LoadingCard className="min-h-[30rem]" />
    </div>
  )
}

function LoadingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[1.8rem] border border-white/8 bg-white/[0.04] p-6 animate-pulse",
        className
      )}
    >
      <div className="h-full rounded-[1.35rem] bg-white/[0.05]" />
    </div>
  )
}

function buildRadarOption(
  scores: NumericRecord,
  accent: string,
  accentAlt: string
): EChartsOption {
  return {
    animationDuration: 820,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    radar: {
      radius: "64%",
      indicator: ATTR_ORDER.map((attribute) => ({
        name: ATTR_LABELS[attribute],
        max: 1,
      })),
      axisName: {
        color: "#d8e6da",
        fontSize: 11,
      },
      axisLine: {
        lineStyle: {
          color: "rgba(255,255,255,0.08)",
        },
      },
      splitLine: {
        lineStyle: {
          color: "rgba(255,255,255,0.08)",
        },
      },
      splitArea: {
        areaStyle: {
          color: [
            "rgba(255,255,255,0.018)",
            "rgba(255,255,255,0.026)",
            "rgba(255,255,255,0.018)",
          ],
        },
      },
    },
    tooltip: {
      trigger: "item",
    },
    series: [
      {
        type: "radar",
        symbol: "circle",
        symbolSize: 7,
        data: [
          {
            value: ATTR_ORDER.map((attribute) => scores[attribute] ?? 0),
            areaStyle: {
              color: hexToRgba(accent, 0.18),
            },
            lineStyle: {
              color: accent,
              width: 2,
            },
            itemStyle: {
              color: accentAlt,
            },
          },
        ],
      },
    ],
  }
}

function buildGenreOption(
  priors: NumericRecord,
  accent: string,
  accentAlt: string
): EChartsOption {
  const entries = getTopGenres(priors)
  const labels = entries.map(([genre]) => genre).reverse()
  const values = entries.map(([, value]) => value).reverse()

  return {
    animationDuration: 820,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    grid: {
      top: 10,
      right: 18,
      bottom: 8,
      left: 94,
      containLabel: false,
    },
    xAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: "rgba(255,255,255,0.06)",
        },
      },
      axisLabel: {
        color: "#87988d",
        formatter: (value: number) => `${Math.round(value * 100)}%`,
      },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: "#e1ebe3",
      },
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    series: [
      {
        type: "bar",
        data: values,
        barWidth: 16,
        itemStyle: {
          borderRadius: 999,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: accent },
              { offset: 1, color: accentAlt },
            ],
          },
        },
      },
    ],
  }
}

function getTopGenres(priors?: NumericRecord) {
  return Object.entries(priors ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
}

function mergeImageResponse(
  sceneResponse: SceneRecommendationResponse,
  imageResponse: ImageRecommendationResponse
): SceneRecommendationResponse {
  return {
    ...sceneResponse,
    source_scene: imageResponse.scene,
    attribute_scores: imageResponse.attribute_scores ?? sceneResponse.attribute_scores,
    attribute_summary: imageResponse.attribute_summary ?? sceneResponse.attribute_summary,
    music_targets: imageResponse.music_targets ?? sceneResponse.music_targets,
    prototype_matches: imageResponse.prototype_matches ?? sceneResponse.prototype_matches,
    recommendations: imageResponse.recommendations ?? sceneResponse.recommendations,
    count: imageResponse.count ?? sceneResponse.count,
  }
}

function getConfidenceLabel(confidence: number) {
  if (confidence >= 0.7) {
    return "高匹配"
  }
  if (confidence >= 0.45) {
    return "中匹配"
  }
  return "探索匹配"
}

function getModelDisplayName(model?: string) {
  if (!model) {
    return "Scene profile preset"
  }
  if (model.includes("CLIP")) {
    return "AI 场景识别"
  }
  if (model.toLowerCase().includes("mock")) {
    return "后备识别模式"
  }
  return model
}

function buildAttributeSummary(attribute: AttributeSummaryItem | null) {
  if (!attribute) {
    return "系统会根据场景属性判断更适合的音乐气质。"
  }

  return `${ATTR_LABELS[attribute.attribute] ?? attribute.attribute} 最强，${attribute.music_effect_hint}`
}

function buildGenreSummary(topGenres: Array<[string, number]>) {
  if (topGenres.length === 0) {
    return "系统会根据场景气质逐步收敛到更匹配的流派方向。"
  }

  const names = topGenres.slice(0, 3).map(([genre]) => genre)
  return `当前更偏向 ${names.join("、")} 这些流派方向，适合把氛围感和场景一致性放在前面。`
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "发生了未知错误，请稍后再试。"
}

export default App
