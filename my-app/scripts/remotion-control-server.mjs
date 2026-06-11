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

const allowedScreens = ["16x9", "9x16", "1x1", "4x5"]

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
  const match = fileContent.match(/currentScreenPresetId:\s*ScreenPresetId\s*=\s*"(.+?)"/)

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