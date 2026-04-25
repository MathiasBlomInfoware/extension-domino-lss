// @ts-check
const vscode = require("vscode");
const {
  BUILTIN_NAMES,
  NOTES_CLASSES,
  CHAPTER7,
  CLASSES_AZ,
  basicBase,
  builtinDocFile,
  notesClassDocFile,
  markdownDoc,
  normalizeHelpVersion,
} = require("./hcl-docs.js");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { tryNotesMemberCompletion } = require("./notes-member-completion.js");

/**
 * @param {vscode.ExtensionContext} context
 */
function registerHclCompletions(context) {
  /** @type {vscode.CompletionItem[] | null} */
  let cache = null;
  /** @type {string} */
  let cacheVersion = "";

  const rebuild = () => {
    const version = normalizeHelpVersion(
      vscode.workspace.getConfiguration("domino-lss-lotusscript").get("helpVersion")
    );
    const base = basicBase(version);
    /** @type {vscode.CompletionItem[]} */
    const items = [];

    for (const name of BUILTIN_NAMES) {
      const file = builtinDocFile(name);
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
      item.detail = "LotusScript built-in (HCL)";
      item.documentation = markdownDoc(version, file, `${name} — LotusScript language reference`);
      items.push(item);
    }

    for (const cls of NOTES_CLASSES) {
      const file = notesClassDocFile(cls);
      const item = new vscode.CompletionItem(cls, vscode.CompletionItemKind.Class);
      item.detail = "Domino LotusScript class (HCL)";
      item.documentation = markdownDoc(
        version,
        file,
        `${cls} — LotusScript class reference`,
        cls
      );
      items.push(item);
    }

    const indexItem = new vscode.CompletionItem("HCL LotusScript A–Z", vscode.CompletionItemKind.Reference);
    indexItem.detail = "Open language reference index";
    indexItem.documentation = markdownDoc(version, CHAPTER7, "LotusScript language reference (chapter index)");
    items.push(indexItem);

    const classesItem = new vscode.CompletionItem("HCL Notes classes A–Z", vscode.CompletionItemKind.Reference);
    classesItem.detail = "Open Notes class library index";
    classesItem.documentation = markdownDoc(version, CLASSES_AZ, "LotusScript Notes classes A–Z");
    items.push(classesItem);

    cache = items;
    cacheVersion = version;
  };

  const provider = {
    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.Position} position
     */
    provideCompletionItems(document, position) {
      if (!isLssDocument(document)) {
        return undefined;
      }
      const enabled = vscode.workspace
        .getConfiguration("domino-lss-lotusscript")
        .get("enableHclDocCompletions", true);
      if (!enabled) {
        return undefined;
      }

      const version = normalizeHelpVersion(
        vscode.workspace.getConfiguration("domino-lss-lotusscript").get("helpVersion")
      );
      if (!cache || cacheVersion !== version) {
        rebuild();
      }

      const membersOnly = vscode.workspace
        .getConfiguration("domino-lss-lotusscript")
        .get("membersOnlyAfterDot", true);

      const memberItems = tryNotesMemberCompletion(document, position, version, membersOnly);
      if (memberItems !== undefined) {
        return new vscode.CompletionList(memberItems, false);
      }

      const wordRange = document.getWordRangeAtPosition(position, /[\w$]+/);
      const prefix = wordRange
        ? document.getText(wordRange).replace(/\$/g, "").toLowerCase()
        : "";

      if (!prefix) {
        return cache;
      }

      return (
        cache &&
        cache.filter((it) => {
          const l = it.label.toString().toLowerCase();
          return l.startsWith(prefix);
        })
      );
    },
  };

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(LOTUSSCRIPT_OR_LSS, provider),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("domino-lss-lotusscript.helpVersion") ||
        e.affectsConfiguration("domino-lss-lotusscript.enableHclDocCompletions")
      ) {
        cache = null;
      }
    })
  );
}

module.exports = { registerHclCompletions };
