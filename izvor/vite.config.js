import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Fiksna imena fajlova (bez hash-a) - tako svaki update prepiše iste
    // fajlove umesto da pravi nove (index-XXXXXX.js), što pojednostavljuje
    // deploy skripte i git istoriju.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
