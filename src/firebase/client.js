import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigComplete() {
  const c = readConfig();
  return Object.values(c).every((v) => typeof v === "string" && v.length > 0);
}

export function getFirebaseApp() {
  if (!isFirebaseConfigComplete()) {
    throw new Error(
      "Firebase env vars are missing. Copy .env.example to .env.local and set VITE_FIREBASE_* values."
    );
  }
  const config = readConfig();
  if (getApps().length) {
    return getApps()[0];
  }
  return initializeApp(config);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

/**
 * Uses the configured bucket explicitly (`gs://…`) so reads/writes target the same bucket as the Console.
 */
export function getFirebaseStorage() {
  const app = getFirebaseApp();
  const bucket = readConfig().storageBucket;
  if (!bucket) {
    throw new Error("VITE_FIREBASE_STORAGE_BUCKET is missing from .env.local");
  }
  const gsUrl = bucket.startsWith("gs://") ? bucket : `gs://${bucket}`;
  return getStorage(app, gsUrl);
}
