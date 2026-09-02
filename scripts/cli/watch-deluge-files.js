const fs = require("fs");
const path = require("path");

const { validateSource } = require("../../src/deluge-validator");

const ROOT = path.resolve(__dirname, "..", "crmFunctions");
const EXTENSION = ".ds";
const debounceTimers = new Map();

function isDelugeFile(filePath) {
  return filePath.endsWith(EXTENSION);
}

function validateFile(filePath) {
  try {
    const source = fs.readFileSync(filePath, "utf8");
    const result = validateSource(source, { execute: false });
    console.log(JSON.stringify({
      file: filePath,
      ok: result.ok,
      diagnostics: result.diagnostics,
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      file: filePath,
      ok: false,
      diagnostics: [
        {
          severity: "error",
          message: error.message,
        },
      ],
    }, null, 2));
  }
}

function scheduleValidate(filePath) {
  if (!isDelugeFile(filePath)) return;
  const existing = debounceTimers.get(filePath);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    filePath,
    setTimeout(() => {
      debounceTimers.delete(filePath);
      validateFile(filePath);
    }, 150)
  );
}

function walkAndValidate(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkAndValidate(nextPath);
      continue;
    }
    if (entry.isFile() && isDelugeFile(nextPath)) {
      validateFile(nextPath);
    }
  }
}

function startWatching(dirPath) {
  const watcher = fs.watch(dirPath, { persistent: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(dirPath, filename.toString());
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return;
    }
    scheduleValidate(fullPath);
  });

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nextPath = path.join(dirPath, entry.name);
      startWatching(nextPath);
    }
  }

  return watcher;
}

function main() {
  const targetArg = process.argv[2] || "";
  const targetPath = targetArg ? path.resolve(process.cwd(), targetArg) : null;
  const targetExists = targetPath ? fs.existsSync(targetPath) : false;
  const targetStat = targetExists ? fs.statSync(targetPath) : null;

  if (targetPath && !targetExists) {
    throw new Error(`Target not found: ${targetPath}`);
  }

  if (!fs.existsSync(ROOT)) {
    throw new Error(`Directory not found: ${ROOT}`);
  }

  const watchRoot = targetPath && targetStat.isFile() ? path.dirname(targetPath) : ROOT;
  const mode = targetPath ? "local-validation-single" : "local-validation";

  console.log(JSON.stringify({
    watching: targetPath || ROOT,
    extension: EXTENSION,
    mode,
  }, null, 2));

  if (targetPath && targetStat.isFile()) {
    validateFile(targetPath);
    return;
  }

  walkAndValidate(ROOT);
  startWatching(watchRoot);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
