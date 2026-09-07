const fs = require("fs");
const path = require("path");

const API_DOMAIN = "https://www.zohoapis.eu";
const API_VERSION = "v8";
const ACCOUNTS_DOMAIN = "https://accounts.zoho.eu";
const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;
const TOKEN_CACHE_PATH = path.resolve(__dirname, ".zoho-cache", "access-token.json");
const TOKEN_REFRESH_MAX_ATTEMPTS = 5;
const { buildCommitMessage } = require("./config/function-commit-message");

let cachedAccessToken = process.env.ZOHO_ACCESS_TOKEN || "";
let cachedAccessTokenExpiresAt = 0;

// Required OAuth scope:
// ZohoCRM.settings.ALL

async function zohoRequest(path, options = {}) {
  const response = await zohoFetch(path, options);
  return response.body;
}

function formatZohoError(response, body, action = "process") {
  const statusCode = response?.status;

  const functionEntry =
    body?.functions?.[0] ||
    body?.function?.functions?.[0] ||
    null;

  const details = functionEntry?.details || body?.details || {};
  const errors = details.errors || [];
  const firstError = Array.isArray(errors) && errors.length ? errors[0] : null;
  const cleanErrorMessage = String(
    firstError?.message ||
      functionEntry?.message ||
      body?.message ||
      "Unknown Zoho error"
  )
    .replace(/\s+/g, " ")
    .trim();
  const message =
    cleanErrorMessage;

  if (functionEntry?.code === "COMPILATION_ERROR" && firstError) {
    const line = firstError.line != null ? ` (Line : ${firstError.line})` : "";
    return new Error(
      `Failed to ${action} function "${cleanErrorMessage}"${line}`
    );
  }

  if (functionEntry?.code === "INVALID_DATA" && details.api_name) {
    const pathInfo = details.json_path ? ` at ${details.json_path}` : "";
    return new Error(
      `Failed to ${action} function: invalid ${details.api_name}${pathInfo}. ${message}`
    );
  }

  if (statusCode) {
    return new Error(`Zoho API ${statusCode}: ${JSON.stringify(body)}`);
  }

  return new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshAccessToken(attempt = 1) {
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;

  if (!refreshToken) {
    throw new Error("Missing ZOHO_REFRESH_TOKEN");
  }

  if (!clientId || !clientSecret) {
    throw new Error("Missing ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET");
  }

  const requestBody = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(`${ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });
  const text = await response.text();

  let responseBody;
  try {
    responseBody = JSON.parse(text);
  } catch {
    responseBody = text;
  }

  if (!response.ok) {
    const retryable =
      response.status === 400 &&
      JSON.stringify(responseBody).includes("too many requests continuously");

    if (retryable && attempt < TOKEN_REFRESH_MAX_ATTEMPTS) {
      await sleep(15000 * attempt);
      return await refreshAccessToken(attempt + 1);
    }

    throw new Error(
      `Zoho token refresh failed ${response.status}: ${JSON.stringify(responseBody)}`
    );
  }

  if (!responseBody.access_token) {
    throw new Error(
      `Zoho token refresh returned no access_token: ${JSON.stringify(responseBody)}`
    );
  }

  const expiresIn = Number(responseBody.expires_in || 3600);
  cachedAccessToken = responseBody.access_token;
  cachedAccessTokenExpiresAt = Date.now() + expiresIn * 1000;
  process.env.ZOHO_ACCESS_TOKEN = responseBody.access_token;

  try {
    fs.mkdirSync(path.dirname(TOKEN_CACHE_PATH), { recursive: true });
    fs.writeFileSync(
      TOKEN_CACHE_PATH,
      JSON.stringify(
        {
          access_token: responseBody.access_token,
          expires_at: cachedAccessTokenExpiresAt,
        },
        null,
        2
      )
    );
  } catch {
    // Cache write is best-effort only.
  }

  return responseBody.access_token;
}

async function getValidAccessToken() {
  if (
    cachedAccessToken &&
    cachedAccessTokenExpiresAt > Date.now() + TOKEN_EXPIRY_SKEW_MS
  ) {
    return cachedAccessToken;
  }

  if (process.env.ZOHO_ACCESS_TOKEN && !process.env.ZOHO_REFRESH_TOKEN) {
    cachedAccessToken = process.env.ZOHO_ACCESS_TOKEN;
    return cachedAccessToken;
  }

  if (!cachedAccessToken) {
    try {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, "utf8"));
      if (
        cached?.access_token &&
        Number(cached.expires_at || 0) > Date.now() + TOKEN_EXPIRY_SKEW_MS
      ) {
        cachedAccessToken = cached.access_token;
        cachedAccessTokenExpiresAt = Number(cached.expires_at);
        process.env.ZOHO_ACCESS_TOKEN = cachedAccessToken;
        return cachedAccessToken;
      }
    } catch {
      // No usable cache yet.
    }
  }

  if (!process.env.ZOHO_REFRESH_TOKEN && !cachedAccessToken) {
    throw new Error("Missing ZOHO_REFRESH_TOKEN");
  }

  return await refreshAccessToken();
}

async function zohoFetch(path, options = {}, retry = true) {
  const accessToken = await getValidAccessToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_DOMAIN}/crm/${API_VERSION}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = JSON.stringify(body);
    const invalidAuth =
      message.includes("INVALID_TOKEN") ||
      message.includes("invalid auth token") ||
      message.includes("expired") ||
      response.status === 401;

    if (retry && invalidAuth && process.env.ZOHO_REFRESH_TOKEN) {
      await refreshAccessToken();
      return await zohoFetch(path, options, false);
    }

    throw formatZohoError(response, body, options.method === "PUT" ? "update" : "create");
  }

  return { response, body };
}

async function findFunctionByApiName(functionApiName) {
  let functionId = null;
  let functionName = functionApiName;
  let moreRecords = true;
  let foundFunction = null;

  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    if (moreRecords === true && functionId === null) {
      const functionListResp = await zohoRequest(
        `/settings/functions?page=${pageNo}&per_page=200`
      );

      if (functionListResp && Array.isArray(functionListResp.functions)) {
        for (const crmFunction of functionListResp.functions) {
          const currentApiName = crmFunction?.api_name || "";

          if (currentApiName === functionApiName) {
            functionId = crmFunction.id || null;
            if (crmFunction.name != null) {
              functionName = crmFunction.name;
            }
            foundFunction = crmFunction;
          }
        }

        if (functionListResp.functions.length < 200) {
          moreRecords = false;
        }
      } else {
        moreRecords = false;
      }
    }
  }

  if (foundFunction) {
    return {
      ...foundFunction,
      id: functionId,
      name: functionName,
    };
  }

  return null;
}

async function createFunction({
  metadata,
}) {
  const createMetadata = JSON.parse(JSON.stringify(metadata));
  if (Array.isArray(createMetadata.functions) && createMetadata.functions[0]) {
    createMetadata.publish = {
      changelog: buildCommitMessage(
        "create",
        createMetadata.functions[0].name || createMetadata.functions[0].api_name || "",
        createMetadata.functions[0].description || "Created function implementation"
      ),
    };
  }

  const form = new FormData();
  form.append("metadata", JSON.stringify(createMetadata));

  return await zohoRequest("/settings/functions", {
    method: "POST",
    body: form,
  });
}

async function updateFunction({
  id,
  metadata,
}) {
  const updateMetadata = JSON.parse(JSON.stringify(metadata));
  if (Array.isArray(updateMetadata.functions) && updateMetadata.functions[0]) {
    const updateFunctionEntry = updateMetadata.functions[0];
    const changelogName = updateFunctionEntry.name || updateFunctionEntry.api_name || "";
    const changelogDescription = updateFunctionEntry.description || "Updated function implementation";

    delete updateFunctionEntry.name;
    delete updateFunctionEntry.api_name;
    updateMetadata.publish = {
      changelog: buildCommitMessage(
        "update",
        changelogName,
        changelogDescription
      ),
    };
  }

  const form = new FormData();
  form.append("metadata", JSON.stringify(updateMetadata));

  return await zohoRequest(`/settings/functions/${id}`, {
    method: "PUT",
    body: form,
  });
}

async function pushFunctionToCRM({
  metadata,
  code,
}) {
  const apiName = metadata?.functions?.[0]?.api_name;

  if (!apiName) {
    throw new Error("Missing metadata.functions[0].api_name");
  }

  const existing = await findFunctionByApiName(apiName);

  if (existing) {
    console.log(`Updating function ${apiName} (${existing.id})`);

    return await updateFunction({
      id: existing.id,
      metadata,
    });
  }

  console.log(`Creating function ${apiName}`);

  return await createFunction({
    metadata,
  });
}

module.exports = {
  API_DOMAIN,
  API_VERSION,
  zohoRequest,
  refreshAccessToken,
  getValidAccessToken,
  findFunctionByApiName,
  createFunction,
  updateFunction,
  pushFunctionToCRM,
  formatZohoError,
};
