import http from "node:http"
import path from "node:path"
import { createReadStream } from "node:fs"
import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const PORT = 3002

const currentScreenFile = path.join(
  rootDir,
  "src",
  "remotion",
  "current-screen.ts",
)

const currentDurationFile = path.join(
  rootDir,
  "src",
  "remotion",
  "current-duration.ts",
)

const htmlCodeRendererDir = path.join(
  rootDir,
  "runtime",
  "remotion-html-renderer",
)

const currentCodeFile = path.join(htmlCodeRendererDir, "current-code.html")

const currentAssetMapFile = path.join(
  htmlCodeRendererDir,
  "current-asset-map.json",
)

const activeAssetsDir = path.join(htmlCodeRendererDir, "assets", "active")
const unusedAssetsDir = path.join(htmlCodeRendererDir, "assets", "unused")

const allowedScreens = ["16x9", "9x16", "1x1", "4x5"]
const allowedVideoModes = ["natural", "timeline", "loop", "stretch"]
const allowedFrameFits = ["cover", "contain", "fill"]

const assetExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".wav",
  ".ogg",
  ".aac",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]

const defaultCode = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: white;
        font-family: Inter, system-ui, sans-serif;
      }

      .scene {
        position: relative;
        width: 100vw;
        height: 100vh;
        background: white;
        overflow: hidden;
      }

      .title {
        position: absolute;
        left: 80px;
        top: 80px;
        color: #111827;
        font-size: 72px;
        font-weight: 900;
        letter-spacing: -3px;
        line-height: 0.95;
      }

      .box {
        position: absolute;
        left: 80px;
        top: 220px;
        width: 240px;
        height: 240px;
        border-radius: 36px;
        background: #4f46e5;
      }
    </style>
  </head>

  <body>
    <div class="scene">
      <div class="title">HTML Code Video</div>
      <div class="box"></div>
    </div>

    <script>
      window.remotionRender = function (ctx) {
        const progress = ctx.progress
        const box = document.querySelector(".box")

        if (!box) return

        box.style.transform =
          "translateX(" + progress * 600 + "px) rotate(" + progress * 180 + "deg)"
      }
    </script>
  </body>
