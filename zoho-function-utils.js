const fs = require("fs");
const path = require("path");

const ALLOWED_CATEGORIES = new Set([
  "Button",
  "Automation",
  "Schedule",
  "Related List",
  "Standalone",
  "Signals",
  "Validation Rule",
]);

const CATEGORY_ALIASES = new Map([
  ["automation", "Automation"],
  ["button", "Button"],
  ["schedule", "Schedule"],
  ["related_list", "Related List"],
  ["related-list", "Related List"],
  ["related list", "Related List"],
  ["standalone", "Standalone"],
  ["signals", "Signals"],
  ["salessignals", "Signals"],
  ["validation_rule", "Validation Rule"],
  ["validation-rule", "Validation Rule"],
  ["validation rule", "Validation Rule"],
]);

const DELUGE_RETURN_TYPES = [
  "void",
  "string",
  "number",
  "boolean",
  "map",
  "list",
  "int",
  "long",
  "double",
  "decimal",
];

function safeFileName(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizeCategory(rawCategory) {
  const key = String(rawCategory || "").trim().toLowerCase();
  return CATEGORY_ALIASES.get(key) || null;
}

function extractFunctionMetadata(code) {
  const returnTypePattern = DELUGE_RETURN_TYPES.join("|");
  const firstSignatureMatch = code.match(
    new RegExp(
      `^\\s*(?:${returnTypePattern})\\s+([A-Za-z_][A-Za-z0-9_]*)\\.([A-Za-z_][A-Za-z0-9_]*)\\s*\\(`,
      "im"
    )
  );

  if (firstSignatureMatch) {
    const category = normalizeCategory(firstSignatureMatch[1]);

    if (!category) {
      throw new Error(
        `Unsupported function category "${firstSignatureMatch[1]}". Allowed categories: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`
      );
    }

    return {
      category,
      displayName: firstSignatureMatch[2].toLowerCase(),
      apiName: firstSignatureMatch[2].toLowerCase(),
    };
  }

  const simpleMatch = code.match(
    new RegExp(
      `^\\s*(?:${returnTypePattern})\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\(`,
      "im"
    )
  );
  if (simpleMatch) {
    return {
      category: "Automation",
      displayName: simpleMatch[1].toLowerCase(),
      apiName: simpleMatch[1].toLowerCase(),
    };
  }

  return null;
}

function resolveDsPath(inputName, explicitDsPath) {
  if (explicitDsPath) {
    return path.resolve(explicitDsPath);
  }

  const outputDir = path.resolve("crmFunctions");
  const candidates = [
    path.join(outputDir, `${String(inputName).trim()}.ds`),
    path.join(outputDir, `${safeFileName(inputName)}.ds`),
    path.join(outputDir, `${safeFileName(inputName).toLowerCase()}.ds`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const available = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter((entry) => entry.endsWith(".ds"))
    : [];

  throw new Error(
    `Missing code file for "${inputName}". Looked for: ${candidates.join(
      " | "
    )}${available.length ? `\nAvailable .ds files: ${available.join(", ")}` : ""}`
  );
}

module.exports = {
  safeFileName,
  extractFunctionMetadata,
  resolveDsPath,
};
