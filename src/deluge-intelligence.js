const {
  catalog,
  findCatalogEntries,
  getCatalogEntry,
  getCallableByPrefix,
  getNamespaceEntries,
} = require("./deluge-catalog");
const fs = require("fs");
const path = require("path");

const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const CACHE_ROOT = path.join(WORKSPACE_ROOT, ".zoho-cache");
const DEFAULT_MODULES = [
  "Leads",
  "Contacts",
  "Accounts",
  "Deals",
  "Tasks",
  "Events",
  "Calls",
  "Products",
  "Quotes",
  "Sales_Orders",
  "Purchase_Orders",
  "Invoices",
  "Cases",
];

function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function getCachedModules() {
  const cached = readJsonIfExists(path.join(CACHE_ROOT, "modules.json"), null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached
      .map((entry) => entry.apiName || entry.name || entry.label)
      .filter(Boolean);
  }
  return DEFAULT_MODULES.slice();
}

function getCachedFields(moduleName) {
  const moduleKey = String(moduleName || "").trim();
  if (!moduleKey) return [];
  const cached = readJsonIfExists(path.join(CACHE_ROOT, "fields", `${moduleKey}.json`), []);
  if (!Array.isArray(cached)) return [];
  return cached
    .map((entry) => ({
      apiName: entry.apiName || entry.name || entry.label,
      label: entry.label || entry.name || entry.apiName,
      dataType: entry.dataType || "unknown",
    }))
    .filter((entry) => entry.apiName);
}

function normalizeContext(source, offset) {
  const before = source.slice(0, offset);
  const trimmed = before.replace(/\s+$/, "");
  return {
    before,
    trimmed,
    lastDot: trimmed.lastIndexOf("."),
    lastBracket: Math.max(trimmed.lastIndexOf("["), trimmed.lastIndexOf("{")),
    lastOpenParen: trimmed.lastIndexOf("("),
  };
}

function getLineNumberAtOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