</html>
`

const frameBridgeScript = `
<script>
  window.__REMOTION_FRAME_BRIDGE_V5__ = true

  function __sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms)
    })
  }

  function __waitWithTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise(function (resolve) {
        setTimeout(resolve, timeoutMs)
      }),
    ])
  }

  function __waitForImages() {
    var images = Array.prototype.slice.call(document.images || [])

    return Promise.all(
      images.map(function (img) {
        if (img.complete) return Promise.resolve()

        if (typeof img.decode === "function") {
          return img.decode().catch(function () {})
        }

        return new Promise(function (resolve) {
          img.onload = resolve
          img.onerror = resolve
        })
      })
    )
  }

  function __waitForVideoMetadata(video) {
    if (!video) return Promise.resolve()

    if (video.readyState >= 1 && Number.isFinite(video.duration)) {
      return Promise.resolve()
    }

    return new Promise(function (resolve) {
      var done = false

      function finish() {
        if (done) return
        done = true

        video.removeEventListener("loadedmetadata", finish)
        video.removeEventListener("canplay", finish)
        video.removeEventListener("loadeddata", finish)
        video.removeEventListener("error", finish)

        resolve()
      }

      video.addEventListener("loadedmetadata", finish)
      video.addEventListener("canplay", finish)
      video.addEventListener("loadeddata", finish)
      video.addEventListener("error", finish)

      try {
        video.muted = true
        video.playsInline = true
        video.preload = "auto"
        video.load()
      } catch (error) {
        finish()
      }

      setTimeout(finish, 1500)
    })
  }

  function __getAssetConfigByValue(value) {
    if (!value) return null

    var config = window.__REMOTION_ASSET_CONFIG__ || {}
    var candidates = []

    candidates.push(value)

    try {
      candidates.push(new URL(value, window.location.href).href)
    } catch (error) {}

    for (var i = 0; i < candidates.length; i++) {
      var key = candidates[i]

      if (config[key]) {
        return config[key]
      }

      try {
        var decodedKey = decodeURIComponent(key)

        if (config[decodedKey]) {
          return config[decodedKey]
        }
      } catch (error) {}
    }

    return null
  }

  function __getAssetConfigForMediaElement(element) {
    if (!element) return null

    var candidates = []

    if (element.currentSrc) candidates.push(element.currentSrc)
    if (element.src) candidates.push(element.src)

    var srcAttr = element.getAttribute("src")
    if (srcAttr) candidates.push(srcAttr)

    var sources = Array.prototype.slice.call(element.querySelectorAll("source"))

    sources.forEach(function (source) {
      var value = source.getAttribute("src")

      if (!value) return

      candidates.push(value)
    })

    for (var i = 0; i < candidates.length; i++) {
      var assetConfig = __getAssetConfigByValue(candidates[i])

      if (assetConfig) {
        return assetConfig
      }
    }

    return null
  }

  function __getAssetConfigForVideo(video) {
    return __getAssetConfigForMediaElement(video)
  }

  function __normalizeFrameConfig(frame) {
    var safeFrame = frame || {}

    var fit = safeFrame.fit || "cover"

    if (fit !== "cover" && fit !== "contain" && fit !== "fill") {
      fit = "cover"
    }

    return {
      fit: fit,
      positionX:
        typeof safeFrame.positionX === "number" ? safeFrame.positionX : 50,
      positionY:
        typeof safeFrame.positionY === "number" ? safeFrame.positionY : 50,
      scale: typeof safeFrame.scale === "number" ? safeFrame.scale : 1,
      rotation: typeof safeFrame.rotation === "number" ? safeFrame.rotation : 0,
    }
  }

  function __getObjectFitValue(fit) {
    if (fit === "fill") return "fill"
    if (fit === "contain") return "contain"

    return "cover"
  }

  function __getBackgroundSizeValue(fit) {
    if (fit === "fill") return "100% 100%"
    if (fit === "contain") return "contain"

    return "cover"
  }

  function __applyFrameToMediaElement(element, assetConfig) {
    if (!element || !assetConfig || !assetConfig.frame) return

    var frame = __normalizeFrameConfig(assetConfig.frame)

    if (!element.dataset.remotionOriginalTransform) {
      element.dataset.remotionOriginalTransform =
        element.style.transform || "__empty__"
    }

    var originalTransform =
      element.dataset.remotionOriginalTransform === "__empty__"
        ? ""
        : element.dataset.remotionOriginalTransform

    element.style.objectFit = __getObjectFitValue(frame.fit)
    element.style.objectPosition = frame.positionX + "% " + frame.positionY + "%"
    element.style.transformOrigin =
      frame.positionX + "% " + frame.positionY + "%"

    var frameTransform =
      " scale(" + frame.scale + ") rotate(" + frame.rotation + "deg)"

    element.style.transform = (originalTransform + frameTransform).trim()
  }

  function __applyFrameToImageElements() {
    var images = Array.prototype.slice.call(document.querySelectorAll("img"))

    images.forEach(function (image) {
      var assetConfig = __getAssetConfigForMediaElement(image)

      if (!assetConfig) return

      __applyFrameToMediaElement(image, assetConfig)
    })
  }

  function __applyFrameToVideoElements() {
    var videos = Array.prototype.slice.call(document.querySelectorAll("video"))

    videos.forEach(function (video) {
      var assetConfig = __getAssetConfigForMediaElement(video)

      if (!assetConfig) return

      __applyFrameToMediaElement(video, assetConfig)
    })
  }

  function __backgroundIncludesAsset(backgroundImage, assetUrl) {
    if (!backgroundImage || !assetUrl) return false

    if (backgroundImage.indexOf(assetUrl) >= 0) return true

    try {
      var decodedAssetUrl = decodeURIComponent(assetUrl)

      if (backgroundImage.indexOf(decodedAssetUrl) >= 0) return true
    } catch (error) {}

    try {
      var encodedAssetUrl = encodeURI(assetUrl)

      if (backgroundImage.indexOf(encodedAssetUrl) >= 0) return true
    } catch (error) {}

    return false
  }

  function __applyFrameToBackgroundElements() {
    var config = window.__REMOTION_ASSET_CONFIG__ || {}
    var configEntries = Object.entries(config)

    if (configEntries.length === 0) return

    var elements = Array.prototype.slice.call(document.querySelectorAll("*"))

    elements.forEach(function (element) {
      var computedStyle = window.getComputedStyle(element)
      var backgroundImage = computedStyle.backgroundImage

      if (!backgroundImage || backgroundImage === "none") return

      for (var i = 0; i < configEntries.length; i++) {
        var assetUrl = configEntries[i][0]
        var assetConfig = configEntries[i][1]

        if (!assetConfig || !assetConfig.frame) continue

        if (!__backgroundIncludesAsset(backgroundImage, assetUrl)) continue

        var frame = __normalizeFrameConfig(assetConfig.frame)

        element.style.backgroundSize = __getBackgroundSizeValue(frame.fit)
        element.style.backgroundPosition =
          frame.positionX + "% " + frame.positionY + "%"
        element.style.backgroundRepeat = "no-repeat"

        break
      }
    })
  }

  function __applyAssetFrames() {
    __applyFrameToImageElements()
    __applyFrameToVideoElements()
    __applyFrameToBackgroundElements()
  }

  function __getVideoMode(video) {
    var assetConfig = __getAssetConfigForVideo(video)

    if (assetConfig && assetConfig.videoMode) {
      return assetConfig.videoMode
    }

    if (video.getAttribute("data-remotion-video-mode")) {
      return video.getAttribute("data-remotion-video-mode")
    }

    return "natural"
  }

  function __getCompositionDurationSeconds(data) {
    var fps = data.fps || 30
    var durationInFrames = data.durationInFrames || fps

    return Math.max(0.01, durationInFrames / fps)
  }

  function __getVideoTargetTime(video, data) {
    var fps = data.fps || 30
    var frameSecond = data.frame / fps

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return null
    }

    var mode = __getVideoMode(video)

    if (mode === "stretch") {
      return Math.max(
        0,
        Math.min(video.duration - 0.05, data.progress * video.duration)
      )
    }

    if (mode === "loop") {
      return frameSecond % video.duration
    }

    return Math.max(0, Math.min(video.duration - 0.05, frameSecond))
  }

  async function __playVideoNaturally(video, data) {
    if (!video) return

    var mode = __getVideoMode(video)

    try {
      await __waitWithTimeout(__waitForVideoMetadata(video), 1600)

      video.muted = true
      video.playsInline = true
      video.preload = "auto"

      video.playbackRate = 1
      video.loop = mode === "loop"

      if (video.paused) {
        var playResult = video.play()

        if (playResult && typeof playResult.then === "function") {
          await playResult.catch(function () {})
        }
      }
    } catch (error) {
      // Natural preview is best-effort.
    }
  }

  async function __syncVideoToFrame(video, data) {
    if (!video) return

    if (video.hasAttribute("data-remotion-ignore-video-sync")) {
      return
    }

    var mode = __getVideoMode(video)

    if (!data.isRendering) {
      await __playVideoNaturally(video, data)
      return
    }

    if (mode === "natural") {
      await __playVideoNaturally(video, data)
      return
    }

    await __waitWithTimeout(__waitForVideoMetadata(video), 1600)

    var targetTime = __getVideoTargetTime(video, data)

    if (targetTime === null) return

    try {
      video.pause()
      video.muted = true
      video.playsInline = true
      video.preload = "auto"
      video.playbackRate = 1

      if (Math.abs(video.currentTime - targetTime) > 0.033) {
        var seekPromise = new Promise(function (resolve) {
          var done = false

          function finish() {
            if (done) return
            done = true

            video.removeEventListener("seeked", finish)
            video.removeEventListener("canplay", finish)
            video.removeEventListener("loadeddata", finish)
            video.removeEventListener("error", finish)

            resolve()
          }

          video.addEventListener("seeked", finish)
          video.addEventListener("canplay", finish)
          video.addEventListener("loadeddata", finish)
          video.addEventListener("error", finish)

          video.currentTime = targetTime

          setTimeout(finish, 1800)
        })

        await __waitWithTimeout(seekPromise, 1900)
      }

      if (typeof video.requestVideoFrameCallback === "function") {
        await __waitWithTimeout(
          new Promise(function (resolve) {
            video.requestVideoFrameCallback(function () {
              resolve()
            })
          }),
          500
        )
      } else {
        await __sleep(30)
      }
    } catch (error) {
      // Không để một video lỗi làm chết cả render.
    }
  }

  async function __syncVideosToFrame(data) {
    var videos = Array.prototype.slice.call(document.querySelectorAll("video"))

    await Promise.all(
      videos.map(function (video) {
        return __syncVideoToFrame(video, data)
      })
    )
  }

  async function __waitForFrameReady(data) {
    var tasks = []

    if (document.fonts && document.fonts.ready) {
      tasks.push(document.fonts.ready.catch(function () {}))
    }

    tasks.push(__waitForImages())
    tasks.push(__syncVideosToFrame(data))

    await Promise.race([
      Promise.all(tasks),
      new Promise(function (resolve) {
        setTimeout(resolve, 4500)
      }),
    ])
  }

  window.addEventListener("message", async function (event) {
    const data = event.data

    if (!data || data.type !== "REMOTION_FRAME") return

    try {
      if (typeof window.remotionRender === "function") {
        const result = window.remotionRender(data)

        if (result && typeof result.then === "function") {
          await result
        }
      }

      __applyAssetFrames()

      await __waitForFrameReady(data)

      window.parent.postMessage(
        {
          type: "REMOTION_FRAME_RENDERED",
          frame: data.frame,
        },
        "*"
      )
    } catch (error) {
      window.parent.postMessage(
        {
          type: "REMOTION_FRAME_RENDER_ERROR",
          frame: data.frame,
          error:
            error && error.message
              ? error.message
              : String(error),
        },
        "*"
      )
    }
  })
