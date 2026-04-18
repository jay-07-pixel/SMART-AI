import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pages = [
  "index.html",
  "dashboard.html",
  "attendance.html",
  "assignments.html",
  "assignment-details.html",
  "quizzes.html",
  "quiz-start.html",
  "quiz-question.html",
];

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "SmartOps Student Portal",
        short_name: "SmartOps",
        description: "Student portal — courses, attendance, and secure face verification.",
        theme_color: "#0d6efd",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/index.html",
        orientation: "any",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Multi-page app: do not send all navigations to index.html (vite-plugin-pwa default).
        navigateFallback: null,
        // Must use a single "/" after ".com" — a typo like ".com)//" never matches Firebase URLs,
        // so Storage requests were handled by the catch-all handler and broke behind the SW.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  optimizeDeps: {
    include: [
      "@tensorflow/tfjs",
      "@tensorflow/tfjs-backend-webgl",
      "@tensorflow-models/face-landmarks-detection",
    ],
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((file) => [file.replace(".html", ""), resolve(__dirname, file)])
      ),
    },
  },
});
