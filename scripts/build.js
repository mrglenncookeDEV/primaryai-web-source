const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const filesToCopy = [
  "index.html",
  "CNAME",
  "google15b1e9dbb874b499.html",
];

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file}`);
  }
}

console.log(`Build complete: ${distDir}`);