</script>
`

async function ensureStorage() {
  await mkdir(htmlCodeRendererDir, { recursive: true })
  await mkdir(activeAssetsDir, { recursive: true })
  await mkdir(unusedAssetsDir, { recursive: true })

  try {
    await stat(currentAssetMapFile)
  } catch {
    await writeFile(
      currentAssetMapFile,
      JSON.stringify({ assets: {} }, null, 2),
      "utf8",
    )
  }

  try {
    await stat(currentCodeFile)
  } catch {
    await writeFile(currentCodeFile, defaultCode, "utf8")
  }
}

function injectFrameBridge(html) {
  if (
    html.includes("__REMOTION_FRAME_BRIDGE_V2__") ||
    html.includes("__REMOTION_FRAME_BRIDGE_V3__") ||
    html.includes("__REMOTION_FRAME_BRIDGE_V4__") ||
    html.includes("__REMOTION_FRAME_BRIDGE_V5__")
  ) {
    return html
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${frameBridgeScript}</body>`)
  }

  return `${html}${frameBridgeScript}`
}

function clampNumber(value, min, max, fallback) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.max(min, Math.min(max, numberValue))
}

function normalizeAssetFrame(frame) {
  const safeFrame = frame && typeof frame === "object" ? frame : {}

  const fit = allowedFrameFits.includes(safeFrame.fit)
    ? safeFrame.fit
    : "cover"

  return {
    fit,
    positionX: clampNumber(safeFrame.positionX, 0, 100, 50),
    positionY: clampNumber(safeFrame.positionY, 0, 100, 50),
    scale: clampNumber(safeFrame.scale, 0.25, 4, 1),
    rotation: clampNumber(safeFrame.rotation, -180, 180, 0),
  }
}

