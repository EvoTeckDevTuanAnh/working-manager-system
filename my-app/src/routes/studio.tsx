import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Code2,
  ExternalLink,
  FileImage,
  RefreshCcw,
  Save,
  Search,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getScreenPreset,
  screenPresets,
  type ScreenPresetId,
} from "@/remotion/screen-presets";

const REMOTION_STUDIO_URL = "http://localhost:3001";
const REMOTION_CONTROL_URL = "http://localhost:3002";

type DetectedAsset = {
  id: string;
  value: string;
  detectionSource: string;
  sourceType: "slot" | "base64" | "external" | "internal" | "local";
  assetType: "slot" | "image" | "video" | "audio" | "font" | "unknown";
  replaceable: boolean;
};

type AssetMapItem = {
  originalValue: string;
  fileName: string;
  storedFileName: string;
  replacementUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

type AssetMap = {
  assets?: Record<string, AssetMapItem>;
};

type AssetScanResponse = {
  ok: boolean;
  assets?: DetectedAsset[];
  assetMap?: AssetMap;
  error?: string;
};

function getAssetStatusLabel(asset: DetectedAsset) {
  if (asset.sourceType === "slot") return "Asset slot";
  if (asset.sourceType === "local") return "Local file";
  if (asset.sourceType === "external") return "External URL";
  if (asset.sourceType === "base64") return "Embedded";

  return asset.sourceType;
}

function getAssetStatusClass(asset: DetectedAsset) {
  if (asset.sourceType === "slot") {
    return "border-indigo-400/30 bg-indigo-500/10 text-indigo-200";
  }

  if (asset.sourceType === "local") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }

  if (asset.sourceType === "external") {
    return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  }

  if (asset.sourceType === "base64") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border-white/10 bg-white/10 text-white/60";
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result));
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Cannot read file"));
    };

    reader.readAsDataURL(file);
  });
}

