// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { forEachExecutableLine } = require("./text-scan.js");
const { BUILTIN_NAMES, NOTES_CLASSES } = require("./hcl-docs.js");

const TOKEN_TYPES = [
  "namespace",
  "class",
  "interface",
  "type",
  "function",
  "method",
  "property",
  "variable",
  "parameter",
  "macro",
  "decorator",
];
const TOKEN_MODIFIERS = ["declaration", "static", "deprecated", "defaultLibrary"];
const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

const BUILTIN_LOWER = new Set(BUILTIN_NAMES.map((n) => n.toLowerCase()));
const NOTES_CLASSES_LOWER = new Set(NOTES_CLASSES.map((n) => n.toLowerCase()));
const DEPRECATED_LOWER = new Set(["lsi_info"]);

const KEYWORDS_LOWER = new Set([
  "if","then","else","elseif","end","select","case","for","to","step","next","each","in",
  "while","wend","do","loop","until","exit","goto","gosub","return","dim","redim","preserve",
  "set","let","const","sub","function","property","get","with","option","public","private",
  "type","enum","byval","byref","new","call","on","error","resume","rem","class","forall",
  "declare","lib","alias","use","uselsx","event","implements","stop","not","and","or","xor",
  "eqv","imp","mod","like","is","typeof","static","global","shared","nothing","pi","true",
  "false","null","empty","as","friend","raiseevent",
]);

const TYPE_NAMES = new Set([
  "boolean","byte","integer","long","single","double","currency","string","variant","date","object","list",
]);

/**
 * Per-line scan of identifier-like tokens. We rebuild on each request because
 * the grammar is small and the cost is dominated by the cleaner pass.
 *
 * @param {vscode.TextDocument} document
 */
