// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");

/**
 * Folding ranges for LotusScript:
 *  - %REM \u2026 %END REM blocks (kind: Comment)
 *  - Sub / Function / Property / Class blocks (kind: Region)
 *
 * VS Code already offers `'#region` / `'#endregion` folding through the
 * markers in language-configuration.json; this provider adds the structural
 * folding that markers cannot express.
 */
const provider = {
  /**
   * @param {vscode.TextDocument} document
   * @returns {vscode.FoldingRange[] | undefined}
   */
  provideFoldingRanges(document) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    /** @type {vscode.FoldingRange[]} */
    const out = [];

    /** @type {{ kind: "rem" | "sub" | "function" | "property" | "class"; start: number }[]} */
    const stack = [];

    const reRemStart = /^\s*%\s*REM\b/i;
    const reRemEnd = /^\s*%\s*END\s+REM\b|^\s*%ENDREM\b/i;
    const reSub = /^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Sub\b/i;
    const reEndSub = /^\s*End\s+Sub\b/i;
    const reFunc = /^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Function\b/i;
    const reEndFunc = /^\s*End\s+Function\b/i;
    const reProp = /^\s*(?:Public\s+|Private\s+|Static\s+|Friend\s+)*Property\s+(?:Get|Set|Let)\b/i;
    const reEndProp = /^\s*End\s+Property\b/i;
    const reClass = /^\s*Class\b/i;
    const reEndClass = /^\s*End\s+Class\b/i;

    /** @param {"rem"|"sub"|"function"|"property"|"class"} kind @param {number} endLine */
    const close = (kind, endLine) => {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].kind === kind) {
          const startLine = stack[i].start;
          stack.splice(i, 1);
          if (endLine > startLine) {
            const range = new vscode.FoldingRange(
              startLine,
              endLine,
              kind === "rem" ? vscode.FoldingRangeKind.Comment : vscode.FoldingRangeKind.Region
            );
            out.push(range);
          }
          return;
        }
      }
    };

    for (let i = 0; i < document.lineCount; i++) {
      const text = document.lineAt(i).text;
      if (reRemEnd.test(text)) {
        close("rem", i);
        continue;
      }
      if (reRemStart.test(text)) {
        stack.push({ kind: "rem", start: i });
        continue;
      }
      // Inside %REM blocks, ignore structural keywords.
      const inRem = stack.some((s) => s.kind === "rem");
      if (inRem) {
        continue;
      }

      if (reEndSub.test(text)) {
        close("sub", i);
        continue;
      }
      if (reEndFunc.test(text)) {
        close("function", i);
        continue;
      }
      if (reEndProp.test(text)) {
        close("property", i);
        continue;
      }
      if (reEndClass.test(text)) {
        close("class", i);
        continue;
      }

      if (reSub.test(text)) {
        stack.push({ kind: "sub", start: i });
      } else if (reFunc.test(text)) {
        stack.push({ kind: "function", start: i });
      } else if (reProp.test(text)) {
        stack.push({ kind: "property", start: i });
      } else if (reClass.test(text)) {
        stack.push({ kind: "class", start: i });
      }
    }

    return out;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptFolding(context) {
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(LOTUSSCRIPT_OR_LSS, provider)
  );
}

module.exports = { registerLotusScriptFolding };
