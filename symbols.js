// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");

/**
 * @typedef {{
 *   name: string;
 *   kind: vscode.SymbolKind;
 *   container?: string;
 *   range: vscode.Range;
 *   selectionRange: vscode.Range;
 *   children: ScannedSymbol[];
 * }} ScannedSymbol
 */

const RE_REM_START = /^\s*%\s*REM\b/i;
const RE_REM_END = /^\s*%\s*END\s+REM\b|^\s*%ENDREM\b/i;
const RE_LINE_COMMENT = /^\s*'/;

const RE_SUB = /^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Sub\s+([A-Za-z_][\w$]*)/i;
const RE_END_SUB = /^\s*End\s+Sub\b/i;
const RE_FUNC = /^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Function\s+([A-Za-z_][\w$]*)/i;
const RE_END_FUNC = /^\s*End\s+Function\b/i;
const RE_PROP = /^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Property\s+(?:Get|Set|Let)\s+([A-Za-z_][\w$]*)/i;
const RE_END_PROP = /^\s*End\s+Property\b/i;
const RE_CLASS = /^\s*Class\s+([A-Za-z_][\w$]*)/i;
const RE_END_CLASS = /^\s*End\s+Class\b/i;
const RE_CONST = /^\s*(?:Public\s+|Private\s+)?Const\s+([A-Za-z_][\w$]*)/i;
const RE_DIM_TOPLEVEL = /^\s*(?:Public|Private|Dim)\s+([A-Za-z_][\w$]*)\s+As\b/i;

/**
 * Quick line-based scan that tolerates LotusScript's nesting:
 *  - Class can contain Sub, Function, Property
 *  - Sub/Function/Property cannot legally nest each other
 *  - Skips lines inside %REM \u2026 %END REM
 *
 * @param {vscode.TextDocument} document
 * @returns {ScannedSymbol[]}
 */
function scanSymbols(document) {
  /** @type {ScannedSymbol[]} */
  const top = [];
  /** @type {ScannedSymbol[]} */
  const stack = [];
  let inRem = false;

  /**
   * @param {ScannedSymbol} sym
   */
  const push = (sym) => {
    if (stack.length === 0) {
      top.push(sym);
    } else {
      stack[stack.length - 1].children.push(sym);
      sym.container = stack[stack.length - 1].name;
    }
    stack.push(sym);
  };

  /**
   * @param {(s: ScannedSymbol)=>boolean} pred
   * @param {number} lineIndex
   * @param {number} lineLen
   */
  const close = (pred, lineIndex, lineLen) => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (pred(stack[i])) {
        stack[i].range = new vscode.Range(
          stack[i].range.start,
          new vscode.Position(lineIndex, lineLen)
        );
        stack.splice(i, 1);
        return;
      }
    }
  };

  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text;
    const trimmed = text.trim();

    if (inRem) {
      if (RE_REM_END.test(text)) {
        inRem = false;
      }
      continue;
    }
    if (RE_REM_START.test(text)) {
      inRem = true;
      continue;
    }
    if (RE_LINE_COMMENT.test(text) || trimmed.length === 0) {
      // Top-level Const after a line comment is fine (we already handle Const below);
      // skip pure comment lines.
      if (RE_LINE_COMMENT.test(text)) {
        continue;
      }
    }

    if (RE_END_SUB.test(text)) {
      close((s) => s.kind === vscode.SymbolKind.Method, i, text.length);
      continue;
    }
    if (RE_END_FUNC.test(text)) {
      close((s) => s.kind === vscode.SymbolKind.Function, i, text.length);
      continue;
    }
    if (RE_END_PROP.test(text)) {
      close((s) => s.kind === vscode.SymbolKind.Property, i, text.length);
      continue;
    }
    if (RE_END_CLASS.test(text)) {
      close((s) => s.kind === vscode.SymbolKind.Class, i, text.length);
      continue;
    }

    let m;
    if ((m = RE_CLASS.exec(text))) {
      const name = m[1];
      const nameStart = text.indexOf(name);
      const sym = {
        name,
        kind: vscode.SymbolKind.Class,
        range: new vscode.Range(i, 0, i, text.length),
        selectionRange: new vscode.Range(i, nameStart, i, nameStart + name.length),
        children: [],
      };
      push(sym);
      continue;
    }
    if ((m = RE_SUB.exec(text))) {
      const name = m[1];
      const nameStart = text.indexOf(name);
      const sym = {
        name,
        kind: vscode.SymbolKind.Method,
        range: new vscode.Range(i, 0, i, text.length),
        selectionRange: new vscode.Range(i, nameStart, i, nameStart + name.length),
        children: [],
      };
      push(sym);
      continue;
    }
    if ((m = RE_FUNC.exec(text))) {
      const name = m[1];
      const nameStart = text.indexOf(name);
      const sym = {
        name,
        kind: vscode.SymbolKind.Function,
        range: new vscode.Range(i, 0, i, text.length),
        selectionRange: new vscode.Range(i, nameStart, i, nameStart + name.length),
        children: [],
      };
      push(sym);
      continue;
    }
    if ((m = RE_PROP.exec(text))) {
      const name = m[1];
      const nameStart = text.indexOf(name);
      const sym = {
        name,
        kind: vscode.SymbolKind.Property,
        range: new vscode.Range(i, 0, i, text.length),
        selectionRange: new vscode.Range(i, nameStart, i, nameStart + name.length),
        children: [],
      };
      push(sym);
      continue;
    }
    if (stack.length === 0) {
      if ((m = RE_CONST.exec(text))) {
        const name = m[1];
        const nameStart = text.indexOf(name);
        top.push({
          name,
          kind: vscode.SymbolKind.Constant,
          range: new vscode.Range(i, 0, i, text.length),
          selectionRange: new vscode.Range(i, nameStart, i, nameStart + name.length),
          children: [],
        });
        continue;
      }
      if ((m = RE_DIM_TOPLEVEL.exec(text))) {
        const name = m[1];
        const nameStart = text.indexOf(name);
        top.push({
          name,
          kind: vscode.SymbolKind.Variable,
          range: new vscode.Range(i, 0, i, text.length),
          selectionRange: new vscode.Range(i, nameStart, i, nameStart + name.length),
          children: [],
        });
      }
    }
  }

  return top;
}

