import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  server: {
    host: true,
    proxy: {
      // used once the backend exists; harmless until then
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
