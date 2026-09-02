const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadDotEnv } = require("../cli-env");

async function main() {
  loadDotEnv(path.resolve(".env"));
  const { getValidAccessToken, API_DOMAIN, API_VERSION } = require("../../zoho-crm-functions");
  const [, , functionName, argsJson = "{}"] = process.argv;

  if (!functionName) {
    throw new Error(
      'Usage: node scripts/cli/run-zoho.js <function_name> [\'{"arg":"value"}\']'
    );
  }

  const token = await getValidAccessToken();
  const raw = execFileSync(
    "curl",
    [
      "-sS",
      "-D",
      "-",
      "-X",
      "POST",
      "-H",
      `Authorization: Zoho-oauthtoken ${token}`,
      "-F",
      `arguments=${argsJson}`,
      `${API_DOMAIN}/crm/${API_VERSION}/functions/${encodeURIComponent(functionName)}/actions/execute?auth_type=oauth`,
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  const lastSeparator = raw.lastIndexOf("\r\n\r\n");
  const bodyText = lastSeparator === -1 ? raw : raw.slice(lastSeparator + 4);
  const statusMatch = raw.match(/HTTP\/\S+\s+(\d+)/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  console.log(JSON.stringify({
    ok: status >= 200 && status < 300,
    status,
    response: body,
  }, null, 2));

  if (!(status >= 200 && status < 300)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
