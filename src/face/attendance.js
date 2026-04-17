import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "../firebase/client.js";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Records face-scan attendance for the signed-in user (one doc per user per calendar day).
 */
export async function recordFaceScanAttendance(uid, { score, threshold, passed }) {
  const db = getFirebaseDb();
  const dateKey = todayKey();
  const ref = doc(db, "faceScanAttendance", `${uid}_${dateKey}`);
  await setDoc(
    ref,
    {
      userId: uid,
      dateKey,
      method: "face_scan",
      passed,
      score,
      threshold,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
