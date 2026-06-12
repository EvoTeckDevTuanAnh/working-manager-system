import { Composition } from "remotion"

import {
  defaultFirstCompositionProps,
  FirstComposition,
} from "./FirstComposition"
import { HtmlCodeVideo } from "./html-code-renderer/HtmlCodeVideo"
import { currentDurationSeconds } from "./current-duration"
import { currentScreenPresetId } from "./current-screen"
import { getScreenPreset } from "./screen-presets"

const FPS = 30

function getDurationInFrames(seconds: number) {
  return Math.max(1, Math.round(seconds * FPS))
}

function getSharedMetadata() {
  const preset = getScreenPreset(currentScreenPresetId)

  return {
    width: preset.width,
    height: preset.height,
    fps: FPS,
    durationInFrames: getDurationInFrames(currentDurationSeconds),
  }
}

export function RemotionRoot() {
  const metadata = getSharedMetadata()

  return (
    <>
      {/* <Composition
        id="FirstVideo"
        component={FirstComposition}
        durationInFrames={metadata.durationInFrames}
        fps={metadata.fps}
        width={metadata.width}
        height={metadata.height}
        defaultProps={defaultFirstCompositionProps}
      /> */}

      <Composition
        id="HtmlCodeVideo"
        component={HtmlCodeVideo}
        durationInFrames={metadata.durationInFrames}
        fps={metadata.fps}
        width={metadata.width}
        height={metadata.height}
      />
    </>
  )
}