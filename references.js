// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { findIdentifierOccurrences, identifierAtPosition } = require("./text-scan.js");
const { scanSymbols } = require("./symbols.js");

const WORKSPACE_FILE_LIMIT = 5000;
let REF_CACHE_GEN = 1;
/** @type {{ gen: number; docs: vscode.TextDocument[] } | undefined} */
let ALL_DOCS_CACHE;
/** @type {Map<string, { gen: number; refs: vscode.Location[] }>} */
const REFS_CACHE = new Map();

function bumpRefCaches() {
  REF_CACHE_GEN++;
  ALL_DOCS_CACHE = undefined;
  REFS_CACHE.clear();
}

/**
 * Built-in / library names that {@link renameProvider} refuses to rename
 * (they aren't user-defined). Lowercase keys.
 */
const RESERVED_LOWER = new Set([
  "sub",
  "function",
  "property",
  "class",
  "end",
  "dim",
  "redim",
  "set",
  "let",
  "as",
  "new",
  "byval",
  "byref",
  "if",
  "then",
  "else",
  "elseif",
  "endif",
  "select",
  "case",
  "for",
  "to",
  "step",
  "next",
  "each",
  "in",
  "while",
  "wend",
  "do",
  "loop",
  "until",
  "exit",
  "goto",
  "gosub",
  "return",
  "with",
  "const",
  "public",
  "private",
  "type",
  "enum",
  "rem",
  "option",
  "declare",
  "lib",
  "alias",
  "forall",
  "and",
  "or",
  "not",
  "xor",
  "imp",
  "eqv",
  "mod",
  "is",
  "like",
  "true",
  "false",
  "nothing",
  "empty",
  "null",
  "pi",
  "me",
  "boolean",
  "byte",
  "integer",
  "long",
  "single",
  "double",
  "currency",
  "string",
  "variant",
  "date",
  "object",
  "list",
  "stop",
  "implements",
]);

/**
 * @typedef {{ name: string; selectionRange: import("vscode").Range; range: import("vscode").Range; container?: string; kind: import("vscode").SymbolKind; children: any[] }} Sym
 */

/**
 * Flatten the nested document symbol tree from {@link scanSymbols} for easy
 * lookup.
 * @param {any[]} list
 * @returns {Sym[]}
 */
function flatten(list) {
  /** @type {Sym[]} */
  const out = [];
  const walk = (/** @type {any[]} */ items) => {
    for (const s of items) {
      out.push(s);
      if (s.children?.length) {
        walk(s.children);
      }
    }
  };
  walk(list);
  return out;
}

/**
 * @param {vscode.TextDocument} document
 * @param {string} name
 * @returns {Sym | undefined}
 */
function findDeclarationInDoc(document, name) {
  const flat = flatten(scanSymbols(document));
  const lower = name.toLowerCase();
  return flat.find((s) => s.name.toLowerCase() === lower);
}

/**
 * Open and parse all `.lss` files in the workspace.
 * @param {vscode.CancellationToken} [token]
 * @returns {Promise<vscode.TextDocument[]>}
 */
async function openAllLssDocuments(token) {
  if (!token && ALL_DOCS_CACHE && ALL_DOCS_CACHE.gen === REF_CACHE_GEN) {
    return ALL_DOCS_CACHE.docs;
  }
  const files = await vscode.workspace.findFiles(
    "**/*.lss",
    "**/node_modules/**",
    WORKSPACE_FILE_LIMIT,
    token
  );
  /** @type {vscode.TextDocument[]} */
  const docs = [];
  for (const uri of files) {
    if (token?.isCancellationRequested) {
      return docs;
    }
    try {
      const d = await vscode.workspace.openTextDocument(uri);
      docs.push(d);
    } catch {
      // Skip unreadable files (locked, deleted between findFiles and open, etc.)
    }
  }
  if (!token) {
    ALL_DOCS_CACHE = { gen: REF_CACHE_GEN, docs };
  }
  return docs;
}

/**
 * Locations of every `name` occurrence across all .lss files in the workspace.
 * @param {string} name
 * @param {vscode.CancellationToken} [token]
 */
async function findReferencesInWorkspace(name, token) {
  const cacheKey = name.toLowerCase();
  if (!token) {
    const hit = REFS_CACHE.get(cacheKey);
    if (hit && hit.gen === REF_CACHE_GEN) {
      return hit.refs;
    }
  }
  /** @type {vscode.Location[]} */
  const out = [];
  const docs = await openAllLssDocuments(token);
  for (const doc of docs) {
    if (token?.isCancellationRequested) {
      return out;
    }
    for (const hit of findIdentifierOccurrences(doc, name)) {
      out.push(
        new vscode.Location(
          doc.uri,
          new vscode.Range(hit.line, hit.start, hit.line, hit.end)
        )
      );
    }
  }
  if (!token) {
    REFS_CACHE.set(cacheKey, { gen: REF_CACHE_GEN, refs: out });
  }
  return out;
}

