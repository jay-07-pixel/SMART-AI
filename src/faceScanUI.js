import { getFaceDetector } from "./face/detectorService.js";
import { runFaceScanFromVideoFrame } from "./face/faceScanPipeline.js";
import { uploadEnrollmentPhoto } from "./face/uploadReference.js";
import { getFirebaseAuth } from "./firebase/client.js";

/**
 * @param {{
 *   modal: HTMLElement;
 *   backdrop?: HTMLElement | null;
 *   video: HTMLVideoElement;
 *   canvas: HTMLCanvasElement;
 *   status: HTMLElement;
 *   enrollBtn: HTMLButtonElement;
 *   verifyBtn: HTMLButtonElement;
 *   closeBtn: HTMLElement;
 * }} els
 */
/**
 * Tries progressively simpler constraints. NotReadableError often comes from
 * another app/tab holding the camera or unsupported ideal resolution.
 */
async function getFrontCameraStream() {
  const attempts = [
    {
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr = null;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastErr = e;
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        throw e;
      }
    }
  }
  throw lastErr ?? new Error("Could not access camera.");
}

function cameraErrorMessage(e) {
  const name = e?.name || "";
  if (name === "NotAllowedError") {
    return "Camera permission denied. Click the lock icon in the address bar → allow Camera, then try again.";
  }
  if (name === "NotFoundError") {
    return "No camera found. Plug in a webcam or enable the built-in camera in Device Manager / system settings.";
  }
  if (name === "NotReadableError") {
    return (
      "Camera is in use or could not be started. Close other apps using the camera " +
      "(Zoom, Teams, another browser tab), disconnect other monitors’ virtual cameras if any, then retry."
    );
  }
  if (name === "OverconstrainedError") {
    return "This camera does not support the requested settings. Try another browser or update camera drivers.";
  }
  if (name === "SecurityError") {
    return "Camera requires a secure page (HTTPS or localhost). Open the app from http://localhost, not a raw file URL.";
  }
  return `Camera error (${name || "unknown"}). ${e?.message || ""}`.trim();
}

export function bindFaceScanModal(els) {
  let stream = null;

  async function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    els.video.srcObject = null;
  }

  async function openModal() {
    els.modal.hidden = false;
    document.body.style.overflow = "hidden";
    els.status.textContent = "Starting camera…";
    els.status.dataset.state = "";
    els.enrollBtn.disabled = true;
    els.verifyBtn.disabled = true;

    try {
      stream = await getFrontCameraStream();
      els.video.srcObject = stream;
      await els.video.play();
      els.status.textContent = "Loading face model (first time may take a few seconds)…";
      await getFaceDetector();
      els.status.textContent =
        "Step 1: Save reference — align your face, tap “Save reference photo”. Step 2: Tap “Verify attendance”.";
      els.enrollBtn.disabled = false;
      els.verifyBtn.disabled = false;
    } catch (e) {
      console.error(e);
      els.status.textContent = cameraErrorMessage(e);
      els.enrollBtn.disabled = true;
      els.verifyBtn.disabled = true;
    }
  }

  async function closeModal() {
    await stopCamera();
    els.modal.hidden = true;
    document.body.style.overflow = "";
    els.status.textContent = "";
  }

  els.closeBtn.addEventListener("click", () => closeModal());
  els.backdrop?.addEventListener("click", () => closeModal());

  els.enrollBtn.addEventListener("click", async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      window.alert("You must be signed in to save a reference photo.");
      return;
    }

    els.enrollBtn.disabled = true;
    els.verifyBtn.disabled = true;
    els.status.textContent = "Saving reference photo…";
    els.status.dataset.state = "";
    try {
      const { path } = await uploadEnrollmentPhoto(user.uid, els.video, els.canvas);
      els.status.textContent = `Reference saved (${path}). You can verify now.`;
      els.status.dataset.state = "ok";
      window.alert(
        "Reference photo uploaded to Firebase Storage.\n\nNext: tap “Verify attendance” to compare your live face to this image."
      );
    } catch (e) {
      console.error(e);
      const msg = e?.message || String(e);
      els.status.textContent = msg;
      els.status.dataset.state = "error";
      window.alert(`Could not save reference:\n\n${msg}\n\nIf this mentions Firestore, open Firebase Console → Firestore → Rules, publish firebase/firestore.rules. If it mentions Storage, use Storage → Rules and publish firebase/storage.rules.`);
    } finally {
      els.enrollBtn.disabled = false;
      els.verifyBtn.disabled = false;
    }
  });

  els.verifyBtn.addEventListener("click", async () => {
    els.enrollBtn.disabled = true;
    els.verifyBtn.disabled = true;
    els.status.textContent = "Analyzing…";
    els.status.dataset.state = "";
    try {
      const result = await runFaceScanFromVideoFrame(els.video, els.canvas);
      if (result.ok) {
        els.status.textContent = result.message;
        els.status.dataset.state = "ok";
      } else {
        els.status.textContent = result.message;
        els.status.dataset.state = "error";
        window.alert(
          `Verification failed\n\n${result.message}\n\nSave a reference photo first, or ensure you match the enrolled image.`
        );
      }
    } catch (e) {
      console.error(e);
      els.status.textContent = e?.message || "Verification error.";
      els.status.dataset.state = "error";
      window.alert(`Verification error: ${e?.message || e}`);
    } finally {
      els.enrollBtn.disabled = false;
      els.verifyBtn.disabled = false;
    }
  });

  return { openModal, closeModal };
}
