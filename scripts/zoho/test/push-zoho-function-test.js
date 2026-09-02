const fs = require("fs");
const path = require("path");

const { loadDotEnv } = require("../../../scripts/cli-env");
const { zohoRequest, findFunctionByApiName } = require("../../../zoho-crm-functions");
const { extractFunctionMetadata, resolveDsPath, safeFileName } = require("../../../zoho-function-utils");

function parseArgs(argv) {
  const args = {
    inputName: null,
    codePath: null,
    authType: "oauth",
    commitMessage: null,
  };

  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--auth-type" && next) {
      args.authType = next;
      i++;
      continue;
    }

    if (current === "--commit-message" && next) {
      args.commitMessage = next;
      i++;
      continue;
    }

    if (current.startsWith("--")) {
      continue;
    }

    positional.push(current);
  }

  args.inputName = positional[0] || null;
  args.codePath = positional[1] || null;

  return args;
}

async function createOrUpdate({
  metadata,
  authType,
  existing,
}) {
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("auth_type", authType);

  if (existing) {
    return await zohoRequest(`/settings/functions/${existing.id}`, {
      method: "PUT",
      body: form,
    });
  }

  return await zohoRequest("/settings/functions", {
    method: "POST",
    body: form,
  });
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const { inputName, codePath, authType, commitMessage } = parseArgs(process.argv);

  if (!inputName) {
    throw new Error(
      "Usage: node push-zoho-function-test.js <function-name> [code.ds] [--auth-type <type>] [--commit-message <text>]"
    );
  }

  const dsPath = resolveDsPath(inputName, codePath);
  const code = fs.readFileSync(dsPath, "utf8");
  const functionNames = extractFunctionMetadata(code) || {
    category: "Automation",
    displayName: inputName,
    apiName: safeFileName(inputName).toLowerCase(),
  };

  const payload = {
    functions: [
      {
        name: functionNames.displayName,
        api_name: functionNames.apiName,
        category: functionNames.category || "Automation",
        runtime: "Deluge 1.0",
        commit_message: commitMessage || `TEST: ${functionNames.displayName}`,
        _code: code,
      },
    ],
  };

  const existing = await findFunctionByApiName(functionNames.apiName);
  const result = await createOrUpdate({
    metadata: payload,
    authType,
    existing,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