function getCompletions(source, offset) {
  const context = normalizeContext(source, offset);
  const suggestions = [];

  if (context.trimmed.endsWith("zoho.crm")) {
    getNamespaceEntries("zoho.crm.").forEach((entry) => {
      suggestions.push({
        label: entry.displayName,
        kind: entry.kind,
        insertText: `${entry.displayName}(`,
        detail: entry.summary,
        documentation: entry.docsUrl,
        sourceId: entry.id,
      });
    });
    return suggestions;
  }

  if (context.trimmed.endsWith("zoho")) {
    suggestions.push({
      label: "zoho.crm",
      kind: "namespace",
      insertText: "zoho.crm.",
      detail: "Zoho CRM namespace",
      sourceId: "namespace.zoho.crm",
    });
    return suggestions;
  }

  if (context.trimmed.endsWith("invokeurl")) {
    return [
      { label: "url", kind: "field", insertText: "url: \"\"", detail: "Request URL" },
      { label: "type", kind: "field", insertText: "type: GET", detail: "HTTP method" },
      { label: "headers", kind: "field", insertText: "headers: {}", detail: "Request headers" },
      { label: "parameters", kind: "field", insertText: "parameters: {}", detail: "Request parameters" },
      { label: "detailed", kind: "field", insertText: "detailed: true", detail: "Return a detailed response" },
      { label: "contentType", kind: "field", insertText: "contentType: \"application/json\"", detail: "Body content type" },
      { label: "files", kind: "field", insertText: "files: {}", detail: "Multipart files" },
    ];
  }

  if (/searchRecords\s*\($/i.test(context.trimmed)) {
    return [
      ...getCachedModules().slice(0, 20).map((moduleName) => ({
        label: moduleName,
        kind: "field",
        insertText: `"${moduleName}"`,
        detail: "CRM module name",
        sourceId: `module.${moduleName}`,
      })),
      { label: "criteria", kind: "field", insertText: '"(Last_Name:equals:Smith)"', detail: "Search criteria string" },
      { label: "page", kind: "field", insertText: "1", detail: "Page number" },
      { label: "perPage", kind: "field", insertText: "200", detail: "Records per page" },
      { label: "connection", kind: "field", insertText: '"connection_name"', detail: "Named connection" },
    ];
  }

  if (/getRelatedRecords\s*\($/i.test(context.trimmed)) {
    return [
      { label: "relationName", kind: "field", insertText: '"Notes"', detail: "Related list name" },
      ...getCachedModules().slice(0, 20).map((moduleName) => ({
        label: `${moduleName} module`,
        kind: "field",
        insertText: `"${moduleName}"`,
        detail: "Parent module name",
        sourceId: `module.${moduleName}`,
      })),
      { label: "recordId", kind: "field", insertText: "recordId", detail: "Parent record id" },
      { label: "page", kind: "field", insertText: "1", detail: "Page number" },
      { label: "perPage", kind: "field", insertText: "200", detail: "Records per page" },
      { label: "connection", kind: "field", insertText: '"connection_name"', detail: "Named connection" },
    ];
  }

  const wordMatch = context.trimmed.match(/([A-Za-z_][A-Za-z0-9_.]*)$/);
  if (wordMatch) {
    const query = wordMatch[1];
    const matches = findCatalogEntries(query);
    matches.slice(0, 20).forEach((entry) => {
      suggestions.push({
        label: entry.displayName,
        kind: entry.kind,
        insertText: entry.kind === "task" ? `${entry.displayName} ` : `${entry.displayName}(`,
        detail: entry.summary,
        documentation: entry.docsUrl,
        sourceId: entry.id,
      });
    });
  }

  return suggestions;
}

function getFieldSuggestions(moduleName) {
  return getCachedFields(moduleName).map((field) => ({
    label: field.apiName,
    kind: "field",
    insertText: field.apiName,
    detail: `${field.label} (${field.dataType})`,
    sourceId: `field.${moduleName}.${field.apiName}`,
  }));
}

function getCriteriaSuggestions(moduleName) {
  return getCachedFields(moduleName).flatMap((field) => [
    {
      label: field.apiName,
      kind: "field",
      insertText: field.apiName,
      detail: `${field.label} field`,
      sourceId: `field.${moduleName}.${field.apiName}`,
    },
    {
      label: `${field.apiName}:equals:`,
      kind: "snippet",
      insertText: `(${field.apiName}:equals:VALUE)`,
      detail: `searchRecords criterion for ${field.label}`,
      sourceId: `criteria.${moduleName}.${field.apiName}`,
    },
  ]);
}

function getHoverInfo(symbolName) {
  const entry = getCatalogEntry(symbolName) || catalog.find((item) => item.displayName === symbolName || item.name === symbolName);
  if (!entry) return null;
  const signatureLines = (entry.signatures || []).map((signature) => signature.syntax);
  return {
    title: entry.displayName,
    summary: entry.summary,
    kind: entry.kind,
    category: entry.category,
    sourceStatus: entry.sourceStatus,
    signatures: signatureLines,
    returnType: entry.returnType || null,
    docsUrl: entry.docsUrl || null,
    examples: entry.examples || [],
  };
}

function lintSource(source) {
  const diagnostics = [];
  const stack = [];
  const openers = { "{": "}", "[": "]", "(": ")" };
  const closers = new Set(Object.values(openers));
  const pairs = new Map(Object.entries(openers).map(([open, close]) => [close, open]));
  const chars = Array.from(source);
  let inString = null;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const next = chars[i + 1];
    if (inString) {
      if (ch === "\\" && next) {
        i += 1;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < chars.length && chars[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < chars.length - 1 && !(chars[i] === "*" && chars[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    if (openers[ch]) {
      stack.push({ ch, index: i });
      continue;
    }
    if (closers.has(ch)) {
      const last = stack.pop();
      if (!last || pairs.get(ch) !== last.ch) {
        diagnostics.push({
          severity: "error",
          message: `Unexpected closing '${ch}'`,
          line: getLineNumberAtOffset(source, i),
        });
      }
    }
  }

  if (inString) {
    diagnostics.push({
      severity: "error",
      message: "Unterminated string",
      line: getLineNumberAtOffset(source, source.length),
    });
  }

  stack.forEach((item) => {
    diagnostics.push({
      severity: "error",
      message: `Unclosed '${item.ch}'`,
      line: getLineNumberAtOffset(source, item.index),
    });
  });

  if (/\binvokeurl\s*\[/.test(source)) {
    const block = source.match(/invokeurl\s*\[([\s\S]*?)\]/i);
    if (block) {
      if (!/\burl\s*:/.test(block[1])) {
        diagnostics.push({ severity: "error", message: "invokeurl block is missing url", line: getLineNumberAtOffset(source, source.indexOf("invokeurl")) });
      }
      if (!/\btype\s*:/.test(block[1])) {
        diagnostics.push({ severity: "error", message: "invokeurl block is missing type", line: getLineNumberAtOffset(source, source.indexOf("invokeurl")) });
      }
      if (/\btype\s*:\s*(?!GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\w+/i.test(block[1])) {
        diagnostics.push({
          severity: "warning",
          message: "invokeurl block type looks unusual",
          line: getLineNumberAtOffset(source, source.indexOf("invokeurl")),
        });
      }
    } else {
      diagnostics.push({ severity: "error", message: "invokeurl block is missing closing ']'", line: getLineNumberAtOffset(source, source.indexOf("invokeurl")) });
    }
  }

  const knownPrefixes = [
    "zoho.crm.getRecordById",
    "zoho.crm.getRecords",
    "zoho.crm.searchRecords",
    "zoho.crm.createRecord",
    "zoho.crm.updateRecord",
    "zoho.crm.deleteRecord",
    "zoho.crm.getRelatedRecords",
    "zoho.crm.getOrgVariable",
    "zoho.crm.setOrgVariable",
    "invokeurl",
    "invokeapi",
    "sendmail",
    "relatedRecords",
  ];
  const suspiciousCrmNames = [
    "zoho.crm.searchRecord",
    "zoho.crm.getRelatedRecord",
  ];
  suspiciousCrmNames.forEach((name) => {
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (pattern.test(source)) {
      diagnostics.push({
        severity: "warning",
        message: `Possible typo: ${name}`,
        line: getLineNumberAtOffset(source, source.search(pattern)),
      });
    }
  });

  const lines = source.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const searchMatch = line.match(/zoho\.crm\.searchRecords\s*\(([^)]*)/i);
    if (searchMatch) {
      const args = searchMatch[1];
      const quotedArgs = args.match(/"([^"]*)"/g) || [];
      if (quotedArgs.length >= 2) {
        const criteria = quotedArgs[1].slice(1, -1);
        if (!/^\([^:]+:[^:]+:.+\)$/.test(criteria)) {
          diagnostics.push({
            severity: "warning",
            message: "searchRecords criteria should usually look like (Field:operator:Value)",
            line: lineNumber,
          });
        }
      }
    }
    const relatedMatch = line.match(/zoho\.crm\.getRelatedRecords\s*\(([^)]*)/i);
    if (relatedMatch && relatedMatch[1].split(",").length < 3) {
      diagnostics.push({
        severity: "error",
        message: "getRelatedRecords needs relationName, parentModuleName, and recordId",
        line: lineNumber,
      });
    }
    const shorthandRelated = line.match(/\brelatedRecords\s*\(([^)]*)/i);
    if (shorthandRelated && shorthandRelated[1].split(",").length < 3) {
      diagnostics.push({
        severity: "warning",
        message: "relatedRecords usually needs moduleName, recordId, and relationName",
        line: lineNumber,
      });
    }

  });

  return diagnostics;
}

module.exports = {
  getCompletions,
  getHoverInfo,
  lintSource,
  getFieldSuggestions,
  getCriteriaSuggestions,
  getCachedModules,
  getCachedFields,
};
