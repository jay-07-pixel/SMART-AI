import { signInAnonymously } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigComplete } from "./client.js";

const COLLECTION = "smartops_ping";

/**
 * Writes one test document to Firestore.
 * Requires: Firestore enabled, Anonymous sign-in enabled, and rules that allow
 * authenticated users to create docs in `smartops_ping` (see firebase/firestore.rules.example).
 */
export async function writeTestPing() {
  if (!isFirebaseConfigComplete()) {
    return {
      ok: false,
      message: "Missing VITE_FIREBASE_* in .env.local — see .env.example.",
    };
  }

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  await signInAnonymously(auth);

  const ref = await addDoc(collection(db, COLLECTION), {
    kind: "smartops_web_smoke_test",
    createdAt: serverTimestamp(),
    path: typeof window !== "undefined" ? window.location.pathname : "",
    note: "Safe to delete; created from SmartOps dashboard test button.",
  });

  return {
    ok: true,
    message: `Stored document in Firestore: ${COLLECTION}/${ref.id}`,
    docId: ref.id,
  };
}
