export type ScreenPresetId = "16x9" | "9x16" | "1x1" | "4x5"

export type ScreenPreset = {
  id: ScreenPresetId
  label: string
  description: string
  width: number
  height: number
}

export const screenPresets: ScreenPreset[] = [
  {
    id: "16x9",
    label: "16:9",
    description: "Landscape",
    width: 1920,
    height: 1080,
  },
  {
    id: "9x16",
    label: "9:16",
    description: "Vertical",
    width: 1080,
    height: 1920,
  },
  {
    id: "1x1",
    label: "1:1",
    description: "Square",
    width: 1080,
    height: 1080,
  },
  {
    id: "4x5",
    label: "4:5",
    description: "Social post",
    width: 1080,
    height: 1350,
  },
]

export function getScreenPreset(id: string | null | undefined): ScreenPreset {
  return screenPresets.find((preset) => preset.id === id) ?? screenPresets[0]
}