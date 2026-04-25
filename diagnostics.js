// @ts-check
const vscode = require("vscode");
const { isLssDocument } = require("./document-selectors.js");
const { NOTES_CLASSES } = require("./hcl-docs.js");
const { stripCommentsAndStrings } = require("./text-scan.js");

const NON_ASCII = /[^\x00-\x7F]/;
const TODO_RE = /\b(TODO|FIXME|XXX|HACK|BUG)\b[:\s]?(.*)/i;

/** Stable diagnostic codes used to wire up quick-fixes in `code-actions.js`. */
const CODE = Object.freeze({
  ASCII_COMMENT: "ascii-comment",
  MISSING_OPTION_DECLARE: "missing-option-declare",
  TODO: "todo",
  UNCLOSED_BLOCK: "unclosed-block",
  STRAY_END: "stray-end",
  BLOCK_MISMATCH: "block-mismatch",
  FALL_THROUGH_ERROR_HANDLER: "fall-through-error-handler",
  SET_NEW_UNTYPED: "set-new-untyped",
  DEPRECATED_CALL: "deprecated-call",
  MSGBOX_MAGIC_NUMBER: "msgbox-magic-number",
  NOTES_CLASS_TYPO: "notes-class-typo",
});

/**
 * Deprecated LotusScript identifiers and their canonical replacement.
 * @type {Record<string, { suggest: string; reason: string }>}
 */
const DEPRECATED_CALLS = {
  lsi_info: {
    suggest: "GetThreadInfo",
    reason: "Lsi_info is a legacy alias of GetThreadInfo. Prefer GetThreadInfo for new code.",
  },
};

const NOTES_CLASSES_LOWER = (() => {
  const m = new Map();
  for (const c of NOTES_CLASSES) {
    m.set(c.toLowerCase(), c);
  }
  return m;
})();

/**
 * @param {string} a
 * @param {string} b
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v1[bl];
}

/**
 * Closest curated Notes* class to `name`, returned only when the edit distance
 * is small enough that a typo is plausible (ratio ≤ 0.25 of name length, max 2).
 * @param {string} name
 */
