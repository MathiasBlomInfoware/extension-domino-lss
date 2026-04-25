// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { stripCommentsAndStrings, identifierAtPosition } = require("./text-scan.js");
const { scanSymbols } = require("./symbols.js");
const { openAllLssDocuments } = require("./references.js");

/**
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find the `As <ClassName>` annotation on the most recent `Dim/Public/Private`
 * declaration of `name` (case-insensitive) in the current document.
 *
 * @param {vscode.TextDocument} doc
 * @param {string} name lower-cased identifier
 * @param {number} fromLine prefer the closest declaration above this line
 */
function findVarType(doc, name, fromLine) {
  const safe = escapeRegExp(name);
  for (let i = Math.min(Math.max(0, fromLine), doc.lineCount - 1); i >= 0; i--) {
    const clean = stripCommentsAndStrings(doc.lineAt(i).text);
    const re = new RegExp(
      `\\b(?:Dim|Public|Private|Static|Friend)\\s+(?:[A-Za-z_]\\w*\\s*,\\s*)*` +
        safe +
        `\\s+As\\s+(?:New\\s+)?([A-Za-z_]\\w*)`,
      "i"
    );
    const m = clean.match(re);
    if (m) return m[1];
  }
  return undefined;
}

/**
 * @param {vscode.TextDocument[]} docs
 * @param {string} className lower-cased
 * @returns {vscode.Location[]}
 */
function findClassDeclarations(docs, className) {
  /** @type {vscode.Location[]} */
  const out = [];
  for (const d of docs) {
    const tree = scanSymbols(d);
    const walk = (/** @type {ReturnType<typeof scanSymbols>} */ list) => {
      for (const s of list) {
        if (s.kind === vscode.SymbolKind.Class && s.name.toLowerCase() === className) {
          out.push(new vscode.Location(d.uri, s.selectionRange));
        }
        if (s.children?.length) walk(s.children);
      }
    };
    walk(tree);
  }
  return out;
}

/**
 * Find every member named `memberName` (lowercased) on every class in `docs`,
 * excluding the declaration `excludeClass`.
 *
 * @param {vscode.TextDocument[]} docs
 * @param {string} memberName lower-cased
 * @param {string|undefined} excludeClass lower-cased
 * @returns {vscode.Location[]}
 */
function findMemberImplementations(docs, memberName, excludeClass) {
  /** @type {vscode.Location[]} */
  const out = [];
  for (const d of docs) {
    const tree = scanSymbols(d);
    const visit = (/** @type {ReturnType<typeof scanSymbols>} */ list) => {
      for (const s of list) {
        if (s.kind === vscode.SymbolKind.Class) {
          for (const child of s.children ?? []) {
            if (
              (child.kind === vscode.SymbolKind.Method ||
                child.kind === vscode.SymbolKind.Function ||
                child.kind === vscode.SymbolKind.Property) &&
              child.name.toLowerCase() === memberName &&
              s.name.toLowerCase() !== excludeClass
            ) {
              out.push(new vscode.Location(d.uri, child.selectionRange));
            }
          }
        }
        if (s.children?.length) visit(s.children);
      }
    };
    visit(tree);
  }
  return out;
}

const typeDefinitionProvider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {vscode.CancellationToken} token
   */
  async provideTypeDefinition(document, position, token) {
    if (!isLssDocument(document)) return undefined;
    const id = identifierAtPosition(document, position);
    if (!id) return undefined;

    const typeName = findVarType(document, id.word.toLowerCase(), id.range.start.line);
    if (!typeName) return undefined;

    const docs = await openAllLssDocuments(token);
    const hits = findClassDeclarations(docs, typeName.toLowerCase());
    return hits.length ? hits : undefined;
  },
};

const implementationProvider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {vscode.CancellationToken} token
   */
  async provideImplementation(document, position, token) {
    if (!isLssDocument(document)) return undefined;
    const id = identifierAtPosition(document, position);
    if (!id) return undefined;

    const lower = id.word.toLowerCase();

    const localTree = scanSymbols(document);
    /** @type {string | undefined} */
    let containingClass;
    const walk = (/** @type {ReturnType<typeof scanSymbols>} */ list) => {
      for (const s of list) {
        if (s.range.contains(position)) {
          if (s.kind === vscode.SymbolKind.Class) containingClass = s.name.toLowerCase();
          if (s.children?.length) walk(s.children);
        }
      }
    };
    walk(localTree);

    const docs = await openAllLssDocuments(token);

    const classHits = findClassDeclarations(docs, lower);
    if (classHits.length) {
      return classHits;
    }

    const memberHits = findMemberImplementations(docs, lower, containingClass);
    return memberHits.length ? memberHits : undefined;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptImplAndTypeDef(context) {
  context.subscriptions.push(
    vscode.languages.registerTypeDefinitionProvider(LOTUSSCRIPT_OR_LSS, typeDefinitionProvider),
    vscode.languages.registerImplementationProvider(LOTUSSCRIPT_OR_LSS, implementationProvider)
  );
}

module.exports = { registerLotusScriptImplAndTypeDef };
