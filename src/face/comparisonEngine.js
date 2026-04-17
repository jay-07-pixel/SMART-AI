import {
  BORDERLINE_CRITICAL_MIN,
  BORDERLINE_DELTA,
  MAX_FACE_PROPORTION,
  MAX_HEAD_ANGLE,
  MIN_BEST_FEATURE,
  MIN_EYE_OPEN_PROBABILITY,
  MIN_FACE_PROPORTION,
  MIN_FACE_SIZE,
  MIN_FACE_SIZE_PIXELS,
  MIN_RATIO_SIMILARITY,
  PROPORTIONS_ANGLE_MAX_DIFF,
  PROPORTIONS_ASPECT_MAX_DIFF,
  PROPORTIONS_EYE_SPACING_MAX_DIFF,
  PROPORTIONS_SMILE_DIFF_FAIL,
  SIZE_RATIO_MAX,
  SIZE_RATIO_MIN,
  WEIGHT_EYE,
  WEIGHT_HEAD_ANGLE,
  WEIGHT_RATIO,
  WEIGHT_SMILE,
} from "./constants.js";
import { getAdaptiveThreshold, meanGrayscaleBrightness } from "./lighting.js";

/**
 * @typedef {object} ComparableFace
 * @property {{ width: number; height: number }} boundingBox
 * @property {number} headEulerAngleX
 * @property {number} headEulerAngleY
 * @property {number} headEulerAngleZ
 * @property {number | null} leftEyeOpenProbability
 * @property {number | null} rightEyeOpenProbability
 * @property {number | null} smilingProbability
 * @property {{ x: number; y: number } | null} leftEye
 * @property {{ x: number; y: number } | null} rightEye
 */

export function isFaceSizeValid(face, imageWidth, imageHeight) {
  const w = face.boundingBox.width;
  const h = face.boundingBox.height;
  if (w < MIN_FACE_SIZE_PIXELS || h < MIN_FACE_SIZE_PIXELS) return false;
  const fw = w / imageWidth;
  const fh = h / imageHeight;
  return fw >= MIN_FACE_PROPORTION && fw <= MAX_FACE_PROPORTION && fh >= MIN_FACE_PROPORTION && fh <= MAX_FACE_PROPORTION;
}

export function checkHeadPose(face) {
  return (
    Math.abs(face.headEulerAngleX) <= MAX_HEAD_ANGLE && Math.abs(face.headEulerAngleY) <= MAX_HEAD_ANGLE
  );
}

export function checkFacialProportionsMatch(referenceFace, capturedFace) {
  const refW = referenceFace.boundingBox.width;
  const refH = referenceFace.boundingBox.height;
  const capW = capturedFace.boundingBox.width;
  const capH = capturedFace.boundingBox.height;
  const refRatio = refW / refH;
  const capRatio = capW / capH;
  if (Math.abs(refRatio - capRatio) >= PROPORTIONS_ASPECT_MAX_DIFF) return false;

  if (Math.abs(referenceFace.headEulerAngleX - capturedFace.headEulerAngleX) >= PROPORTIONS_ANGLE_MAX_DIFF) {
    return false;
  }
  if (Math.abs(referenceFace.headEulerAngleY - capturedFace.headEulerAngleY) >= PROPORTIONS_ANGLE_MAX_DIFF) {
    return false;
  }

  const leR = referenceFace.leftEye;
  const riR = referenceFace.rightEye;
  const leC = capturedFace.leftEye;
  const riC = capturedFace.rightEye;
  if (leR && riR && leC && riC) {
    const eyeSpaceR = Math.abs(leR.x - riR.x) / refW;
    const eyeSpaceC = Math.abs(leC.x - riC.x) / capW;
    if (Math.abs(eyeSpaceR - eyeSpaceC) >= PROPORTIONS_EYE_SPACING_MAX_DIFF) return false;
  }

  const sr = referenceFace.smilingProbability;
  const sc = capturedFace.smilingProbability;
  if (sr != null && sc != null && Math.abs(sr - sc) > PROPORTIONS_SMILE_DIFF_FAIL) {
    return false;
  }

  return true;
}

/**
 * @returns {{ pass: boolean; score: number; threshold: number; reason?: string }}
 */
