import "./pwa-register.js";
import { guardProtectedPage } from "./auth/guard.js";

async function main() {
  await guardProtectedPage();

  document.querySelectorAll(".subject-row").forEach((row) => {
    const percent = Number(row.dataset.percent);
    if (percent < 75) {
      row.classList.add("low-attendance");
    }
  });
}

main().catch((err) => console.error(err));
