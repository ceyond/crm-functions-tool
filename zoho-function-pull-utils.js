const fs = require("fs");
const path = require("path");

const { loadDotEnv } = require("./scripts/cli-env");
const { zohoRequest } = require("./zoho-crm-functions");
const { safeFileName } = require("./zoho-function-utils");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function extractCodeFromResponse(codeResp) {
  if (typeof codeResp === "string") {
    return codeResp;
  }

  if (codeResp && typeof codeResp === "object") {
    if (typeof codeResp.code === "string") {
      return codeResp.code;
    }

    if (typeof codeResp.content === "string") {
      return codeResp.content;
    }

    if (typeof codeResp.toString === "function") {
      return String(codeResp);
    }
  }

  return String(codeResp || "");
}

async function listFunctions() {
  const results = [];

  for (let page = 1; page <= 20; page++) {
    const response = await zohoRequest(
      `/settings/functions?page=${page}&per_page=200`
    );

    const functions = response.functions || [];

    for (const fn of functions) {
      results.push(fn);
    }

    if (functions.length < 200) {
      break;
    }
  }

  return results;
}

async function fetchFunctionArtifacts(functionId) {
  const functionResp = await zohoRequest(
    `/settings/functions/${functionId.toString()}`
  );

  const codeResp = await zohoRequest(
    `/settings/functions/${functionId.toString()}/code`
  );

  return { functionResp, codeResp };
}

async function findFunctionByNameOrApiName(inputName) {
  const target = String(inputName || "").trim().toLowerCase();
  const functions = await listFunctions();

  const apiMatch = functions.find((fn) => {
    const apiName = String(fn.api_name || "").trim().toLowerCase();
    return apiName === target;
  });

  if (apiMatch) {
    return apiMatch;
  }

  return (
    functions.find((fn) => {
      const name = String(fn.name || "").trim().toLowerCase();
      return name === target;
    }) || null
  );
}

async function exportAllFunctions(outputDir) {
  ensureDir(outputDir);
  const functions = await listFunctions();
  const exported = [];
  const seenFileNames = new Map();

  for (const fn of functions) {
    if (!fn.id) {
      continue;
    }

    const { functionResp, codeResp } = await fetchFunctionArtifacts(fn.id);
    const fullFunction = functionResp?.functions?.[0] || {};
    const functionName = fullFunction.name || fn.name || fn.id;
    const apiName = String(fullFunction.api_name || fn.api_name || fn.apiName || functionName || fn.id)
      .trim();
    const baseName = safeFileName(apiName || functionName || fn.id);
    const collisionCount = seenFileNames.get(baseName) || 0;
    const safeName = collisionCount === 0 ? baseName : `${baseName}_${collisionCount + 1}`;
    seenFileNames.set(baseName, collisionCount + 1);
    const codePath = path.join(outputDir, `${safeName}.ds`);

    fs.writeFileSync(codePath, extractCodeFromResponse(codeResp));

    exported.push({
      name: functionName,
      apiName,
      id: fn.id,
      codePath,
    });
  }

  return exported;
}

async function exportOneFunction(inputName, outputDir) {
  const found = await findFunctionByNameOrApiName(inputName);
  if (!found?.id) {
    throw new Error(`Function not found: ${inputName}`);
  }

  const { functionResp, codeResp } = await fetchFunctionArtifacts(found.id);
  const fullFunction = functionResp?.functions?.[0] || {};
  const functionName = fullFunction.name || found.name || inputName;
  const apiName = String(fullFunction.api_name || found.api_name || inputName).trim();
  const safeName = safeFileName(apiName || functionName || inputName);

  ensureDir(outputDir);
  const codePath = path.join(outputDir, `${safeName}.ds`);
  fs.writeFileSync(codePath, extractCodeFromResponse(codeResp));

  return {
    name: apiName,
    apiName,
    id: found.id,
    codePath,
  };
}

module.exports = {
  ensureDir,
  exportAllFunctions,
  exportOneFunction,
  loadDotEnv,
  safeFileName,
};
