// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { notesClassTopicUrl, effectiveHelpVersion } = require("./hcl-docs.js");
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
    /** @type {vscode.CodeLens[]} */
    const lenses = [];
    /** @type {Set<string>} */
    const seen = new Set();
    let inRem = false;

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
        e.affectsConfiguration("domino-lss-lotusscript.helpVersion")
      ) {
        emitter.fire();
      }
    })
  );
}

module.exports = { registerLotusScriptCodeLens };
