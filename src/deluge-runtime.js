class DelugeRuntimeError extends Error {
  constructor(message, node) {
    super(message);
    this.name = "DelugeRuntimeError";
    this.node = node || null;
  }
}

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

class BreakSignal {}

class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.bindings = new Map();
  }

  define(name, value) {
    this.bindings.set(name, value);
  }

  assign(name, value) {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    this.bindings.set(name, value);
  }

  get(name) {
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new DelugeRuntimeError(`Undefined variable: ${name}`);
  }
}

function createStandardLibrary(output) {
  function formatForInfo(value) {
    if (value == null) {
      return String(value);
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value) || isPlainObject(value)) {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  function wrapValue(nextValue) {
    if (Array.isArray(nextValue)) {
      return toList(nextValue.map((item) => wrapValue(item)));
    }
    if (isPlainObject(nextValue)) {
      return toMap(nextValue);
    }
    return nextValue;
  }

  function toMap(value) {
    const obj = Object.assign({}, value || {});
      Object.defineProperties(obj, {
        getJSON: {
          value(key) {
            return wrapValue(obj[key]);
          },
          enumerable: false,
        },
        get: {
          value(key) {
            return wrapValue(obj[key]);
          },
        enumerable: false,
      },
      put: {
        value(key, nextValue) {
          obj[key] = nextValue;
          return obj;
        },
        enumerable: false,
      },
      containsKey: {
        value(key) {
          return Object.prototype.hasOwnProperty.call(obj, key);
        },
        enumerable: false,
      },
      keys: {
        value() {
          return toList(Object.keys(obj));
        },
        enumerable: false,
      },
      values: {
        value() {
          return toList(Object.keys(obj).map((key) => wrapValue(obj[key])));
        },
        enumerable: false,
      },
      isEmpty: {
        value() {
          return Object.keys(obj).length === 0;
        },
        enumerable: false,
      },
      size: {
        value() {
          return Object.keys(obj).length;
        },
        enumerable: false,
      },
      toString: {
        value() {
          return JSON.stringify(obj);
        },
        enumerable: false,
      },
    });
    for (const key of Object.keys(obj)) {
      obj[key] = wrapValue(obj[key]);
    }
    return obj;
  }

  function toList(value) {
    const arr = Array.isArray(value) ? value.slice() : [];
    Object.defineProperties(arr, {
      toList: {
        value() {
          return arr;
        },
        enumerable: false,
      },
      add: {
        value(nextValue) {
          arr.push(nextValue);
          return arr;
        },
        enumerable: false,
      },
      removeElement: {
        value(nextValue) {
          const index = arr.indexOf(nextValue);
          if (index >= 0) {
            arr.splice(index, 1);
          }
          return arr;
        },
        enumerable: false,
      },
      contains: {
        value(nextValue) {
          return arr.includes(nextValue);
        },
        enumerable: false,
      },
      isEmpty: {
        value() {
          return arr.length === 0;
        },
        enumerable: false,
      },
      get: {
        value(index) {
          return wrapValue(arr[index]);
        },
        enumerable: false,
      },
      size: {
        value() {
          return arr.length;
        },
        enumerable: false,
      },
      toString: {
        value() {
          return JSON.stringify(arr);
        },
        enumerable: false,
      },
    });
    for (let index = 0; index < arr.length; index += 1) {
      arr[index] = wrapValue(arr[index]);
    }
    return arr;
  }

  function createNamespaceStub() {
    return new Proxy(
      {},
      {
        get(_target, property) {
          if (property === Symbol.toStringTag) return "Object";
          return (..._args) =>
            toMap({
              data: {
                id: "mock-id",
              },
            });
        },
      }
    );
  }

  return {
    info(value) {
      output.push(formatForInfo(value));
      return value;
    },
    Map(initial) {
      return toMap(initial);
    },
    List(initial) {
      return toList(initial);
    },
    zoho: {
      crm: {
        getRecordById(moduleName, recordId) {
          return { id: String(recordId), module: moduleName, Name: "mock record" };
        },
        getRecords() {
          return [];
        },
        searchRecords() {
          return [];
        },
        createRecord(moduleName, data) {
          return { module: moduleName, data };
        },
        updateRecord(moduleName, recordId, data) {
          return { id: String(recordId), module: moduleName, data };
        },
        getRelatedRecords() {
          return [];
        },
        getOrgVariable() {
          return null;
        },
        setOrgVariable() {
          return null;
        },
      },
    },
    automation: createNamespaceStub(),
    standalone: createNamespaceStub(),
    isnull(value) {
      return value == null || value === "";
    },
    ifnull(value, fallback) {
      return value == null || value === "" ? fallback : value;
    },
    toText(value) {
      return value == null ? "" : String(value);
    },
    toMap(value) {
      if (typeof value === "string") {
        try {
          return toMap(JSON.parse(value));
        } catch {
          return toMap({});
        }
      }
      return toMap(isPlainObject(value) ? value : {});
    },
  };
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function evaluate(node, env, stdlib) {
  switch (node.type) {
    case "Program": {
      let last = null;
      for (const statement of node.body) {
        last = evaluate(statement, env, stdlib);
      }
      return last;
    }
    case "FunctionDeclaration":
      return evaluate({ type: "Program", body: node.body }, env, stdlib);
    case "Literal":
      return node.value;
    case "Identifier":
      if (Object.prototype.hasOwnProperty.call(stdlib, node.name)) {
        return stdlib[node.name];
      }
      return env.get(node.name);
    case "AssignmentExpression": {
      if (node.left.type !== "Identifier") {
        throw new DelugeRuntimeError("Invalid assignment target", node);
      }
      const value = evaluate(node.right, env, stdlib);
      env.assign(node.left.name, value);
      return value;
    }
    case "BinaryExpression": {
      const left = evaluate(node.left, env, stdlib);
      const right = evaluate(node.right, env, stdlib);
      const bothBigInts =
        typeof left === "bigint" || typeof right === "bigint";
      const toBigInt = (value) => {
        if (typeof value === "bigint") return value;
        if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
        throw new DelugeRuntimeError("Cannot mix non-integer values with bigint arithmetic", node);
      };
      const bigintLeft = bothBigInts ? toBigInt(left) : null;
      const bigintRight = bothBigInts ? toBigInt(right) : null;
      switch (node.operator) {
        case "+":
          return bothBigInts ? bigintLeft + bigintRight : left + right;
        case "-":
          return bothBigInts ? bigintLeft - bigintRight : left - right;
        case "*":
          return bothBigInts ? bigintLeft * bigintRight : left * right;
        case "/":
          return bothBigInts ? bigintLeft / bigintRight : left / right;
        case "==": return left === right;
        case "!=": return left !== right;
        case "<": return left < right;
        case "<=": return left <= right;
        case ">": return left > right;
        case ">=": return left >= right;
        default:
          throw new DelugeRuntimeError(`Unknown operator: ${node.operator}`, node);
      }
    }
    case "LogicalExpression": {
      if (node.operator === "&&") {
        return evaluate(node.left, env, stdlib) && evaluate(node.right, env, stdlib);
      }
      if (node.operator === "||") {
        return evaluate(node.left, env, stdlib) || evaluate(node.right, env, stdlib);
      }
      throw new DelugeRuntimeError(`Unknown logical operator: ${node.operator}`, node);
    }
    case "UnaryExpression":
      if (node.operator === "!") {
        return !evaluate(node.argument, env, stdlib);
      }
      if (node.operator === "-") {
        const argument = evaluate(node.argument, env, stdlib);
        return typeof argument === "bigint" ? -argument : -argument;
      }
      throw new DelugeRuntimeError(`Unknown unary operator: ${node.operator}`, node);
    case "MapLiteral": {
      const obj = {};
      for (const entry of node.entries) {
        obj[entry.key] = evaluate(entry.value, env, stdlib);
      }
      return stdlib.Map(obj);
    }
    case "ListLiteral":
      return stdlib.List(node.elements.map((entry) => evaluate(entry, env, stdlib)));
    case "MemberExpression": {
      const object = evaluate(node.object, env, stdlib);
      if (object == null) {
        throw new DelugeRuntimeError(`Cannot access member ${node.property} of null`, node);
      }
      if (typeof object === "string" && node.property === "toMap") {
        return () => stdlib.toMap(object);
      }
      if (typeof object === "string" && node.property === "get") {
        return (index) => {
          try {
            const parsed = JSON.parse(object);
            if (Array.isArray(parsed)) {
              return wrapValue(parsed[index]);
            }
          } catch {
            return object.charAt(Number(index));
          }
          return object.charAt(Number(index));
        };
      }
      if (typeof object === "string" && node.property === "toList") {
        return () => stdlib.List(object.split(""));
      }
      const value = object[node.property];
      if (typeof value === "function") {
        return value.bind(object);
      }
      if (typeof object === "string") {
        const stringMethods = {
          isNull: () => object == null || object === "",
          isEmpty: () => object.length === 0,
          contains: (needle) => object.includes(String(needle)),
          equals: (other) => object === String(other),
          startsWith: (prefix) => object.startsWith(String(prefix)),
          endsWith: (suffix) => object.endsWith(String(suffix)),
          replaceAll: (searchValue, replaceValue) => object.replaceAll(String(searchValue), String(replaceValue)),
          replaceFirst: (searchValue, replaceValue) =>
            object.replace(String(searchValue), String(replaceValue)),
          split: (delimiter) => stdlib.List(object.split(String(delimiter))),
          toMap: () => stdlib.toMap(object),
          toText: () => object.toString(),
          toString: () => object.toString(),
          addDay: () => object,
          addBusinessDay: () => object,
          toDateTime: () => object,
        };
        if (Object.prototype.hasOwnProperty.call(stringMethods, node.property)) {
          return stringMethods[node.property];
        }
      }
      if (typeof object === "number") {
        const numberMethods = {
          round: (places = 0) => Number(object.toFixed(Number(places))),
          toDecimal: () => object,
          toString: () => String(object),
        };
        if (Object.prototype.hasOwnProperty.call(numberMethods, node.property)) {
          return numberMethods[node.property];
        }
      }
      if (typeof object === "bigint") {
        const bigintMethods = {
          toDecimal: () => Number(object),
          toString: () => object.toString(),
        };
        if (Object.prototype.hasOwnProperty.call(bigintMethods, node.property)) {
          return bigintMethods[node.property];
        }
      }
      return value;
    }
    case "CallExpression": {
      const callee = evaluate(node.callee, env, stdlib);
      if (typeof callee !== "function") {
        throw new DelugeRuntimeError("Unsupported call expression", node);
      }
      return callee(...node.arguments.map((arg) => evaluate(arg, env, stdlib)));
    }
    case "InvokeUrlExpression":
      return stdlib.Map({
        data: {
          id: "mock-id",
          Taxable: false,
          Product_Titel: "Mock Product",
          Preis_einmalig: 100,
          Anzahlung_Sofortkauf: 100,
        },
      });
    case "ExpressionStatement":
      return evaluate(node.expression, env, stdlib);
    case "InfoStatement":
      return stdlib.info(evaluate(node.argument, env, stdlib));
    case "IfStatement":
      if (evaluate(node.test, env, stdlib)) {
        return evaluate({ type: "Program", body: node.consequent }, env, stdlib);
      }
      if (node.alternate) {
        return evaluate({ type: "Program", body: node.alternate }, env, stdlib);
      }
      return null;
    case "TryStatement":
      try {
        return evaluate({ type: "Program", body: node.body }, env, stdlib);
      } catch (error) {
        if (node.catchBody) {
          return evaluate({ type: "Program", body: node.catchBody }, env, stdlib);
        }
        throw error;
      }
    case "ForEachStatement": {
      const iterable = evaluate(node.iterable, env, stdlib) || [];
      if (!Array.isArray(iterable)) {
        throw new DelugeRuntimeError("for each expects a list", node);
      }
      let last = null;
      for (const item of iterable) {
        const child = new Environment(env);
        child.define(node.item, item);
        try {
          last = evaluate({ type: "Program", body: node.body }, child, stdlib);
        } catch (error) {
          if (error instanceof BreakSignal) {
            break;
          }
          throw error;
        }
      }
      return last;
    }
    case "ReturnStatement":
      throw new ReturnSignal(node.argument ? evaluate(node.argument, env, stdlib) : null);
    case "BreakStatement":
      throw new BreakSignal();
    case "ThrowsStatement":
      throw new DelugeRuntimeError(String(evaluate(node.argument, env, stdlib)), node);
    default:
      throw new DelugeRuntimeError(`Unsupported node type: ${node.type}`, node);
  }
}

function run(ast, options = {}) {
  const output = [];
  const stdlib = Object.assign(createStandardLibrary(output), options.stdlib || {});
  const env = new Environment();
  const functionDecl = ast.body.find((node) => node.type === "FunctionDeclaration") || null;

  function defaultValueForParam(param) {
    const type = String(param?.type || "").toLowerCase();
    const name = String(param?.name || "").toLowerCase();
    if (name.includes("request")) return '{"record":{"Email":"mock@example.com"}}';
    if (name.includes("id")) return 1;
    if (type === "string") return "";
    if (type === "int" || type === "long" || type === "double" || type === "decimal" || type === "number") return 0;
    if (type === "map") return stdlib.Map({});
    if (type === "list") return stdlib.List([]);
    return null;
  }

  function executeFunctionBody(decl) {
    const fnEnv = new Environment(env);
    const providedArgs = options.args || {};

    for (const param of decl.params || []) {
      const value =
        Object.prototype.hasOwnProperty.call(providedArgs, param.name)
          ? providedArgs[param.name]
          : defaultValueForParam(param);
      fnEnv.define(param.name, value);
    }

    return evaluate({ type: "Program", body: decl.body }, fnEnv, stdlib);
  }

  try {
    const value = functionDecl ? executeFunctionBody(functionDecl) : evaluate(ast, env, stdlib);
    return { value, output, env };
  } catch (error) {
    if (error instanceof ReturnSignal) {
      return { value: error.value, output, env };
    }
    throw error;
  }
}

module.exports = {
  DelugeRuntimeError,
  Environment,
  run,
};
