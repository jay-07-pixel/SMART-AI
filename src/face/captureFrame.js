/**
 * Draws the current video frame into the canvas with the same horizontal orientation
 * as the on-screen preview (see `.face-scan-video` CSS). Keeps enroll/verify pixels aligned
 * with what the user sees.
 */
export function drawFrontCameraToCanvas(video, canvas) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return false;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  canvas.width = w;
  canvas.height = h;
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();
  return true;
}
