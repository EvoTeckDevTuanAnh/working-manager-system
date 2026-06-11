import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ExternalLink, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  getScreenPreset,
  screenPresets,
  type ScreenPresetId,
} from "@/remotion/screen-presets"

const REMOTION_STUDIO_URL = "http://localhost:3001"
const REMOTION_CONTROL_URL = "http://localhost:3002"

export function StudioPage() {
  const [selectedScreen, setSelectedScreen] =
    useState<ScreenPresetId>("16x9")
  const [isScreenBoxOpen, setIsScreenBoxOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const currentScreenPreset = getScreenPreset(selectedScreen)

  const studioUrl = useMemo(() => {
    return `${REMOTION_STUDIO_URL}?reload=${reloadKey}`
  }, [reloadKey])

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

    loadCurrentScreen()
  }, [])

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

      // reload iframe để Remotion Studio đọc lại current-screen.ts
      setReloadKey((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
          <div className="absolute left-0 top-14 max-w-[520px] rounded-lg border border-red-500/30 bg-red-950 px-3 py-2 text-xs text-red-100 shadow-xl">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}