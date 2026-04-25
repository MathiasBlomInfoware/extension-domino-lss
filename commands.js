// @ts-check
const vscode = require("vscode");
const { isLssDocument } = require("./document-selectors.js");
const {
  effectiveHelpVersion,
  designerPublicationUrl,
} = require("./hcl-docs.js");

/**
 * Locate the line index of the first executable (non-`Option …`, non-`%REM`,
 * non-blank, non-comment) statement in `doc`.
 *
 * @param {vscode.TextDocument} doc
 */
function findFirstCodeLine(doc) {
  let inRem = false;
  for (let i = 0; i < doc.lineCount; i++) {
    const t = doc.lineAt(i).text.trim();
    if (inRem) {
      if (/^%\s*END\s+REM\b/i.test(t)) inRem = false;
      continue;
    }
    if (/^%\s*REM\b/i.test(t)) {
      inRem = true;
      continue;
    }
    if (!t) continue;
    if (t.startsWith("'")) continue;
    if (/^Option\s+/i.test(t)) continue;
    if (/^Use(LSX)?\s+/i.test(t)) continue;
    if (/^%\s*Include\b/i.test(t)) continue;
    return i;
  }
  return doc.lineCount;
}

/**
 * Run a snippet-style template at the active editor's cursor (or, when
 * `top=true`, prepended at the file head). Activates only for `.lss` editors.
 *
 * @param {string[]} body
 * @param {{ top?: boolean }} [opts]
 */
async function insertSnippet(body, opts) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isLssDocument(editor.document)) {
    void vscode.window.showInformationMessage("Open a .lss file first.");
    return;
  }
  const snippet = new vscode.SnippetString(body.join("\n"));
  if (opts?.top) {
    await editor.insertSnippet(snippet, new vscode.Position(0, 0));
    return;
  }
  await editor.insertSnippet(snippet);
}

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("domino-lss-lotusscript.insertAgentSkeleton", async () => {
      await insertSnippet(
        [
          "Option Public",
          "Option Declare",
          "%Include \"lsconst.lss\"",
          "",
          "Sub Initialize",
          "\tOn Error Goto errh",
          "\tDim s As New NotesSession",
          "\tDim db As NotesDatabase",
          "\tSet db = s.CurrentDatabase",
          "\tDim agent As NotesAgent",
          "\tSet agent = s.CurrentAgent",
          "\tDim log As NotesLog",
          "\tSet log = s.CreateLog(agent.Name)",
          "\tCall log.OpenAgentLog()",
          "\t",
          "\t$0",
          "\t",
          "\tCall log.Close()",
          "\tExit Sub",
          "errh:",
          "\tCall log.LogError(Err, \"\" & Error$ & \" at line \" & Erl)",
          "\tCall log.Close()",
          "End Sub",
        ],
        { top: true }
      );
    }),

    vscode.commands.registerCommand("domino-lss-lotusscript.insertSessionAndDb", async () => {
      await insertSnippet([
        "Dim s As New NotesSession",
        "Dim db As NotesDatabase",
        "Set db = s.CurrentDatabase",
        "$0",
      ]);
    }),

    vscode.commands.registerCommand("domino-lss-lotusscript.toggleOptionDeclare", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLssDocument(editor.document)) {
        void vscode.window.showInformationMessage("Open a .lss file first.");
        return;
      }
      const doc = editor.document;
      let foundLine = -1;
      for (let i = 0; i < Math.min(doc.lineCount, 200); i++) {
        if (/^\s*Option\s+Declare\b/i.test(doc.lineAt(i).text)) {
          foundLine = i;
          break;
        }
      }
      const edit = new vscode.WorkspaceEdit();
      if (foundLine >= 0) {
        const range = doc.lineAt(foundLine).rangeIncludingLineBreak;
        edit.delete(doc.uri, range);
        await vscode.workspace.applyEdit(edit);
        void vscode.window.setStatusBarMessage("Removed 'Option Declare'", 3000);
      } else {
        const insertAt = new vscode.Position(0, 0);
        edit.insert(doc.uri, insertAt, "Option Declare\n");
        await vscode.workspace.applyEdit(edit);
        void vscode.window.setStatusBarMessage("Added 'Option Declare' at top", 3000);
      }
    }),

    vscode.commands.registerCommand("domino-lss-lotusscript.openLsconstReference", async () => {
      const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript");
      const v = effectiveHelpVersion(conf.get("helpVersion"));
      const url = designerPublicationUrl(
        v,
        "basic/LSAZ_LIST_OF_CONSTANTS_LSCONST_LSS.html"
      );
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand("domino-lss-lotusscript.insertAtFirstCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLssDocument(editor.document)) {
        void vscode.window.showInformationMessage("Open a .lss file first.");
        return;
      }
      const line = findFirstCodeLine(editor.document);
      const pos = new vscode.Position(line, 0);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    })
  );
}

module.exports = { registerLotusScriptCommands };
