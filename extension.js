// @ts-check
const vscode = require("vscode");
const { effectiveHelpVersion } = require("./hcl-docs.js");
const { registerHclCompletions } = require("./completion.js");
const { registerHclHover } = require("./hover.js");
const { isLssDocument } = require("./document-selectors.js");
const { dropNotesVarTypeMapForUri } = require("./notes-member-completion.js");

const NON_ASCII = /[^\x00-\x7F]/;
const DIAG_SOURCE = "domino-lss-lotusscript";
const DIAG_DEBOUNCE_MS = 200;

/** @param {string} line */
function isPercentRemStart(line) {
  return /^\s*%\s*REM\s*$/i.test(line.trimEnd());
}

/** @param {string} line */
function isPercentRemEnd(line) {
  const t = line.trimEnd();
  return /^\s*%\s*END\s+REM\s*$/i.test(t) || /^\s*%ENDREM\s*$/i.test(t);
}

/**
 * @param {vscode.TextDocument} doc
 * @param {vscode.DiagnosticCollection} collection
 */
function scanDocument(doc, collection) {
  if (!isLssDocument(doc)) {
    return;
  }
  const enabled = vscode.workspace
    .getConfiguration("domino-lss-lotusscript")
    .get("requireAsciiComments", true);
  if (!enabled) {
    collection.delete(doc.uri);
    return;
  }

  /** @type {vscode.Diagnostic[]} */
  const diagnostics = [];
  let inPercentRem = false;

  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i);
    const t = line.text;

    if (inPercentRem) {
      if (isPercentRemEnd(t)) {
        inPercentRem = false;
      } else if (NON_ASCII.test(t)) {
        const m = t.match(NON_ASCII);
        const col = m ? t.indexOf(m[0]) : 0;
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(i, col, i, col + 1),
            "Use English in comments: avoid non-ASCII characters in this block.",
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
      continue;
    }

    if (isPercentRemStart(t)) {
      inPercentRem = true;
      continue;
    }

    if (/^\s*Rem\b/i.test(t)) {
      const rem = t.match(/^\s*Rem\b(\s*)(.*)$/i);
      if (rem && rem[2] && NON_ASCII.test(rem[2])) {
        const start = t.indexOf(rem[2]);
        const idx = start + rem[2].search(NON_ASCII);
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(i, idx, i, idx + 1),
            "Use English in comments: avoid non-ASCII characters after Rem.",
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
      continue;
    }

    if (/^\s*'/.test(t)) {
      const idx = t.search(/'/);
      const after = t.slice(idx);
      if (NON_ASCII.test(after)) {
        const rel = after.search(NON_ASCII);
        const col = idx + rel;
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(i, col, i, col + 1),
            "Use English in comments: avoid non-ASCII characters in this line comment.",
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }
  }

  collection.set(doc.uri, diagnostics);
}

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
      if (e.affectsConfiguration("domino-lss-lotusscript.requireAsciiComments")) {
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