export function StudioPage() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenPresetId>("16x9");
  const [isScreenBoxOpen, setIsScreenBoxOpen] = useState(false);

  const [durationInput, setDurationInput] = useState("8");

  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isCodeBoxOpen, setIsCodeBoxOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [isCodeSaving, setIsCodeSaving] = useState(false);

  const [detectedAssets, setDetectedAssets] = useState<DetectedAsset[]>([]);
  const [assetMap, setAssetMap] = useState<AssetMap>({ assets: {} });
  const [isAssetScanning, setIsAssetScanning] = useState(false);
  const [uploadingAssetValue, setUploadingAssetValue] = useState<string | null>(
    null,
  );

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const currentScreenPreset = getScreenPreset(selectedScreen);

  const studioUrl = useMemo(() => {
    return `${REMOTION_STUDIO_URL}?reload=${reloadKey}`;
  }, [reloadKey]);

  useEffect(() => {
    async function loadCurrentScreen() {
      try {
        const response = await fetch(`${REMOTION_CONTROL_URL}/screen`);
        const data = await response.json();

        if (data.ok && data.screenPreset) {
          setSelectedScreen(data.screenPreset);
        }
      } catch {
        // control server chưa chạy thì giữ default
      }
    }

    async function loadCurrentDuration() {
      try {
        const response = await fetch(`${REMOTION_CONTROL_URL}/duration`);
        const data = await response.json();

        if (data.ok && data.durationSeconds) {
          setDurationInput(String(data.durationSeconds));
        }
      } catch {
        // control server chưa chạy thì giữ default
      }
    }

    loadCurrentScreen();
    loadCurrentDuration();
  }, []);

  const scanCodeValue = async (code: string) => {
    try {
      setError(null);
      setIsAssetScanning(true);

      const response = await fetch(`${REMOTION_CONTROL_URL}/assets/scan-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
        }),
      });

      const data = (await response.json()) as AssetScanResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot scan assets");
      }

      setDetectedAssets(data.assets || []);
      setAssetMap(data.assetMap || { assets: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAssetScanning(false);
    }
  };

  const selectScreen = async (screenId: ScreenPresetId) => {
    try {
      setError(null);

      const response = await fetch(`${REMOTION_CONTROL_URL}/screen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          screenPreset: screenId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot update screen size");
      }

      setSelectedScreen(screenId);
      setIsScreenBoxOpen(false);
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const applyDuration = async () => {
    try {
      setError(null);

      const nextDuration = Number(durationInput);

      const response = await fetch(`${REMOTION_CONTROL_URL}/duration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          durationSeconds: nextDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot update duration");
      }

      setDurationInput(String(nextDuration));
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openCodeBox = async () => {
    try {
      setError(null);
      setIsCodeBoxOpen(true);
      setIsCodeLoading(true);

      const response = await fetch(`${REMOTION_CONTROL_URL}/code`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot load code");
      }

      const code = data.code || "";

      setCodeInput(code);
      await scanCodeValue(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCodeLoading(false);
    }
  };

  const applyCode = async () => {
    try {
      setError(null);
      setIsCodeSaving(true);

      const response = await fetch(`${REMOTION_CONTROL_URL}/code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codeInput,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Cannot save code");
      }

      await scanCodeValue(codeInput);

      // Đóng Code Box để xem full màn hình kết quả
      setIsCodeBoxOpen(false);

      // Apply Code mới reload preview
      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCodeSaving(false);
    }
  };

  const uploadAssetFile = async (asset: DetectedAsset, file: File) => {
    try {
      setError(null);
      setUploadingAssetValue(asset.value);

      // Lưu code hiện tại trước, nhưng không reload preview.
      const saveCodeResponse = await fetch(`${REMOTION_CONTROL_URL}/code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codeInput,
        }),
      });

      const saveCodeData = await saveCodeResponse.json();

      if (!saveCodeResponse.ok || !saveCodeData.ok) {
        throw new Error(saveCodeData.error || "Cannot save code before upload");
      }

      const dataUrl = await readFileAsDataUrl(file);

      const uploadResponse = await fetch(
        `${REMOTION_CONTROL_URL}/assets/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalValue: asset.value,
            fileName: file.name,
            dataUrl,
          }),
        },
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.ok) {
        throw new Error(uploadData.error || "Cannot upload asset");
      }

      setAssetMap(uploadData.assetMap || { assets: {} });

      // Scan lại để cập nhật trạng thái mapped, nhưng không reload preview.
      await scanCodeValue(codeInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingAssetValue(null);
    }
  };

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
                const isActive = preset.id === selectedScreen;

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
                );
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
                applyDuration();
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
        <div className="absolute right-4 top-20 z-50 flex h-[calc(100%-6rem)] w-[840px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1217] text-white shadow-2xl">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <div>
              <div className="text-sm font-semibold">HTML/CSS/JS Code Box</div>
              <div className="text-xs text-white/45">
                Paste full HTML file. Detected assets can be replaced by upload.
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

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px]">
            <div className="min-h-0 border-r border-white/10 p-3">
              {isCodeLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-white/50">
                  Loading code...
                </div>
              ) : (
                <textarea
                  value={codeInput}
                  onChange={(event) => {
                    setCodeInput(event.target.value);
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

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {detectedAssets.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/45">
                    No assets detected. If your code has images, use img src,
                    CSS url(...), or placeholder like {"{{asset:mainPhoto}}"}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detectedAssets.map((asset) => {
                      const mappedAsset = assetMap.assets?.[asset.value];
                      const isUploading = uploadingAssetValue === asset.value;

                      return (
                        <div
                          key={asset.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                getAssetStatusClass(asset),
                              ].join(" ")}
                            >
                              {getAssetStatusLabel(asset)}
                            </span>

                            <span className="text-[10px] uppercase tracking-wide text-white/35">
                              {asset.assetType}
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

                          {asset.replaceable ? (
                            <div className="mt-3">
                              <input
                                ref={(node) => {
                                  fileInputRefs.current[asset.value] = node;
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
                                  const file = event.target.files?.[0];

                                  if (file) {
                                    uploadAssetFile(asset, file);
                                  }

                                  event.target.value = "";
                                }}
                              />

                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => {
                                  fileInputRefs.current[asset.value]?.click();
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
                          ) : (
                            <div className="mt-2 text-[11px] text-white/30">
                              Không cần upload.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-white/10 px-4">
            <div className="text-xs text-white/45">
              Upload không reload. Apply Code mới reload preview.
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
    </div>
  );
}
