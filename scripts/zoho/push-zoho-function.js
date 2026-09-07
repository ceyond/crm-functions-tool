const fs = require("fs");
const path = require("path");
const { loadDotEnv } = require("../cli-env");
const { extractFunctionMetadata, resolveDsPath } = require("../../zoho-function-utils");

function parseArgs(argv) {
  const args = {
    inputName: null,
    codePath: null,
  };

  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];

    if (current.startsWith("--")) {
      continue;
    }

    positional.push(current);
  }

  args.inputName = positional[0] || null;
  args.codePath = positional[1] || null;

  return args;
}

async function main() {
  loadDotEnv(path.resolve(".env"));
  const {
    pushFunctionToCRM,
  } = require("../../zoho-crm-functions");

  const { inputName, codePath } = parseArgs(process.argv);

  if (!inputName) {
    throw new Error(
      "Usage: node scripts/zoho/push-zoho-function.js <function-name> [code.ds]"
    );
  }

  const safeName = String(inputName).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const dsPath = resolveDsPath(inputName, codePath);
  const apiName = path.basename(dsPath, path.extname(dsPath));

  const code = fs.readFileSync(dsPath, "utf8");
  const functionNames = extractFunctionMetadata(code) || {
    category: "Automation",
    displayName: apiName.toLowerCase(),
    apiName: apiName.toLowerCase(),
  };

  const payload = {
    functions: [
      {
        name: apiName,
        api_name: apiName,
        category: functionNames.category || "Automation",
        runtime: "Deluge 1.0",
        _code: code,
      },
    ],
  };

  const result = await pushFunctionToCRM({
    metadata: payload,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