function createAssetConfigScript(assetMap) {
  const config = {}
  const assets = assetMap.assets || {}

  for (const [originalValue, assetData] of Object.entries(assets)) {
    if (!assetData || !assetData.replacementUrl) continue

    const assetType =
      assetData.assetType ||
      (assetData.mimeType && assetData.mimeType.startsWith("video/")
        ? "video"
        : assetData.mimeType && assetData.mimeType.startsWith("image/")
          ? "image"
          : getAssetType(assetData.fileName || originalValue))

    if (assetType !== "image" && assetType !== "video") continue

    config[assetData.replacementUrl] = {
      originalValue,
      fileName: assetData.fileName || "",
      assetType,
      frame: normalizeAssetFrame(assetData.frame),
      ...(assetType === "video"
        ? {
            videoMode: assetData.videoMode || "natural",
          }
        : {}),
    }
  }

  const safeJson = JSON.stringify(config).replace(/</g, "\\u003c")

  return `<script>window.__REMOTION_ASSET_CONFIG__ = ${safeJson};</script>`
}

function injectAssetConfig(html, assetMap) {
  const assetConfigScript = createAssetConfigScript(assetMap)

  if (html.includes("__REMOTION_ASSET_CONFIG__")) {
    return html
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${assetConfigScript}</body>`)
  }

  return `${html}${assetConfigScript}`
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
  })

  res.end(JSON.stringify(data))
}

function sendError(res, statusCode, error) {
  sendJson(res, statusCode, {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ""

    req.on("data", (chunk) => {
      body += chunk
    })

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })

    req.on("error", reject)
  })
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
  }

  return mimeMap[ext] || "application/octet-stream"
}

function hasAssetExtension(value) {
  const cleanValue = value.split("?")[0].split("#")[0].toLowerCase()

  return assetExtensions.some((extension) => cleanValue.endsWith(extension))
}

function getAssetType(value) {
  const cleanValue = value.split("?")[0].split("#")[0].toLowerCase()

  if (
    [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"].some((ext) =>
      cleanValue.endsWith(ext),
    )
  ) {
    return "image"
  }

  if ([".mp4", ".webm", ".mov"].some((ext) => cleanValue.endsWith(ext))) {
    return "video"
  }

  if (
    [".mp3", ".wav", ".ogg", ".aac"].some((ext) =>
      cleanValue.endsWith(ext),
    )
  ) {
    return "audio"
  }

  if (
    [".woff", ".woff2", ".ttf", ".otf"].some((ext) =>
      cleanValue.endsWith(ext),
    )
  ) {
    return "font"
  }

  return "unknown"
}

function getSourceType(value) {
  if (value.startsWith("{{asset:")) return "slot"
  if (value.startsWith("data:")) return "base64"
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return "external"
  }
  if (value.startsWith("//")) return "external"
  if (value.startsWith("#")) return "internal"

  return "local"
}

function shouldIgnoreAsset(value) {
  if (!value) return true

  const trimmed = value.trim()

  if (!trimmed) return true
  if (trimmed.startsWith("#")) return true
  if (trimmed.startsWith("mailto:")) return true
  if (trimmed.startsWith("tel:")) return true
  if (trimmed.startsWith("javascript:")) return true
  if (trimmed.startsWith("blob:")) return true

  return false
}

function normalizeAssetValue(value) {
  return value.trim().replace(/^['"]|['"]$/g, "")
}

function createAssetRecord(value, detectionSource) {
  const normalizedValue = normalizeAssetValue(value)
  const sourceType = getSourceType(normalizedValue)

  return {
    id: Buffer.from(normalizedValue).toString("base64url"),
    value: normalizedValue,
    detectionSource,
    sourceType,
    assetType: sourceType === "slot" ? "slot" : getAssetType(normalizedValue),
    replaceable: sourceType !== "base64" && sourceType !== "internal",
  }
}

function addAsset(assetMap, value, detectionSource) {
  const normalizedValue = normalizeAssetValue(value)

  if (shouldIgnoreAsset(normalizedValue)) return

  const sourceType = getSourceType(normalizedValue)

  if (
    sourceType !== "slot" &&
    sourceType !== "base64" &&
    !hasAssetExtension(normalizedValue)
  ) {
    return
  }

  if (!assetMap.has(normalizedValue)) {
    assetMap.set(
      normalizedValue,
      createAssetRecord(normalizedValue, detectionSource),
    )
  }
}

function scanSrcset(assetMap, srcsetValue) {
  const parts = srcsetValue.split(",")

  for (const part of parts) {
    const candidate = part.trim().split(/\s+/)[0]

    addAsset(assetMap, candidate, "srcset")
  }
}

function scanAssetsFromCode(code) {
  const assetMap = new Map()

  const slotRegex = /\{\{asset:([a-zA-Z0-9_-]+)\}\}/g

  for (const match of code.matchAll(slotRegex)) {
    addAsset(assetMap, `{{asset:${match[1]}}}`, "asset-slot")
  }

  const htmlAssetRegex =
    /\b(src|href|poster)\s*=\s*["']([^"']+)["']/gi

  for (const match of code.matchAll(htmlAssetRegex)) {
    addAsset(assetMap, match[2], `html-${match[1].toLowerCase()}`)
  }

  const srcsetRegex = /\bsrcset\s*=\s*["']([^"']+)["']/gi

  for (const match of code.matchAll(srcsetRegex)) {
    scanSrcset(assetMap, match[1])
  }

  const cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi

  for (const match of code.matchAll(cssUrlRegex)) {
    addAsset(assetMap, match[2], "css-url")
  }

  const jsStringAssetRegex =
    /["'`]([^"'`]+\.(jpg|jpeg|png|webp|gif|svg|avif|mp4|webm|mov|mp3|wav|ogg|aac|woff|woff2|ttf|otf)(\?[^"'`]*)?(#[^"'`]*)?)["'`]/gi

  for (const match of code.matchAll(jsStringAssetRegex)) {
    addAsset(assetMap, match[1], "js-string")
  }

  return Array.from(assetMap.values())
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function rewriteCodeWithAssetMap(code, assetMap) {
  let output = code
  const assets = assetMap.assets || {}

  for (const [originalValue, assetData] of Object.entries(assets)) {
    if (!assetData || !assetData.replacementUrl) continue

    output = output.replace(
      new RegExp(escapeRegExp(originalValue), "g"),
      assetData.replacementUrl,
    )
  }

  return output
}

function sanitizeFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  const base = path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)

  const safeBase = base || "asset"
  const safeExt = ext || ".bin"

  return `${safeBase}${safeExt}`
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!match) {
    throw new Error("Invalid data URL")
  }

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], "base64")

  return {
    mimeType,
    buffer,
  }
}

