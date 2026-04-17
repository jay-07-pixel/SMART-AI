import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigComplete } from "../firebase/client.js";

function ensureAuthGateStyle() {
  if (document.getElementById("auth-gate-style")) return;
  const style = document.createElement("style");
  style.id = "auth-gate-style";
  style.textContent = "html.auth-checking body { visibility: hidden; }";
  document.head.appendChild(style);
}

/**
 * Blocks the page until Firebase reports a signed-in user; otherwise redirects to login.
 */
export function guardProtectedPage() {
  ensureAuthGateStyle();
  document.documentElement.classList.add("auth-checking");

  if (!isFirebaseConfigComplete()) {
    window.location.replace("index.html");
    return new Promise(() => {});
  }

  const auth = getFirebaseAuth();
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.replace("index.html");
        return;
      }
      document.documentElement.classList.remove("auth-checking");
      resolve(user);
    });
  });
}
