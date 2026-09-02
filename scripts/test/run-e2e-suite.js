const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadDotEnv } = require("../cli-env");
const { getValidAccessToken } = require("../../zoho-crm-functions");

const rootDir = path.resolve(__dirname, "../..");
const docsDir = path.resolve(rootDir, "docs");
const runsLogPath = path.resolve(docsDir, "TEST_AUTOMATION_RUNS.md");
const suiteCounterPath = path.resolve(rootDir, ".zoho-cache", "test-suite-counter.json");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zoho-e2e-"));

const DEFAULT_PULL_FUNCTION = process.env.ZOHO_E2E_PULL_FUNCTION || "api_test_nha_2";
const DEFAULT_CREATE_FUNCTION = process.env.ZOHO_E2E_CREATE_FUNCTION || "TestSuite_NHA";

loadDotEnv(path.resolve(rootDir, ".env"));

function parseArgs(argv) {
  const args = {
    pullFunction: DEFAULT_PULL_FUNCTION,
    createFunction: DEFAULT_CREATE_FUNCTION,
    validateOnly: false,
    roundtripOnly: false,
    createOnly: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--pull-function" && next) {
      args.pullFunction = next;
      i++;
      continue;
    }

    if (current === "--create-function" && next) {
      args.createFunction = next;
      i++;
      continue;
    }

    if (current === "--roundtrip-only") {
      args.roundtripOnly = true;
      continue;
    }

    if (current === "--create-only") {
      args.createOnly = true;
      continue;
    }

    if (current === "--local-only") {
      args.validateOnly = true;
      continue;
    }
  }

  return args;
}

function sanitizeSuiteName(value) {
  const safe = String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  return safe.replace(/^_+|_+$/g, "");
}

function ensureSuiteCounterDir() {
  fs.mkdirSync(path.dirname(suiteCounterPath), { recursive: true });
}

function readSuiteCounter() {
  try {
    const parsed = JSON.parse(fs.readFileSync(suiteCounterPath, "utf8"));
    const current = Number(parsed?.iteration);
    if (Number.isFinite(current) && current >= 1) {
      return current;
    }
  } catch {
    // fall through to default
  }

  return 1;
}

function writeSuiteCounter(counter) {
  ensureSuiteCounterDir();
  fs.writeFileSync(suiteCounterPath, JSON.stringify({ iteration: counter }, null, 2));
}

function buildNumberedSuiteFunctionName(seed = DEFAULT_CREATE_FUNCTION) {
  const base = sanitizeSuiteName(seed) || "TestSuite_NHA";
  const counter = readSuiteCounter();
  writeSuiteCounter(counter + 1);
  const iteration = String(counter).padStart(2, "0");
  return `${base}_${iteration}`;
}

function runCommand(command, args, options = {}) {
  const env = {
    ...process.env,
    ...(options.env || {}),
  };

  if (env.ZOHO_ACCESS_TOKEN) {
    delete env.ZOHO_REFRESH_TOKEN;
    delete env.ZOHO_CLIENT_ID;
    delete env.ZOHO_CLIENT_SECRET;
  }

  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    ...options,
    env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const stdoutText = String(result.stdout || "").trim();
  let response = stdoutText;
  if (stdoutText) {
    const jsonMatch = stdoutText.match(/(\{[\s\S]*\})\s*$/);
    if (jsonMatch) {
      try {
        response = JSON.parse(jsonMatch[1]);
      } catch {
        response = stdoutText;
      }
    } else {
      try {
        response = JSON.parse(stdoutText);
      } catch {
        response = stdoutText.split(/\r?\n/).slice(-1)[0] || stdoutText;
      }
    }
  }

  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    response,
  };
}

function runNode(scriptPath, scriptArgs = [], options = {}) {
  return runCommand("node", [scriptPath, ...scriptArgs], options);
}

function appendInfoBeforeClosingBrace(source, infoLine) {
  const trimmed = String(source).replace(/\s*$/, "");
  const closingBraceIndex = trimmed.lastIndexOf("}");

  if (closingBraceIndex === -1) {
    return `${trimmed}\n${infoLine}\n`;
  }

  const before = trimmed.slice(0, closingBraceIndex).replace(/\s*$/, "");
  const after = trimmed.slice(closingBraceIndex);
  return `${before}\n    ${infoLine}\n${after}\n`;
}

function ensureDocsDir() {
  fs.mkdirSync(docsDir, { recursive: true });
}

function formatViennaTimestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
    timeZoneName: "longOffset",
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const offset = String(parts.timeZoneName || "GMT+02:00")
    .replace(/^GMT/, "")
    .replace(/^([+-]\d{2})$/, "$1:00");

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond || "000"}${offset}`;
}

function appendRunLog(entry) {
  ensureDocsDir();

  const header = fs.existsSync(runsLogPath)
    ? ""
    : "# Test Automation Runs\n\nThis log records each suite invocation, the parameters used, and the result summary.\n\n";

  const block = [
    `## ${entry.startedAt}`,
    "",
    `- command: \`${entry.command}\``,
    `- mode: ${entry.mode}`,
    `- exitCode: ${entry.exitCode}`,
    `- status: ${entry.status}`,
    "",
    "### Step Results",
    "",
    ...entry.results.flatMap((step) => [
      `#### ${step.label}`,
      "",
      `- status: ${step.ok ? "passed" : "failed"}`,
      `- endpoint: ${step.endpoint || "local"}`,
      `- request: ${JSON.stringify(step.request || {})}`,
      `- response: ${JSON.stringify(step.response ?? null)}`,
      "",
    ]),
    "",
  ].join("\n");

  fs.appendFileSync(runsLogPath, header + block);
}

function pullFunctionToTemp(functionName, accessToken) {
  const result = runNode("scripts/zoho/pull-zoho-function.js", [functionName], {
    env: { ZOHO_ACCESS_TOKEN: accessToken },
  });
  if (!result.ok) {
    return result;
  }

  const data = JSON.parse(result.stdout.trim());
  const sourcePath = path.resolve(rootDir, data.codePath);
  const tempPath = path.join(tmpRoot, `${path.basename(data.codePath, ".ds")}.roundtrip.ds`);
  fs.copyFileSync(sourcePath, tempPath);

  return {
    ...result,
    pulled: data,
    tempPath,
    request: {
      functionName,
    },
  };
}

function createLocalFunctionFile(functionName, targetPath) {
  const source = `void automation.${functionName}()\n{\n    info "e2e local create probe";\n}\n`;
  fs.writeFileSync(targetPath, source);
  return targetPath;
}

function runRoundtripScenario(pullFunction, accessToken) {
  const results = [];

  console.log("\n=== Roundtrip scenario: pull -> edit -> validate -> push ===");
  const pulled = pullFunctionToTemp(pullFunction, accessToken);
  results.push({
    label: "Pull Zoho function",
    ok: pulled.ok,
    status: pulled.status,
    signal: pulled.signal,
    endpoint: "GET /settings/functions?page={page}&per_page=200, GET /settings/functions/{id}, GET /settings/functions/{id}/code",
    request: pulled.request || { functionName: pullFunction },
    response: pulled.response,
  });

  if (!pulled.ok) {
    return results;
  }

  const editedSource = appendInfoBeforeClosingBrace(
    fs.readFileSync(pulled.tempPath, "utf8"),
    'info "e2e roundtrip probe";'
  );
  fs.writeFileSync(pulled.tempPath, editedSource);

  const validate = runNode("scripts/cli/validate-deluge-file.js", [pulled.tempPath]);
  results.push({
    label: "Validate roundtrip copy",
    ok: validate.ok,
    status: validate.status,
    signal: validate.signal,
    endpoint: "local validate",
    request: {
      file: pulled.tempPath,
    },
    response: validate.response,
  });
  if (!validate.ok) {
    return results;
  }

  const push = runNode("scripts/zoho/push-zoho-function.js", [pullFunction, pulled.tempPath], {
    env: { ZOHO_ACCESS_TOKEN: accessToken },
  });
  results.push({
    label: "Push roundtrip update",
    ok: push.ok,
    status: push.status,
    signal: push.signal,
    endpoint: "PUT /settings/functions/{id}",
    request: {
      functionName: pullFunction,
      codePath: pulled.tempPath,
      method: "PUT",
    },
    response: push.response,
  });

  return results;
}

function runCreateScenario(createFunction, accessToken) {
  const results = [];
  const actualFunctionName = buildNumberedSuiteFunctionName(createFunction);

  console.log("\n=== Create scenario: local create -> validate -> push -> automation ===");
  const tempPath = path.join(tmpRoot, `${actualFunctionName}.ds`);
  createLocalFunctionFile(actualFunctionName, tempPath);

  const validate = runNode("scripts/cli/validate-deluge-file.js", [tempPath]);
  results.push({
    label: "Validate local create file",
    ok: validate.ok,
    status: validate.status,
    signal: validate.signal,
    endpoint: "local validate",
    request: {
      file: tempPath,
    },
    response: validate.response,
  });
  if (!validate.ok) {
    return results;
  }

  const push = runNode("scripts/zoho/push-zoho-function.js", [actualFunctionName, tempPath], {
    env: { ZOHO_ACCESS_TOKEN: accessToken },
  });
  results.push({
    label: "Push local create function",
    ok: push.ok,
    status: push.status,
    signal: push.signal,
    endpoint: "POST /settings/functions",
    request: {
      functionName: actualFunctionName,
      codePath: tempPath,
      method: "POST",
    },
    response: push.response,
  });
  if (!push.ok) {
    return results;
  }

  const automation = runNode("scripts/zoho/push-automation-function.js", [
    actualFunctionName,
    tempPath,
    "--module",
    "Leads",
    "--feature-type",
    "workflow",
  ], {
    env: { ZOHO_ACCESS_TOKEN: accessToken },
  });
  results.push({
    label: "Push automation association",
    ok: automation.ok,
    status: automation.status,
    signal: automation.signal,
    endpoint: "POST/PUT /settings/automation/functions",
    request: {
      functionName: actualFunctionName,
      codePath: tempPath,
      method: "POST/PUT",
      module: "Leads",
      featureType: "workflow",
    },
    response: automation.response,
  });

  return results;
}

