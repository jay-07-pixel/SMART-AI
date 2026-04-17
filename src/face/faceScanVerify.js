import { isFaceSizeValid, simulateFaceComparison } from "./comparisonEngine.js";
import { detectFacesForVerification, getFaceDetector } from "./detectorService.js";
import { comparableFaceFromTfFace } from "./tfAdapter.js";
import { loadReferenceFaceImage } from "./referenceImage.js";

/**
 * @param {string} uid
 * @param {ImageBitmap} liveBitmap
 */
export async function compareFacesPipeline(uid, liveBitmap) {
  const detector = await getFaceDetector();

  let refBitmap;
  try {
    refBitmap = await loadReferenceFaceImage(uid);
  } catch (e) {
    if (e?.message === "MISSING_REFERENCE") {
      return {
        pass: false,
        score: 0,
        threshold: 0,
        reason: "No reference photo. Upload faces/<yourUserId>.jpg to Storage or set faceImageUrl on your Students document.",
      };
    }
    throw e;
  }

  try {
    const refDetect = await detectFacesForVerification(detector, refBitmap);
    if (refDetect.error === "NO_FACE") {
      return { pass: false, score: 0, threshold: 0, reason: "No face found in reference image." };
    }
    if (refDetect.error === "MULTIPLE_FACES") {
      return { pass: false, score: 0, threshold: 0, reason: "Multiple faces in reference image." };
    }

    const capDetect = await detectFacesForVerification(detector, liveBitmap);
    if (capDetect.error === "NO_FACE") {
      return { pass: false, score: 0, threshold: 0, reason: "No face detected. Center your face." };
    }
    if (capDetect.error === "MULTIPLE_FACES") {
      return { pass: false, score: 0, threshold: 0, reason: "Multiple faces in camera view." };
    }

    const refW = refBitmap.width;
    const refH = refBitmap.height;
    const capW = liveBitmap.width;
    const capH = liveBitmap.height;

    const refFace = comparableFaceFromTfFace(refDetect.face, refW, refH);
    const capFace = comparableFaceFromTfFace(capDetect.face, capW, capH);

    if (!isFaceSizeValid(refFace, refW, refH)) {
      return { pass: false, score: 0, threshold: 0, reason: "Reference face size invalid." };
    }
    if (!isFaceSizeValid(capFace, capW, capH)) {
      return { pass: false, score: 0, threshold: 0, reason: "Move closer or farther — face size out of range." };
    }

    const out = simulateFaceComparison(refFace, capFace, liveBitmap);
    return {
      pass: out.pass,
      score: out.score,
      threshold: out.threshold,
      reason: out.reason,
    };
  } finally {
    refBitmap.close();
  }
}
