const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { loadDotEnv } = require("../cli-env");
const { pushFunctionToCRM } = require("../../zoho-crm-functions");
const { safeFileName, extractFunctionMetadata } = require("../../zoho-function-utils");

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const inputName = process.argv[2];
  const explicitDsPath = process.argv[3];
  const force = process.argv.includes("--force");

  const statePath = path.resolve("crm-sync-state.json");
  const state = readJson(statePath, { files: {} });

  const outputDir = path.resolve("crmFunctions");
  if (!fs.existsSync(outputDir)) {
    throw new Error("Missing crmFunctions folder. Run the initial export first.");
  }

  const filesToSync = [];

  if (inputName) {
    const safeName = safeFileName(inputName);
    const dsPath = explicitDsPath
      ? path.resolve(explicitDsPath)
      : path.resolve(outputDir, `${safeName}.ds`);
    filesToSync.push(dsPath);
  } else {
    for (const entry of fs.readdirSync(outputDir)) {
      if (entry.endsWith(".ds")) {
        filesToSync.push(path.join(outputDir, entry));
      }
    }
  }

  const results = [];

  for (const dsPath of filesToSync) {
    if (!fs.existsSync(dsPath)) {
      throw new Error(`Missing code file: ${dsPath}`);
    }

    const code = fs.readFileSync(dsPath, "utf8");
    const fileName = path.basename(dsPath, ".ds");
    const functionNames = extractFunctionMetadata(code) || {
      displayName: fileName,
      apiName: fileName.toLowerCase(),
    };
    const apiName = functionNames.apiName;
    const displayName = functionNames.displayName;
    const currentHash = sha256(code);
    const previousHash = state.files[apiName]?.hash;

    if (!force && previousHash === currentHash) {
      results.push({
        file: apiName,
        status: "skipped",
      });
      continue;
    }

    const payload = {
      functions: [
        {
          name: displayName,
          api_name: apiName,
          category: "Automation",
          runtime: "Deluge 1.0",
          _code: code,
        },
      ],
    };

    const result = await pushFunctionToCRM({ metadata: payload });
    state.files[apiName] = { hash: currentHash, lastSync: new Date().toISOString() };

    results.push({
      file: apiName,
      status: "pushed",
      result,
    });
  }

  writeJson(statePath, state);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