function buildTokens(document) {
  const builder = new vscode.SemanticTokensBuilder(LEGEND);
  const mod = {
    declaration: 1 << TOKEN_MODIFIERS.indexOf("declaration"),
    static: 1 << TOKEN_MODIFIERS.indexOf("static"),
    deprecated: 1 << TOKEN_MODIFIERS.indexOf("deprecated"),
    defaultLibrary: 1 << TOKEN_MODIFIERS.indexOf("defaultLibrary"),
  };

  /** @type {Set<string>} declared user identifiers (lowercased) */
  const userClasses = new Set();
  /** @type {Set<string>} */
  const userSubs = new Set();
  /** @type {Set<string>} */
  const userFuncs = new Set();
  /** @type {Set<string>} */
  const userProps = new Set();
  /** @type {Map<string, Set<string>>} per-procedure local parameter names (lowercased) */
  const paramSets = new Map();
  /** @type {Set<string>} declaration markers `${line}:${col}:${lower}` */
  const declarations = new Set();

  /** @type {{ line: number; clean: string }[]} */
  const lines = [];

  forEachExecutableLine(document, (i, clean) => {
    lines.push({ line: i, clean });

    let m;
    if ((m = clean.match(/^\s*Class\s+([A-Za-z_]\w*)/i))) {
      userClasses.add(m[1].toLowerCase());
      const col = clean.toLowerCase().indexOf(m[1].toLowerCase());
      if (col >= 0) declarations.add(`${i}:${col}:${m[1].toLowerCase()}`);
    }
    if ((m = clean.match(/^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Sub\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/i))) {
      userSubs.add(m[1].toLowerCase());
      const col = clean.toLowerCase().indexOf(m[1].toLowerCase());
      if (col >= 0) declarations.add(`${i}:${col}:${m[1].toLowerCase()}`);
      const params = paramNames(m[2]);
      paramSets.set(`sub:${m[1].toLowerCase()}:${i}`, params);
    } else if ((m = clean.match(/^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Sub\s+([A-Za-z_]\w*)/i))) {
      userSubs.add(m[1].toLowerCase());
      const col = clean.toLowerCase().indexOf(m[1].toLowerCase());
      if (col >= 0) declarations.add(`${i}:${col}:${m[1].toLowerCase()}`);
    }
    if ((m = clean.match(/^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/i))) {
      userFuncs.add(m[1].toLowerCase());
      const col = clean.toLowerCase().indexOf(m[1].toLowerCase());
      if (col >= 0) declarations.add(`${i}:${col}:${m[1].toLowerCase()}`);
      const params = paramNames(m[2]);
      paramSets.set(`function:${m[1].toLowerCase()}:${i}`, params);
    }
    if ((m = clean.match(/^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Property\s+(?:Get|Set|Let)\s+([A-Za-z_]\w*)/i))) {
      userProps.add(m[1].toLowerCase());
      const col = clean.toLowerCase().indexOf(m[1].toLowerCase());
      if (col >= 0) declarations.add(`${i}:${col}:${m[1].toLowerCase()}`);
    }
  });

  let currentParams = new Set();
  for (const { line: i, clean } of lines) {
    if (/^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*(?:Sub|Function)\s+([A-Za-z_]\w*)/i.test(clean)) {
      const head = clean.match(/^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*(Sub|Function)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/i);
      if (head) {
        const kind = head[1].toLowerCase();
        const name = head[2].toLowerCase();
        currentParams = paramSets.get(`${kind}:${name}:${i}`) ?? new Set();
      } else {
        currentParams = new Set();
      }
    } else if (/^\s*End\s+(Sub|Function|Property)\b/i.test(clean)) {
      currentParams = new Set();
    }

    const idRe = /[A-Za-z_]\w*/g;
    let m;
    while ((m = idRe.exec(clean)) !== null) {
      const word = m[0];
      const lower = word.toLowerCase();
      const col = m.index;

      if (KEYWORDS_LOWER.has(lower)) continue;
      if (TYPE_NAMES.has(lower)) {
        builder.push(i, col, word.length, TOKEN_TYPES.indexOf("type"), 0);
        continue;
      }
      if (NOTES_CLASSES_LOWER.has(lower)) {
        builder.push(i, col, word.length, TOKEN_TYPES.indexOf("class"), mod.defaultLibrary);
        continue;
      }
      if (userClasses.has(lower)) {
        const flags = declarations.has(`${i}:${col}:${lower}`) ? mod.declaration : 0;
        builder.push(i, col, word.length, TOKEN_TYPES.indexOf("class"), flags);
        continue;
      }
      if (DEPRECATED_LOWER.has(lower)) {
        builder.push(
          i,
          col,
          word.length,
          TOKEN_TYPES.indexOf("function"),
          mod.deprecated | mod.defaultLibrary
        );
        continue;
      }
      if (BUILTIN_LOWER.has(lower)) {
        builder.push(i, col, word.length, TOKEN_TYPES.indexOf("function"), mod.defaultLibrary);
        continue;
      }
      if (currentParams.has(lower)) {
        builder.push(i, col, word.length, TOKEN_TYPES.indexOf("parameter"), 0);
        continue;
      }
      if (userSubs.has(lower) || userFuncs.has(lower)) {
        const after = clean.slice(col + word.length);
        if (/^\s*\(/.test(after) || /^\s*$/.test(after)) {
          const flags = declarations.has(`${i}:${col}:${lower}`) ? mod.declaration : 0;
          builder.push(
            i,
            col,
            word.length,
            TOKEN_TYPES.indexOf(userSubs.has(lower) ? "method" : "function"),
            flags
          );
          continue;
        }
      }
      if (userProps.has(lower)) {
        const flags = declarations.has(`${i}:${col}:${lower}`) ? mod.declaration : 0;
        builder.push(i, col, word.length, TOKEN_TYPES.indexOf("property"), flags);
        continue;
      }
    }
  }

  return builder.build();
}

/**
 * Extract just the parameter names (lower-cased) from a parameter list.
 *
 * @param {string} list
 * @returns {Set<string>}
 */
function paramNames(list) {
  /** @type {Set<string>} */
  const out = new Set();
  let depth = 0;
  let cur = "";
  const flush = () => {
    const piece = cur.trim();
    if (piece) {
      const m = piece.match(/^\s*(?:ByVal|ByRef|Optional)?\s*([A-Za-z_]\w*)/i);
      if (m) out.add(m[1].toLowerCase());
    }
    cur = "";
  };
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (c === "," && depth === 0) {
      flush();
      continue;
    }
    cur += c;
  }
  flush();
  return out;
}

const provider = {
  /** @param {vscode.TextDocument} document */
  provideDocumentSemanticTokens(document) {
    if (!isLssDocument(document)) return undefined;
    const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", document.uri);
    if (!conf.get("enableSemanticTokens", true)) return undefined;
    try {
      return buildTokens(document);
    } catch {
      return undefined;
    }
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptSemanticTokens(context) {
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(LOTUSSCRIPT_OR_LSS, provider, LEGEND)
  );
}

module.exports = { registerLotusScriptSemanticTokens, LEGEND };
