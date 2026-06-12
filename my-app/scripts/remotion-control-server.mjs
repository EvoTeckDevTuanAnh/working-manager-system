import http from "node:http"
import path from "node:path"
import { readFile, writeFile } from "node:fs/promises"
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

const currentCodeFile = path.join(
  rootDir,
  "src",
  "remotion",
  "html-code-renderer",
  "current-code.html",
)

const allowedScreens = ["16x9", "9x16", "1x1", "4x5"]

const frameBridgeScript = `
<script>
  window.__REMOTION_FRAME_BRIDGE_V2__ = true

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

function injectFrameBridge(html) {
  if (html.includes("__REMOTION_FRAME_BRIDGE_V2__")) {
    return html
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${frameBridgeScript}</body>`)
  }

  return `${html}${frameBridgeScript}`
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
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

      res.writeHead(200, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: true,
          screenPreset,
        }),
      )
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return
  }

  if (req.method === "POST" && req.url === "/screen") {
    try {
      const body = await readBody(req)
      const screenPreset = body.screenPreset || "16x9"

      await setCurrentScreen(screenPreset)

      res.writeHead(200, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: true,
          screenPreset,
        }),
      )
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return
  }

  if (req.method === "GET" && req.url === "/duration") {
    try {
      const durationSeconds = await getCurrentDuration()

      res.writeHead(200, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: true,
          durationSeconds,
        }),
      )
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return
  }

  if (req.method === "POST" && req.url === "/duration") {
    try {
      const body = await readBody(req)
      const durationSeconds = body.durationSeconds || 8

      await setCurrentDuration(durationSeconds)

      res.writeHead(200, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: true,
          durationSeconds,
        }),
      )
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return
  }

  if (req.method === "GET" && req.url === "/code") {
    try {
      const code = await getCurrentCode()

      res.writeHead(200, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: true,
          code,
        }),
      )
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return
  }

  if (req.method === "POST" && req.url === "/code") {
    try {
      const body = await readBody(req)
      const code = body.code || ""

      await setCurrentCode(code)

      res.writeHead(200, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: true,
        }),
      )
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      })

      res.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    return
  }

  if (req.method === "GET" && req.url?.startsWith("/code-preview.html")) {
    try {
      const code = await getCurrentCode()
      const htmlWithBridge = injectFrameBridge(code)

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

  res.writeHead(404, {
    "Content-Type": "application/json",
  })

  res.end(
    JSON.stringify({
      ok: false,
      error: "Not found",
    }),
  )
})

server.listen(PORT, () => {
  console.log(`Remotion control server running at http://localhost:${PORT}`)
})