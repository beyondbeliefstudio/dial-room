import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// `--mode mock` swaps the Convex client for local fixtures so the UI can be previewed with no backend.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve:
    mode === "mock"
      ? { alias: { "convex/react": fileURLToPath(new URL("./dev/mockConvex.tsx", import.meta.url)) } }
      : undefined,
  define: mode === "mock" ? { "import.meta.env.VITE_CONVEX_URL": JSON.stringify("mock") } : undefined,
}));
