const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { parse } = require("../src/deluge-parser");
const { run, DelugeRuntimeError } = require("../src/deluge-runtime");
const { validateSource } = require("../src/deluge-validator");

test("parses assignment and info", () => {
  const ast = parse('x = 1 + 2; info x;');
  assert.equal(ast.type, "Program");
  assert.equal(ast.body.length, 2);
  assert.equal(ast.body[0].type, "ExpressionStatement");
  assert.equal(ast.body[1].type, "InfoStatement");
});

test("runs arithmetic and info output", () => {
  const ast = parse('x = 1 + 2; info x;');
  const result = run(ast);
  assert.equal(result.value, 3);
  assert.deepEqual(result.output, ["3"]);
});

test("supports map get and list basics", () => {
  const ast = parse('m = {"name":"Zoho"}; info m.get("name");');
  const result = run(ast);
  assert.deepEqual(result.output, ["Zoho"]);
});

test("reports parse errors with location", () => {
  const out = validateSource("x = ;");
  assert.equal(out.ok, false);
  assert.equal(out.diagnostics.length, 1);
  assert.match(out.diagnostics[0].message, /Unexpected token|Expected/);
});

test("reports runtime errors for undefined variables", () => {
  const ast = parse("info unknownVar;");
  assert.throws(() => run(ast), DelugeRuntimeError);
});

test("supports for each loops", () => {
  const ast = parse('items = ["a","b"]; for each item in items { info item; }');
  const result = run(ast);
  assert.deepEqual(result.output, ["a", "b"]);
});

test("validates a schedule fixture from crmFunctions", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../crmFunctions/sc_test_nha_created_via_ide.ds"),
    "utf8"
  );
  const result = validateSource(source);
  assert.equal(result.ok, true);
  assert.deepEqual(result.output, ["test1", "test2", "test3", "test4"]);
});

test("validates a workflow fixture with zoho crm stub", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../crmFunctions/wf_leads_test_nha_2.ds"),
    "utf8"
  );
  const result = validateSource(source);
  assert.equal(result.ok, true);
  assert.deepEqual(result.output, [
    '{"id":"1","module":"Leads","Name":"mock record"}',
    "Test NHA",
  ]);
});

test("validates a validation-rule fixture with request parsing", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../crmFunctions/vr_test_nha_created_via_ide.ds"),
    "utf8"
  );
  const result = validateSource(source);
  assert.equal(result.ok, true);
  assert.equal(result.output.includes("hello world"), true);
});

test("validates the pasted workflow fixture", () => {
  const source = fs.readFileSync(
    path.resolve(
      "/Users/nico.hartmann/.codex/attachments/d1cbf490-a2d3-4754-9267-596b780183a8/pasted-text.txt"
    ),
    "utf8"
  );
  const result = validateSource(source);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diag) => /Unsupported call expression/.test(diag.message)));
});

test("validates the pasted standalone billing fixture", () => {
  const source = fs.readFileSync(
    path.resolve(
      "/Users/nico.hartmann/.codex/attachments/741a3e12-2c1a-4b6d-b6fc-e1cb3834bf14/pasted-text.txt"
    ),
    "utf8"
  );
  const result = validateSource(source);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diag) => /Unsupported call expression/.test(diag.message)));
});

test("validates the pasted widget fixture", () => {
  const source = fs.readFileSync(
    path.resolve(
      "/Users/nico.hartmann/.codex/attachments/01d9212d-76a3-41a2-98ca-363cd0c60cde/pasted-text.txt"
    ),
    "utf8"
  );
  const result = validateSource(source);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((diag) => /Unsupported call expression/.test(diag.message)));
});
