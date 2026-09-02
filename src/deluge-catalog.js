const DOCUMENTED = "documented";
const OBSERVED = "observed";
const INFERRED = "inferred";
const UNKNOWN = "unknown";

const PRIMITIVES = {
  TEXT: { name: "TEXT", kind: "primitive" },
  NUMBER: { name: "NUMBER", kind: "primitive" },
  BOOLEAN: { name: "BOOLEAN", kind: "primitive" },
  NULL: { name: "NULL", kind: "primitive" },
  LIST: { name: "LIST", kind: "collection" },
  MAP: { name: "MAP", kind: "collection" },
  FILE: { name: "FILE", kind: "object" },
  DATE_TIME: { name: "DATE-TIME", kind: "primitive" },
  ANY: { name: "ANY", kind: "unknown" },
  COLLECTION: { name: "COLLECTION", kind: "collection" },
  RECORD_LIST: { name: "RECORD LIST", kind: "task-result" },
};

function typeRef(name) {
  return PRIMITIVES[name] || { name, kind: "unknown" };
}

function baseEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    displayName: entry.displayName || entry.name,
    kind: entry.kind,
    category: entry.category,
    sourceStatus: entry.sourceStatus || UNKNOWN,
    summary: entry.summary,
    description: entry.description || "",
    docsUrl: entry.docsUrl || "",
    examples: entry.examples || [],
    tags: entry.tags || [],
  };
}

function callableEntry(entry) {
  return {
    ...baseEntry(entry),
    signatures: entry.signatures || [],
    returnType: entry.returnType || null,
    memberOn: entry.memberOn || [],
    aliases: entry.aliases || [],
    deprecated: Boolean(entry.deprecated),
  };
}

