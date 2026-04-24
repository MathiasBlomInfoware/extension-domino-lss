// @ts-check

/** Match LotusScript language id or any .lss file (e.g. Plain Text until associations apply). */
/** @type {import("vscode").DocumentSelector} */
const LOTUSSCRIPT_OR_LSS = [
  { language: "lotusscript" },
  { scheme: "file", pattern: "**/*.lss" },
  { scheme: "untitled", pattern: "**/*.lss" },
  // Any scheme (e.g. remote) when the path ends with .lss
  { pattern: "**/*.lss" },
];

/**
 * @param {import("vscode").TextDocument} doc
 */
function isLssDocument(doc) {
  if (doc.languageId === "lotusscript") {
    return true;
  }
  const p = (doc.uri.fsPath || doc.uri.path || "").toLowerCase();
  if (p.endsWith(".lss")) {
    return true;
  }
  // Fallback: some hosts only expose a basename (e.g. untitled / virtual).
  const fn = typeof doc.fileName === "string" ? doc.fileName.toLowerCase() : "";
  return fn.endsWith(".lss");
}

module.exports = { LOTUSSCRIPT_OR_LSS, isLssDocument };
