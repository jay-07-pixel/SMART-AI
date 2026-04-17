import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { drawFrontCameraToCanvas } from "./captureFrame.js";
import { detectFacesForVerification, getFaceDetector } from "./detectorService.js";
import { getFirebaseDb, getFirebaseStorage } from "../firebase/client.js";

/**
 * Captures current video frame, checks for a single face, uploads JPEG to Storage `faces/{uid}.jpg`,
 * and merges `faceImageUrl` / `faceImagePath` on `Students/{uid}`.
 */
export async function uploadEnrollmentPhoto(uid, video, canvas) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    throw new Error("Camera not ready.");
  }

  if (!drawFrontCameraToCanvas(video, canvas)) {
    throw new Error("Canvas error.");
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode JPEG."))), "image/jpeg", 0.92);
  });

  const detector = await getFaceDetector();
  const bmp = await createImageBitmap(blob);
  try {
    const det = await detectFacesForVerification(detector, bmp);
    if (det.error === "NO_FACE") {
      throw new Error("No face detected — center your face in the frame.");
    }
    if (det.error === "MULTIPLE_FACES") {
      throw new Error("Only one face allowed for enrollment.");
    }
  } finally {
    bmp.close();
  }

  const path = `faces/${uid}.jpg`;
  const storage = getFirebaseStorage();
  const ref = storageRef(storage, path);

  try {
    await uploadBytes(ref, blob, { contentType: "image/jpeg" });
  } catch (e) {
    const code = e?.code || "";
    throw new Error(
      `Storage upload failed (${code || "unknown"}). In Firebase Console → Storage → Rules, publish firebase/storage.rules, then try again.`
    );
  }

  let url;
  try {
    url = await getDownloadURL(ref);
  } catch (e) {
    const code = e?.code || "";
    throw new Error(
      `Storage download URL failed (${code || "unknown"}). Check Storage rules allow read for faces/<your uid>.jpg.`
    );
  }

  const db = getFirebaseDb();
  try {
    await setDoc(
      doc(db, "Students", uid),
      {
        faceImageUrl: url,
        faceImagePath: path,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    const code = e?.code || "";
    throw new Error(
      `Firestore save failed (${code || "permission-denied"}). Deploy Firestore rules: Firebase Console → Firestore → Rules → paste firebase/firestore.rules → Publish. Your image is already in Storage at ${path}; only the profile link failed.`
    );
  }

  return { url, path };
}
