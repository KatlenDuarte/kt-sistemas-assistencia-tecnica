import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base relativa: funciona em qualquer hospedagem (Vercel, Netlify, GitHub Pages)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
});
