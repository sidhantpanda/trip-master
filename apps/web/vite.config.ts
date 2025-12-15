import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@trip-master/shared": path.resolve(__dirname, "..", "..", "packages/shared/src")
    }
  },
  optimizeDeps: {
    include: ["@trip-master/shared"]
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
