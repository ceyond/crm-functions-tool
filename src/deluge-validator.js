const { parse } = require("./deluge-parser");
const { lintSource } = require("./deluge-intelligence");

function toDiagnostic(error, severity = "error") {
  return {
    severity,
    message: error.message,
    line: error.line || error.node?.line || null,
    column: error.column || error.node?.column || null,
  };
}

function validateSource(source, options = {}) {
  const { execute = true } = options;
  const lintDiagnostics = lintSource(source);
  try {
    const ast = parse(source);
    if (!execute) {
      return {
        ok: lintDiagnostics.every((diagnostic) => diagnostic.severity !== "error"),
        ast,
        value: null,
        output: [],
        diagnostics: lintDiagnostics,
      };
    }
    const { run } = require("./deluge-runtime");
    const result = run(ast);
    return {
      ok: lintDiagnostics.every((diagnostic) => diagnostic.severity !== "error"),
      ast,
      value: result.value,
      output: result.output,
      diagnostics: lintDiagnostics,
    };
  } catch (error) {
    const diagnostic = toDiagnostic(error);
    return {
      ok: false,
      ast: null,
      value: null,
      output: [],
      diagnostics: [...lintDiagnostics, diagnostic],
    };
  }
}

module.exports = {
  validateSource,
  toDiagnostic,
};