async function deleteFileIfExists(filePath) {
  try {
    await rm(filePath, {
      force: true,
    })
  } catch {
    // ignore
  }
}

async function deleteStoredAssetFile(storedFileName) {
  if (!storedFileName || typeof storedFileName !== "string") return

  const safeStoredFileName = path.basename(storedFileName)
  const filePath = path.join(activeAssetsDir, safeStoredFileName)

  if (!filePath.startsWith(activeAssetsDir)) return

  await deleteFileIfExists(filePath)
}

async function cleanupOrphanActiveAssets(assetMap) {
  const usedFiles = new Set(
    Object.values(assetMap.assets || {})
      .map((assetData) => assetData?.storedFileName)
      .filter(Boolean),
  )

  try {
    const files = await readdir(activeAssetsDir)

    await Promise.all(
      files.map(async (fileName) => {
        if (fileName === ".gitkeep") return
        if (usedFiles.has(fileName)) return

        await deleteFileIfExists(path.join(activeAssetsDir, fileName))
      }),
    )
  } catch {
    // ignore
  }
}

async function cleanupUnusedAssetsForCode(code, assetMap) {
  const detectedAssets = scanAssetsFromCode(code)
  const activeOriginalValues = new Set(
    detectedAssets.map((asset) => asset.value),
  )

  const nextAssetMap = {
    assets: {
      ...(assetMap.assets || {}),
    },
  }

  for (const [originalValue, assetData] of Object.entries(
    assetMap.assets || {},
  )) {
    if (activeOriginalValues.has(originalValue)) continue

    await deleteStoredAssetFile(assetData?.storedFileName)
    delete nextAssetMap.assets[originalValue]
  }

  await cleanupOrphanActiveAssets(nextAssetMap)

  return nextAssetMap
}

