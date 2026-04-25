// @ts-check
const vscode = require("vscode");
const { effectiveHelpVersion } = require("./hcl-docs.js");
const { registerHclCompletions } = require("./completion.js");
const { registerHclHover } = require("./hover.js");
const { isLssDocument } = require("./document-selectors.js");
const { dropNotesVarTypeMapForUri } = require("./notes-member-completion.js");
const { scanDocument } = require("./diagnostics.js");
const { registerLotusScriptFolding } = require("./folding.js");
const { registerLotusScriptSymbols } = require("./symbols.js");
const { registerLotusScriptSignatureHelp } = require("./signature-help.js");
const { registerLotusScriptFormatter } = require("./formatter.js");
const { registerLotusScriptCodeLens } = require("./codelens.js");
const { registerLotusScriptReferences } = require("./references.js");
const { registerLotusScriptCodeActions } = require("./code-actions.js");
const { registerLotusScriptInlayHints } = require("./inlay-hints.js");
const { registerLotusScriptStatusBar } = require("./status-bar.js");
const { registerLotusScriptDocumentLinks } = require("./document-links.js");
const { registerLotusScriptSemanticTokens } = require("./semantic-tokens.js");
const { registerLotusScriptImplAndTypeDef } = require("./impl-typedef.js");
const { registerLotusScriptCommands } = require("./commands.js");

const DIAG_SOURCE = "domino-lss-lotusscript";
const DIAG_DEBOUNCE_MS = 200;

/**
 * One-time: persist cleaned `helpVersion` (pasted URLs → segment; below-minimum semver → floor).
 * Covers Global, Workspace and every WorkspaceFolder scope.
 * @param {vscode.ExtensionContext} context
 */
async function migrateHelpVersionCanonical(context) {
  const key = "dominoLssMigratedHelpVersionCanonical2026c";
  if (context.globalState.get(key)) {
    return;
  }
  try {
    /**
     * @param {vscode.WorkspaceConfiguration} conf
     * @param {import("vscode").ConfigurationTarget} target
     * @param {unknown} val
     */
    const tryUpdate = async (conf, target, val) => {
      if (val === undefined || val === null) {
        return;
      }
      const raw = String(val).trim();
      if (!raw) {
        return;
      }
      const next = effectiveHelpVersion(val);
      if (next !== raw) {
        await conf.update("helpVersion", next, target);
      }
    };

    const root = vscode.workspace.getConfiguration("domino-lss-lotusscript");
    const rootIns = root.inspect("helpVersion");
    await tryUpdate(root, vscode.ConfigurationTarget.Global, rootIns?.globalValue);
    await tryUpdate(root, vscode.ConfigurationTarget.Workspace, rootIns?.workspaceValue);

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", folder.uri);
      const ins = conf.inspect("helpVersion");
      await tryUpdate(conf, vscode.ConfigurationTarget.WorkspaceFolder, ins?.workspaceFolderValue);
    }
  } catch {
    // ignore if settings are read-only
  }
  await context.globalState.update(key, true);
}

/** @param {vscode.ExtensionContext} context */
exports.activate = function (context) {
  void migrateHelpVersionCanonical(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "domino-lss-lotusscript.openDesignerHelp",
      async (/** @type {unknown} */ urlArg) => {
        const url = typeof urlArg === "string" ? urlArg : "";
        if (!url.startsWith("https://help.hcl-software.com/")) {
          return;
        }
        await vscode.env.openExternal(vscode.Uri.parse(url));
      }
    )
  );

  registerHclCompletions(context);
  registerHclHover(context);
  registerLotusScriptFolding(context);
  registerLotusScriptSymbols(context);
  registerLotusScriptSignatureHelp(context);
  registerLotusScriptFormatter(context);
  registerLotusScriptCodeLens(context);
  registerLotusScriptReferences(context);
  registerLotusScriptCodeActions(context);
  registerLotusScriptInlayHints(context);
  registerLotusScriptStatusBar(context);
  registerLotusScriptDocumentLinks(context);
  registerLotusScriptSemanticTokens(context);
  registerLotusScriptImplAndTypeDef(context);
  registerLotusScriptCommands(context);

  const collection = vscode.languages.createDiagnosticCollection(DIAG_SOURCE);
  context.subscriptions.push(collection);

  const run = (/** @type {vscode.TextDocument} */ doc) => {
    if (isLssDocument(doc)) {
      scanDocument(doc, collection);
    }
  };

  /** @type {Map<string, NodeJS.Timeout>} */
  const debounceTimers = new Map();
  const scheduleRun = (/** @type {vscode.TextDocument} */ doc) => {
    if (!isLssDocument(doc)) {
      return;
    }
    const key = doc.uri.toString();
    const prev = debounceTimers.get(key);
    if (prev) {
      clearTimeout(prev);
    }
    debounceTimers.set(
      key,
      setTimeout(() => {
        debounceTimers.delete(key);
        if (!doc.isClosed) {
          scanDocument(doc, collection);
        }
      }, DIAG_DEBOUNCE_MS)
    );
  };

  for (const doc of vscode.workspace.textDocuments) {
    run(doc);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(run),
    vscode.workspace.onDidSaveTextDocument(run),
    vscode.workspace.onDidChangeTextDocument((e) => {
      scheduleRun(e.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (isLssDocument(doc)) {
        collection.delete(doc.uri);
        dropNotesVarTypeMapForUri(doc.uri);
        const key = doc.uri.toString();
        const t = debounceTimers.get(key);
        if (t) {
          clearTimeout(t);
          debounceTimers.delete(key);
        }
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("domino-lss-lotusscript.requireAsciiComments") ||
        e.affectsConfiguration("domino-lss-lotusscript.warnMissingOptionDeclare") ||
        e.affectsConfiguration("domino-lss-lotusscript.highlightTodos") ||
        e.affectsConfiguration("domino-lss-lotusscript.checkStructuralBlocks") ||
        e.affectsConfiguration("domino-lss-lotusscript.warnFallThroughErrorHandler") ||
        e.affectsConfiguration("domino-lss-lotusscript.warnSetNewWithoutDim") ||
        e.affectsConfiguration("domino-lss-lotusscript.warnDeprecatedCalls") ||
        e.affectsConfiguration("domino-lss-lotusscript.warnMagicMsgboxConstants") ||
        e.affectsConfiguration("domino-lss-lotusscript.warnNotesClassTypo")
      ) {
        for (const doc of vscode.workspace.textDocuments) {
          run(doc);
        }
      }
    }),
    {
      dispose() {
        for (const t of debounceTimers.values()) {
          clearTimeout(t);
        }
        debounceTimers.clear();
      },
    }
  );
};

exports.deactivate = function () {};
