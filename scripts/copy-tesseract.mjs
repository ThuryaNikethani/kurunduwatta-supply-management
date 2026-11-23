// Copies the bill reader (Tesseract) files into public/tesseract so the app
// serves them itself: no outside service is used when HR reads a bill photo.
// Runs after every `npm install` (also on Vercel). The copied files are not committed.
import fs from "node:fs";
import path from "node:path";

const out = path.join("public", "tesseract");
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

copy("node_modules/tesseract.js/dist/worker.min.js", path.join(out, "worker.min.js"));
for (const f of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
  copy(path.join("node_modules/tesseract.js-core", f), path.join(out, f));
}
for (const lang of ["sin", "eng"]) {
  copy(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`, path.join(out, "lang", `${lang}.traineddata.gz`));
}
console.log("bill reader files copied to", out);