async function getCurrentScreen() {
  const fileContent = await readFile(currentScreenFile, "utf8")
  const match = fileContent.match(
    /currentScreenPresetId:\s*ScreenPresetId\s*=\s*"(.+?)"/,
  )

  return match?.[1] || "16x9"
}

async function setCurrentScreen(screenPreset) {
  if (!allowedScreens.includes(screenPreset)) {
    throw new Error(`Invalid screen preset: ${screenPreset}`)
  }

  const content = `import type { ScreenPresetId } from "./screen-presets"

export const currentScreenPresetId: ScreenPresetId = "${screenPreset}"
`

  await writeFile(currentScreenFile, content, "utf8")
}

async function getCurrentDuration() {
  const fileContent = await readFile(currentDurationFile, "utf8")
  const match = fileContent.match(/currentDurationSeconds\s*=\s*(\d+)/)

  return Number(match?.[1] || 8)
}

async function setCurrentDuration(seconds) {
  const durationSeconds = Number(seconds)

  if (!Number.isFinite(durationSeconds)) {
    throw new Error("Duration must be a valid number")
  }

  if (durationSeconds < 1 || durationSeconds > 120) {
    throw new Error("Duration must be between 1 and 120 seconds")
  }

  const content = `export const currentDurationSeconds = ${Math.round(
    durationSeconds,
  )}
`

  await writeFile(currentDurationFile, content, "utf8")
}

async function getCurrentCode() {
  return readFile(currentCodeFile, "utf8")
}

async function setCurrentCode(code) {
  if (typeof code !== "string") {
    throw new Error("Code must be a string")
  }

  await writeFile(currentCodeFile, code, "utf8")

  const currentAssetMap = await getCurrentAssetMap()
  const cleanedAssetMap = await cleanupUnusedAssetsForCode(code, currentAssetMap)

  await setCurrentAssetMap(cleanedAssetMap)

  return cleanedAssetMap
}

async function getCurrentAssetMap() {
  try {
    const fileContent = await readFile(currentAssetMapFile, "utf8")
    return JSON.parse(fileContent)
  } catch {
    return {
      assets: {},
    }
  }
}

async function setCurrentAssetMap(assetMap) {
  const safeMap =
    assetMap && typeof assetMap === "object" && assetMap.assets
      ? assetMap
      : { assets: {} }

  await writeFile(currentAssetMapFile, JSON.stringify(safeMap, null, 2), "utf8")
}

