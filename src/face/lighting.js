import {
  FACE_MATCH_THRESHOLD_RELAXED,
  FACE_MATCH_THRESHOLD_STRICT,
  GOOD_LIGHTING_THRESHOLD,
  POOR_LIGHTING_THRESHOLD,
} from "./constants.js";

/**
 * Mean grayscale brightness 0–255 from ImageBitmap or HTMLCanvasElement.
 */
export function meanGrayscaleBrightness(source) {
  let canvas;
  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const c = canvas.getContext("2d");
    if (!c) return 128;
    c.drawImage(source, 0, 0);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return 128;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  const n = canvas.width * canvas.height;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return n > 0 ? sum / n : 128;
}

/**
 * Adaptive match threshold from captured bitmap lighting (spec: linear blend 0.85–0.95 between poor/good).
 */
export function getAdaptiveThreshold(meanBrightness) {
  if (meanBrightness >= GOOD_LIGHTING_THRESHOLD) {
    return FACE_MATCH_THRESHOLD_STRICT;
  }
  if (meanBrightness <= POOR_LIGHTING_THRESHOLD) {
    return FACE_MATCH_THRESHOLD_RELAXED;
  }
  const t =
    (meanBrightness - POOR_LIGHTING_THRESHOLD) /
    (GOOD_LIGHTING_THRESHOLD - POOR_LIGHTING_THRESHOLD);
  return FACE_MATCH_THRESHOLD_RELAXED + t * (FACE_MATCH_THRESHOLD_STRICT - FACE_MATCH_THRESHOLD_RELAXED);
}
