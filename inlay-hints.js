// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { getNotesVarTypeMap } = require("./notes-member-completion.js");
const { stripCommentsAndStrings } = require("./text-scan.js");
/** @type {Record<string, Record<string, { signature: string; params: { label: string; doc?: string }[]; returns?: string }>>} */
const SIGS = require("./data/notes-signatures.json");

/**
 * Try to find the signature for `Class.Member` in the curated table.
 * @param {string} className
 * @param {string} memberName
 */
function lookupSignature(className, memberName) {
  const cls = SIGS[className];
  if (!cls) return undefined;
  const wantLower = memberName.toLowerCase();
  for (const key of Object.keys(cls)) {
    if (key.toLowerCase() === wantLower) {
      return cls[key];
    }
  }
  return undefined;
}

/**
 * Find the closing `)` matching the `(` at `openParenCol` on `line`,
 * and split the inner argument list at top-level commas. Strings (`"..."`)
 * and nested `()`/`[]` are respected.
 *
 * @param {string} line  Line text where comments/strings have already been
 *   blanked out by {@link stripCommentsAndStrings}.
 * @param {number} openParenCol
 * @returns {{ argStartCols: number[]; closeCol: number } | undefined}
 */
function splitArgs(line, openParenCol) {
  /** @type {number[]} */
  const starts = [];
  let depth = 0;
  let i = openParenCol + 1;
  let firstNonSpace = -1;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === "(" || c === "[") {
      depth++;
      if (firstNonSpace < 0) firstNonSpace = i;
      continue;
    }
    if (c === ")" || c === "]") {
      if (depth === 0) {
        if (c !== ")") return undefined;
        if (firstNonSpace >= 0) {
          starts.unshift(firstNonSpace);
        }
        return { argStartCols: starts, closeCol: i };
      }
      depth--;
      continue;
    }
    if (c === "," && depth === 0) {
      starts.push(i + 1);
      while (starts[starts.length - 1] < line.length && /\s/.test(line[starts[starts.length - 1]])) {
        starts[starts.length - 1]++;
      }
      continue;
    }
    if (firstNonSpace < 0 && !/\s/.test(c)) {
      firstNonSpace = i;
    }
  }
  return undefined;
}

const provider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Range} range
   */
  provideInlayHints(document, range) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", document.uri);
    if (!conf.get("enableInlayHints", true)) {
      return [];
    }
    const map = getNotesVarTypeMap(document);
    /** @type {vscode.InlayHint[]} */
    const hints = [];

    const startLine = Math.max(0, range.start.line);
    const endLine = Math.min(document.lineCount - 1, range.end.line);

    for (let i = startLine; i <= endLine; i++) {
      const original = document.lineAt(i).text;
      const clean = stripCommentsAndStrings(original);
      const callRe = /\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\(/g;
      let m;
      while ((m = callRe.exec(clean)) !== null) {
        const obj = m[1];
        const member = m[2];
        const openParen = m.index + m[0].length - 1;
        const notesType = map.get(obj.toLowerCase());
        if (!notesType) continue;
        const sig = lookupSignature(notesType, member);
        if (!sig || !sig.params || sig.params.length === 0) continue;
        const split = splitArgs(clean, openParen);
        if (!split) continue;
        const max = Math.min(split.argStartCols.length, sig.params.length);
        for (let p = 0; p < max; p++) {
          const col = split.argStartCols[p];
          if (col >= clean.length) break;
          const argText = clean.slice(col, p + 1 < split.argStartCols.length ? split.argStartCols[p + 1] - 1 : split.closeCol);
          const trimmed = argText.trim();
          if (!trimmed) continue;
          const paramLabel = sig.params[p].label;
          const paramName = paramLabel.split(/\s+/)[0].replace(/[\[\]:,]/g, "");
          if (!paramName) continue;
          if (trimmed.toLowerCase() === paramName.toLowerCase()) continue;
          const hint = new vscode.InlayHint(
            new vscode.Position(i, col),
            `${paramName}:`,
            vscode.InlayHintKind.Parameter
          );
          hint.paddingRight = true;
          hint.tooltip = new vscode.MarkdownString(
            `**${notesType}.${member}** parameter \`${paramLabel}\``
          );
          hints.push(hint);
        }
      }
    }

    return hints;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptInlayHints(context) {
  const emitter = new vscode.EventEmitter();
  /** @type {any} */ (provider).onDidChangeInlayHints = emitter.event;
  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(LOTUSSCRIPT_OR_LSS, provider),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("domino-lss-lotusscript.enableInlayHints")) {
        emitter.fire();
      }
    })
  );
}

module.exports = { registerLotusScriptInlayHints };
