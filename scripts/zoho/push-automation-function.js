const fs = require("fs");
const path = require("path");

const { loadDotEnv } = require("../cli-env");
const { zohoRequest, pushFunctionToCRM } = require("../../zoho-crm-functions");
const { safeFileName, resolveDsPath } = require("../../zoho-function-utils");

function parseArgs(argv) {
  const args = {
    module: null,
    featureType: null,
    description: "",
  };

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--module" && next) {
      args.module = next;
      i++;
      continue;
    }

    if (current === "--feature-type" && next) {
      args.featureType = next;
      i++;
      continue;
    }

    if (current === "--description" && next) {
      args.description = next;
      i++;
      continue;
    }
  }

  if (!args.module || !args.featureType) {
    throw new Error(
      "Usage: node scripts/zoho/push-automation-function.js <function-name> --module <module> --feature-type <feature_type> [--description <text>] [code.ds]"
    );
  }

  return args;
}

async function getModules() {
  const response = await zohoRequest("/settings/modules");
  return response.modules || [];
}

async function findModule(moduleApiName) {
  const modules = await getModules();
  return (
    modules.find(
      (mod) =>
        mod.api_name === moduleApiName ||
        mod.api_name?.toLowerCase() === moduleApiName.toLowerCase()
    ) || null
  );
}

async function getAutomationFunctions(moduleName, featureType) {
  const response = await zohoRequest(
    `/settings/automation/functions?module=${encodeURIComponent(moduleName)}&feature_type=${encodeURIComponent(featureType)}&per_page=200`
  );
  return response.functions || [];
}

async function fetchAutomationAssociation(moduleName, featureType, functionId) {
  const functions = await getAutomationFunctions(moduleName, featureType);
  return (
    functions.find((item) => item.function?.id === functionId || item.function?.id?.toString() === functionId?.toString()) ||
    null
  );
}

async function createOrUpdateAutomationAssociation({
  association,
  module,
  featureType,
  functionId,
  displayName,
  description,
}) {
  const payload = {
    functions: [
      {
        name: displayName,
        language: "deluge",
        module: {
          api_name: module.api_name,
          id: module.id,
          module_name: module.module_name || module.api_name,
          singular_label: module.singular_label,
          plural_label: module.plural_label,
        },
        feature_type: featureType,
        function: {
          id: functionId,
        },
        description: description || undefined,
      },
    ],
  };

  if (association?.id) {
    return await zohoRequest(`/settings/automation/functions/${association.id}`, {
      method: "PUT",
      body: JSON.stringify({
        functions: [
          {
            ...payload.functions[0],
            id: association.id,
            language: "deluge",
          },
        ],
      }),
    });
  }

  return await zohoRequest("/settings/automation/functions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const inputName = process.argv[2];
  const explicitDsPath = process.argv[3] && !process.argv[3].startsWith("--")
    ? process.argv[3]
    : null;
  const { module: moduleName, featureType, description } = parseArgs(process.argv);

  if (!inputName) {
    throw new Error(
      "Usage: node scripts/zoho/push-automation-function.js <function-name> --module <module> --feature-type <feature_type> [--description <text>] [code.ds]"
    );
  }

  const safeName = safeFileName(inputName);
  const dsPath = resolveDsPath(inputName, explicitDsPath);

  const code = fs.readFileSync(dsPath, "utf8");
  const functionNames = {
    displayName: inputName,
    apiName: safeName.toLowerCase(),
  };

  const module = await findModule(moduleName);
  if (!module) {
    throw new Error(`Module not found: ${moduleName}`);
  }

  const baseFunctionMetadata = {
    functions: [
      {
        name: functionNames.displayName,
        api_name: functionNames.apiName,
        category: "Automation",
        runtime: "Deluge 1.0",
        _code: code,
      },
    ],
  };

  const crmFunctionResult = await pushFunctionToCRM({
    metadata: baseFunctionMetadata,
  });

  const crmFunctionId =
    crmFunctionResult?.functions?.[0]?.details?.id ||
    crmFunctionResult?.functions?.[0]?.id ||
    crmFunctionResult?.details?.id ||
    null;

  if (!crmFunctionId) {
    throw new Error("Could not resolve CRM function ID after create/update");
  }

  const association = await fetchAutomationAssociation(
    module.api_name || moduleName,
    featureType,
    crmFunctionId
  );

  const automationResult = await createOrUpdateAutomationAssociation({
    association,
    module,
    featureType,
    functionId: crmFunctionId,
    displayName: functionNames.displayName,
    description,
  });

  console.log(
    JSON.stringify(
      {
        crm_function: crmFunctionResult,
        automation_function: automationResult,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
