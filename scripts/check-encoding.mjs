import fs from "node:fs";
import path from "node:path";

const ROOTS = ["src", "public"];
const EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".css",
  ".html",
  ".md",
  ".txt",
  ".svg",
]);

const suspiciousPatterns = [
  /Ã./u,
  /Â[\u0080-\u00bf ]/u,
  /â[\u0080-\u00bf]/u,
  /ð[\u0080-\u00bf]/u,
  /ï¿½/u,
  /\uFFFD/u,
];

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }

  return files;
}

const failures = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const contents = fs.readFileSync(file, "utf8");
    const lines = contents.split(/\r?\n/u);

    lines.forEach((line, index) => {
      if (suspiciousPatterns.some((pattern) => pattern.test(line))) {
        failures.push({
          file,
          line: index + 1,
          preview: line.trim().slice(0, 180),
        });
      }
    });
  }
}

if (failures.length) {
  console.error("\nPotential encoding corruption found:\n");
  for (const failure of failures) {
    console.error(
      `- ${failure.file}:${failure.line}  ${failure.preview}`
    );
  }
  console.error(
    "\nReplace corrupted text or use a Lucide icon instead of pasted symbol characters.\n"
  );
  process.exit(1);
}

console.log("Encoding audit passed: no common mojibake markers found.");
