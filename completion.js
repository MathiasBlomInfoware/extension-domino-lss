// @ts-check
const vscode = require("vscode");
const {
  BUILTIN_NAMES,
  NOTES_CLASSES,
  CHAPTER7,
  CLASSES_AZ,
  DESIGNER_PUBLICATION,
  builtinDocFile,
  notesClassDocFile,
  markdownDoc,
  markdownDesignerPublicationDoc,
  effectiveHelpVersion,
} = require("./hcl-docs.js");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { tryNotesMemberCompletion } = require("./notes-member-completion.js");
const { constantCompletionItems } = require("./notes-constants.js");

/**
 * @param {vscode.ExtensionContext} context
 */
function registerHclCompletions(context) {
  /** @type {vscode.CompletionItem[] | null} */
  let cache = null;
  /** @type {string} */
  let cacheVersion = "";
  /** @type {string} workspace folder or file path used for {@link vscode.workspace.getConfiguration} scope */
  let cacheScopeKey = "";

  /**
   * @param {vscode.Uri | undefined} resource
   */
  const rebuild = (resource) => {
    const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", resource);
    const version = effectiveHelpVersion(conf.get("helpVersion"));
    const scopeKey = resource
      ? vscode.workspace.getWorkspaceFolder(resource)?.uri.fsPath ?? resource.fsPath
      : "__default__";
    cacheScopeKey = scopeKey;
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

    const portalItem = new vscode.CompletionItem("HCL Designer help portal", vscode.CompletionItemKind.Reference);
    portalItem.detail = "Domino Designer 14.5.x documentation home (HCL)";
    portalItem.documentation = markdownDesignerPublicationDoc(
      version,
      DESIGNER_PUBLICATION.index,
      "HCL Domino Designer documentation (index)"
    );
    items.push(portalItem);

    const paneItem = new vscode.CompletionItem("HCL LotusScript Programmer's pane", vscode.CompletionItemKind.Reference);
    paneItem.detail = "Writing LotusScript in the Programmer's pane";
    paneItem.documentation = markdownDesignerPublicationDoc(
      version,
      DESIGNER_PUBLICATION.lotusScriptProgrammersPane,
      "Writing LotusScript in the Programmer's pane"
    );
    items.push(paneItem);

    const comOleItem = new vscode.CompletionItem("HCL LotusScript COM OLE classes", vscode.CompletionItemKind.Reference);
    comOleItem.detail = "LotusScript/COM/OLE classes section overview";
    comOleItem.documentation = markdownDesignerPublicationDoc(
      version,
      DESIGNER_PUBLICATION.lotusScriptComOleSection,
      "LotusScript/COM/OLE classes (overview)"
    );
    items.push(comOleItem);

    for (const c of constantCompletionItems()) {
      items.push(c);
    }

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
      const conf = vscode.workspace.getConfiguration("domino-lss-lotusscript", document.uri);
      const enabled = conf.get("enableHclDocCompletions", true);
      if (!enabled) {
        return undefined;
      }

      const version = effectiveHelpVersion(conf.get("helpVersion"));
      const scopeKey = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ?? document.uri.fsPath;
      if (!cache || cacheVersion !== version || cacheScopeKey !== scopeKey) {
        rebuild(document.uri);
      }

      const membersOnly = conf.get("membersOnlyAfterDot", true);

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
    // Trigger member completion immediately after `obj.` typing.
    vscode.languages.registerCompletionItemProvider(LOTUSSCRIPT_OR_LSS, provider, "."),
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
