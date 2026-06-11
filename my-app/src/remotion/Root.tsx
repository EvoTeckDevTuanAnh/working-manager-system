import type { CalculateMetadataFunction } from "remotion"
import { Composition } from "remotion"

import {
  defaultFirstCompositionProps,
  FirstComposition,
  type FirstCompositionProps,
} from "./FirstComposition"
import { currentScreenPresetId } from "./current-screen"
import { getScreenPreset } from "./screen-presets"

const calculateFirstVideoMetadata: CalculateMetadataFunction<
  FirstCompositionProps
> = () => {
  const preset = getScreenPreset(currentScreenPresetId)

  return {
    width: preset.width,
    height: preset.height,
  }
}

export function RemotionRoot() {
  const preset = getScreenPreset(currentScreenPresetId)

  return (
    <>
      <Composition
        id="FirstVideo"
        component={FirstComposition}
        durationInFrames={240}
        fps={30}
        width={preset.width}
        height={preset.height}
        defaultProps={defaultFirstCompositionProps}
        calculateMetadata={calculateFirstVideoMetadata}
      />
    </>
  )
}