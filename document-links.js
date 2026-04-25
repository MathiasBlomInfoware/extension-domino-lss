// @ts-check
const vscode = require("vscode");
const path = require("path");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { RE_REM_START, RE_REM_END } = require("./text-scan.js");

/**
 * Resolve a `%Include "name"` target file by trying:
 *   1) absolute path,
 *   2) relative to the current document,
 *   3) relative to each workspace folder root,
 *   4) relative to common subfolders (`Code/ScriptLibraries`, `ScriptLibraries`, `lib`, `include`).
 *
 * Falls back to the first candidate so the user gets *some* link to act on.
 *
 * @param {vscode.TextDocument} doc
 * @param {string} target raw text inside the quotes
 * @returns {Promise<vscode.Uri>}
 */
async function resolveIncludeTarget(doc, target) {
  /** @type {string[]} */
  const candidates = [];
  const cleaned = target.trim();
  if (!cleaned) return doc.uri;

  if (path.isAbsolute(cleaned)) {
    candidates.push(cleaned);
  }

  const docDir = path.dirname(doc.uri.fsPath);
  candidates.push(path.join(docDir, cleaned));

  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const f of folders) {
    candidates.push(path.join(f.uri.fsPath, cleaned));
    for (const sub of ["Code/ScriptLibraries", "ScriptLibraries", "lib", "include", "src"]) {
      candidates.push(path.join(f.uri.fsPath, sub, cleaned));
    }
  }

  const ext = path.extname(cleaned).toLowerCase();
  const withExt = ext ? candidates : candidates.flatMap((p) => [p, p + ".lss", p + ".lsa"]);

  for (const p of withExt) {
    try {
      const uri = vscode.Uri.file(p);
      await vscode.workspace.fs.stat(uri);
      return uri;
    } catch {
      /* keep trying */
    }
  }
  return vscode.Uri.file(withExt[0] ?? cleaned);
}

const URL_RE = /\bhttps?:\/\/[^\s"'<>)]+/g;

/**
 * First apostrophe comment start position outside string literals.
 * Returns -1 if no `'` line-comment marker is found.
 *
 * @param {string} line
 */
function lineCommentStart(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === '"' && line[i + 1] === '"') {
        i++;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "'") {
      return i;
    }
  }
  return -1;
}

const provider = {
  /**
   * @param {vscode.TextDocument} document
   * @returns {Promise<vscode.DocumentLink[]>}
   */
  async provideDocumentLinks(document) {
    if (!isLssDocument(document)) return [];
    /** @type {vscode.DocumentLink[]} */
    const links = [];
    let inRem = false;
    for (let i = 0; i < document.lineCount; i++) {
      const original = document.lineAt(i).text;
      if (!inRem && RE_REM_START.test(original)) {
        inRem = true;
        continue;
      }
      if (inRem) {
        if (RE_REM_END.test(original)) inRem = false;
        URL_RE.lastIndex = 0;
        let m2;
        while ((m2 = URL_RE.exec(original)) !== null) {
          const range = new vscode.Range(i, m2.index, i, m2.index + m2[0].length);
          const link = new vscode.DocumentLink(range, vscode.Uri.parse(m2[0]));
          link.tooltip = "Open URL in browser";
          links.push(link);
        }
        continue;
      }

      const inc = original.match(/^(\s*)%\s*Include\s+"([^"]+)"/i);
      if (inc) {
        const start = original.indexOf('"' + inc[2] + '"') + 1;
        const range = new vscode.Range(i, start, i, start + inc[2].length);
        const target = await resolveIncludeTarget(document, inc[2]);
        const link = new vscode.DocumentLink(range, target);
        link.tooltip = `Open include target — ${path.basename(target.fsPath)}`;
        links.push(link);
      }

      // Keep URL links to comments only (apostrophe comments and REM lines),
      // so runtime strings such as HTTP payloads do not become noisy links.
      const remLine = /^\s*Rem\b/i.test(original);
      const commentCol = lineCommentStart(original);
      const sliceStart = remLine
        ? original.search(/\S|$/)
        : commentCol >= 0
          ? commentCol
          : -1;
      if (sliceStart >= 0) {
        const commentSlice = original.slice(sliceStart);
        URL_RE.lastIndex = 0;
        let mu;
        while ((mu = URL_RE.exec(commentSlice)) !== null) {
          const col = sliceStart + mu.index;
          const range = new vscode.Range(i, col, i, col + mu[0].length);
          const link = new vscode.DocumentLink(range, vscode.Uri.parse(mu[0]));
          link.tooltip = "Open URL in browser";
          links.push(link);
        }
      }
    }
    return links;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptDocumentLinks(context) {
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(LOTUSSCRIPT_OR_LSS, provider)
  );
}

module.exports = { registerLotusScriptDocumentLinks };
