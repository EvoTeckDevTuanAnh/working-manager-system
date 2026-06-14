import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Crop,
  ExternalLink,
  FileImage,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  getScreenPreset,
  screenPresets,
  type ScreenPresetId,
} from "@/remotion/screen-presets"

const REMOTION_STUDIO_URL = "http://localhost:3001"
const REMOTION_CONTROL_URL = "http://localhost:3002"

type VideoMode = "natural" | "timeline" | "loop" | "stretch"
type AssetFrameFit = "cover" | "contain" | "fill"

type AssetFrame = {
  fit: AssetFrameFit
  positionX: number
  positionY: number
  scale: number
  rotation: number
}

type DetectedAsset = {
  id: string
  value: string
  detectionSource: string
  sourceType: "slot" | "base64" | "external" | "internal" | "local"
  assetType: "slot" | "image" | "video" | "audio" | "font" | "unknown"
  replaceable: boolean
}

type AssetMapItem = {
  originalValue: string
  fileName: string
  storedFileName: string
  replacementUrl: string
  mimeType: string
  assetType?: "image" | "video" | "audio" | "font" | "unknown"
  videoMode?: VideoMode
  frame?: AssetFrame
  sizeBytes: number
  uploadedAt: string
  updatedAt?: string
}

type AssetMap = {
  assets?: Record<string, AssetMapItem>
}

type AssetScanResponse = {
  ok: boolean
  assets?: DetectedAsset[]
  assetMap?: AssetMap
  error?: string
}

type AssetConfigResponse = {
  ok: boolean
  assetMap?: AssetMap
  updatedAsset?: AssetMapItem
  error?: string
}

const defaultAssetFrame: AssetFrame = {
  fit: "cover",
  positionX: 50,
  positionY: 50,
  scale: 1,
  rotation: 0,
}

const videoModeOptions: Array<{
  value: VideoMode
  label: string
  description: string
}> = [
  {
    value: "natural",
    label: "Natural playback",
    description: "Video chạy tự nhiên, mượt hơn khi preview.",
  },
  {
    value: "timeline",
    label: "Timeline sync",
    description: "Khi render: frame 30 = giây 1.0.",
  },
  {
    value: "loop",
    label: "Loop sync",
    description: "Khi render: video ngắn tự lặp theo timeline.",
  },
  {
    value: "stretch",
    label: "Stretch to duration",
    description: "Khi render: kéo video khớp toàn bộ duration.",
  },
]

const frameFitOptions: Array<{
  value: AssetFrameFit
  label: string
  description: string
}> = [
  {
    value: "cover",
    label: "Cover",
    description: "Lấp đầy khung, có thể bị crop cạnh.",
  },
  {
    value: "contain",
    label: "Contain",
    description: "Hiện đủ ảnh/video, có thể hở viền.",
  },
  {
    value: "fill",
    label: "Fill",
    description: "Ép đầy khung, có thể méo tỉ lệ.",
  },
]

function getAssetStatusLabel(asset: DetectedAsset, mappedAsset?: AssetMapItem) {
  if (mappedAsset) return "Mapped"
  if (asset.sourceType === "slot") return "Missing slot"
  if (asset.sourceType === "local") return "Missing local"
  if (asset.sourceType === "external") return "External URL"
  if (asset.sourceType === "base64") return "Embedded"
  if (asset.sourceType === "internal") return "Internal"

  return asset.sourceType
}

function getAssetStatusClass(asset: DetectedAsset, mappedAsset?: AssetMapItem) {
  if (mappedAsset) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
  }

  if (asset.sourceType === "slot") {
    return "border-red-400/30 bg-red-500/10 text-red-200"
  }

  if (asset.sourceType === "local") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200"
  }

  if (asset.sourceType === "external") {
    return "border-sky-400/30 bg-sky-500/10 text-sky-200"
  }

  if (asset.sourceType === "base64") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
  }

  return "border-white/10 bg-white/10 text-white/60"
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}

