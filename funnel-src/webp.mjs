// PNG -> WebP (alpha preserved), then assemble manifest.json of data URIs.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import sharp from "sharp";

const DIR = new URL("./assets/", import.meta.url).pathname;
const pngs = readdirSync(DIR).filter((f) => f.endsWith(".png"));
let total = 0;
for (const f of pngs) {
  const out = DIR + f.replace(/\.png$/, ".webp");
  const q = f.startsWith("demo_") ? 78 : 72;
  await sharp(DIR + f).webp({ quality: q, alphaQuality: 85 }).toFile(out);
  total += statSync(out).size;
}
console.log("webp total KB:", Math.round(total / 1024));

// manifest: webp + svg -> data URIs
const manifest = {};
for (const f of readdirSync(DIR)) {
  const key = f.replace(/\.(webp|svg)$/, "");
  if (f.endsWith(".webp")) {
    manifest[key] = "data:image/webp;base64," + readFileSync(DIR + f).toString("base64");
  } else if (f.endsWith(".svg")) {
    // strip comments/newlines, then URL-encode (smaller than base64 for text)
    let svg = readFileSync(DIR + f, "utf8")
      .replace(/<\?xml[\s\S]*?\?>/, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
    manifest[key] = "data:image/svg+xml," + encodeURIComponent(svg).replace(/%20/g, " ").replace(/%3D/g, "=").replace(/%3A/g, ":").replace(/%2F/g, "/").replace(/%22/g, "'");
  }
}
writeFileSync(new URL("./manifest.json", import.meta.url).pathname, JSON.stringify(manifest));
const sz = Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, Math.round(v.length / 1024) + "K"]));
console.log(JSON.stringify(sz));
console.log("manifest total KB:", Math.round(Object.values(manifest).reduce((a, v) => a + v.length, 0) / 1024));