/** @param {ScannedSymbol[]} list @returns {vscode.DocumentSymbol[]} */
function toDocSymbols(list) {
  return list.map((s) => {
    const ds = new vscode.DocumentSymbol(s.name, s.container || "", s.kind, s.range, s.selectionRange);
    ds.children = toDocSymbols(s.children);
    return ds;
  });
}

const documentSymbolProvider = {
  /**
   * @param {vscode.TextDocument} document
   */
  provideDocumentSymbols(document) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    return toDocSymbols(scanSymbols(document));
  },
};

const workspaceSymbolProvider = {
  /**
   * @param {string} query
   * @param {vscode.CancellationToken} token
   */
  async provideWorkspaceSymbols(query, token) {
    /** @type {vscode.SymbolInformation[]} */
    const results = [];
    const q = (query || "").toLowerCase();
    const files = await vscode.workspace.findFiles("**/*.lss", "**/node_modules/**", 5000, token);
    for (const uri of files) {
      if (token.isCancellationRequested) {
        return results;
      }
      let doc;
      try {
        doc = await vscode.workspace.openTextDocument(uri);
      } catch {
        continue;
      }
      const flat = [];
      const walk = (/** @type {ScannedSymbol[]} */ list) => {
        for (const s of list) {
          flat.push(s);
          if (s.children.length) {
            walk(s.children);
          }
        }
      };
      walk(scanSymbols(doc));
      for (const s of flat) {
        if (q && !s.name.toLowerCase().includes(q)) {
          continue;
        }
        results.push(
          new vscode.SymbolInformation(
            s.name,
            s.kind,
            s.container || "",
            new vscode.Location(uri, s.selectionRange)
          )
        );
      }
    }
    return results;
  },
};

const definitionProvider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   */
  async provideDefinition(document, position) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][\w$]*/);
    if (!wordRange) {
      return undefined;
    }
    const word = document.getText(wordRange);
    if (!word) {
      return undefined;
    }
    /** @type {vscode.Location[]} */
    const out = [];
    const matchInDoc = (/** @type {vscode.TextDocument} */ doc) => {
      const flat = [];
      const walk = (/** @type {ScannedSymbol[]} */ list) => {
        for (const s of list) {
          flat.push(s);
          if (s.children.length) walk(s.children);
        }
      };
      walk(scanSymbols(doc));
      for (const s of flat) {
        if (s.name.toLowerCase() === word.toLowerCase()) {
          out.push(new vscode.Location(doc.uri, s.selectionRange));
        }
      }
    };

    matchInDoc(document);
    if (out.length > 0) {
      return out;
    }

    const files = await vscode.workspace.findFiles("**/*.lss", "**/node_modules/**", 5000);
    for (const uri of files) {
      if (uri.toString() === document.uri.toString()) continue;
      let doc;
      try {
        doc = await vscode.workspace.openTextDocument(uri);
      } catch {
        continue;
      }
      matchInDoc(doc);
      if (out.length >= 32) break;
    }
    return out.length ? out : undefined;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptSymbols(context) {
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(LOTUSSCRIPT_OR_LSS, documentSymbolProvider),
    vscode.languages.registerWorkspaceSymbolProvider(workspaceSymbolProvider),
    vscode.languages.registerDefinitionProvider(LOTUSSCRIPT_OR_LSS, definitionProvider)
  );
}

module.exports = { registerLotusScriptSymbols, scanSymbols };
