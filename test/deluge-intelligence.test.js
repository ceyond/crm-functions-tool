const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCompletions,
  getHoverInfo,
  lintSource,
  getFieldSuggestions,
  getCriteriaSuggestions,
} = require("../src/deluge-intelligence");

test("suggests Zoho CRM completions from namespace context", () => {
  const completions = getCompletions("zoho.crm.", "zoho.crm.".length);
  assert.ok(completions.some((item) => item.label === "zoho.crm.getRecords"));
  assert.ok(completions.some((item) => item.label === "zoho.crm.getRelatedRecords"));
});

test("returns hover information for catalog entries", () => {
  const hover = getHoverInfo("zoho.crm.getRelatedRecords");
  assert.ok(hover);
  assert.equal(hover.title, "zoho.crm.getRelatedRecords");
  assert.equal(hover.kind, "function");
  assert.equal(hover.signatures[0].includes("getRelatedRecords"), true);
});

test("lints invokeurl blocks and bracket mismatches", () => {
  const diagnostics = lintSource("invokeurl [ type: GET ]; x = (1 + 2;");
  assert.ok(diagnostics.some((diag) => diag.message.includes("url")));
  assert.ok(diagnostics.some((diag) => diag.message.includes("Unclosed '('")));
});

test("warns on suspicious CRM typos", () => {
  const diagnostics = lintSource("x = zoho.crm.searchRecord(\"Leads\");");
  assert.ok(diagnostics.some((diag) => diag.message.includes("Possible typo")));
});

test("suggests searchRecords and relatedRecords argument hints", () => {
  const searchHints = getCompletions("zoho.crm.searchRecords(", "zoho.crm.searchRecords(".length);
  assert.ok(searchHints.some((item) => item.label === "criteria"));
  assert.ok(searchHints.some((item) => item.label === "perPage"));

  const relatedHints = getCompletions("zoho.crm.getRelatedRecords(", "zoho.crm.getRelatedRecords(".length);
  assert.ok(relatedHints.some((item) => item.label === "relationName"));
  assert.ok(relatedHints.some((item) => item.label === "recordId"));
});

test("lints relatedRecords and searchRecords usage more specifically", () => {
  const diagnostics = lintSource(
    [
      'relatedRecords("Leads", 123);',
      'zoho.crm.searchRecords("Leads", "Last_Name=Smith");',
      'invokeurl [ type: GET ];',
    ].join("\n")
  );

  assert.ok(
    diagnostics.some((diag) => diag.message.includes("relatedRecords usually needs"))
  );
  assert.ok(
    diagnostics.some((diag) => diag.message.includes("searchRecords criteria should usually"))
  );
  assert.ok(diagnostics.some((diag) => diag.message.includes("invokeurl block is missing url")));
});

test("suggests CRM fields from cached module metadata", () => {
  const fieldHints = getFieldSuggestions("Leads");
  assert.ok(fieldHints.some((item) => item.label === "Last_Name"));
  assert.ok(fieldHints.some((item) => item.label === "Lead_Status"));
});

test("suggests CRM search criteria snippets from cached fields", () => {
  const criteriaHints = getCriteriaSuggestions("Leads");
  assert.ok(criteriaHints.some((item) => item.insertText.includes("Last_Name:equals:VALUE")));
  assert.ok(criteriaHints.some((item) => item.insertText.includes("Lead_Status:equals:VALUE")));
});
