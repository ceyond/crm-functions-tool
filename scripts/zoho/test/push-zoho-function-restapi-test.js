const fs = require("fs");
const path = require("path");

const { loadDotEnv } = require("../../../scripts/cli-env");
const { zohoRequest, findFunctionByApiName } = require("../../../zoho-crm-functions");
const { extractFunctionMetadata, resolveDsPath, safeFileName } = require("../../../zoho-function-utils");

function parseArgs(argv) {
  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (current.startsWith("--")) {
      continue;
    }
    positional.push(current);
  }

  return {
    inputName: positional[0] || null,
    codePath: positional[1] || null,
  };
}

function buildPayload({ functionName, apiName, category, code, restApiMode, description }) {
  return {
    functions: [
      {
        name: functionName,
        api_name: apiName,
        category,
        runtime: "Deluge 1.0",
        description,
        rest_api_mode: restApiMode,
        _code: code,
      },
    ],
  };
}

async function sendVariant({ label, method, id, payload, extraFields = {} }) {
  const form = new FormData();
  form.append("metadata", JSON.stringify(payload));

  for (const [key, value] of Object.entries(extraFields)) {
    form.append(key, value);
  }

  const targetPath = id ? `/settings/functions/${id}` : "/settings/functions";

  console.log(`\n===== ${label} =====`);
  console.log("REQUEST:");
  console.log(
    JSON.stringify(
      {
        method,
        path: targetPath,
        metadata: payload,
        extraFields,
      },
      null,
      2
    )
  );

  try {
    const response = await zohoRequest(targetPath, {
      method,
      body: form,
    });

    console.log("RESPONSE:");
    console.log(JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.log("RESPONSE:");
    console.log(error.message);
    return null;
  }
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const { inputName, codePath } = parseArgs(process.argv);

  if (!inputName) {
    throw new Error(
      "Usage: node push-zoho-function-restapi-test.js <function-name> [code.ds]"
    );
  }

  const dsPath = resolveDsPath(inputName, codePath);
  const code = fs.readFileSync(dsPath, "utf8");
  const functionNames = extractFunctionMetadata(code) || {
    category: "Automation",
    displayName: inputName,
    apiName: safeFileName(inputName).toLowerCase(),
  };

  const existing = await findFunctionByApiName(functionNames.apiName);
  const method = existing ? "PUT" : "POST";
  const id = existing?.id || null;

  console.log(
    JSON.stringify(
      {
        file: dsPath,
        apiName: functionNames.apiName,
        existingFunctionId: id,
        method,
      },
      null,
      2
    )
  );

  const variants = [
    {
      label: "variant-1 metadata.rest_api_mode = [\"Oauth\"]",
      payload: buildPayload({
        functionName: functionNames.displayName,
        apiName: functionNames.apiName,
        category: functionNames.category || "Automation",
        code,
        restApiMode: ["Oauth"],
        description: "OAuth rest_api_mode probe - metadata only",
      }),
    },
    {
      label: "variant-2 metadata.rest_api_mode + extra form field rest_api_mode=Oauth",
      payload: buildPayload({
        functionName: functionNames.displayName,
        apiName: functionNames.apiName,
        category: functionNames.category || "Automation",
        code,
        restApiMode: ["Oauth"],
        description: "OAuth rest_api_mode probe - metadata plus form field",
      }),
      extraFields: {
        rest_api_mode: "Oauth",
      },
    },
    {
      label: "variant-3 metadata.rest_api_mode = [\"Oauth\"] with explicit update/create body replay",
      payload: buildPayload({
        functionName: functionNames.displayName,
        apiName: functionNames.apiName,
        category: functionNames.category || "Automation",
        code,
        restApiMode: ["Oauth"],
        description: "OAuth rest_api_mode probe - replay body",
      }),
    },
    {
      label: "variant-4 metadata.rest_api_mode = [\"Oauth\"] + auth_type=oauth",
      payload: buildPayload({
        functionName: functionNames.displayName,
        apiName: functionNames.apiName,
        category: functionNames.category || "Automation",
        code,
        restApiMode: ["Oauth"],
        description: "OAuth rest_api_mode probe - auth type",
      }),
      extraFields: {
        auth_type: "oauth",
      },
    },
  ];

  for (const variant of variants) {
    if (method === "PUT" && variant.payload?.functions?.[0]) {
      delete variant.payload.functions[0].api_name;
    }

    await sendVariant({
      label: variant.label,
      method,
      id,
      payload: variant.payload,
      extraFields: variant.extraFields || {},
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