async function updateAssetConfig({ originalValue, videoMode }) {
  if (!originalValue || typeof originalValue !== "string") {
    throw new Error("originalValue is required")
  }

  const assetMap = await getCurrentAssetMap()
  const currentAsset = assetMap.assets?.[originalValue]

  if (!currentAsset) {
    throw new Error("Asset not found in asset map")
  }

  const nextVideoMode = videoMode || currentAsset.videoMode || "natural"

  if (!allowedVideoModes.includes(nextVideoMode)) {
    throw new Error(`Invalid video mode: ${nextVideoMode}`)
  }

  assetMap.assets = {
    ...(assetMap.assets || {}),
    [originalValue]: {
      ...currentAsset,
      videoMode: nextVideoMode,
      updatedAt: new Date().toISOString(),
    },
  }

  await setCurrentAssetMap(assetMap)

  return {
    assetMap,
    updatedAsset: assetMap.assets[originalValue],
  }
}

async function updateAssetFrame({ originalValue, frame }) {
  if (!originalValue || typeof originalValue !== "string") {
    throw new Error("originalValue is required")
  }

  const assetMap = await getCurrentAssetMap()
  const currentAsset = assetMap.assets?.[originalValue]

  if (!currentAsset) {
    throw new Error("Asset not found in asset map")
  }

  const normalizedFrame = normalizeAssetFrame(frame)

  assetMap.assets = {
    ...(assetMap.assets || {}),
    [originalValue]: {
      ...currentAsset,
      frame: normalizedFrame,
      updatedAt: new Date().toISOString(),
    },
  }

  await setCurrentAssetMap(assetMap)

  return {
    assetMap,
    updatedAsset: assetMap.assets[originalValue],
  }
}

async function uploadAssetReplacement({ originalValue, fileName, dataUrl }) {
  if (!originalValue || typeof originalValue !== "string") {
    throw new Error("originalValue is required")
  }

  if (!fileName || typeof fileName !== "string") {
    throw new Error("fileName is required")
  }

  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("dataUrl is required")
  }

  const { mimeType, buffer } = parseDataUrl(dataUrl)

  if (buffer.byteLength > 50 * 1024 * 1024) {
    throw new Error("File is too large. Max size is 50MB")
  }

  await mkdir(activeAssetsDir, { recursive: true })

  const assetMap = await getCurrentAssetMap()
  const previousAsset = assetMap.assets?.[originalValue]

  if (previousAsset?.storedFileName) {
    await deleteStoredAssetFile(previousAsset.storedFileName)
  }

  const safeFileName = sanitizeFileName(fileName)
  const assetId = Buffer.from(originalValue).toString("base64url")
  const storedFileName = `${assetId}-${Date.now()}-${safeFileName}`
  const outputPath = path.join(activeAssetsDir, storedFileName)

  await writeFile(outputPath, buffer)

  const replacementUrl = `http://localhost:${PORT}/assets/active/${encodeURIComponent(
    storedFileName,
  )}`

  const assetType = mimeType.startsWith("video/")
    ? "video"
    : mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("audio/")
        ? "audio"
        : getAssetType(fileName || originalValue)

  const previousVideoMode = previousAsset?.videoMode
  const previousFrame = previousAsset?.frame

  const videoMode =
    assetType === "video" ? previousVideoMode || "natural" : undefined

  assetMap.assets = {
    ...(assetMap.assets || {}),
    [originalValue]: {
      originalValue,
      fileName,
      storedFileName,
      replacementUrl,
      mimeType,
      assetType,
      sizeBytes: buffer.byteLength,
      uploadedAt: new Date().toISOString(),
      frame: normalizeAssetFrame(previousFrame),
      ...(videoMode ? { videoMode } : {}),
    },
  }

  await setCurrentAssetMap(assetMap)
  await cleanupOrphanActiveAssets(assetMap)

  return {
    assetMap,
    uploadedAsset: assetMap.assets[originalValue],
  }
}

