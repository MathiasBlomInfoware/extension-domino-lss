// @ts-check
/**
 * Shared LotusScript token scanner. Yields identifier matches in a document
 * while skipping content that should not contribute to references / renames /
 * highlights:
 *
 *  - inside `%REM ... %END REM` blocks
 *  - on `Rem ...` and `'...` line comments (only the comment tail, not whole line)
 *  - inside `"..."` string literals (with `""` doubled-quote escapes)
 *  - inside `{...}` and `{"}` set literals (LotusScript replace-set elements)
 *  - inside `|c|` delimited single-character literals
 */

const RE_REM_START = /^\s*%\s*REM\b/i;
const RE_REM_END = /^\s*%\s*END\s+REM\b|^\s*%ENDREM\b/i;

/**
 * Strip parts of a single line that are inside string/set literals or after a
 * line-comment (`'`, `Rem ...`). Replaces stripped characters with single
 * spaces so that all remaining columns line up with the original text.
 *
 * Does NOT handle `%REM`/`%END REM` block context — that's a multi-line
 * concern and must be tracked by the caller.
 *
 * @param {string} line
 * @returns {string} same length as `line`; comment/string regions are spaces.
 */
function stripCommentsAndStrings(line) {
  const remLine = line.match(/^(\s*)Rem\b/i);
  if (remLine) {
    return remLine[1] + "Rem" + " ".repeat(line.length - (remLine[1].length + 3));
  }
  const out = line.split("");
  let i = 0;
  const n = out.length;
  while (i < n) {
    const c = out[i];
    if (c === "'") {
      for (let k = i; k < n; k++) {
        out[k] = " ";
      }
      break;
    }
    if (c === '"') {
      const start = i;
      i++;
      while (i < n) {
        if (out[i] === '"') {
          if (i + 1 < n && out[i + 1] === '"') {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      for (let k = start; k < i; k++) {
        out[k] = " ";
      }
      continue;
    }
    if (c === "{") {
      const start = i;
      i++;
      while (i < n && out[i] !== "}") {
        i++;
      }
      if (i < n) {
        i++;
      }
      for (let k = start; k < i; k++) {
        out[k] = " ";
      }
      continue;
    }
    if (c === "|") {
      if (i + 2 < n && out[i + 2] === "|") {
        out[i] = " ";
        out[i + 1] = " ";
        out[i + 2] = " ";
        i += 3;
        continue;
      }
    }
    i++;
  }
  return out.join("");
}

/**
 * Walk every executable line in a document, yielding `(lineIndex, cleanText)`
 * pairs where `cleanText` has comments and string literals blanked out (same
 * column positions as the original). `%REM`-block lines are skipped entirely.
 *
 * @template T
 * @param {import("vscode").TextDocument} document
 * @param {(lineIndex: number, cleanText: string, originalText: string) => T | void} visit
 *   Return a non-undefined value to short-circuit and have the caller see it via
 *   {@link forEachExecutableLine}'s return value.
 * @returns {T | undefined}
 */
function forEachExecutableLine(document, visit) {
  let inRem = false;
  for (let i = 0; i < document.lineCount; i++) {
    const original = document.lineAt(i).text;
    if (inRem) {
      if (RE_REM_END.test(original)) {
        inRem = false;
      }
      continue;
    }
    if (RE_REM_START.test(original)) {
      inRem = true;
      continue;
    }
    const clean = stripCommentsAndStrings(original);
    const r = visit(i, clean, original);
    if (r !== undefined) {
      return r;
    }
  }
  return undefined;
}

/**
 * Find every occurrence of `name` (case-insensitive identifier match) in a
 * document, returning their character ranges. Identifier boundaries are
 * `[A-Za-z0-9_$]`.
 *
 * @param {import("vscode").TextDocument} document
 * @param {string} name identifier to search for; if empty, returns no matches.
 * @returns {{ line: number; start: number; end: number }[]}
 */
function findIdentifierOccurrences(document, name) {
  /** @type {{ line: number; start: number; end: number }[]} */
  const out = [];
  if (!name) {
    return out;
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![A-Za-z0-9_$])${escaped}(?![A-Za-z0-9_$])`, "gi");
  forEachExecutableLine(document, (i, clean) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(clean)) !== null) {
      out.push({ line: i, start: m.index, end: m.index + m[0].length });
    }
  });
  return out;
}

/**
 * Word at `position` constrained to LotusScript identifier characters
 * (`[A-Za-z_][A-Za-z0-9_$]*`). Returns `undefined` for empty matches.
 *
 * @param {import("vscode").TextDocument} document
 * @param {import("vscode").Position} position
 */
function identifierAtPosition(document, position) {
  const range = document.getWordRangeAtPosition(position, /[A-Za-z_][\w$]*/);
  if (!range) {
    return undefined;
  }
  const word = document.getText(range);
  if (!word) {
    return undefined;
  }
  return { range, word };
}

module.exports = {
  RE_REM_START,
  RE_REM_END,
  stripCommentsAndStrings,
  forEachExecutableLine,
  findIdentifierOccurrences,
  identifierAtPosition,
};