function isVideoAsset(asset: DetectedAsset, mappedAsset?: AssetMapItem) {
  if (asset.assetType === "video") return true
  if (mappedAsset?.assetType === "video") return true
  if (mappedAsset?.mimeType?.startsWith("video/")) return true

  return false
}

function isImageAsset(asset: DetectedAsset, mappedAsset?: AssetMapItem) {
  if (asset.assetType === "image") return true
  if (mappedAsset?.assetType === "image") return true
  if (mappedAsset?.mimeType?.startsWith("image/")) return true

  return false
}

function isFrameAdjustableAsset(
  asset: DetectedAsset,
  mappedAsset?: AssetMapItem,
) {
  if (!mappedAsset) return false

  return isImageAsset(asset, mappedAsset) || isVideoAsset(asset, mappedAsset)
}

function getSafeAssetFrame(frame?: AssetFrame): AssetFrame {
  return {
    fit: frame?.fit || defaultAssetFrame.fit,
    positionX:
      typeof frame?.positionX === "number"
        ? frame.positionX
        : defaultAssetFrame.positionX,
    positionY:
      typeof frame?.positionY === "number"
        ? frame.positionY
        : defaultAssetFrame.positionY,
    scale:
      typeof frame?.scale === "number" ? frame.scale : defaultAssetFrame.scale,
    rotation:
      typeof frame?.rotation === "number"
        ? frame.rotation
        : defaultAssetFrame.rotation,
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(String(reader.result))
    }

    reader.onerror = () => {
      reject(reader.error || new Error("Cannot read file"))
    }

    reader.readAsDataURL(file)
  })
}

