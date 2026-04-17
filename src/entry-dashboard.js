import "./pwa-register.js";
import { signOut } from "firebase/auth";
import { guardProtectedPage } from "./auth/guard.js";
import { getFirebaseAuth } from "./firebase/client.js";
import { writeTestPing } from "./firebase/writePing.js";
import { upsertDemoStudent } from "./firebase/students.js";

function setStatus(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.dataset.state = isError ? "error" : "ok";
}

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

async function main() {
  await guardProtectedPage();

  onReady(() => {
    const signOutBtn = document.getElementById("sign-out-btn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        signOutBtn.disabled = true;
        try {
          await signOut(getFirebaseAuth());
          window.location.assign("index.html");
        } catch (e) {
          console.error(e);
          signOutBtn.disabled = false;
        }
      });
    }

    const pingStatus = document.getElementById("firebase-ping-status");
    const pingBtn = document.getElementById("firebase-ping-btn");

    if (pingBtn && pingStatus) {
      pingBtn.addEventListener("click", async () => {
        pingBtn.disabled = true;
        setStatus(pingStatus, "Writing to Firestore…", false);
        try {
          const result = await writeTestPing();
          setStatus(pingStatus, result.ok ? result.message : result.message, !result.ok);
        } catch (err) {
          const msg =
            err && typeof err.message === "string"
              ? err.message
              : "Firestore write failed. Check console, Firestore rules, and Anonymous auth.";
          setStatus(pingStatus, msg, true);
          console.error(err);
        } finally {
          pingBtn.disabled = false;
        }
      });
    }

    const seedStatus = document.getElementById("student-seed-status");
    const seedBtn = document.getElementById("student-seed-btn");

    const faceScanModal = document.getElementById("face-scan-modal");
    const faceScanOpen = document.getElementById("face-scan-open-btn");
    const faceScanVideo = document.getElementById("face-scan-video");
    const faceScanCanvas = document.getElementById("face-scan-canvas");
    const faceScanStatus = document.getElementById("face-scan-status");
    const faceScanEnroll = document.getElementById("face-scan-enroll-btn");
    const faceScanVerify = document.getElementById("face-scan-verify-btn");
    const faceScanClose = document.getElementById("face-scan-close-btn");
    const faceScanBackdrop = document.getElementById("face-scan-backdrop");

    if (
      faceScanModal &&
      faceScanOpen &&
      faceScanVideo instanceof HTMLVideoElement &&
      faceScanCanvas instanceof HTMLCanvasElement &&
      faceScanStatus &&
      faceScanEnroll &&
      faceScanVerify &&
      faceScanClose
    ) {
      let faceScanApi = null;
      faceScanOpen.addEventListener("click", async () => {
        if (!faceScanApi) {
          const { bindFaceScanModal } = await import("./faceScanUI.js");
          faceScanApi = bindFaceScanModal({
            modal: faceScanModal,
            backdrop: faceScanBackdrop,
            video: faceScanVideo,
            canvas: faceScanCanvas,
            status: faceScanStatus,
            enrollBtn: faceScanEnroll,
            verifyBtn: faceScanVerify,
            closeBtn: faceScanClose,
          });
        }
        faceScanApi.openModal();
      });
    }

    if (seedBtn && seedStatus) {
      seedBtn.addEventListener("click", async () => {
        seedBtn.disabled = true;
        setStatus(seedStatus, "Creating account and saving to Students…", false);
        try {
          const result = await upsertDemoStudent();
          setStatus(seedStatus, result.ok ? result.message : result.message, !result.ok);
        } catch (err) {
          const code = err?.code ? `${err.code}: ` : "";
          const msg =
            err && typeof err.message === "string"
              ? `${code}${err.message}`
              : "Failed. Enable Email/Password in Firebase Auth and check Firestore rules for Students.";
          setStatus(seedStatus, msg, true);
          console.error(err);
        } finally {
          seedBtn.disabled = false;
        }
      });
    }
  });
}

main().catch((err) => console.error(err));
