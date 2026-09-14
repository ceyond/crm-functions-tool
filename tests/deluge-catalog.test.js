const test = require("node:test");
const assert = require("node:assert/strict");

const {
  catalog,
  getCatalogEntry,
  findCatalogEntries,
  getNamespaceEntries,
  DOCUMENTED,
} = require("../src/deluge-catalog");

test("catalog exposes starter Deluge metadata", () => {
  assert.ok(Array.isArray(catalog));
  assert.ok(catalog.length >= 10);

  const relatedRecords = getCatalogEntry("zoho.crm.getRelatedRecords");
  assert.ok(relatedRecords);
  assert.equal(relatedRecords.category, "zoho-integration");
  assert.equal(relatedRecords.sourceStatus, DOCUMENTED);
  assert.equal(relatedRecords.signatures[0].syntax.includes("getRelatedRecords"), true);
});

test("catalog can search by symbol and tag", () => {
  const crmMatches = findCatalogEntries("related-records");
  assert.equal(crmMatches.some((entry) => entry.id === "zoho.crm.getRelatedRecords"), true);
});

test("catalog can narrow entries by namespace prefix", () => {
  const namespaceMatches = getNamespaceEntries("zoho.crm.");
  assert.equal(
    namespaceMatches.some((entry) => entry.id === "zoho.crm.searchRecords"),
    true
  );
});
