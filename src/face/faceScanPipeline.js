import { onAuthStateChanged } from "firebase/auth";
import { recordFaceScanAttendance } from "./attendance.js";
import { drawFrontCameraToCanvas } from "./captureFrame.js";
import { compareFacesPipeline } from "./faceScanVerify.js";
import { getFirebaseAuth } from "../firebase/client.js";

/**
 * Run full verify: reference image → live capture bitmap → TF faces → heuristic compare → optional Firestore attendance.
 */
export async function runFaceScanFromVideoFrame(video, canvas) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, message: "Not signed in." };
  }

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    return { ok: false, message: "Camera not ready." };
  }

  if (!drawFrontCameraToCanvas(video, canvas)) {
    return { ok: false, message: "Canvas error." };
  }
  const liveBitmap = await createImageBitmap(canvas);

  try {
    const result = await compareFacesPipeline(user.uid, liveBitmap);
    if (result.pass) {
      await recordFaceScanAttendance(user.uid, {
        score: result.score,
        threshold: result.threshold,
        passed: true,
      });
    }
    return {
      ok: result.pass,
      message: result.pass
        ? `Verified (score ${(result.score * 100).toFixed(1)}%). Attendance saved.`
        : result.reason || "Face does not match enrolled profile.",
      detail: result,
    };
  } finally {
    liveBitmap.close();
  }
}

/** Resolve current user uid (for UI). */
export function getCurrentUid() {
  return new Promise((resolve) => {
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (u) {
      resolve(u.uid);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user?.uid ?? null);
    });
  });
}
