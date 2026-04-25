// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { CODE } = require("./diagnostics.js");
const { NOTES_CLASSES } = require("./hcl-docs.js");

/** Lower-case Notes class lookup so we can suggest a fix from a typo diagnostic. */
const NOTES_CLASSES_LOWER = (() => {
  const m = new Map();
  for (const c of NOTES_CLASSES) {
    m.set(c.toLowerCase(), c);
  }
  return m;
})();

/** Indent size & character used by `generateRemBlockEdit`. */
const INDENT_TAB = "\t";

/**
 * Build a `%REM ... %END REM` block matching the kind/name of the declaration
 * on `line`. Returns `undefined` when the line isn't a declaration.
 *
 * @param {string} lineText
 */
function describeDeclaration(lineText) {
  const sub = lineText.match(/^(\s*)(?:Public\s+|Private\s+|Static\s+|Friend\s+)*(Sub|Function|Property)\s+(?:(?:Get|Set|Let)\s+)?([A-Za-z_]\w*)/i);
  if (!sub) {
    return undefined;
  }
  return { indent: sub[1], kind: sub[2], name: sub[3] };
}

/**
 * @param {string} indent
 * @param {string} kind  Sub | Function | Property
 * @param {string} name
 */
function buildRemBlock(indent, kind, name) {
  return [
    `${indent}%REM`,
    `${indent}${INDENT_TAB}${kind} ${name}`,
    `${indent}${INDENT_TAB}Description: Comments for ${kind}`,
    `${indent}%END REM`,
    "",
  ].join("\n");
}

