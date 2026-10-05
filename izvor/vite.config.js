import { defineConfig } from "vite";

// Oznaka verzije - dodaje se kao ?v=... na JS/CSS da iOS "Add to Home Screen"
// (koji agresivno kešira) ne drži stari bundle.
const BUILD = "v26";

// iOS 12 Safari (iPad Air 1) i njegov standalone (home screen) mod ne vole
// <script type="module" crossorigin>. Bundle se pravi kao IIFE (obična skripta)
// i ubacuje se POSLE config.js, bez type="module" i bez crossorigin atributa.
function classicScript() {
  return {
    name: "classic-script",
    enforce: "post",
    transformIndexHtml(html) {
      let src = null;
      html = html.replace(/\s*<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, s) => {
        src = s;
        return "";
      });
      html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, h) => `<link rel="stylesheet" href="${h}?${BUILD}">`);
      if (src) {
        html = html.replace(/(<script src="\.\/config\.js[^"]*"><\/script>)/, `$1\n<script src="${src}?${BUILD}"></script>`);
      }
      return html;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [classicScript()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // iOS 12 Safari (iPad Air 1) ne zna ?. / ?? - transpajluj na stariju sintaksu
    target: ["safari12", "es2017"],
    cssTarget: "safari12",
    modulePreload: false,
    cssCodeSplit: false,
    // Fiksna imena fajlova (bez hash-a) - tako svaki update prepiše iste
    // fajlove umesto da pravi nove (index-XXXXXX.js), što pojednostavljuje
    // deploy skripte i git istoriju.
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
