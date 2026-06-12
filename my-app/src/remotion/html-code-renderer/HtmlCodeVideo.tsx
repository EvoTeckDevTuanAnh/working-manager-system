import { useEffect, useMemo, useRef, useState } from "react"
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"

const CONTROL_SERVER_URL = "http://localhost:3002"

export function HtmlCodeVideo() {
  const frame = useCurrentFrame()
  const videoConfig = useVideoConfig()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const [loadHandle] = useState(() => delayRender("Loading HTML code iframe"))
  const [isIframeReady, setIsIframeReady] = useState(false)

  const iframeSrc = useMemo(() => {
    return `${CONTROL_SERVER_URL}/code-preview.html?t=${Date.now()}`
  }, [])

  const framePayload = useMemo(
    () => ({
      type: "REMOTION_FRAME",
      frame,
      fps: videoConfig.fps,
      durationInFrames: videoConfig.durationInFrames,
      progress:
        videoConfig.durationInFrames <= 1
          ? 1
          : frame / (videoConfig.durationInFrames - 1),
      width: videoConfig.width,
      height: videoConfig.height,
    }),
    [frame, videoConfig],
  )

  useEffect(() => {
    const iframe = iframeRef.current

    if (!iframe) return

    const onLoad = () => {
      setIsIframeReady(true)
      continueRender(loadHandle)
    }

    iframe.addEventListener("load", onLoad)

    return () => {
      iframe.removeEventListener("load", onLoad)
    }
  }, [loadHandle])

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow

    if (!iframeWindow || !isIframeReady) return

    const frameHandle = delayRender(`Rendering HTML frame ${frame}`)
    let isResolved = false

    const finishFrame = () => {
      if (isResolved) return

      isResolved = true
      continueRender(frameHandle)
    }

    const timeout = window.setTimeout(() => {
      finishFrame()
    }, 1200)

    const onMessage = (event: MessageEvent) => {
      const data = event.data

      if (!data) return

      if (
        data.type === "REMOTION_FRAME_RENDERED" &&
        data.frame === frame
      ) {
        window.clearTimeout(timeout)
        finishFrame()
      }

      if (
        data.type === "REMOTION_FRAME_RENDER_ERROR" &&
        data.frame === frame
      ) {
        window.clearTimeout(timeout)
        finishFrame()
      }
    }

    window.addEventListener("message", onMessage)
    iframeWindow.postMessage(framePayload, "*")

    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener("message", onMessage)
      finishFrame()
    }
  }, [frame, framePayload, isIframeReady])

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        overflow: "hidden",
      }}
    >
      <iframe
        ref={iframeRef}
        title="HTML Code Renderer"
        src={iframeSrc}
        sandbox="allow-scripts"
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: "white",
        }}
      />
    </AbsoluteFill>
  )
}