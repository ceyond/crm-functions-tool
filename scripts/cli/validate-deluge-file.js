const fs = require("fs");
const path = require("path");

const { validateSource } = require("../../src/deluge-validator");

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: node scripts/cli/validate-deluge-file.js <file.ds>");
  }

  const resolved = path.resolve(inputPath);
  const source = fs.readFileSync(resolved, "utf8");
  const result = validateSource(source, { execute: false });
  console.log(JSON.stringify({
    file: resolved,
    ok: result.ok,
    diagnostics: result.diagnostics,
  }, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