export function simulateFaceComparison(referenceFace, capturedFace, capturedBitmap) {
  const captW = capturedFace.boundingBox.width;
  const captH = capturedFace.boundingBox.height;
  if (captW < MIN_FACE_SIZE || captH < MIN_FACE_SIZE) {
    return { pass: false, score: 0, threshold: 0, reason: "Face too small in capture." };
  }

  const refW = referenceFace.boundingBox.width;
  const refH = referenceFace.boundingBox.height;
  const sizeRatio = Math.min(captW / refW, captH / refH);
  if (sizeRatio < SIZE_RATIO_MIN || sizeRatio > SIZE_RATIO_MAX) {
    return { pass: false, score: 0, threshold: 0, reason: "Face scale mismatch vs reference." };
  }

  const le = capturedFace.leftEyeOpenProbability;
  const re = capturedFace.rightEyeOpenProbability;
  if (le != null && re != null && le < MIN_EYE_OPEN_PROBABILITY && re < MIN_EYE_OPEN_PROBABILITY) {
    return { pass: false, score: 0, threshold: 0, reason: "Eyes appear closed." };
  }

  if (!checkHeadPose(capturedFace)) {
    return { pass: false, score: 0, threshold: 0, reason: "Head pose out of range." };
  }
  if (Math.abs(capturedFace.headEulerAngleX) > MAX_HEAD_ANGLE || Math.abs(capturedFace.headEulerAngleY) > MAX_HEAD_ANGLE) {
    return { pass: false, score: 0, threshold: 0, reason: "Head angles exceed limit." };
  }

  if (!checkFacialProportionsMatch(referenceFace, capturedFace)) {
    return { pass: false, score: 0, threshold: 0, reason: "Facial proportions do not match reference." };
  }

  const brightness = meanGrayscaleBrightness(capturedBitmap);
  const currentThreshold = getAdaptiveThreshold(brightness);

  const refRatio = refW / refH;
  const capRatio = captW / captH;
  const ratioSimilarity = Math.max(0, 1 - Math.abs(refRatio - capRatio) * 4.5);

  const leftEyeSim =
    referenceFace.leftEyeOpenProbability != null && capturedFace.leftEyeOpenProbability != null
      ? 1 - Math.abs(referenceFace.leftEyeOpenProbability - capturedFace.leftEyeOpenProbability)
      : 0;
  const rightEyeSim =
    referenceFace.rightEyeOpenProbability != null && capturedFace.rightEyeOpenProbability != null
      ? 1 - Math.abs(referenceFace.rightEyeOpenProbability - capturedFace.rightEyeOpenProbability)
      : 0;

  const smileSim =
    referenceFace.smilingProbability != null && capturedFace.smilingProbability != null
      ? 1 - Math.abs(referenceFace.smilingProbability - capturedFace.smilingProbability)
      : 0;

  const dX = Math.abs(referenceFace.headEulerAngleX - capturedFace.headEulerAngleX);
  const dY = Math.abs(referenceFace.headEulerAngleY - capturedFace.headEulerAngleY);
  const dZ = Math.abs(referenceFace.headEulerAngleZ - capturedFace.headEulerAngleZ);
  const angleSimX = Math.max(0, 1 - dX / 20);
  const angleSimY = Math.max(0, 1 - dY / 20);
  const angleSimZ = Math.max(0, 1 - dZ / 16);

  let similarityScore = WEIGHT_RATIO * ratioSimilarity;
  let totalWeight = WEIGHT_RATIO;

  if (referenceFace.leftEyeOpenProbability != null && capturedFace.leftEyeOpenProbability != null) {
    similarityScore += WEIGHT_EYE * leftEyeSim;
    totalWeight += WEIGHT_EYE;
  }
  if (referenceFace.rightEyeOpenProbability != null && capturedFace.rightEyeOpenProbability != null) {
    similarityScore += WEIGHT_EYE * rightEyeSim;
    totalWeight += WEIGHT_EYE;
  }
  if (referenceFace.smilingProbability != null && capturedFace.smilingProbability != null) {
    similarityScore += WEIGHT_SMILE * smileSim;
    totalWeight += WEIGHT_SMILE;
  }

  similarityScore += WEIGHT_HEAD_ANGLE * angleSimX + WEIGHT_HEAD_ANGLE * angleSimY + WEIGHT_HEAD_ANGLE * angleSimZ;
  totalWeight += WEIGHT_HEAD_ANGLE * 3;

  const finalScore = similarityScore / totalWeight;

  if (finalScore >= currentThreshold) {
    /* pass score gate */
  } else if (finalScore >= currentThreshold - BORDERLINE_DELTA) {
    const criticalAvg = (angleSimX + angleSimY + angleSimZ + ratioSimilarity) / 4;
    scoreGateOk = criticalAvg >= BORDERLINE_CRITICAL_MIN;
    if (!scoreGateOk) {
      return {
        pass: false,
        score: finalScore,
        threshold: currentThreshold,
        reason: "Borderline: critical features too low.",
      };
    }
  } else {
    return { pass: false, score: finalScore, threshold: currentThreshold, reason: "Match score below threshold." };
  }

  if (ratioSimilarity < MIN_RATIO_SIMILARITY) {
    return { pass: false, score: finalScore, threshold: currentThreshold, reason: "Aspect ratio similarity too low." };
  }

  const bestFeature = Math.max(leftEyeSim, rightEyeSim, angleSimX, angleSimY, angleSimZ);
  if (bestFeature < MIN_BEST_FEATURE) {
    return { pass: false, score: finalScore, threshold: currentThreshold, reason: "No strong matching feature." };
  }

  return { pass: true, score: finalScore, threshold: currentThreshold };
}
