// @ts-check
const vscode = require("vscode");
const { hoverMarkdownForWord } = require("./hcl-docs.js");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");

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

      let wordRange = document.getWordRangeAtPosition(position, /[\w$]+/);
      if (!wordRange) {
        wordRange = document.getWordRangeAtPosition(position);
      }
      if (!wordRange) {
        return undefined;
      }

      const word = document.getText(wordRange);
      try {
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