export function StudioPage() {
  const [selectedScreen, setSelectedScreen] =
    useState<ScreenPresetId>("16x9")
  const [isScreenBoxOpen, setIsScreenBoxOpen] = useState(false)

  const [durationInput, setDurationInput] = useState("8")

  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [isCodeBoxOpen, setIsCodeBoxOpen] = useState(false)
  const [codeInput, setCodeInput] = useState("")
  const [isCodeLoading, setIsCodeLoading] = useState(false)
  const [isCodeSaving, setIsCodeSaving] = useState(false)

  const [detectedAssets, setDetectedAssets] = useState<DetectedAsset[]>([])
  const [assetMap, setAssetMap] = useState<AssetMap>({ assets: {} })
  const [isAssetScanning, setIsAssetScanning] = useState(false)
  const [uploadingAssetValue, setUploadingAssetValue] = useState<string | null>(
    null,
  )
  const [updatingVideoModeValue, setUpdatingVideoModeValue] = useState<
    string | null
  >(null)

  const [isFrameEditorOpen, setIsFrameEditorOpen] = useState(false)
  const [selectedFrameAssetValue, setSelectedFrameAssetValue] = useState<
    string | null
  >(null)
  const [draftFrame, setDraftFrame] =
    useState<AssetFrame>(defaultAssetFrame)
  const [isSavingFrame, setIsSavingFrame] = useState(false)
  const [isFrameDragging, setIsFrameDragging] = useState(false)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const currentScreenPreset = getScreenPreset(selectedScreen)

  const studioUrl = useMemo(() => {
    return `${REMOTION_STUDIO_URL}?reload=${reloadKey}`
  }, [reloadKey])

  const selectedFrameAsset = useMemo(() => {
    if (!selectedFrameAssetValue) return null

    return (
      detectedAssets.find((asset) => asset.value === selectedFrameAssetValue) ||
      null
    )
  }, [detectedAssets, selectedFrameAssetValue])

  const selectedFrameMappedAsset = useMemo(() => {
    if (!selectedFrameAssetValue) return undefined

    return assetMap.assets?.[selectedFrameAssetValue]
  }, [assetMap.assets, selectedFrameAssetValue])

  const missingAssets = useMemo(() => {
    return detectedAssets.filter((asset) => {
      if (!asset.replaceable) return false
      if (asset.sourceType === "external") return false
      if (asset.sourceType === "base64") return false
      if (assetMap.assets?.[asset.value]) return false

      return true
    })
  }, [assetMap.assets, detectedAssets])

  useEffect(() => {
    async function loadCurrentScreen() {
      try {
        const response = await fetch(`${REMOTION_CONTROL_URL}/screen`)
        const data = await response.json()

        if (data.ok && data.screenPreset) {
          setSelectedScreen(data.screenPreset)
        }
      } catch {
        // control server chưa chạy thì giữ default
      }
    }

    async function loadCurrentDuration() {
      try {
        const response = await fetch(`${REMOTION_CONTROL_URL}/duration`)
        const data = await response.json()

        if (data.ok && data.durationSeconds) {
          setDurationInput(String(data.durationSeconds))
        }
      } catch {
        // control server chưa chạy thì giữ default
      }
    }

    loadCurrentScreen()
    loadCurrentDuration()
  }, [])

  const scanCodeValue = async (code: string) => {
    try {
      setError(null)
      setIsAssetScanning(true)

      const response = await fetch(`${REMOTION_CONTROL_URL}/assets/scan-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
        }),
      })

      const data = (await response.json()) as AssetScanResponse

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot scan assets")
      }

      setDetectedAssets(data.assets || [])
      setAssetMap(data.assetMap || { assets: {} })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAssetScanning(false)
    }
  }

  const selectScreen = async (screenId: ScreenPresetId) => {
    try {
      setError(null)

      const response = await fetch(`${REMOTION_CONTROL_URL}/screen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          screenPreset: screenId,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot update screen size")
      }

      setSelectedScreen(screenId)
      setIsScreenBoxOpen(false)
      setReloadKey((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const applyDuration = async () => {
    try {
      setError(null)

      const nextDuration = Number(durationInput)

      const response = await fetch(`${REMOTION_CONTROL_URL}/duration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          durationSeconds: nextDuration,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot update duration")
      }

      setDurationInput(String(nextDuration))
      setReloadKey((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const openCodeBox = async () => {
    try {
      setError(null)
      setIsCodeBoxOpen(true)
      setIsCodeLoading(true)

      const response = await fetch(`${REMOTION_CONTROL_URL}/code`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot load code")
      }

      const code = data.code || ""

      setCodeInput(code)
      await scanCodeValue(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsCodeLoading(false)
    }
  }

  const applyCode = async () => {
    try {
      setError(null)
      setIsCodeSaving(true)

      const response = await fetch(`${REMOTION_CONTROL_URL}/code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codeInput,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot save code")
      }

      if (data.assetMap) {
        setAssetMap(data.assetMap)
      }

      await scanCodeValue(codeInput)

      setIsCodeBoxOpen(false)
      setReloadKey((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsCodeSaving(false)
    }
  }

  const uploadAssetFile = async (asset: DetectedAsset, file: File) => {
    try {
      setError(null)
      setUploadingAssetValue(asset.value)

      const saveCodeResponse = await fetch(`${REMOTION_CONTROL_URL}/code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codeInput,
        }),
      })

      const saveCodeData = await saveCodeResponse.json()

      if (!saveCodeResponse.ok || !saveCodeData.ok) {
        throw new Error(saveCodeData.error || "Cannot save code before upload")
      }

      const dataUrl = await readFileAsDataUrl(file)

      const uploadResponse = await fetch(`${REMOTION_CONTROL_URL}/assets/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalValue: asset.value,
          fileName: file.name,
          dataUrl,
        }),
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok || !uploadData.ok) {
        throw new Error(uploadData.error || "Cannot upload asset")
      }

      setAssetMap(uploadData.assetMap || { assets: {} })

      await scanCodeValue(codeInput)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploadingAssetValue(null)
    }
  }

  const updateVideoMode = async (
    asset: DetectedAsset,
    nextVideoMode: VideoMode,
  ) => {
    try {
      setError(null)
      setUpdatingVideoModeValue(asset.value)

      const response = await fetch(`${REMOTION_CONTROL_URL}/assets/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalValue: asset.value,
          videoMode: nextVideoMode,
        }),
      })

      const data = (await response.json()) as AssetConfigResponse

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot update video mode")
      }

      setAssetMap(data.assetMap || { assets: {} })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUpdatingVideoModeValue(null)
    }
  }

  const openFrameEditor = (asset: DetectedAsset) => {
    const mappedAsset = assetMap.assets?.[asset.value]

    if (!mappedAsset) return

    setSelectedFrameAssetValue(asset.value)
    setDraftFrame(getSafeAssetFrame(mappedAsset.frame))
    setIsFrameEditorOpen(true)
  }

  const closeFrameEditor = () => {
    setIsFrameEditorOpen(false)
    setSelectedFrameAssetValue(null)
    setDraftFrame(defaultAssetFrame)
    setIsFrameDragging(false)
  }

  const updateDraftFrame = (nextFrame: Partial<AssetFrame>) => {
    setDraftFrame((current) => ({
      ...current,
      ...nextFrame,
    }))
  }

  const resetDraftFrame = () => {
    setDraftFrame(defaultAssetFrame)
  }

  const updateDraftPositionByPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const positionX = ((event.clientX - rect.left) / rect.width) * 100
    const positionY = ((event.clientY - rect.top) / rect.height) * 100

    updateDraftFrame({
      positionX: Math.round(clampNumber(positionX, 0, 100)),
      positionY: Math.round(clampNumber(positionY, 0, 100)),
    })
  }

  const saveFrameConfig = async () => {
    if (!selectedFrameAssetValue) return

    try {
      setError(null)
      setIsSavingFrame(true)

      const response = await fetch(`${REMOTION_CONTROL_URL}/assets/frame`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalValue: selectedFrameAssetValue,
          frame: draftFrame,
        }),
      })

      const data = (await response.json()) as AssetConfigResponse

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot save frame config")
      }

      setAssetMap(data.assetMap || { assets: {} })
      closeFrameEditor()

      // Reload only Remotion iframe so the saved framing is visible immediately.
      setReloadKey((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingFrame(false)
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        key={studioUrl}
        title="Remotion Studio"
        src={studioUrl}
        className="h-full w-full border-0"
      />

      <div className="absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-black/70 p-2 text-white shadow-2xl backdrop-blur">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsScreenBoxOpen((current) => !current)}
            className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <span>{currentScreenPreset.label}</span>
            <span className="text-xs text-black/50">
              {currentScreenPreset.width}×{currentScreenPreset.height}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {isScreenBoxOpen ? (
            <div className="absolute left-0 top-11 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#111418] p-1 shadow-2xl">
              {screenPresets.map((preset) => {
                const isActive = preset.id === selectedScreen

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectScreen(preset.id)}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-white text-black"
                        : "text-white hover:bg-white/10",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block font-semibold">
                        {preset.label}
                      </span>
                      <span
                        className={[
                          "block text-xs",
                          isActive ? "text-black/50" : "text-white/45",
                        ].join(" ")}
                      >
                        {preset.description} · {preset.width}×{preset.height}
                      </span>
                    </span>

                    {isActive ? <Check className="h-4 w-4" /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-black">
          <Clock className="h-4 w-4" />

          <input
            value={durationInput}
            onChange={(event) => setDurationInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyDuration()
              }
            }}
            className="h-6 w-12 bg-transparent text-right outline-none"
            inputMode="numeric"
          />

          <span className="text-xs text-black/50">sec</span>

          <button
            type="button"
            onClick={applyDuration}
            className="rounded-md bg-black px-2 py-1 text-xs font-semibold text-white"
          >
            Apply
          </button>
        </div>

        <Button size="sm" variant="secondary" onClick={openCodeBox}>
          <Code2 className="mr-2 h-4 w-4" />
          Code Box
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Reload
        </Button>

        <Button asChild size="sm" variant="secondary">
          <a href={studioUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </a>
        </Button>

        {error ? (
          <div className="absolute left-0 top-14 max-w-[580px] rounded-lg border border-red-500/30 bg-red-950 px-3 py-2 text-xs text-red-100 shadow-xl">
            {error}
          </div>
        ) : null}
      </div>

      {isCodeBoxOpen ? (
        <div className="absolute right-4 top-20 z-50 flex h-[calc(100%-6rem)] w-[920px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1217] text-white shadow-2xl">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <div>
              <div className="text-sm font-semibold">HTML/CSS/JS Code Box</div>
              <div className="text-xs text-white/45">
                Upload không reload. Adjust frame để chỉnh vùng hiển thị ảnh/video.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCodeBoxOpen(false)}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_400px]">
            <div className="min-h-0 border-r border-white/10 p-3">
              {isCodeLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-white/50">
                  Loading code...
                </div>
              ) : (
                <textarea
                  value={codeInput}
                  onChange={(event) => {
                    setCodeInput(event.target.value)
                  }}
                  spellCheck={false}
                  className="h-full w-full resize-none rounded-xl border border-white/10 bg-[#05070a] p-4 font-mono text-xs leading-5 text-white outline-none transition focus:border-indigo-400"
                />
              )}
            </div>

            <aside className="flex min-h-0 flex-col">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                  <FileImage className="h-4 w-4" />
                  Detected assets
                </div>

                <button
                  type="button"
                  onClick={() => scanCodeValue(codeInput)}
                  disabled={isAssetScanning}
                  className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/15 disabled:opacity-50"
                >
                  <Search className="h-3 w-3" />
                  {isAssetScanning ? "Scanning" : "Scan"}
                </button>
              </div>

              {missingAssets.length > 0 ? (
                <div className="border-b border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    {missingAssets.length} asset chưa upload
                  </div>
                </div>
              ) : detectedAssets.length > 0 ? (
                <div className="border-b border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <Check className="h-3 w-3" />
                    Không còn asset local/slot bị thiếu
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {detectedAssets.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/45">
                    No assets detected. If your code has images/video, use img
                    src, video src, CSS url(...), or placeholder like{" "}
                    {"{{asset:mainPhoto}}"}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detectedAssets.map((asset) => {
                      const mappedAsset = assetMap.assets?.[asset.value]
                      const isUploading = uploadingAssetValue === asset.value
                      const isUpdatingVideoMode =
                        updatingVideoModeValue === asset.value
                      const shouldShowVideoMode = isVideoAsset(asset, mappedAsset)
                      const shouldShowFrameButton = isFrameAdjustableAsset(
                        asset,
                        mappedAsset,
                      )
                      const currentVideoMode =
                        mappedAsset?.videoMode || "natural"
                      const selectedVideoMode = videoModeOptions.find(
                        (option) => option.value === currentVideoMode,
                      )
                      const currentFrame = getSafeAssetFrame(mappedAsset?.frame)

                      return (
                        <div
                          key={asset.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                getAssetStatusClass(asset, mappedAsset),
                              ].join(" ")}
                            >
                              {getAssetStatusLabel(asset, mappedAsset)}
                            </span>

                            <span className="text-[10px] uppercase tracking-wide text-white/35">
                              {mappedAsset?.assetType || asset.assetType}
                            </span>
                          </div>

                          <div className="break-all font-mono text-[11px] leading-4 text-white/75">
                            {asset.value}
                          </div>

                          <div className="mt-2 text-[11px] text-white/35">
                            source: {asset.detectionSource}
                          </div>

                          {mappedAsset ? (
                            <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-[11px] text-emerald-100">
                              <div className="font-semibold">
                                Mapped: {mappedAsset.fileName}
                              </div>
                              <div className="mt-1 text-emerald-100/60">
                                {formatFileSize(mappedAsset.sizeBytes)}
                              </div>
                            </div>
                          ) : null}

                          {asset.sourceType === "external" && !mappedAsset ? (
                            <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-500/10 p-2 text-[11px] text-sky-100">
                              Đang dùng URL ngoài. Có thể upload file để thay
                              thế nếu muốn render ổn định hơn.
                            </div>
                          ) : null}

                          {asset.sourceType === "base64" ? (
                            <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-[11px] text-emerald-100">
                              Asset đã nhúng trực tiếp trong code. Không cần
                              upload.
                            </div>
                          ) : null}

                          {shouldShowVideoMode ? (
                            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="text-[11px] font-semibold text-white/75">
                                  Video behavior
                                </div>

                                {isUpdatingVideoMode ? (
                                  <div className="text-[10px] text-white/35">
                                    Saving...
                                  </div>
                                ) : null}
                              </div>

                              <select
                                value={currentVideoMode}
                                disabled={!mappedAsset || isUpdatingVideoMode}
                                onChange={(event) => {
                                  updateVideoMode(
                                    asset,
                                    event.target.value as VideoMode,
                                  )
                                }}
                                className="h-8 w-full rounded-md border border-white/10 bg-[#05070a] px-2 text-[11px] font-semibold text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {videoModeOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              <div className="mt-2 text-[10px] leading-4 text-white/35">
                                {mappedAsset
                                  ? selectedVideoMode?.description
                                  : "Upload video trước, sau đó chọn behavior."}
                              </div>
                            </div>
                          ) : null}

                          {shouldShowFrameButton ? (
                            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                              <div className="mb-2 text-[11px] font-semibold text-white/75">
                                Frame position
                              </div>

                              <div className="mb-2 grid grid-cols-2 gap-2 text-[10px] text-white/35">
                                <div>X: {currentFrame.positionX}%</div>
                                <div>Y: {currentFrame.positionY}%</div>
                                <div>Scale: {currentFrame.scale.toFixed(2)}</div>
                                <div>Fit: {currentFrame.fit}</div>
                              </div>

                              <button
                                type="button"
                                onClick={() => openFrameEditor(asset)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/[0.08]"
                              >
                                <Crop className="h-3 w-3" />
                                Adjust frame
                              </button>
                            </div>
                          ) : null}

                          {asset.replaceable ? (
                            <div className="mt-3">
                              <input
                                ref={(node) => {
                                  fileInputRefs.current[asset.value] = node
                                }}
                                type="file"
                                className="hidden"
                                accept={
                                  asset.assetType === "image"
                                    ? "image/*"
                                    : asset.assetType === "video"
                                      ? "video/*"
                                      : asset.assetType === "audio"
                                        ? "audio/*"
                                        : undefined
                                }
                                onChange={(event) => {
                                  const file = event.target.files?.[0]

                                  if (file) {
                                    uploadAssetFile(asset, file)
                                  }

                                  event.target.value = ""
                                }}
                              />

                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => {
                                  fileInputRefs.current[asset.value]?.click()
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.06] disabled:opacity-50"
                              >
                                <Upload className="h-3 w-3" />
                                {isUploading
                                  ? "Uploading..."
                                  : mappedAsset
                                    ? "Replace file"
                                    : "Upload replacement"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-white/10 px-4">
            <div className="text-xs text-white/45">
              Apply Code sẽ đóng box và reload preview.
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isAssetScanning || isCodeLoading}
                onClick={() => scanCodeValue(codeInput)}
              >
                <Search className="mr-2 h-4 w-4" />
                Scan Assets
              </Button>

              <Button
                size="sm"
                variant="secondary"
                disabled={isCodeSaving || isCodeLoading}
                onClick={applyCode}
              >
                <Save className="mr-2 h-4 w-4" />
                {isCodeSaving ? "Saving..." : "Apply Code"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isFrameEditorOpen && selectedFrameMappedAsset ? (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 text-white backdrop-blur">
          <div className="flex max-h-[92vh] w-[980px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1217] shadow-2xl">
            <div className="flex min-w-0 flex-1 flex-col border-r border-white/10">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <div>
                  <div className="text-sm font-semibold">Adjust frame</div>
                  <div className="max-w-[560px] truncate text-xs text-white/45">
                    {selectedFrameMappedAsset.fileName}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeFrameEditor}
                  className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center bg-[#05070a] p-6">
                <div
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => {
                    setIsFrameDragging(true)
                    event.currentTarget.setPointerCapture(event.pointerId)
                    updateDraftPositionByPointer(event)
                  }}
                  onPointerMove={(event) => {
                    if (!isFrameDragging) return

                    updateDraftPositionByPointer(event)
                  }}
                  onPointerUp={(event) => {
                    setIsFrameDragging(false)
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }}
                  onPointerCancel={() => {
                    setIsFrameDragging(false)
                  }}
                  className="relative aspect-video w-full max-w-[680px] cursor-crosshair overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
                >
                  <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:33.333%_33.333%]" />

                  {selectedFrameAsset &&
                  isVideoAsset(selectedFrameAsset, selectedFrameMappedAsset) ? (
                    <video
                      src={selectedFrameMappedAsset.replacementUrl}
                      muted
                      playsInline
                      autoPlay
                      loop
                      className="h-full w-full"
                      style={{
                        objectFit: draftFrame.fit,
                        objectPosition: `${draftFrame.positionX}% ${draftFrame.positionY}%`,
                        transform: `scale(${draftFrame.scale}) rotate(${draftFrame.rotation}deg)`,
                        transformOrigin: `${draftFrame.positionX}% ${draftFrame.positionY}%`,
                      }}
                    />
                  ) : (
                    <img
                      src={selectedFrameMappedAsset.replacementUrl}
                      alt={selectedFrameMappedAsset.fileName}
                      className="h-full w-full select-none"
                      draggable={false}
                      style={{
                        objectFit: draftFrame.fit,
                        objectPosition: `${draftFrame.positionX}% ${draftFrame.positionY}%`,
                        transform: `scale(${draftFrame.scale}) rotate(${draftFrame.rotation}deg)`,
                        transformOrigin: `${draftFrame.positionX}% ${draftFrame.positionY}%`,
                      }}
                    />
                  )}

                  <div
                    className="pointer-events-none absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black/60"
                    style={{
                      left: `${draftFrame.positionX}%`,
                      top: `${draftFrame.positionY}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <aside className="flex w-[300px] shrink-0 flex-col">
              <div className="border-b border-white/10 p-4">
                <div className="text-sm font-semibold">Frame controls</div>
                <div className="mt-1 text-xs leading-5 text-white/45">
                  Kéo trực tiếp trên preview hoặc dùng slider để chỉnh vùng ảnh/video.
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/70">
                    Fit mode
                  </label>

                  <select
                    value={draftFrame.fit}
                    onChange={(event) => {
                      updateDraftFrame({
                        fit: event.target.value as AssetFrameFit,
                      })
                    }}
                    className="h-9 w-full rounded-lg border border-white/10 bg-[#05070a] px-3 text-xs font-semibold text-white outline-none"
                  >
                    {frameFitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 text-[11px] leading-4 text-white/35">
                    {
                      frameFitOptions.find(
                        (option) => option.value === draftFrame.fit,
                      )?.description
                    }
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/70">
                    <span>Position X</span>
                    <span>{draftFrame.positionX}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draftFrame.positionX}
                    onChange={(event) => {
                      updateDraftFrame({
                        positionX: Number(event.target.value),
                      })
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/70">
                    <span>Position Y</span>
                    <span>{draftFrame.positionY}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draftFrame.positionY}
                    onChange={(event) => {
                      updateDraftFrame({
                        positionY: Number(event.target.value),
                      })
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/70">
                    <span>Scale</span>
                    <span>{draftFrame.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={4}
                    step={0.01}
                    value={draftFrame.scale}
                    onChange={(event) => {
                      updateDraftFrame({
                        scale: Number(event.target.value),
                      })
                    }}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/70">
                    <span>Rotation</span>
                    <span>{draftFrame.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={draftFrame.rotation}
                    onChange={(event) => {
                      updateDraftFrame({
                        rotation: Number(event.target.value),
                      })
                    }}
                    className="w-full"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-5 text-white/45">
                  Save Frame chỉ reload iframe preview, không reload app. Code Box
                  vẫn giữ nguyên.
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 p-4">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={resetDraftFrame}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={closeFrameEditor}
                  >
                    Cancel
                  </Button>

                  <Button
                    size="sm"
                    type="button"
                    disabled={isSavingFrame}
                    onClick={saveFrameConfig}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSavingFrame ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  )
}