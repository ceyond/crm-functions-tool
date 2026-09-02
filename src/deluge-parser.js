const { tokenize } = require("./deluge-tokenizer");

function parse(source) {
  const tokens = tokenize(source);
  let current = 0;

  function peek() {
    return tokens[current];
  }

  function previous() {
    return tokens[current - 1];
  }

  function advance() {
    if (current < tokens.length) current += 1;
    return previous();
  }

  function check(type, value) {
    const token = peek();
    return token.type === type && (value == null || token.value === value);
  }

  function match(type, value) {
    if (check(type, value)) {
      advance();
      return true;
    }
    return false;
  }

  function consume(type, value, message) {
    if (check(type, value)) return advance();
    const token = peek();
    throw Object.assign(new Error(message), {
      line: token.line,
      column: token.column,
    });
  }

  function parseProgram() {
    const body = [];
    while (!check("eof")) {
      body.push(parseTopLevel());
    }
    return { type: "Program", body };
  }

  function parseTopLevel() {
    const token = peek();
    const returnTypes = new Set([
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
    ]);

    if (
      returnTypes.has(String(token.value).toLowerCase()) &&
      (token.type === "keyword" || token.type === "identifier")
    ) {
      return parseFunctionDeclaration();
    }

    return parseStatement();
  }

  function parseFunctionDeclaration() {
    const returnType = advance().value;
    const packageName = consume("identifier", null, "Expected function package name").value;
    consume("dot", ".", "Expected '.' after package name");
    const name = consume("identifier", null, "Expected function name").value;
    consume("lparen", "(", "Expected '(' after function name");

    const params = [];
    if (!check("rparen")) {
      do {
        const paramTypeToken = consume(
          "identifier",
          null,
          "Expected parameter type"
        );
        const paramName = consume("identifier", null, "Expected parameter name");
        params.push({
          type: paramTypeToken.value,
          name: paramName.value,
        });
      } while (match("comma", ","));
    }

    consume("rparen", ")", "Expected ')' after parameter list");
    const body = parseBlock();
    return {
      type: "FunctionDeclaration",
      returnType,
      packageName,
      name,
      params,
      body,
    };
  }

  function parseStatement() {
    if (match("identifier", "try")) return parseTryCatch();
    if (match("identifier", "throws")) return parseThrows();
    if (match("identifier", "break")) return parseBreak();
    if (check("identifier", "invokeurl") && tokens[current + 1]?.type === "lbracket") {
      const expression = parseExpression();
      if (check("semicolon")) advance();
      return { type: "ExpressionStatement", expression };
    }
    if (match("keyword", "if")) return parseIf();
    if (match("keyword", "for")) return parseForEach();
    if (match("keyword", "return")) return parseReturn();
    if (match("keyword", "info")) return parseInfo();
    return parseExpressionStatement();
  }

  function parseTryCatch() {
    const body = parseBlock();
    let catchBody = null;
    if (match("identifier", "catch")) {
      if (match("lparen", "(")) {
        while (!check("rparen") && !check("eof")) advance();
        consume("rparen", ")", "Expected ')' after catch");
      }
      catchBody = parseBlock();
    }
    return { type: "TryStatement", body, catchBody };
  }

  function parseThrows() {
    const argument = parseExpression();
    consume("semicolon", ";", "Expected ';' after throws");
    return { type: "ThrowsStatement", argument };
  }

  function parseBreak() {
    consume("semicolon", ";", "Expected ';' after break");
    return { type: "BreakStatement" };
  }

  function parseBlock() {
    consume("lbrace", "{", "Expected '{'");
    const body = [];
    while (!check("rbrace") && !check("eof")) {
      body.push(parseStatement());
    }
    consume("rbrace", "}", "Expected '}'");
    return body;
  }

  function parseIf() {
    consume("lparen", "(", "Expected '(' after if");
    const test = parseExpression();
    consume("rparen", ")", "Expected ')' after if condition");
    const consequent = parseBlock();
    let alternate = null;
    if (match("keyword", "else")) {
      if (match("keyword", "if")) {
        alternate = [parseIf()];
      } else {
        alternate = parseBlock();
      }
    }
    return { type: "IfStatement", test, consequent, alternate };
  }

  function parseForEach() {
    consume("keyword", "each", "Expected 'each' after for");
    const item = consume("identifier", null, "Expected loop variable");
    consume("keyword", "in", "Expected 'in' in for each loop");
    const iterable = parseExpression();
    const body = parseBlock();
    return { type: "ForEachStatement", item: item.value, iterable, body };
  }

  function parseReturn() {
    if (check("semicolon")) {
      advance();
      return { type: "ReturnStatement", argument: null };
    }
    const argument = parseExpression();
    consume("semicolon", ";", "Expected ';' after return");
    return { type: "ReturnStatement", argument };
  }

  function parseInfo() {
    const argument = parseExpression();
    consume("semicolon", ";", "Expected ';' after info statement");
    return { type: "InfoStatement", argument };
  }

  function parseExpressionStatement() {
    const expression = parseExpression();
    consume("semicolon", ";", "Expected ';' after expression");
    return { type: "ExpressionStatement", expression };
  }

  function parseExpression() {
    return parseAssignment();
  }

  function parseAssignment() {
    const left = parseOr();
    if (match("operator", "=")) {
      const right = parseAssignment();
      return { type: "AssignmentExpression", left, right };
    }
    return left;
  }

  function parseOr() {
    let expr = parseAnd();
    while (match("operator", "||")) {
      const operator = previous().value;
      const right = parseAnd();
      expr = { type: "LogicalExpression", operator, left: expr, right };
    }
    return expr;
  }

  function parseAnd() {
    let expr = parseEquality();
    while (match("operator", "&&")) {
      const operator = previous().value;
      const right = parseEquality();
      expr = { type: "LogicalExpression", operator, left: expr, right };
    }
    return expr;
  }

  function parseEquality() {
    let expr = parseComparison();
    while (match("operator", "==") || match("operator", "!=")) {
      const operator = previous().value;
      const right = parseComparison();
      expr = { type: "BinaryExpression", operator, left: expr, right };
    }
    return expr;
  }

  function parseUnary() {
    if (match("operator", "!")) {
      return { type: "UnaryExpression", operator: "!", argument: parseUnary() };
    }
    if (match("operator", "-")) {
      return { type: "UnaryExpression", operator: "-", argument: parseUnary() };
    }
    return parseCall();
  }

  function parseComparison() {
    let expr = parseTerm();
    while (
      match("operator", "<") ||
      match("operator", ">") ||
      match("operator", "<=") ||
      match("operator", ">=")
    ) {
      const operator = previous().value;
      const right = parseTerm();
      expr = { type: "BinaryExpression", operator, left: expr, right };
    }
    return expr;
  }

  function parseTerm() {
    let expr = parseFactor();
    while (match("operator", "+") || match("operator", "-")) {
      const operator = previous().value;
      const right = parseFactor();
      expr = { type: "BinaryExpression", operator, left: expr, right };
    }
    return expr;
  }

  function parseFactor() {
    let expr = parseUnary();
    while (match("operator", "*") || match("operator", "/")) {
      const operator = previous().value;
      const right = parseUnary();
      expr = { type: "BinaryExpression", operator, left: expr, right };
    }
    return expr;
  }

  function parseCall() {
    let expr = parsePrimary();
    while (true) {
      if (match("lparen", "(")) {
        const args = [];
        if (!check("rparen")) {
          do {
            args.push(parseExpression());
          } while (match("comma", ","));
        }
        consume("rparen", ")", "Expected ')'");
        expr = { type: "CallExpression", callee: expr, arguments: args };
        continue;
      }
      if (match("dot", ".")) {
        const property = consume("identifier", null, "Expected property name after '.'");
        expr = { type: "MemberExpression", object: expr, property: property.value };
        continue;
      }
      break;
    }
    return expr;
  }

  function parsePrimary() {
    if (match("number")) return { type: "Literal", value: previous().value };
    if (match("string")) return { type: "Literal", value: previous().value };
    if (match("keyword", "true")) return { type: "Literal", value: true };
    if (match("keyword", "false")) return { type: "Literal", value: false };
    if (match("keyword", "null")) return { type: "Literal", value: null };

    if (match("identifier")) {
      const name = previous().value;
      if (name === "invokeurl" && match("lbracket", "[")) {
        const rawEntries = [];
        while (!check("rbracket") && !check("eof")) {
          const keyToken = peek();
          if (keyToken.type === "identifier") {
            const key = advance().value;
            consume("colon", ":", "Expected ':' in invokeurl block");
            const value = parseExpression();
            rawEntries.push({ key, value });
          } else {
            advance();
          }
        }
        consume("rbracket", "]", "Expected ']' after invokeurl block");
        return { type: "InvokeUrlExpression", entries: rawEntries };
      }
      return { type: "Identifier", name };
    }

    if (match("lparen", "(")) {
      const expr = parseExpression();
      consume("rparen", ")", "Expected ')'");
      return expr;
    }

    if (match("lbrace", "{")) {
      if (check("rbrace")) {
        advance();
        return { type: "ListLiteral", elements: [] };
      }

      const firstToken = peek();
      const secondToken = tokens[current + 1];
      const looksLikeMap = secondToken && secondToken.type === "colon";

      if (looksLikeMap) {
        const entries = [];
        do {
          const keyToken = consume(
            peek().type === "string" ? "string" : "identifier",
            null,
            "Expected object key"
          );
          consume("colon", ":", "Expected ':' in map literal");
          const value = parseExpression();
          entries.push({ key: keyToken.value, value });
        } while (match("comma", ","));
        consume("rbrace", "}", "Expected '}' after map literal");
        return { type: "MapLiteral", entries };
      }

      const elements = [];
      do {
        elements.push(parseExpression());
      } while (match("comma", ","));
      consume("rbrace", "}", "Expected '}' after list literal");
      return { type: "ListLiteral", elements };
    }

    if (match("lbracket", "[")) {
      const elements = [];
      if (!check("rbracket")) {
        do {
          elements.push(parseExpression());
        } while (match("comma", ","));
      }
      consume("rbracket", "]", "Expected ']' after list literal");
      return { type: "ListLiteral", elements };
    }

    const token = peek();
    throw Object.assign(new Error(`Unexpected token ${token.type}`), {
      line: token.line,
      column: token.column,
    });
  }

  return parseProgram();
}

module.exports = { parse };
