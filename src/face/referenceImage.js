import { getDoc, doc } from "firebase/firestore";
import { getBlob, ref as storageRef } from "firebase/storage";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "../firebase/client.js";

/**
 * Fresh ID token so Storage REST calls include Authorization (avoids 403 that browsers mis-report as CORS).
 */
async function ensureAuthForStorage(uid) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in — sign in again before Face Scan.");
  }
  if (user.uid !== uid) {
    throw new Error("Signed-in user does not match — refresh the page and log in again.");
  }
  await user.getIdToken(true);
}

function storageReadErrorHelp(original) {
  const code = original?.code || "";
  const msg = original?.message || String(original);
  return new Error(
    `Cannot read reference image from Storage (${code || "unknown"}). ` +
      `Browsers often show this as a “CORS” error when the real issue is permission (403) or a stale login. ` +
      `Fix: (1) Firebase Console → Storage → Rules — allow read for faces/<your uid>.jpg to the signed-in user; ` +
      `(2) confirm VITE_FIREBASE_STORAGE_BUCKET in .env.local matches the bucket (e.g. erp-ai-8a770.firebasestorage.app); ` +
      `(3) sign out and sign in again, then retry. Details: ${msg}`
  );
}

/**
 * Load reference image as ImageBitmap via Storage SDK getBlob (authenticated; avoids raw fetch()).
 */
export async function loadReferenceFaceImage(uid) {
  await ensureAuthForStorage(uid);

  const storage = getFirebaseStorage();
  const db = getFirebaseDb();
  const path = `faces/${uid}.jpg`;
  const ref = storageRef(storage, path);

  /** @type {unknown} */
  let lastErr = null;

  async function blobToBitmap(r) {
    const blob = await getBlob(r);
    return createImageBitmap(blob);
  }

  try {
    return await blobToBitmap(ref);
  } catch (e) {
    lastErr = e;
  }

  try {
    await ensureAuthForStorage(uid);
    return await blobToBitmap(ref);
  } catch (e) {
    lastErr = e;
  }

  const snap = await getDoc(doc(db, "Students", uid));
  const data = snap.data();
  const storedPath = data?.faceImagePath;
  if (storedPath && typeof storedPath === "string" && storedPath !== path) {
    try {
      await ensureAuthForStorage(uid);
      return await blobToBitmap(storageRef(storage, storedPath));
    } catch (e) {
      lastErr = e;
      console.warn("getBlob fallback path failed", storedPath, e);
    }
  }

  throw storageReadErrorHelp(lastErr ?? new Error("Storage read failed"));
}