async function serveActiveAsset(req, res) {
  const rawAssetPath = decodeURIComponent(
    req.url.replace("/assets/active/", ""),
  )

  const safeAssetPath = path.normalize(rawAssetPath).replace(/^(\.\.[/\\])+/, "")
  const filePath = path.join(activeAssetsDir, safeAssetPath)

  if (!filePath.startsWith(activeAssetsDir)) {
    sendError(res, 403, "Invalid asset path")
    return
  }

  try {
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const mimeType = getMimeType(filePath)
    const range = req.headers.range

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/)

      if (!match) {
        res.writeHead(416, {
          "Content-Range": `bytes */${fileSize}`,
        })
        res.end()
        return
      }

      let start = match[1] ? Number.parseInt(match[1], 10) : 0
      let end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1

      if (!match[1] && match[2]) {
        const suffixLength = Number.parseInt(match[2], 10)
        start = Math.max(fileSize - suffixLength, 0)
        end = fileSize - 1
      }

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end < start ||
        start >= fileSize
      ) {
        res.writeHead(416, {
          "Content-Range": `bytes */${fileSize}`,
        })
        res.end()
        return
      }

      end = Math.min(end, fileSize - 1)

      const chunkSize = end - start + 1

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": mimeType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      })

      createReadStream(filePath, {
        start,
        end,
      }).pipe(res)

      return
    }

    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": fileSize,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    })

    createReadStream(filePath).pipe(res)
  } catch {
    sendError(res, 404, "Asset not found")
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === "GET" && req.url === "/screen") {
    try {
      const screenPreset = await getCurrentScreen()

      sendJson(res, 200, {
        ok: true,
        screenPreset,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/screen") {
    try {
      const body = await readBody(req)
      const screenPreset = body.screenPreset || "16x9"

      await setCurrentScreen(screenPreset)

      sendJson(res, 200, {
        ok: true,
        screenPreset,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "GET" && req.url === "/duration") {
    try {
      const durationSeconds = await getCurrentDuration()

      sendJson(res, 200, {
        ok: true,
        durationSeconds,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/duration") {
    try {
      const body = await readBody(req)
      const durationSeconds = body.durationSeconds || 8

      await setCurrentDuration(durationSeconds)

      sendJson(res, 200, {
        ok: true,
        durationSeconds,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "GET" && req.url === "/code") {
    try {
      const code = await getCurrentCode()

      sendJson(res, 200, {
        ok: true,
        code,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/code") {
    try {
      const body = await readBody(req)
      const code = body.code || ""
      const assetMap = await setCurrentCode(code)

      sendJson(res, 200, {
        ok: true,
        assetMap,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "GET" && req.url === "/asset-map") {
    try {
      const assetMap = await getCurrentAssetMap()

      sendJson(res, 200, {
        ok: true,
        assetMap,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/asset-map") {
    try {
      const body = await readBody(req)
      const assetMap = body.assetMap || { assets: {} }

      await setCurrentAssetMap(assetMap)
      await cleanupOrphanActiveAssets(assetMap)

      sendJson(res, 200, {
        ok: true,
        assetMap,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/assets/config") {
    try {
      const body = await readBody(req)

      const result = await updateAssetConfig({
        originalValue: body.originalValue,
        videoMode: body.videoMode,
      })

      sendJson(res, 200, {
        ok: true,
        ...result,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/assets/frame") {
    try {
      const body = await readBody(req)

      const result = await updateAssetFrame({
        originalValue: body.originalValue,
        frame: body.frame,
      })

      sendJson(res, 200, {
        ok: true,
        ...result,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "GET" && req.url === "/assets/scan") {
    try {
      const code = await getCurrentCode()
      const detectedAssets = scanAssetsFromCode(code)
      const assetMap = await getCurrentAssetMap()

      sendJson(res, 200, {
        ok: true,
        assets: detectedAssets,
        assetMap,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/assets/scan-code") {
    try {
      const body = await readBody(req)
      const code = typeof body.code === "string" ? body.code : ""
      const detectedAssets = scanAssetsFromCode(code)
      const assetMap = await getCurrentAssetMap()

      sendJson(res, 200, {
        ok: true,
        assets: detectedAssets,
        assetMap,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "POST" && req.url === "/assets/upload") {
    try {
      const body = await readBody(req)

      const result = await uploadAssetReplacement({
        originalValue: body.originalValue,
        fileName: body.fileName,
        dataUrl: body.dataUrl,
      })

      sendJson(res, 200, {
        ok: true,
        ...result,
      })
    } catch (error) {
      sendError(res, 500, error)
    }

    return
  }

  if (req.method === "GET" && req.url?.startsWith("/assets/active/")) {
    await serveActiveAsset(req, res)
    return
  }

  if (req.method === "GET" && req.url?.startsWith("/code-preview.html")) {
    try {
      const code = await getCurrentCode()
      const assetMap = await getCurrentAssetMap()
      const rewrittenCode = rewriteCodeWithAssetMap(code, assetMap)
      const htmlWithAssetConfig = injectAssetConfig(rewrittenCode, assetMap)
      const htmlWithBridge = injectFrameBridge(htmlWithAssetConfig)

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      })

      res.end(htmlWithBridge)
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
      })

      res.end(error instanceof Error ? error.message : String(error))
    }

    return
  }

  sendJson(res, 404, {
    ok: false,
    error: "Not found",
  })
})

ensureStorage()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Remotion control server running at http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error("Failed to start Remotion control server:", error)
    process.exit(1)
  })