const provider = {
  metadata: {
    providedCodeActionKinds: [
      vscode.CodeActionKind.QuickFix,
      vscode.CodeActionKind.RefactorRewrite,
    ],
  },
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Range | vscode.Selection} range
   * @param {vscode.CodeActionContext} context
   */
  provideCodeActions(document, range, context) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    /** @type {vscode.CodeAction[]} */
    const actions = [];

    for (const diag of context.diagnostics) {
      if (diag.source !== "lotusscript") {
        continue;
      }
      const code = typeof diag.code === "string" ? diag.code : diag.code?.value;
      switch (code) {
        case CODE.MISSING_OPTION_DECLARE: {
          const action = new vscode.CodeAction(
            "Add 'Option Declare' at top of file",
            vscode.CodeActionKind.QuickFix
          );
          const edit = new vscode.WorkspaceEdit();
          edit.insert(document.uri, new vscode.Position(0, 0), "Option Declare\n");
          action.edit = edit;
          action.diagnostics = [diag];
          action.isPreferred = true;
          actions.push(action);
          break;
        }
        case CODE.FALL_THROUGH_ERROR_HANDLER: {
          const labelLine = diag.range.start.line;
          let insertLine = labelLine;
          while (insertLine > 0) {
            const t = document.lineAt(insertLine - 1).text;
            if (t.trim().length > 0) break;
            insertLine--;
          }
          const before = insertLine > 0 ? document.lineAt(insertLine - 1).text : "";
          const indentMatch = before.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : "\t";
          const inFunc = isInsideFunction(document, labelLine);
          const exitKind = inFunc ? "Exit Function" : "Exit Sub";
          const action = new vscode.CodeAction(
            `Add '${exitKind}' before label`,
            vscode.CodeActionKind.QuickFix
          );
          const edit = new vscode.WorkspaceEdit();
          edit.insert(
            document.uri,
            new vscode.Position(insertLine, 0),
            `${indent}${exitKind}\n`
          );
          action.edit = edit;
          action.diagnostics = [diag];
          action.isPreferred = true;
          actions.push(action);
          break;
        }
        case CODE.SET_NEW_UNTYPED: {
          const m = document.lineAt(diag.range.start.line).text.match(
            /^(\s*)Set\s+([A-Za-z_]\w*)\s*=\s*New\s+([A-Za-z_]\w*)/i
          );
          if (m) {
            const action = new vscode.CodeAction(
              `Add 'Dim ${m[2]} As ${m[3]}' before this line`,
              vscode.CodeActionKind.QuickFix
            );
            const edit = new vscode.WorkspaceEdit();
            edit.insert(
              document.uri,
              new vscode.Position(diag.range.start.line, 0),
              `${m[1]}Dim ${m[2]} As ${m[3]}\n`
            );
            action.edit = edit;
            action.diagnostics = [diag];
            action.isPreferred = true;
            actions.push(action);
          }
          break;
        }
        case CODE.DEPRECATED_CALL: {
          const wordRange = document.getWordRangeAtPosition(
            diag.range.start,
            /[A-Za-z_]\w*/
          );
          if (wordRange) {
            const m = diag.message.match(/Replace with (\w+)\.?$/);
            if (m) {
              const action = new vscode.CodeAction(
                `Replace with '${m[1]}'`,
                vscode.CodeActionKind.QuickFix
              );
              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, wordRange, m[1]);
              action.edit = edit;
              action.diagnostics = [diag];
              action.isPreferred = true;
              actions.push(action);
            }
          }
          break;
        }
        case CODE.NOTES_CLASS_TYPO: {
          const m = diag.message.match(/Did you mean '([A-Za-z_]\w*)'\?/);
          if (m) {
            const action = new vscode.CodeAction(
              `Change to '${m[1]}'`,
              vscode.CodeActionKind.QuickFix
            );
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, diag.range, m[1]);
            action.edit = edit;
            action.diagnostics = [diag];
            action.isPreferred = true;
            actions.push(action);
          }
          break;
        }
        case CODE.MSGBOX_MAGIC_NUMBER: {
          const action = new vscode.CodeAction(
            "Add %Include \"lsconst.lss\" at top of file",
            vscode.CodeActionKind.QuickFix
          );
          const hasInclude = documentContainsLsConst(document);
          if (!hasInclude) {
            const edit = new vscode.WorkspaceEdit();
            edit.insert(
              document.uri,
              new vscode.Position(0, 0),
              `%Include "lsconst.lss"\n`
            );
            action.edit = edit;
            action.diagnostics = [diag];
            actions.push(action);
          }
          break;
        }
      }
    }

    const lineText = document.lineAt(range.start.line).text;
    const decl = describeDeclaration(lineText);
    if (decl) {
      const above = range.start.line > 0 ? document.lineAt(range.start.line - 1).text : "";
      const alreadyHasRem = /^\s*%\s*END\s+REM\b/i.test(above) || /^\s*%\s*REM\b/i.test(above);
      if (!alreadyHasRem) {
        const action = new vscode.CodeAction(
          `Generate %REM block above ${decl.kind} ${decl.name}`,
          vscode.CodeActionKind.RefactorRewrite
        );
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(range.start.line, 0),
          buildRemBlock(decl.indent, decl.kind, decl.name)
        );
        action.edit = edit;
        actions.push(action);
      }

      const subLine = lineText.match(/^(\s*)(?:Public\s+|Private\s+|Static\s+|Friend\s+)*(Sub|Function|Property)\b/i);
      if (subLine) {
        const inFunc = subLine[2].toLowerCase() !== "sub";
        const indent = subLine[1] + INDENT_TAB;
        const handler = [
          ``,
          `${indent}On Error GoTo ErrorHandler`,
          `${indent}'----------`,
          `${indent}'`,
          `${indent}'----------`,
          `${indent}Exit ${inFunc ? subLine[2] : "Sub"}`,
          `ErrorHandler:`,
          `${indent}MessageBox "Error " & Err & ": " & Error$ & " at line " & Erl, 16, "Error"`,
          `${indent}Resume Next`,
        ].join("\n");
        const action = new vscode.CodeAction(
          `Add error handler skeleton to ${subLine[2]}`,
          vscode.CodeActionKind.RefactorRewrite
        );
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(range.start.line, lineText.length),
          handler
        );
        action.edit = edit;
        actions.push(action);
      }
    }

    return actions;
  },
};

/**
 * @param {vscode.TextDocument} document
 * @param {number} line
 */
function isInsideFunction(document, line) {
  for (let i = line; i >= 0; i--) {
    const t = document.lineAt(i).text;
    if (/^\s*(?:Public|Private|Static|Friend)?\s*Function\b/i.test(t)) return true;
    if (/^\s*(?:Public|Private|Static|Friend)?\s*Sub\b/i.test(t)) return false;
    if (/^\s*(?:Public|Private|Static|Friend)?\s*Property\b/i.test(t)) return false;
    if (/^\s*End\s+(Sub|Function|Property)\b/i.test(t)) return false;
  }
  return false;
}

/**
 * @param {vscode.TextDocument} document
 */
function documentContainsLsConst(document) {
  const max = Math.min(document.lineCount, 80);
  for (let i = 0; i < max; i++) {
    const t = document.lineAt(i).text;
    if (/%\s*Include\s+"\s*lsconst\.lss\s*"/i.test(t)) return true;
  }
  return false;
}

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptCodeActions(context) {
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      LOTUSSCRIPT_OR_LSS,
      provider,
      provider.metadata
    )
  );
}

module.exports = { registerLotusScriptCodeActions };