function runLocalOnlyScenario(createFunction) {
  const results = [];
  const actualFunctionName = buildNumberedSuiteFunctionName(createFunction);

  console.log("\n=== Local-only scenario: unit tests -> local create -> validate ===");

  const unitTests = runNode("--test", [
    "test/deluge-catalog.test.js",
    "test/deluge-engine.test.js",
    "test/deluge-intelligence.test.js",
  ]);
  results.push({
    label: "Node test suite",
    ok: unitTests.ok,
    status: unitTests.status,
    signal: unitTests.signal,
    endpoint: "node --test",
    request: {
      files: [
        "test/deluge-catalog.test.js",
        "test/deluge-engine.test.js",
        "test/deluge-intelligence.test.js",
      ],
    },
    response: unitTests.response,
  });

  if (!unitTests.ok) {
    return results;
  }

  const tempPath = path.join(tmpRoot, `${actualFunctionName}.local-only.ds`);
  createLocalFunctionFile(actualFunctionName, tempPath);

  results.push({
    label: "Create local function file",
    ok: true,
    status: 0,
    signal: null,
    endpoint: "local create",
    request: {
      functionName: actualFunctionName,
      file: tempPath,
    },
    response: {
      file: tempPath,
      created: true,
    },
  });

  const validate = runNode("scripts/cli/validate-deluge-file.js", [tempPath]);
  results.push({
    label: "Validate local create file",
    ok: validate.ok,
    status: validate.status,
    signal: validate.signal,
    endpoint: "local validate",
    request: {
      file: tempPath,
    },
    response: validate.response,
  });

  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const results = [];
  let accessToken = "";

  if (!args.validateOnly) {
    accessToken = await getValidAccessToken();
  }

  if (args.validateOnly) {
    const localResults = runLocalOnlyScenario(args.createFunction);
    results.push(...localResults);
    appendRunLog({
      startedAt: formatViennaTimestamp(),
      command: `node ${path.relative(rootDir, __filename)} ${process.argv.slice(2).join(" ")}`.trim(),
      mode: "local-only",
      exitCode: localResults.some((item) => !item.ok) ? 1 : 0,
      status: localResults.some((item) => !item.ok) ? "failed" : "passed",
      results,
    });

    console.log("\n=== Suite Summary ===");
    console.log(JSON.stringify(results, null, 2));
    process.exitCode = localResults.some((item) => !item.ok) ? 1 : 0;
    return;
  }

  if (!args.validateOnly) {
    if (!args.createOnly) {
      const roundtripResults = runRoundtripScenario(args.pullFunction, accessToken);
      results.push(...roundtripResults);
      if (roundtripResults.some((item) => !item.ok)) {
        appendRunLog({
          startedAt: formatViennaTimestamp(),
          command: `node ${path.relative(rootDir, __filename)} ${process.argv.slice(2).join(" ")}`.trim(),
          mode: args.roundtripOnly ? "roundtrip" : args.createOnly ? "create" : args.validateOnly ? "local-only" : "full",
          exitCode: 1,
          status: "failed",
          results,
        });
        console.log("\n=== Suite Summary ===");
        console.log(JSON.stringify(results, null, 2));
        process.exitCode = 1;
        return;
      }
    }

    if (!args.roundtripOnly) {
      const createResults = runCreateScenario(args.createFunction, accessToken);
      results.push(...createResults);
      if (createResults.some((item) => !item.ok)) {
    appendRunLog({
      startedAt: formatViennaTimestamp(),
      command: `node ${path.relative(rootDir, __filename)} ${process.argv.slice(2).join(" ")}`.trim(),
      mode: args.roundtripOnly ? "roundtrip" : args.createOnly ? "create" : args.validateOnly ? "local-only" : "full",
      exitCode: 1,
      status: "failed",
      results,
        });
        console.log("\n=== Suite Summary ===");
        console.log(JSON.stringify(results, null, 2));
        process.exitCode = 1;
        return;
      }
    }
  }

  appendRunLog({
    startedAt: formatViennaTimestamp(),
    command: `node ${path.relative(rootDir, __filename)} ${process.argv.slice(2).join(" ")}`.trim(),
    mode: args.roundtripOnly ? "roundtrip" : args.createOnly ? "create" : args.validateOnly ? "local-only" : "full",
    exitCode: 0,
    status: "passed",
    results,
  });

  console.log("\n=== Suite Summary ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
