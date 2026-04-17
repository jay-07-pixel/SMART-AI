import "./pwa-register.js";
import { guardProtectedPage } from "./auth/guard.js";

guardProtectedPage().catch(() => {});
