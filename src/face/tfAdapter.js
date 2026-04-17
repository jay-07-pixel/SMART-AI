/** Map TensorFlow.js MediaPipe FaceMesh output to ComparableFace for the heuristic engine. */

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Standard 6-point EAR indices (MediaPipe Face Mesh topology). */
const LEFT_EYE_IDX = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380];

function eyeAspectRatio(keypoints, indices) {
  if (indices.some((i) => !keypoints[i])) return null;
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => keypoints[i]);
  const v1 = dist(p2, p6);
  const v2 = dist(p3, p5);
  const h = dist(p1, p4);
  if (h < 1e-4) return null;
  return (v1 + v2) / (2 * h);
}

function earToOpenProbability(ear) {
  if (ear == null) return null;
  return Math.min(1, Math.max(0, (ear - 0.16) / 0.22));
}

/**
 * Smile proxy: mouth width / face width from corner landmarks (61, 291).
 */
function smileProbability(keypoints, faceWidth) {
  const lm = keypoints[61];
  const rm = keypoints[291];
  if (!lm || !rm || faceWidth < 1e-4) return null;
  const mw = dist(lm, rm);
  const ratio = mw / faceWidth;
  return Math.min(1, Math.max(0, (ratio - 0.32) / 0.18));
}

/**
 * Rough Euler angles (degrees) from landmarks — same order of magnitude as ML Kit for frontal faces.
 */
function estimateHeadAngles(keypoints, boxW, boxH) {
  const nose = keypoints[1];
  const chin = keypoints[152];
  const le = keypoints[33];
  const re = keypoints[263];
  if (!nose || !chin || !le || !re) {
    return { x: 0, y: 0, z: 0 };
  }
  const faceCx = (le.x + re.x) / 2;
  const faceW = Math.max(boxW, 1);
  const faceH = Math.max(boxH, 1);
  const yaw = ((nose.x - faceCx) / faceW) * 75;
  const pitch = ((chin.y - nose.y) / faceH) * 55 - 12;
  const roll =
    (Math.atan2(re.y - le.y, re.x - le.x) * 180) / Math.PI;
  return { x: pitch, y: yaw, z: roll };
}

/**
 * @param {import('@tensorflow-models/face-landmarks-detection').Face} face
 * @param {number} imageWidth
 * @param {number} imageHeight
 */
export function comparableFaceFromTfFace(face, imageWidth, imageHeight) {
  const kp = face.keypoints;
  const box = face.box;
  const w = box.width;
  const h = box.height;
  const left = box.xMin;
  const top = box.yMin;

  const leftEar = eyeAspectRatio(kp, LEFT_EYE_IDX);
  const rightEar = eyeAspectRatio(kp, RIGHT_EYE_IDX);
  const euler = estimateHeadAngles(kp, w, h);
  const smile = smileProbability(kp, w);

  const lePt = kp[159] || kp[33];
  const riPt = kp[386] || kp[263];

  return {
    boundingBox: { width: w, height: h, left, top },
    headEulerAngleX: euler.x,
    headEulerAngleY: euler.y,
    headEulerAngleZ: euler.z,
    leftEyeOpenProbability: earToOpenProbability(leftEar),
    rightEyeOpenProbability: earToOpenProbability(rightEar),
    smilingProbability: smile,
    leftEye: lePt ? { x: lePt.x, y: lePt.y } : null,
    rightEye: riPt ? { x: riPt.x, y: riPt.y } : null,
  };
}
