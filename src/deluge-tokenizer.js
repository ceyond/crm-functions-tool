function isWhitespace(ch) {
  return /\s/.test(ch);
}

function isDigit(ch) {
  return /[0-9]/.test(ch);
}

function isIdentifierStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function isIdentifierPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;

  function push(type, value, startLine, startColumn) {
    tokens.push({ type, value, line: startLine, column: startColumn });
  }

  function advance(count = 1) {
    for (let n = 0; n < count; n++) {
      const ch = source[i++];
      if (ch === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
  }

  while (i < source.length) {
    const ch = source[i];
    const startLine = line;
    const startColumn = column;

    if (isWhitespace(ch)) {
      advance();
      continue;
    }

    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") advance();
      continue;
    }

    if (ch === "/" && source[i + 1] === "*") {
      advance(2);
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        advance();
      }
      advance(2);
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let value = "";
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < source.length) {
          value += source[i + 1];
          advance(2);
          continue;
        }
        value += source[i];
        advance();
      }
      if (source[i] !== quote) {
        throw Object.assign(new Error("Unterminated string"), {
          line: startLine,
          column: startColumn,
        });
      }
      advance();
      push("string", value, startLine, startColumn);
      continue;
    }

    if (isDigit(ch)) {
      let value = "";
      while (i < source.length && /[0-9.]/.test(source[i])) {
        value += source[i];
        advance();
      }
      if (!value.includes(".") && value.length > 15) {
        push("number", BigInt(value), startLine, startColumn);
      } else {
        push("number", Number(value), startLine, startColumn);
      }
      continue;
    }

    if (isIdentifierStart(ch)) {
      let value = "";
      while (i < source.length && isIdentifierPart(source[i])) {
        value += source[i];
        advance();
      }
      const keywords = new Set([
        "if",
        "else",
        "for",
        "each",
        "in",
        "return",
        "info",
        "true",
        "false",
        "null",
      ]);
      push(keywords.has(value) ? "keyword" : "identifier", value, startLine, startColumn);
      continue;
    }

    const twoChar = source.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(twoChar)) {
      push("operator", twoChar, startLine, startColumn);
      advance(2);
      continue;
    }

    const singleCharTokens = {
      "{": "lbrace",
      "}": "rbrace",
      "(": "lparen",
      ")": "rparen",
      "[": "lbracket",
      "]": "rbracket",
      ",": "comma",
      ";": "semicolon",
      ":": "colon",
      ".": "dot",
      "=": "operator",
      "!": "operator",
      "+": "operator",
      "-": "operator",
      "*": "operator",
      "/": "operator",
      "<": "operator",
      ">": "operator",
    };

    if (singleCharTokens[ch]) {
      push(singleCharTokens[ch], ch, startLine, startColumn);
      advance();
      continue;
    }

    throw Object.assign(new Error(`Unexpected character: ${ch}`), {
      line: startLine,
      column: startColumn,
    });
  }

  tokens.push({ type: "eof", value: "", line, column });
  return tokens;
}

module.exports = { tokenize };
