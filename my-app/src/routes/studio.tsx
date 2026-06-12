import { useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  Clock,
  Code2,
  ExternalLink,
  RefreshCcw,
  Save,
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

      setCodeInput(data.code || "")
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

      setIsCodeBoxOpen(false)
      setReloadKey((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsCodeSaving(false)
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
        <div className="absolute right-4 top-20 z-50 flex h-[calc(100%-6rem)] w-[620px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1217] text-white shadow-2xl">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <div>
              <div className="text-sm font-semibold">HTML/CSS/JS Code Box</div>
              <div className="text-xs text-white/45">
                Paste full HTML file. Animation should use
                window.remotionRender(ctx).
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

          <div className="min-h-0 flex-1 p-3">
            {isCodeLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-white/50">
                Loading code...
              </div>
            ) : (
              <textarea
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                spellCheck={false}
                className="h-full w-full resize-none rounded-xl border border-white/10 bg-[#05070a] p-4 font-mono text-xs leading-5 text-white outline-none transition focus:border-indigo-400"
              />
            )}
          </div>

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-white/10 px-4">
            <div className="text-xs text-white/45">
              Apply sẽ ghi vào current-code.html và reload Studio.
            </div>

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
      ) : null}
    </div>
  )
}