function suggestNotesClass(name) {
  const lower = name.toLowerCase();
  if (NOTES_CLASSES_LOWER.has(lower)) {
    return undefined;
  }
  let best;
  let bestDist = Infinity;
  for (const c of NOTES_CLASSES) {
    const d = levenshtein(lower, c.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  const limit = Math.max(1, Math.min(2, Math.floor(name.length * 0.25)));
  if (best && bestDist > 0 && bestDist <= limit) {
    return best;
  }
  return undefined;
}

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
  const checkErrHandler = conf.get("warnFallThroughErrorHandler", true);
  const checkSetNew = conf.get("warnSetNewWithoutDim", true);
  const checkDeprecated = conf.get("warnDeprecatedCalls", true);
  const checkMsgbox = conf.get("warnMagicMsgboxConstants", true);
  const checkNotesTypo = conf.get("warnNotesClassTypo", true);

  /** @type {vscode.Diagnostic[]} */
  const diagnostics = [];
  let inPercentRem = false;
  let hasOptionDeclare = false;
  let hasNonCommentCode = false;

  /** Cleaned line text (comments and string literals blanked out). */
  /** @type {string[]} */
  const cleanByLine = new Array(doc.lineCount);
  /** True when `cleanByLine[i]` is in a `%REM`-block. */
  /** @type {boolean[]} */
  const inRemByLine = new Array(doc.lineCount);
  {
    let rem = false;
    for (let i = 0; i < doc.lineCount; i++) {
      const t = doc.lineAt(i).text;
      if (rem) {
        inRemByLine[i] = true;
        if (isPercentRemEnd(t)) rem = false;
        cleanByLine[i] = "";
        continue;
      }
      if (isPercentRemStart(t)) {
        rem = true;
        inRemByLine[i] = true;
        cleanByLine[i] = "";
        continue;
      }
      inRemByLine[i] = false;
      cleanByLine[i] = stripCommentsAndStrings(t);
    }
  }

  /** Names declared with `Dim`/`Public`/`Private`/`Static` anywhere in the doc, lowercase. */
  const declaredNames = new Set();
  for (let i = 0; i < doc.lineCount; i++) {
    if (inRemByLine[i]) continue;
    const c = cleanByLine[i];
    const re = /\b(?:Dim|ReDim|Public|Private|Static)\b\s+([A-Za-z_][\w$]*)/gi;
    let m;
    while ((m = re.exec(c)) !== null) {
      declaredNames.add(m[1].toLowerCase());
    }
  }

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
        const d = new vscode.Diagnostic(
          new vscode.Range(i, col, i, col + 1),
          "Use English in comments: avoid non-ASCII characters in this block.",
          vscode.DiagnosticSeverity.Warning
        );
        d.source = "lotusscript";
        d.code = CODE.ASCII_COMMENT;
        diagnostics.push(d);
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
          d.code = CODE.TODO;
          diagnostics.push(d);
        }
      }
      continue;
    }

    if (isPercentRemStart(t)) {
      inPercentRem = true;
      continue;
    }

    if (/^\s*Rem\b/i.test(t)) {
      const rem = t.match(/^\s*Rem\b(\s*)(.*)$/i);
      if (rem && rem[2] && checkAscii && NON_ASCII.test(rem[2])) {
        const start = t.indexOf(rem[2]);
        const idx = start + rem[2].search(NON_ASCII);
        const d = new vscode.Diagnostic(
          new vscode.Range(i, idx, i, idx + 1),
          "Use English in comments: avoid non-ASCII characters after Rem.",
          vscode.DiagnosticSeverity.Warning
        );
        d.source = "lotusscript";
        d.code = CODE.ASCII_COMMENT;
        diagnostics.push(d);
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
          d.code = CODE.TODO;
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
        const d = new vscode.Diagnostic(
          new vscode.Range(i, col, i, col + 1),
          "Use English in comments: avoid non-ASCII characters in this line comment.",
          vscode.DiagnosticSeverity.Warning
        );
        d.source = "lotusscript";
        d.code = CODE.ASCII_COMMENT;
        diagnostics.push(d);
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
          d.code = CODE.TODO;
          diagnostics.push(d);
        }
      }
      continue;
    }

    {
      const clean = cleanByLine[i] || "";

      if (checkErrHandler) {
        const lab = clean.match(/^\s*([A-Za-z_]\w*)\s*:\s*$/);
        if (lab && /error|handler/i.test(lab[1])) {
          let prevIdx = i - 1;
          while (prevIdx >= 0) {
            const p = (cleanByLine[prevIdx] || "").trim();
            if (p.length > 0) break;
            prevIdx--;
          }
          if (prevIdx >= 0) {
            const prev = cleanByLine[prevIdx];
            const exits =
              /^\s*(Exit\s+(Sub|Function|Property)|End\s+(Sub|Function|Property)|GoTo\s+\w|Resume(\s+\w+)?|Return\b|Stop\b)/i;
            if (!exits.test(prev)) {
              const labelStart = t.indexOf(lab[1]);
              const d = new vscode.Diagnostic(
                new vscode.Range(i, labelStart, i, labelStart + lab[1].length),
                `Body falls through into '${lab[1]}:'. Add 'Exit Sub' / 'Exit Function' / 'Exit Property' on the previous line so the handler only runs after errors.`,
                vscode.DiagnosticSeverity.Warning
              );
              d.source = "lotusscript";
              d.code = CODE.FALL_THROUGH_ERROR_HANDLER;
              diagnostics.push(d);
            }
          }
        }
      }

      if (checkSetNew) {
        const sn = clean.match(/^\s*Set\s+([A-Za-z_]\w*)\s*=\s*New\s+([A-Za-z_]\w*)/i);
        if (sn && !declaredNames.has(sn[1].toLowerCase())) {
          const nameStart = t.toLowerCase().indexOf(sn[1].toLowerCase());
          const d = new vscode.Diagnostic(
            new vscode.Range(i, nameStart, i, nameStart + sn[1].length),
            `'${sn[1]}' is assigned with 'Set ... = New ${sn[2]}' but never declared. Add 'Dim ${sn[1]} As ${sn[2]}' for typed completion and signature help.`,
            vscode.DiagnosticSeverity.Information
          );
          d.source = "lotusscript";
          d.code = CODE.SET_NEW_UNTYPED;
          diagnostics.push(d);
        }
      }

      if (checkDeprecated) {
        const re = /\b([A-Za-z_]\w*)\s*\(/g;
        let m;
        while ((m = re.exec(clean)) !== null) {
          const dep = DEPRECATED_CALLS[m[1].toLowerCase()];
          if (dep) {
            const d = new vscode.Diagnostic(
              new vscode.Range(i, m.index, i, m.index + m[1].length),
              `${m[1]} is deprecated. ${dep.reason} Replace with ${dep.suggest}.`,
              vscode.DiagnosticSeverity.Hint
            );
            d.tags = [vscode.DiagnosticTag.Deprecated];
            d.source = "lotusscript";
            d.code = CODE.DEPRECATED_CALL;
            diagnostics.push(d);
          }
        }
      }

      if (checkMsgbox) {
        const re = /\b(Msgbox|Messagebox)\b\s*(?:\(\s*)?([^,\n)]+),\s*([^,\n)]+)/gi;
        let m;
        while ((m = re.exec(clean)) !== null) {
          const buttons = m[3].trim();
          if (/^[\d\s+()*&|]+$/.test(buttons) && /\d/.test(buttons)) {
            const argStart =
              m.index +
              m[0].lastIndexOf(m[3]);
            const d = new vscode.Diagnostic(
              new vscode.Range(i, argStart, i, argStart + m[3].length),
              `Magic number for ${m[1]} buttons/icon. Prefer named constants like MB_OK, MB_OKCANCEL, MB_ICONSTOP, MB_ICONQUESTION, … (in lsconst.lss via %Include).`,
              vscode.DiagnosticSeverity.Hint
            );
            d.source = "lotusscript";
            d.code = CODE.MSGBOX_MAGIC_NUMBER;
            diagnostics.push(d);
          }
        }
      }

      if (checkNotesTypo) {
        const re = /\bAs\s+(?:New\s+)?(Notes[A-Za-z][\w]*)/g;
        let m;
        while ((m = re.exec(clean)) !== null) {
          const cls = m[1];
          const sugg = suggestNotesClass(cls);
          if (sugg) {
            const start = m.index + m[0].lastIndexOf(cls);
            const d = new vscode.Diagnostic(
              new vscode.Range(i, start, i, start + cls.length),
              `Unknown Notes class '${cls}'. Did you mean '${sugg}'?`,
              vscode.DiagnosticSeverity.Warning
            );
            d.source = "lotusscript";
            d.code = CODE.NOTES_CLASS_TYPO;
            diagnostics.push(d);
          }
        }
      }
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
    const d = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, Math.min(40, doc.lineAt(0).text.length)),
      "Missing 'Option Declare'. LotusScript will allow implicit Variant declarations otherwise.",
      vscode.DiagnosticSeverity.Hint
    );
    d.source = "lotusscript";
    d.code = CODE.MISSING_OPTION_DECLARE;
    diagnostics.push(d);
  }

  if (checkStructure) {
    for (const open of stack) {
      const d = new vscode.Diagnostic(
        new vscode.Range(open.line, 0, open.line, Math.min(80, open.raw.length)),
        `Unclosed '${open.kind}' block — expected matching End ${open.kind}/Loop/Wend/Next.`,
        vscode.DiagnosticSeverity.Warning
      );
      d.source = "lotusscript";
      d.code = CODE.UNCLOSED_BLOCK;
      diagnostics.push(d);
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
    const d = new vscode.Diagnostic(
      new vscode.Range(line, 0, line, Math.min(80, text.length)),
      `'End ${kind}' / closer without a matching opener.`,
      vscode.DiagnosticSeverity.Warning
    );
    d.source = "lotusscript";
    d.code = CODE.STRAY_END;
    diagnostics.push(d);
    return;
  }
  const top = stack[stack.length - 1];
  if (top.kind !== kind) {
    const d = new vscode.Diagnostic(
      new vscode.Range(line, 0, line, Math.min(80, text.length)),
      `Block mismatch: expected closer for '${top.kind}' opened on line ${top.line + 1}, got '${kind}' closer.`,
      vscode.DiagnosticSeverity.Warning
    );
    d.source = "lotusscript";
    d.code = CODE.BLOCK_MISMATCH;
    diagnostics.push(d);
  }
  stack.pop();
}

module.exports = { scanDocument, CODE };
