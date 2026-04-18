import "./pwa-register.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { DEMO_STUDENT_CREDENTIALS } from "./firebase/demo-student.js";
import {
  firebaseConfigHintForUi,
  getFirebaseAuth,
  isFirebaseConfigComplete,
} from "./firebase/client.js";
import { upsertDemoStudent } from "./firebase/students.js";

function mapLoginError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Sign-in failed. Try again.";
  }
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.dataset.state = "error";
}

function clearError(el) {
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}

function setupPasswordVisibilityToggle(passwordInput) {
  const btn = document.getElementById("password-toggle-btn");
  const icon = btn?.querySelector("i");
  if (!passwordInput || !btn || !icon) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    btn.setAttribute("aria-pressed", isHidden ? "true" : "false");
    icon.className = isHidden ? "bi bi-eye-slash-fill" : "bi bi-eye-fill";
  });
}

function init() {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("studentId");
  const passwordInput = document.getElementById("password");

  setupPasswordVisibilityToggle(passwordInput);
  const rememberInput = document.getElementById("remember");
  const errorEl = document.getElementById("login-error");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!isFirebaseConfigComplete()) {
    if (errorEl) {
      showError(errorEl, `Firebase is not configured. ${firebaseConfigHintForUi()}`);
    }
    if (submitBtn) submitBtn.disabled = true;
    document.querySelectorAll(".demo-login-actions button").forEach((b) => {
      b.disabled = true;
    });
    return;
  }

  const emailText = document.getElementById("demo-email-text");
  const passText = document.getElementById("demo-password-text");
  if (emailText) emailText.textContent = DEMO_STUDENT_CREDENTIALS.email;
  if (passText) passText.textContent = DEMO_STUDENT_CREDENTIALS.password;

  const fillBtn = document.getElementById("demo-fill-btn");
  const createBtn = document.getElementById("demo-create-btn");

  fillBtn?.addEventListener("click", () => {
    if (!emailInput || !passwordInput) return;
    emailInput.value = DEMO_STUDENT_CREDENTIALS.email;
    passwordInput.value = DEMO_STUDENT_CREDENTIALS.password;
    clearError(errorEl);
  });

  createBtn?.addEventListener("click", async () => {
    if (!createBtn) return;
    createBtn.disabled = true;
    clearError(errorEl);
    try {
      const result = await upsertDemoStudent();
      if (!result.ok) {
        showError(errorEl, result.message);
        return;
      }
      window.location.assign("dashboard.html");
    } catch (err) {
      showError(errorEl, err?.message || "Could not create demo account. Check Firebase Auth (Email/Password) and Firestore rules.");
      console.error(err);
    } finally {
      createBtn.disabled = false;
    }
  });

  const auth = getFirebaseAuth();
  const sessionBanner = document.getElementById("session-banner");
  const sessionEmailEl = document.getElementById("session-email");
  const sessionSignOutBtn = document.getElementById("session-sign-out-btn");
  const demoCard = document.querySelector(".demo-login-card");

  function applySessionUi(user) {
    if (user) {
      if (sessionEmailEl) sessionEmailEl.textContent = user.email ?? "Signed-in account";
      if (sessionBanner) sessionBanner.hidden = false;
      if (form) form.hidden = true;
      if (demoCard) demoCard.hidden = true;
    } else {
      if (sessionBanner) sessionBanner.hidden = true;
      if (form) form.hidden = false;
      if (demoCard) demoCard.hidden = false;
    }
  }

  onAuthStateChanged(auth, (user) => {
    applySessionUi(user);
  });

  sessionSignOutBtn?.addEventListener("click", async () => {
    sessionSignOutBtn.disabled = true;
    try {
      await signOut(auth);
      clearError(errorEl);
    } catch (e) {
      console.error(e);
    } finally {
      sessionSignOutBtn.disabled = false;
    }
  });

  if (!form || !emailInput || !passwordInput) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(errorEl);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError(errorEl, "Enter email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(errorEl, "Enter a valid email address.");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      await setPersistence(
        auth,
        rememberInput?.checked ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email, password);
      window.location.assign("dashboard.html");
    } catch (err) {
      showError(errorEl, mapLoginError(err?.code));
      console.error(err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
