import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { DEMO_STUDENT_CREDENTIALS } from "./demo-student.js";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigComplete } from "./client.js";

const COLLECTION = "Students";

/**
 * Creates or signs in the demo account (Auth), then writes profile to Firestore `Students/{uid}`.
 * Fields in Firestore: email, department, year, updatedAt (no password field).
 */
export async function upsertDemoStudent() {
  if (!isFirebaseConfigComplete()) {
    return {
      ok: false,
      message: "Missing VITE_FIREBASE_* in .env.local — see .env.example.",
    };
  }

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(
      auth,
      DEMO_STUDENT_CREDENTIALS.email,
      DEMO_STUDENT_CREDENTIALS.password
    );
  } catch (err) {
    if (err?.code === "auth/email-already-in-use") {
      cred = await signInWithEmailAndPassword(
        auth,
        DEMO_STUDENT_CREDENTIALS.email,
        DEMO_STUDENT_CREDENTIALS.password
      );
    } else {
      throw err;
    }
  }

  const uid = cred.user.uid;
  const ref = doc(db, COLLECTION, uid);

  await setDoc(
    ref,
    {
      email: DEMO_STUDENT_CREDENTIALS.email,
      department: DEMO_STUDENT_CREDENTIALS.department,
      year: DEMO_STUDENT_CREDENTIALS.year,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    ok: true,
    message: `Saved to Firestore: ${COLLECTION}/${uid}`,
    uid,
  };
}
