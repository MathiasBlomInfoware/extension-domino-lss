// @ts-check
const vscode = require("vscode");
const { isLssDocument } = require("./document-selectors.js");
const { scanSymbols } = require("./symbols.js");

/**
 * Walk the symbol tree and return the most specific symbol that contains
 * `position` (deepest match wins).
 *
 * @param {ReturnType<typeof scanSymbols>} list
 * @param {vscode.Position} position
 * @returns {{ name: string; kind: vscode.SymbolKind; container?: string } | undefined}
 */
function findContaining(list, position) {
  /** @type {{ name: string; kind: vscode.SymbolKind; container?: string } | undefined} */
  let best;
  for (const s of list) {
    if (s.range.contains(position)) {
      best = { name: s.name, kind: s.kind, container: s.container };
      if (s.children?.length) {
        const inner = findContaining(s.children, position);
        if (inner) best = inner;
      }
      return best;
    }
  }
  return undefined;
}

const KIND_GLYPH = {
  [vscode.SymbolKind.Class]: "$(symbol-class)",
  [vscode.SymbolKind.Method]: "$(symbol-method)",
  [vscode.SymbolKind.Function]: "$(symbol-function)",
  [vscode.SymbolKind.Property]: "$(symbol-property)",
  [vscode.SymbolKind.Constant]: "$(symbol-constant)",
  [vscode.SymbolKind.Variable]: "$(symbol-variable)",
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptStatusBar(context) {
  const symbolItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 80);
  symbolItem.command = "workbench.action.gotoSymbol";
  symbolItem.tooltip = "Current LotusScript symbol — click to jump (Ctrl+Shift+O)";

  const diagItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 79);
  diagItem.command = "workbench.actions.view.problems";
  diagItem.tooltip = "LotusScript diagnostics in this file — click to open Problems panel";

  context.subscriptions.push(symbolItem, diagItem);

  const updateSymbol = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isLssDocument(editor.document)) {
      symbolItem.hide();
      return;
    }
    const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", editor.document.uri);
    if (!conf.get("enableStatusBar", true)) {
      symbolItem.hide();
      return;
    }
    try {
      const tree = scanSymbols(editor.document);
      const hit = findContaining(tree, editor.selection.active);
      if (!hit) {
        symbolItem.text = "$(symbol-namespace) (module)";
        symbolItem.show();
        return;
      }
      const glyph = KIND_GLYPH[hit.kind] ?? "$(symbol-misc)";
      const label = hit.container ? `${hit.container}.${hit.name}` : hit.name;
      symbolItem.text = `${glyph} ${label}`;
      symbolItem.show();
    } catch {
      symbolItem.hide();
    }
  };

  const updateDiag = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isLssDocument(editor.document)) {
      diagItem.hide();
      return;
    }
    const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", editor.document.uri);
    if (!conf.get("enableStatusBar", true)) {
      diagItem.hide();
      return;
    }
    const all = vscode.languages.getDiagnostics(editor.document.uri);
    let errors = 0;
    let warnings = 0;
    let hints = 0;
    for (const d of all) {
      if (d.source && d.source !== "lotusscript" && d.source !== "domino-lss-lotusscript") continue;
      switch (d.severity) {
        case vscode.DiagnosticSeverity.Error: errors++; break;
        case vscode.DiagnosticSeverity.Warning: warnings++; break;
        case vscode.DiagnosticSeverity.Hint:
        case vscode.DiagnosticSeverity.Information: hints++; break;
      }
    }
    if (errors === 0 && warnings === 0 && hints === 0) {
      diagItem.text = "$(check) lss";
      diagItem.tooltip = "No LotusScript diagnostics in this file";
    } else {
      const parts = [];
      if (errors) parts.push(`$(error) ${errors}`);
      if (warnings) parts.push(`$(warning) ${warnings}`);
      if (hints) parts.push(`$(info) ${hints}`);
      diagItem.text = parts.join(" ");
      diagItem.tooltip = `LotusScript diagnostics: ${errors} errors, ${warnings} warnings, ${hints} hints — click to open Problems`;
    }
    diagItem.show();
  };

  const update = () => {
    updateSymbol();
    updateDiag();
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(update),
    vscode.window.onDidChangeTextEditorSelection(updateSymbol),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) {
        update();
      }
    }),
    vscode.languages.onDidChangeDiagnostics(updateDiag),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("domino-lss-lotusscript.enableStatusBar")) {
        update();
      }
    })
  );

  update();
}

module.exports = { registerLotusScriptStatusBar };
