// @ts-check
const vscode = require("vscode");
const { isLssDocument } = require("./document-selectors.js");

const NON_ASCII = /[^\x00-\x7F]/;
const TODO_RE = /\b(TODO|FIXME|XXX|HACK|BUG)\b[:\s]?(.*)/i;

/**
 * @param {string} line
 */
function isPercentRemStart(line) {
  return /^\s*%\s*REM\s*$/i.test(line.trimEnd());
}
/**
 * @param {string} line
 */
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
  const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", doc.uri);
  const checkAscii = conf.get("requireAsciiComments", true);
  const checkOptionDeclare = conf.get("warnMissingOptionDeclare", true);
  const checkTodos = conf.get("highlightTodos", true);
  const checkStructure = conf.get("checkStructuralBlocks", true);

  /** @type {vscode.Diagnostic[]} */
  const diagnostics = [];
  let inPercentRem = false;
  let hasOptionDeclare = false;
  let hasNonCommentCode = false;

  /**
   * Stack of open structural blocks: kind + (line, col) of opener.
   * @type {{ kind: string; line: number; col: number; raw: string }[]}
   */
  const stack = [];

  const RE_SUB = /^\s*(?:Public|Private|Static|Friend)?\s*Sub\b/i;
  const RE_END_SUB = /^\s*End\s+Sub\b/i;
  const RE_FUNC = /^\s*(?:Public|Private|Static|Friend)?\s*Function\b/i;
  const RE_END_FUNC = /^\s*End\s+Function\b/i;
  const RE_PROP = /^\s*(?:Public|Private|Static|Friend)?\s*Property\s+(?:Get|Set|Let)\b/i;
  const RE_END_PROP = /^\s*End\s+Property\b/i;
  const RE_CLASS = /^\s*Class\b/i;
  const RE_END_CLASS = /^\s*End\s+Class\b/i;
  const RE_IF_THEN_NEWLINE = /^\s*If\b.*\bThen\s*$/i;
  const RE_END_IF = /^\s*End\s+If\b/i;
  const RE_FOR = /^\s*For\b/i;
  const RE_NEXT = /^\s*Next\b/i;
  const RE_FORALL = /^\s*ForAll\b/i;
  const RE_END_FORALL = /^\s*End\s+ForAll\b/i;
  const RE_DO = /^\s*Do\b/i;
  const RE_LOOP = /^\s*Loop\b/i;
  const RE_WHILE = /^\s*While\b/i;
  const RE_WEND = /^\s*Wend\b/i;
  const RE_WITH = /^\s*With\b/i;
  const RE_END_WITH = /^\s*End\s+With\b/i;
  const RE_SELECT = /^\s*Select\s+Case\b/i;
  const RE_END_SELECT = /^\s*End\s+Select\b/i;

  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i);
    const t = line.text;

    if (inPercentRem) {
      if (isPercentRemEnd(t)) {
        inPercentRem = false;
      } else if (checkAscii && NON_ASCII.test(t)) {
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
      // TODO/FIXME inside %REM
      if (checkTodos) {
        const td = t.match(TODO_RE);
        if (td) {
          const start = t.indexOf(td[1]);
          const d = new vscode.Diagnostic(
            new vscode.Range(i, start, i, start + td[1].length + (td[2]?.length || 0)),
            `${td[1].toUpperCase()}${td[2] ? ":" + td[2].trimEnd() : ""}`,
            vscode.DiagnosticSeverity.Information
          );
          d.source = "lotusscript";
          d.code = "todo";
          diagnostics.push(d);
        }
      }
      continue;
    }

    if (isPercentRemStart(t)) {
      inPercentRem = true;
      continue;
    }

    // ASCII checks for line / Rem comments
    if (/^\s*Rem\b/i.test(t)) {
      const rem = t.match(/^\s*Rem\b(\s*)(.*)$/i);
      if (rem && rem[2] && checkAscii && NON_ASCII.test(rem[2])) {
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
      if (checkTodos) {
        const td = t.match(TODO_RE);
        if (td) {
          const start = t.indexOf(td[1]);
          const d = new vscode.Diagnostic(
            new vscode.Range(i, start, i, start + td[1].length + (td[2]?.length || 0)),
            `${td[1].toUpperCase()}${td[2] ? ":" + td[2].trimEnd() : ""}`,
            vscode.DiagnosticSeverity.Information
          );
          d.source = "lotusscript";
          d.code = "todo";
          diagnostics.push(d);
        }
      }
      continue;
    }

    if (/^\s*'/.test(t)) {
      const idx = t.search(/'/);
      const after = t.slice(idx);
      if (checkAscii && NON_ASCII.test(after)) {
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
      if (checkTodos) {
        const td = t.match(TODO_RE);
        if (td) {
          const start = t.indexOf(td[1]);
          const d = new vscode.Diagnostic(
            new vscode.Range(i, start, i, start + td[1].length + (td[2]?.length || 0)),
            `${td[1].toUpperCase()}${td[2] ? ":" + td[2].trimEnd() : ""}`,
            vscode.DiagnosticSeverity.Information
          );
          d.source = "lotusscript";
          d.code = "todo";
          diagnostics.push(d);
        }
      }
      continue;
    }

    // First non-comment code line
    if (t.trim().length > 0) {
      if (!hasNonCommentCode && /^\s*Option\s+(Declare|Public|Base|Compare|Explicit)\b/i.test(t)) {
        if (/^\s*Option\s+Declare\b/i.test(t)) {
          hasOptionDeclare = true;
        }
      } else if (t.trim().length > 0 && !/^\s*Option\b/i.test(t)) {
        hasNonCommentCode = true;
      }
    }

    if (!checkStructure) {
      continue;
    }

    if (RE_SUB.test(t)) {
      stack.push({ kind: "Sub", line: i, col: 0, raw: t });
    } else if (RE_END_SUB.test(t)) {
      popMatch(stack, "Sub", i, t, diagnostics);
    } else if (RE_FUNC.test(t)) {
      stack.push({ kind: "Function", line: i, col: 0, raw: t });
    } else if (RE_END_FUNC.test(t)) {
      popMatch(stack, "Function", i, t, diagnostics);
    } else if (RE_PROP.test(t)) {
      stack.push({ kind: "Property", line: i, col: 0, raw: t });
    } else if (RE_END_PROP.test(t)) {
      popMatch(stack, "Property", i, t, diagnostics);
    } else if (RE_CLASS.test(t)) {
      stack.push({ kind: "Class", line: i, col: 0, raw: t });
    } else if (RE_END_CLASS.test(t)) {
      popMatch(stack, "Class", i, t, diagnostics);
    } else if (RE_IF_THEN_NEWLINE.test(t)) {
      stack.push({ kind: "If", line: i, col: 0, raw: t });
    } else if (RE_END_IF.test(t)) {
      popMatch(stack, "If", i, t, diagnostics);
    } else if (RE_FORALL.test(t)) {
      stack.push({ kind: "ForAll", line: i, col: 0, raw: t });
    } else if (RE_END_FORALL.test(t)) {
      popMatch(stack, "ForAll", i, t, diagnostics);
    } else if (RE_FOR.test(t)) {
      stack.push({ kind: "For", line: i, col: 0, raw: t });
    } else if (RE_NEXT.test(t)) {
      popMatch(stack, "For", i, t, diagnostics);
    } else if (RE_DO.test(t)) {
      stack.push({ kind: "Do", line: i, col: 0, raw: t });
    } else if (RE_LOOP.test(t)) {
      popMatch(stack, "Do", i, t, diagnostics);
    } else if (RE_WHILE.test(t) && !/\bDo\b/i.test(t)) {
      stack.push({ kind: "While", line: i, col: 0, raw: t });
    } else if (RE_WEND.test(t)) {
      popMatch(stack, "While", i, t, diagnostics);
    } else if (RE_WITH.test(t)) {
      stack.push({ kind: "With", line: i, col: 0, raw: t });
    } else if (RE_END_WITH.test(t)) {
      popMatch(stack, "With", i, t, diagnostics);
    } else if (RE_SELECT.test(t)) {
      stack.push({ kind: "Select", line: i, col: 0, raw: t });
    } else if (RE_END_SELECT.test(t)) {
      popMatch(stack, "Select", i, t, diagnostics);
    }
  }

  if (checkOptionDeclare && hasNonCommentCode && !hasOptionDeclare) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, Math.min(40, doc.lineAt(0).text.length)),
        "Missing 'Option Declare'. LotusScript will allow implicit Variant declarations otherwise.",
        vscode.DiagnosticSeverity.Hint
      )
    );
  }

  if (checkStructure) {
    for (const open of stack) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(open.line, 0, open.line, Math.min(80, open.raw.length)),
          `Unclosed '${open.kind}' block — expected matching End ${open.kind}/Loop/Wend/Next.`,
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
  }

  collection.set(doc.uri, diagnostics);
}

/**
 * Pop the topmost block matching `kind`. Reports a warning at `line` if the
 * topmost open block is a different kind, and pops it anyway to keep moving.
 *
 * @param {{ kind: string; line: number; col: number; raw: string }[]} stack
 * @param {string} kind
 * @param {number} line
 * @param {string} text
 * @param {vscode.Diagnostic[]} diagnostics
 */
function popMatch(stack, kind, line, text, diagnostics) {
  if (stack.length === 0) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(line, 0, line, Math.min(80, text.length)),
        `'End ${kind}' / closer without a matching opener.`,
        vscode.DiagnosticSeverity.Warning
      )
    );
    return;
  }
  const top = stack[stack.length - 1];
  if (top.kind !== kind) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(line, 0, line, Math.min(80, text.length)),
        `Block mismatch: expected closer for '${top.kind}' opened on line ${top.line + 1}, got '${kind}' closer.`,
        vscode.DiagnosticSeverity.Warning
      )
    );
  }
  stack.pop();
}

module.exports = { scanDocument };
