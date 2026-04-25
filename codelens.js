// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { notesClassTopicUrl, effectiveHelpVersion } = require("./hcl-docs.js");
const { scanSymbols } = require("./symbols.js");
const { findReferencesInWorkspace, flattenSymbolList } = require("./references.js");
/** @type {Record<string, Array<{ name: string }>>} */
const NOTES_MEMBERS = require("./data/notes-members.json");

const RE_DECL = /\b(\w+)\s+As\s+(?:New\s+)?(Notes\w+)\b/g;
const RE_REM_START = /^\s*%\s*REM\b/i;
const RE_REM_END = /^\s*%\s*END\s+REM\b|^\s*%ENDREM\b/i;

const provider = {
  /**
   * @param {vscode.TextDocument} document
   */
  provideCodeLenses(document) {
    if (!isLssDocument(document)) {
      return [];
    }
    const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", document.uri);
    if (!conf.get("enableCodeLens", true)) {
      return [];
    }
    const version = effectiveHelpVersion(conf.get("helpVersion"));
    const showRefCounts = conf.get("enableReferenceCodeLens", true);
    /** @type {vscode.CodeLens[]} */
    const lenses = [];
    /** @type {Set<string>} */
    const seen = new Set();
    let inRem = false;

    if (showRefCounts) {
      const flat = flattenSymbolList(scanSymbols(document));
      for (const s of flat) {
        if (
          s.kind === vscode.SymbolKind.Method ||
          s.kind === vscode.SymbolKind.Function ||
          s.kind === vscode.SymbolKind.Property ||
          s.kind === vscode.SymbolKind.Class
        ) {
          const lens = new vscode.CodeLens(s.selectionRange);
          /** @type {any} */ (lens).__refsCtx = {
            kind: s.kind,
            name: s.name,
            uri: document.uri,
          };
          lenses.push(lens);
        }
      }
    }

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;
      if (inRem) {
        if (RE_REM_END.test(line)) {
          inRem = false;
        }
        continue;
      }
      if (RE_REM_START.test(line)) {
        inRem = true;
        continue;
      }
      if (/^\s*'/.test(line)) {
        continue;
      }
      const onlyDecl = /^\s*(?:Public|Private|Static|Friend|Dim)\b/i.test(line);
      const setNew = line.match(/^\s*Set\s+\w+\s*=\s*New\s+(Notes\w+)\b/i);
      if (setNew && !NOTES_MEMBERS[setNew[1]]) {
        // class is not in our curated set; still link it
      }
      if (setNew) {
        const cls = setNew[1];
        const key = `${i}:${cls}`;
        if (!seen.has(key)) {
          seen.add(key);
          lenses.push(
            new vscode.CodeLens(new vscode.Range(i, 0, i, line.length), {
              title: `$(book) Open ${cls} in HCL help`,
              command: "vscode.open",
              arguments: [vscode.Uri.parse(notesClassTopicUrl(version, cls))],
            })
          );
        }
        continue;
      }
      if (!onlyDecl) {
        continue;
      }
      RE_DECL.lastIndex = 0;
      let m;
      while ((m = RE_DECL.exec(line)) !== null) {
        const cls = m[2];
        const key = `${i}:${cls}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        lenses.push(
          new vscode.CodeLens(new vscode.Range(i, 0, i, line.length), {
            title: `$(book) Open ${cls} in HCL help`,
            command: "vscode.open",
            arguments: [vscode.Uri.parse(notesClassTopicUrl(version, cls))],
          })
        );
      }
    }
    return lenses;
  },
  /**
   * Lazy "N references" lenses on top of declarations. The HCL-link lenses
   * above are returned synchronously by `provideCodeLenses`; references
   * counts are filled in by `resolveCodeLens` so the workspace scan only
   * runs for lenses VS Code actually requests resolution for.
   *
   * @param {vscode.CodeLens} lens
   */
  async resolveCodeLens(lens) {
    /** @type {{ kind?: string; name?: string; uri?: vscode.Uri }} */
    const ctx = /** @type {any} */ (lens).__refsCtx;
    if (!ctx || !ctx.name || !ctx.uri) {
      return lens;
    }
    try {
      const refs = await findReferencesInWorkspace(ctx.name);
      const others = refs.filter(
        (r) =>
          !(
            r.uri.toString() === ctx.uri.toString() &&
            r.range.start.line === lens.range.start.line
          )
      );
      const count = others.length;
      lens.command = {
        title: count === 1 ? `$(references) 1 reference` : `$(references) ${count} references`,
        command: "editor.action.showReferences",
        arguments: [ctx.uri, lens.range.start, others],
      };
    } catch (e) {
      lens.command = {
        title: "$(references) — references",
        command: "",
      };
    }
    return lens;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptCodeLens(context) {
  const emitter = new vscode.EventEmitter();
  /** @type {any} */ (provider).onDidChangeCodeLenses = emitter.event;
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(LOTUSSCRIPT_OR_LSS, provider),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("domino-lss-lotusscript.enableCodeLens") ||
        e.affectsConfiguration("domino-lss-lotusscript.enableReferenceCodeLens") ||
        e.affectsConfiguration("domino-lss-lotusscript.helpVersion")
      ) {
        emitter.fire();
      }
    })
  );
}

module.exports = { registerLotusScriptCodeLens };
