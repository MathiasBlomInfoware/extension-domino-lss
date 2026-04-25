// @ts-check
const vscode = require("vscode");
/** @type {Record<string, Record<string, { value: any; summary?: string }>>} */
const RAW = require("./data/notes-constants.json");

/** Flat lookup: NAME -> { value, group, summary } */
const FLAT = (() => {
  /** @type {Map<string, { value: any; group: string; summary?: string }>} */
  const m = new Map();
  for (const [group, entries] of Object.entries(RAW)) {
    for (const [name, def] of Object.entries(entries)) {
      m.set(name, { value: def.value, group, summary: def.summary });
    }
  }
  return m;
})();

/** @param {string} name */
function lookupConstant(name) {
  return FLAT.get(name);
}

/** @returns {vscode.CompletionItem[]} */
function constantCompletionItems() {
  /** @type {vscode.CompletionItem[]} */
  const items = [];
  for (const [name, def] of FLAT.entries()) {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Constant);
    item.detail = `${def.group} (LotusScript constant) = ${formatValue(def.value)}`;
    const md = new vscode.MarkdownString(
      `**${name}** = \`${formatValue(def.value)}\`` +
        (def.summary ? `\n\n${def.summary}` : "") +
        `\n\n*${def.group}*`
    );
    md.isTrusted = false;
    item.documentation = md;
    item.sortText = `~~${name.toLowerCase()}`; // sink below user identifiers
    items.push(item);
  }
  return items;
}

/** @param {string} word @returns {vscode.MarkdownString | undefined} */
function constantHoverMarkdown(word) {
  const def = lookupConstant(word);
  if (!def) {
    return undefined;
  }
  const md = new vscode.MarkdownString(
    `### ${word}\n\nDomino LotusScript constant — **${def.group}**` +
      `\n\n\`\`\`\n${word} = ${formatValue(def.value)}\n\`\`\`` +
      (def.summary ? `\n\n${def.summary}` : "")
  );
  md.isTrusted = false;
  return md;
}

function formatValue(v) {
  if (typeof v === "string") return v;
  return String(v);
}

/**
 * HCL topic listing lsconst.lss constants (Domino LotusScript).
 * @param {string} versionSegment e.g. `14.5.1`
 */
function constantHelpListUrl(versionSegment) {
  const v = String(versionSegment || "14.5.1").trim() || "14.5.1";
  return `https://help.hcl-software.com/dom_designer/${v}/basic/LSAZ_LIST_OF_CONSTANTS_LSCONST_LSS.html`;
}

module.exports = {
  lookupConstant,
  constantHoverMarkdown,
  constantCompletionItems,
  constantHelpListUrl,
  FLAT,
};
