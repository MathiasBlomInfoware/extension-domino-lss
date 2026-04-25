// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");

const RE_INC = /^\s*(?:(?:Public|Private|Friend|Static)\s+)?(?:Sub|Function|Property\s+(?:Get|Set|Let)|Class|If\b.*\bThen\s*$|For\b|ForAll\b|Do\b|While\b|With\b|Select\s+Case\b|Type\b|Enum\b)/i;
const RE_INC_MID = /^\s*(?:Else|ElseIf\b.*\bThen\s*$|Case\b)/i;
const RE_DEC_FULL = /^\s*(?:End\s+(?:Sub|Function|Property|Class|If|With|Select|Type|Enum)|End\s+ForAll|Next\b|Loop\b|Wend\b)/i;
const RE_DEC_MID = /^\s*(?:Else|ElseIf\b|Case\b)/i;
const RE_REM_START = /^\s*%\s*REM\b/i;
const RE_REM_END = /^\s*%\s*END\s+REM\b|^\s*%ENDREM\b/i;
const RE_LABEL = /^\s*[A-Za-z_]\w*:\s*$/;

/**
 * @param {vscode.TextDocument} document
 * @param {vscode.FormattingOptions} options
 */
function formatDocument(document, options) {
  const indentUnit = options.insertSpaces ? " ".repeat(options.tabSize || 4) : "\t";
  const lines = document.getText().split(/\r?\n/);
  const out = new Array(lines.length);
  let level = 0;
  let inRem = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/[\t ]+$/, "");
    const text = raw;
    if (inRem) {
      out[i] = text;
      if (RE_REM_END.test(text)) {
        inRem = false;
      }
      continue;
    }
    if (RE_REM_START.test(text)) {
      out[i] = indentUnit.repeat(Math.max(0, level)) + text.trim();
      inRem = true;
      continue;
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      out[i] = "";
      continue;
    }

    if (RE_LABEL.test(trimmed)) {
      out[i] = trimmed;
      continue;
    }

    let useLevel = level;
    if (RE_DEC_FULL.test(trimmed)) {
      useLevel = Math.max(0, level - 1);
      out[i] = indentUnit.repeat(useLevel) + trimmed;
      level = useLevel;
      continue;
    }
    if (RE_DEC_MID.test(trimmed) && level > 0) {
      useLevel = level - 1;
      out[i] = indentUnit.repeat(useLevel) + trimmed;
    } else {
      out[i] = indentUnit.repeat(useLevel) + trimmed;
    }

    // RE_INC_MID (Else/ElseIf/Case) doesn't change net depth: it pops 1, pushes 1.
    // Only true block openers (RE_INC) increase the indent for following lines.
    if (RE_INC.test(trimmed)) {
      level++;
    }
  }
  return out.join("\n");
}

const provider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.FormattingOptions} options
   */
  provideDocumentFormattingEdits(document, options) {
    if (!isLssDocument(document)) {
      return [];
    }
    const formatted = formatDocument(document, options);
    if (formatted === document.getText()) {
      return [];
    }
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    return [vscode.TextEdit.replace(fullRange, formatted)];
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptFormatter(context) {
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(LOTUSSCRIPT_OR_LSS, provider)
  );
}

module.exports = { registerLotusScriptFormatter, formatDocument };