const referenceProvider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {{ includeDeclaration: boolean }} context
   * @param {vscode.CancellationToken} token
   */
  async provideReferences(document, position, context, token) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    const word = identifierAtPosition(document, position);
    if (!word) {
      return undefined;
    }
    const refs = await findReferencesInWorkspace(word.word, token);
    if (context.includeDeclaration === false) {
      const decl = findDeclarationInDoc(document, word.word);
      if (decl) {
        return refs.filter(
          (r) =>
            !(
              r.uri.toString() === document.uri.toString() &&
              r.range.isEqual(decl.selectionRange)
            )
        );
      }
    }
    return refs;
  },
};

const documentHighlightProvider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   */
  provideDocumentHighlights(document, position) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    const word = identifierAtPosition(document, position);
    if (!word) {
      return undefined;
    }
    return findIdentifierOccurrences(document, word.word).map(
      (h) =>
        new vscode.DocumentHighlight(
          new vscode.Range(h.line, h.start, h.line, h.end),
          vscode.DocumentHighlightKind.Read
        )
    );
  },
};

const renameProvider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   */
  prepareRename(document, position) {
    if (!isLssDocument(document)) {
      throw new Error("Not a LotusScript document.");
    }
    const word = identifierAtPosition(document, position);
    if (!word) {
      throw new Error("Place the cursor on an identifier to rename.");
    }
    if (RESERVED_LOWER.has(word.word.toLowerCase())) {
      throw new Error(`'${word.word}' is a reserved word and cannot be renamed.`);
    }
    if (/^Notes/i.test(word.word)) {
      throw new Error(
        `'${word.word}' looks like a Domino class — refusing to rename built-in API surface.`
      );
    }
    return { range: word.range, placeholder: word.word };
  },
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {string} newName
   * @param {vscode.CancellationToken} token
   */
  async provideRenameEdits(document, position, newName, token) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    if (!/^[A-Za-z_][\w$]*$/.test(newName)) {
      throw new Error(
        `'${newName}' is not a valid LotusScript identifier (letters, digits, _ or $; must not start with a digit).`
      );
    }
    if (RESERVED_LOWER.has(newName.toLowerCase())) {
      throw new Error(`'${newName}' is a reserved word.`);
    }
    const word = identifierAtPosition(document, position);
    if (!word) {
      return undefined;
    }
    const refs = await findReferencesInWorkspace(word.word, token);
    const edit = new vscode.WorkspaceEdit();
    for (const r of refs) {
      edit.replace(r.uri, r.range, newName);
    }
    return edit;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptReferences(context) {
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(LOTUSSCRIPT_OR_LSS, referenceProvider),
    vscode.languages.registerDocumentHighlightProvider(LOTUSSCRIPT_OR_LSS, documentHighlightProvider),
    vscode.languages.registerRenameProvider(LOTUSSCRIPT_OR_LSS, renameProvider),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (isLssDocument(e.document)) {
        bumpRefCaches();
      }
    }),
    vscode.workspace.onDidOpenTextDocument((d) => {
      if (isLssDocument(d)) {
        bumpRefCaches();
      }
    }),
    vscode.workspace.onDidCloseTextDocument((d) => {
      if (isLssDocument(d)) {
        bumpRefCaches();
      }
    }),
    vscode.workspace.onDidCreateFiles((e) => {
      if (e.files.some((u) => u.fsPath.toLowerCase().endsWith(".lss"))) {
        bumpRefCaches();
      }
    }),
    vscode.workspace.onDidDeleteFiles((e) => {
      if (e.files.some((u) => u.fsPath.toLowerCase().endsWith(".lss"))) {
        bumpRefCaches();
      }
    }),
    vscode.workspace.onDidRenameFiles((e) => {
      if (
        e.files.some(
          (f) =>
            f.oldUri.fsPath.toLowerCase().endsWith(".lss") ||
            f.newUri.fsPath.toLowerCase().endsWith(".lss")
        )
      ) {
        bumpRefCaches();
      }
    })
  );
}

module.exports = {
  registerLotusScriptReferences,
  findReferencesInWorkspace,
  openAllLssDocuments,
  flattenSymbolList: flatten,
};