const catalog = [
  callableEntry({
    id: "core.info",
    name: "info",
    kind: "function",
    category: "core",
    sourceStatus: DOCUMENTED,
    summary: "Writes a value to the script output stream.",
    docsUrl: "https://www.zoho.com/deluge/help/",
    signatures: [
      {
        syntax: "info <expression>;",
        parameters: [{ name: "expression", type: typeRef("ANY"), required: true }],
        returns: typeRef("ANY"),
      },
    ],
    returnType: typeRef("ANY"),
    examples: [{ code: 'info "Hello";', expectedOutput: "Hello" }],
    tags: ["output", "logging"],
  }),
  callableEntry({
    id: "core.ifNull",
    name: "ifNull",
    kind: "function",
    category: "core",
    sourceStatus: DOCUMENTED,
    summary: "Returns the fallback value when the first argument is null or empty.",
    docsUrl: "https://www.zoho.com/deluge/help/conditional-statements/condition.html",
    signatures: [
      {
        syntax: "ifNull(expression1, expression2)",
        parameters: [
          { name: "expression1", type: typeRef("ANY"), required: true },
          { name: "expression2", type: typeRef("ANY"), required: true },
        ],
        returns: typeRef("ANY"),
      },
    ],
    returnType: typeRef("ANY"),
    aliases: ["ifnull"],
  }),
  callableEntry({
    id: "core.Map",
    name: "Map",
    kind: "function",
    category: "core",
    sourceStatus: DOCUMENTED,
    summary: "Creates a map value.",
    docsUrl: "https://www.zoho.com/deluge/help/built-in-functions.html",
    signatures: [
      {
        syntax: "Map(initial?)",
        parameters: [{ name: "initial", type: typeRef("MAP"), required: false }],
        returns: typeRef("MAP"),
      },
    ],
    returnType: typeRef("MAP"),
  }),
  callableEntry({
    id: "core.List",
    name: "List",
    kind: "function",
    category: "core",
    sourceStatus: DOCUMENTED,
    summary: "Creates a list value.",
    docsUrl: "https://www.zoho.com/deluge/help/built-in-functions.html",
    signatures: [
      {
        syntax: "List(initial?)",
        parameters: [{ name: "initial", type: typeRef("LIST"), required: false }],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
  }),
  callableEntry({
    id: "core.toText",
    name: "toText",
    kind: "function",
    category: "core",
    sourceStatus: DOCUMENTED,
    summary: "Converts a value to text.",
    docsUrl: "https://www.zoho.com/deluge/help/functions/number/text.html",
    signatures: [
      {
        syntax: "toText(formatText?)",
        parameters: [{ name: "formatText", type: typeRef("TEXT"), required: false }],
        returns: typeRef("TEXT"),
      },
    ],
    returnType: typeRef("TEXT"),
  }),
  callableEntry({
    id: "core.toLong",
    name: "toLong",
    kind: "function",
    category: "core",
    sourceStatus: OBSERVED,
    summary: "Converts a value to a long integer.",
    docsUrl: "",
    signatures: [
      {
        syntax: "toLong()",
        parameters: [],
        returns: typeRef("NUMBER"),
      },
    ],
    returnType: typeRef("NUMBER"),
  }),
  callableEntry({
    id: "core.toDate",
    name: "toDate",
    kind: "function",
    category: "core",
    sourceStatus: OBSERVED,
    summary: "Converts a value to a date-time value.",
    docsUrl: "",
    signatures: [
      {
        syntax: "toDate(formatText?)",
        parameters: [{ name: "formatText", type: typeRef("TEXT"), required: false }],
        returns: typeRef("DATE_TIME"),
      },
    ],
    returnType: typeRef("DATE_TIME"),
  }),
  callableEntry({
    id: "collection.get",
    name: "get",
    kind: "method",
    category: "stdlib",
    sourceStatus: DOCUMENTED,
    summary: "Returns the value at an index or key from a collection.",
    docsUrl: "https://www.zoho.com/deluge/help/functions/collection/get.html",
    memberOn: [typeRef("LIST"), typeRef("MAP"), typeRef("COLLECTION")],
    signatures: [
      {
        syntax: "collection.get(indexOrKey)",
        parameters: [{ name: "indexOrKey", type: typeRef("ANY"), required: true }],
        returns: typeRef("ANY"),
      },
    ],
    returnType: typeRef("ANY"),
  }),
  callableEntry({
    id: "collection.size",
    name: "size",
    kind: "method",
    category: "stdlib",
    sourceStatus: DOCUMENTED,
    summary: "Returns the number of items in a list, map, or collection.",
    docsUrl: "https://www.zoho.com/deluge/help/built-in-functions.html",
    memberOn: [typeRef("LIST"), typeRef("MAP"), typeRef("COLLECTION")],
    signatures: [
      {
        syntax: "collection.size()",
        parameters: [],
        returns: typeRef("NUMBER"),
      },
    ],
    returnType: typeRef("NUMBER"),
  }),
  callableEntry({
    id: "collection.keys",
    name: "keys",
    kind: "method",
    category: "stdlib",
    sourceStatus: DOCUMENTED,
    summary: "Returns the keys of a map as a list.",
    docsUrl: "https://www.zoho.com/deluge/help/functions/map/keys.html",
    memberOn: [typeRef("MAP")],
    signatures: [
      {
        syntax: "map.keys()",
        parameters: [],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
  }),
  callableEntry({
    id: "collection.values",
    name: "values",
    kind: "method",
    category: "stdlib",
    sourceStatus: DOCUMENTED,
    summary: "Returns the values of a map as a list.",
    docsUrl: "https://www.zoho.com/deluge/help/built-in-functions.html",
    memberOn: [typeRef("MAP")],
    signatures: [
      {
        syntax: "map.values()",
        parameters: [],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
  }),
  callableEntry({
    id: "zoho.crm.getRecordById",
    name: "getRecordById",
    displayName: "zoho.crm.getRecordById",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Fetches a CRM record by module and record id.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/get-record-by-id.html",
    signatures: [
      {
        syntax: "zoho.crm.getRecordById(moduleName, recordId, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "recordId", type: typeRef("NUMBER"), required: true },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("MAP"),
      },
    ],
    returnType: typeRef("MAP"),
    tags: ["crm", "record"],
  }),
  callableEntry({
    id: "zoho.crm.getRecords",
    name: "getRecords",
    displayName: "zoho.crm.getRecords",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Fetches records from a CRM module.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/get-records.html",
    signatures: [
      {
        syntax: "zoho.crm.getRecords(moduleName, page?, perPage?, optionalDataMap?, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "page", type: typeRef("NUMBER"), required: false },
          { name: "perPage", type: typeRef("NUMBER"), required: false },
          { name: "optionalDataMap", type: typeRef("MAP"), required: false },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
    tags: ["crm", "records"],
  }),
  callableEntry({
    id: "zoho.crm.getRecordById",
    name: "getRecordById",
    displayName: "zoho.crm.getRecordById",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Fetches a CRM record by module and record id.",
    docsUrl: "https://www.zoho.com/deluge/help/functions/zoho-crm/get-record-by-id.html",
    signatures: [
      {
        syntax: "zoho.crm.getRecordById(moduleName, recordId, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "recordId", type: typeRef("NUMBER"), required: true },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("MAP"),
      },
    ],
    returnType: typeRef("MAP"),
    tags: ["crm", "record"],
  }),
  callableEntry({
    id: "zoho.crm.getRelatedRecords",
    name: "getRelatedRecords",
    displayName: "zoho.crm.getRelatedRecords",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Fetches records related to a parent CRM record.",
    docsUrl: "https://www.zoho.com/deluge/help/functions/zoho-crm/getrelatedrecords.html",
    signatures: [
      {
        syntax: "zoho.crm.getRelatedRecords(relationName, parentModuleName, recordId, page?, perPage?, connection?)",
        parameters: [
          { name: "relationName", type: typeRef("TEXT"), required: true },
          { name: "parentModuleName", type: typeRef("TEXT"), required: true },
          { name: "recordId", type: typeRef("NUMBER"), required: true },
          { name: "page", type: typeRef("NUMBER"), required: false },
          { name: "perPage", type: typeRef("NUMBER"), required: false },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
    tags: ["crm", "related-records", "relationship"],
  }),
  callableEntry({
    id: "zoho.crm.searchRecords",
    name: "searchRecords",
    displayName: "zoho.crm.searchRecords",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Searches for CRM records using criteria.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/search-records.html",
    signatures: [
      {
        syntax: "zoho.crm.searchRecords(moduleName, criteria, page?, perPage?, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "criteria", type: typeRef("TEXT"), required: true },
          { name: "page", type: typeRef("NUMBER"), required: false },
          { name: "perPage", type: typeRef("NUMBER"), required: false },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
    tags: ["crm", "search", "criteria"],
  }),
  callableEntry({
    id: "zoho.crm.searchRecords.criteria",
    name: "searchRecords.criteria",
    displayName: "searchRecords criteria",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: INFERRED,
    summary: "Criteria strings used by searchRecords.",
    docsUrl: "",
    signatures: [
      {
        syntax: 'searchRecords criteria examples: "(Last_Name:equals:Smith)"',
        parameters: [],
        returns: typeRef("TEXT"),
      },
    ],
    returnType: typeRef("TEXT"),
    tags: ["crm", "search", "criteria", "operators"],
  }),
  callableEntry({
    id: "zoho.crm.createRecord",
    name: "createRecord",
    displayName: "zoho.crm.createRecord",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Creates a CRM record in a module.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/create-record.html",
    signatures: [
      {
        syntax: "zoho.crm.createRecord(moduleName, dataMap, optionsMap?, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "dataMap", type: typeRef("MAP"), required: true },
          { name: "optionsMap", type: typeRef("MAP"), required: false },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("MAP"),
      },
    ],
    returnType: typeRef("MAP"),
    tags: ["crm", "create"],
  }),
  callableEntry({
    id: "zoho.crm.updateRecord",
    name: "updateRecord",
    displayName: "zoho.crm.updateRecord",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Updates a CRM record.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/update-record.html",
    signatures: [
      {
        syntax: "zoho.crm.updateRecord(moduleName, recordId, dataMap, optionsMap?, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "recordId", type: typeRef("NUMBER"), required: true },
          { name: "dataMap", type: typeRef("MAP"), required: true },
          { name: "optionsMap", type: typeRef("MAP"), required: false },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("MAP"),
      },
    ],
    returnType: typeRef("MAP"),
    tags: ["crm", "update"],
  }),
  callableEntry({
    id: "zoho.crm.deleteRecord",
    name: "deleteRecord",
    displayName: "zoho.crm.deleteRecord",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Deletes a CRM record.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/delete-record.html",
    signatures: [
      {
        syntax: "zoho.crm.deleteRecord(moduleName, recordId, connection?)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "recordId", type: typeRef("NUMBER"), required: true },
          { name: "connection", type: typeRef("TEXT"), required: false },
        ],
        returns: typeRef("MAP"),
      },
    ],
    returnType: typeRef("MAP"),
    tags: ["crm", "delete"],
  }),
  callableEntry({
    id: "zoho.crm.getOrgVariable",
    name: "getOrgVariable",
    displayName: "zoho.crm.getOrgVariable",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Reads an organization variable.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/org-variables.html",
    signatures: [
      {
        syntax: "zoho.crm.getOrgVariable(name)",
        parameters: [{ name: "name", type: typeRef("TEXT"), required: true }],
        returns: typeRef("ANY"),
      },
    ],
    returnType: typeRef("ANY"),
    tags: ["crm", "org-variable"],
  }),
  callableEntry({
    id: "zoho.crm.setOrgVariable",
    name: "setOrgVariable",
    displayName: "zoho.crm.setOrgVariable",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: DOCUMENTED,
    summary: "Writes an organization variable.",
    docsUrl: "https://www.zoho.com/deluge/help/crm/org-variables.html",
    signatures: [
      {
        syntax: "zoho.crm.setOrgVariable(name, value)",
        parameters: [
          { name: "name", type: typeRef("TEXT"), required: true },
          { name: "value", type: typeRef("ANY"), required: true },
        ],
        returns: typeRef("NULL"),
      },
    ],
    returnType: typeRef("NULL"),
    tags: ["crm", "org-variable"],
  }),
  callableEntry({
    id: "task.invokeurl",
    name: "invokeurl",
    kind: "task",
    category: "zoho-integration",
    sourceStatus: OBSERVED,
    summary: "Performs an HTTP request from Deluge.",
    docsUrl: "https://deluge.zoho.com/help/",
    signatures: [
      {
        syntax: "invokeurl [ url: ..., type: ..., headers?: ..., parameters?: ... ];",
        parameters: [],
        returns: typeRef("ANY"),
      },
    ],
    returnType: typeRef("ANY"),
    tags: ["http", "request", "integration"],
  }),
  callableEntry({
    id: "task.invokeurl.keys",
    name: "invokeurl.keys",
    displayName: "invokeurl block keys",
    kind: "task",
    category: "zoho-integration",
    sourceStatus: OBSERVED,
    summary: "Common keys for an invokeurl block.",
    docsUrl: "",
    signatures: [
      {
        syntax: "url, type, headers, parameters, detailed, contentType, files",
        parameters: [],
        returns: typeRef("TEXT"),
      },
    ],
    returnType: typeRef("TEXT"),
    tags: ["http", "invokeurl", "task-block", "keys"],
  }),
  callableEntry({
    id: "task.sendmail",
    name: "sendmail",
    kind: "task",
    category: "product-specific",
    sourceStatus: DOCUMENTED,
    summary: "Sends an email from a Deluge workflow.",
    docsUrl: "https://www.zoho.com/deluge/help/",
    signatures: [
      {
        syntax: "sendmail [ from: ..., to: ..., subject: ..., message: ... ];",
        parameters: [],
        returns: typeRef("NULL"),
      },
    ],
    returnType: typeRef("NULL"),
    tags: ["email", "workflow"],
  }),
  callableEntry({
    id: "task.invokeapi",
    name: "invokeapi",
    kind: "task",
    category: "zoho-integration",
    sourceStatus: OBSERVED,
    summary: "Performs an API invocation through a Deluge task.",
    docsUrl: "https://www.zoho.com/deluge/help/",
    signatures: [
      {
        syntax: "invokeapi [ ... ];",
        parameters: [],
        returns: typeRef("ANY"),
      },
    ],
    returnType: typeRef("ANY"),
    tags: ["api", "integration"],
  }),
  callableEntry({
    id: "zoho.crm.relatedRecords",
    name: "relatedRecords",
    displayName: "relatedRecords",
    kind: "function",
    category: "zoho-integration",
    sourceStatus: INFERRED,
    summary: "A convenience name for related-record lookups in the editor catalog.",
    docsUrl: "",
    signatures: [
      {
        syntax: "relatedRecords(moduleName, recordId, relationName)",
        parameters: [
          { name: "moduleName", type: typeRef("TEXT"), required: true },
          { name: "recordId", type: typeRef("NUMBER"), required: true },
          { name: "relationName", type: typeRef("TEXT"), required: true },
        ],
        returns: typeRef("LIST"),
      },
    ],
    returnType: typeRef("LIST"),
    tags: ["crm", "related-records", "alias"],
  }),
];

function listCatalog() {
  return catalog.slice();
}

function getCatalogEntry(id) {
  return catalog.find((entry) => entry.id === id) || null;
}

function findCatalogEntries(query) {
  const needle = String(query || "").toLowerCase();
  if (!needle) return listCatalog();
  return catalog.filter((entry) => {
    const haystack = [
      entry.id,
      entry.name,
      entry.displayName,
      entry.summary,
      entry.description,
      ...(entry.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function getNamespaceEntries(namespace) {
  const prefix = String(namespace || "").toLowerCase();
  return catalog.filter((entry) => {
    const displayName = String(entry.displayName || entry.name).toLowerCase();
    return displayName.startsWith(prefix);
  });
}

function getCallableByPrefix(prefix) {
  const needle = String(prefix || "").toLowerCase();
  return catalog.filter((entry) => {
    const displayName = String(entry.displayName || entry.name).toLowerCase();
    return entry.kind !== "namespace" && displayName.startsWith(needle);
  });
}

module.exports = {
  DOCUMENTED,
  OBSERVED,
  INFERRED,
  UNKNOWN,
  PRIMITIVES,
  catalog,
  listCatalog,
  getCatalogEntry,
  findCatalogEntries,
  getNamespaceEntries,
  getCallableByPrefix,
  typeRef,
};
