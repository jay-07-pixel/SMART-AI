import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

let detectorPromise = null;

export async function getFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.ready();
      await tf.setBackend("webgl");
      return faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 2,
        }
      );
    })();
  }
  return detectorPromise;
}

/**
 * @param {import('@tensorflow-models/face-landmarks-detection').FaceLandmarksDetector} detector
 * @param {import('@tensorflow-models/face-landmarks-detection').FaceLandmarksDetectorInput} input
 */
export async function detectFacesForVerification(detector, input) {
  const faces = await detector.estimateFaces(input, {
    flipHorizontal: false,
    staticImageMode: true,
  });
  if (!faces.length) return { error: "NO_FACE" };
  if (faces.length > 1) return { error: "MULTIPLE_FACES", faces };
  return { face: faces[0] };
}
