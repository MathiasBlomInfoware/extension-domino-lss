// @ts-check
const vscode = require("vscode");
const { hoverMarkdownForWord } = require("./hcl-docs.js");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { tryNotesMemberHover } = require("./notes-member-completion.js");

/**
 * @param {string} ch
 */
function isIdentChar(ch) {
  return /[\w$]/.test(ch);
}

/**
 * Parse `object.member` around the cursor without relying on
 * {@link vscode.TextDocument.getWordRangeAtPosition} (which often returns
 * nothing at end-of-line or for some language configurations).
 * @param {string} line
 * @param {number} rawCol 0-based UTF-16 column from {@link vscode.Position}
 * @returns {{ obj: string; member: string; memberStart: number; memberEnd: number } | undefined}
 */
function parseNotesDotMember(line, rawCol) {
  if (!line.length) {
    return undefined;
  }
  let c = rawCol;
  if (c < 0) {
    c = 0;
  }
  if (c >= line.length) {
    c = line.length - 1;
  }
  if (line[c] === "." && c + 1 < line.length && isIdentChar(line[c + 1])) {
    c = c + 1;
  } else if (!isIdentChar(line[c])) {
    let t = Math.min(Math.max(0, rawCol), line.length - 1);
    while (t >= 0 && !isIdentChar(line[t]) && line[t] !== ".") {
      t--;
    }
    if (t < 0) {
      return undefined;
    }
    if (line[t] === "." && t + 1 < line.length && isIdentChar(line[t + 1])) {
      c = t + 1;
    } else if (isIdentChar(line[t])) {
      c = t;
    } else {
      return undefined;
    }
  }

  let we = c + 1;
  while (we < line.length && isIdentChar(line[we])) {
    we++;
  }
  let ws = c;
  while (ws > 0 && isIdentChar(line[ws - 1])) {
    ws--;
  }
  if (ws === 0 || line[ws - 1] !== ".") {
    return undefined;
  }
  let oe = ws - 2;
  if (oe < 0 || !/\w/.test(line[oe])) {
    return undefined;
  }
  let os = oe;
  while (os > 0 && /[A-Za-z0-9_]/.test(line[os - 1])) {
    os--;
  }
  const obj = line.slice(os, oe + 1);
  const member = line.slice(ws, we);
  if (!member.length) {
    return undefined;
  }
  return { obj, member, memberStart: ws, memberEnd: we };
}

/**
 * Identifier under or near `rawCol` without using {@link vscode.TextDocument.getWordRangeAtPosition}
 * (unreliable at EOL and for some language/wordPatterns).
 * @param {string} line
 * @param {number} rawCol
 * @returns {{ start: number; end: number; word: string } | undefined}
 */
function scanIdentifierAtColumn(line, rawCol) {
  if (!line.length) {
    return undefined;
  }
  const col = Math.min(Math.max(0, rawCol), line.length - 1);
  let c = col;
  if (!/[\w$]/.test(line[c])) {
    let found = -1;
    for (let d = 1; d <= 24 && found < 0; d++) {
      const right = col + d;
      if (right < line.length && /[\w$]/.test(line[right])) {
        found = right;
        break;
      }
      const left = col - d;
      if (left >= 0 && /[\w$]/.test(line[left])) {
        found = left;
        break;
      }
    }
    if (found < 0) {
      return undefined;
    }
    c = found;
  }
  let e = c + 1;
  while (e < line.length && /[\w$]/.test(line[e])) {
    e++;
  }
  let s = c;
  while (s > 0 && /[\w$]/.test(line[s - 1])) {
    s--;
  }
  if (s >= e) {
    return undefined;
  }
  return { start: s, end: e, word: line.slice(s, e) };
}

/**
 * Word under cursor for hover; if the cursor is on `.` (or spaces after `.`),
 * resolve the member name to the right so `doc.|universalid` still hovers.
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @returns {{ word: string; wordStartCol: number; wordRange: vscode.Range } | undefined}
 */
function resolveHoverIdentifier(document, position) {
  const line = document.lineAt(position.line).text;
  const scanned = scanIdentifierAtColumn(line, position.character);
  if (!scanned) {
    return undefined;
  }
  let word = scanned.word;
  let wordStartCol = scanned.start;
  const wordRange = new vscode.Range(
    position.line,
    scanned.start,
    position.line,
    scanned.end
  );
  const dotted = word.match(/^(\w+)\.([\w$]+)$/);
  if (dotted) {
    word = dotted[2];
    wordStartCol = scanned.start + dotted[1].length + 1;
  }
  return { word, wordStartCol, wordRange };
}

/**
 * @param {vscode.ExtensionContext} context
 */
function registerHclHover(context) {
  const provider = {
    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.Position} position
     */
    provideHover(document, position) {
      if (!isLssDocument(document)) {
        return undefined;
      }
      const enabled = vscode.workspace
        .getConfiguration("domino-lss-lotusscript")
        .get("enableHclDocHover", true);
      if (!enabled) {
        return undefined;
      }

      const version =
        vscode.workspace
          .getConfiguration("domino-lss-lotusscript")
          .get("helpVersion", "14.5.0") + "";

      const lineText = document.lineAt(position.line).text;
      const fullText = document.getText();

      const dot = parseNotesDotMember(lineText, position.character);
      if (dot) {
        try {
          const memberMd = tryNotesMemberHover(
            fullText,
            lineText,
            dot.member,
            dot.memberStart,
            version
          );
          if (memberMd) {
            const memberRange = new vscode.Range(
              position.line,
              dot.memberStart,
              position.line,
              dot.memberEnd
            );
            return new vscode.Hover(memberMd, memberRange);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const fallback = new vscode.MarkdownString(
            `**LotusScript hover**\n\n_(Error building help: ${msg})_`
          );
          fallback.isTrusted = false;
          const memberRange = new vscode.Range(
            position.line,
            dot.memberStart,
            position.line,
            dot.memberEnd
          );
          return new vscode.Hover(fallback, memberRange);
        }
      }

      const resolved = resolveHoverIdentifier(document, position);
      if (!resolved) {
        return undefined;
      }
      const { word, wordStartCol, wordRange } = resolved;

      try {
        const memberMd = tryNotesMemberHover(
          fullText,
          lineText,
          word,
          wordStartCol,
          version
        );
        if (memberMd) {
          return new vscode.Hover(memberMd, wordRange);
        }

        const md = hoverMarkdownForWord(word, version);
        if (!md) {
          return undefined;
        }
        return new vscode.Hover(md, wordRange);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const fallback = new vscode.MarkdownString(
          `**LotusScript hover**\n\n_(Error building help: ${msg})_`
        );
        fallback.isTrusted = false;
        return new vscode.Hover(fallback, wordRange);
      }
    },
  };

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(LOTUSSCRIPT_OR_LSS, provider)
  );
}

module.exports = { registerHclHover };
