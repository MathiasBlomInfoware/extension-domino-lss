// @ts-check
const vscode = require("vscode");
const { LOTUSSCRIPT_OR_LSS, isLssDocument } = require("./document-selectors.js");
const { getNotesVarTypeMap } = require("./notes-member-completion.js");
/** @type {Record<string, Record<string, { signature: string; params: { label: string; doc?: string }[]; returns?: string }>>} */
const SIGS = require("./data/notes-signatures.json");

/**
 * @param {string} className
 * @param {string} memberName
 */
function lookupSignature(className, memberName) {
  const cls = SIGS[className];
  if (!cls) {
    return undefined;
  }
  const wantLower = memberName.toLowerCase();
  for (const key of Object.keys(cls)) {
    if (key.toLowerCase() === wantLower) {
      return { className, memberName: key, def: cls[key] };
    }
  }
  return undefined;
}

/**
 * Walk back from `before` (text on the line up to the cursor) to find the call
 * we are inside: returns `{ obj, member, argIndex }` if cursor is inside
 * `obj.Member( … |`. Bails on unmatched closers / strings.
 *
 * @param {string} before
 */
function parseCallContext(before) {
  let depth = 0;
  let argIndex = 0;
  let inString = false;
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];
    if (inString) {
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === ")" || ch === "]") {
      depth++;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) {
        const head = before.slice(0, i);
        const m = head.match(/(\w+)\s*\.\s*(\w+)\s*$/);
        if (!m) {
          return undefined;
        }
        return { obj: m[1], member: m[2], argIndex, openParenCol: i };
      }
      depth--;
      continue;
    }
    if (ch === "[") {
      if (depth > 0) {
        depth--;
      }
      continue;
    }
    if (ch === "," && depth === 0) {
      argIndex++;
    }
  }
  return undefined;
}

const provider = {
  /**
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   */
  provideSignatureHelp(document, position) {
    if (!isLssDocument(document)) {
      return undefined;
    }
    const line = document.lineAt(position.line).text;
    const before = line.slice(0, position.character);

    const ctx = parseCallContext(before);
    if (!ctx) {
      return undefined;
    }

    const map = getNotesVarTypeMap(document);
    const notesType = map.get(ctx.obj.toLowerCase());
    if (!notesType) {
      return undefined;
    }

    const hit = lookupSignature(notesType, ctx.member);
    if (!hit) {
      return undefined;
    }

    const help = new vscode.SignatureHelp();
    const sig = new vscode.SignatureInformation(
      `${notesType}.${hit.def.signature}`
    );
    const params = hit.def.params || [];
    sig.parameters = params.map(
      (p) => new vscode.ParameterInformation(p.label, p.doc ? new vscode.MarkdownString(p.doc) : undefined)
    );
    const returnLine = hit.def.returns ? `\n\n**Returns:** ${hit.def.returns}` : "";
    sig.documentation = new vscode.MarkdownString(
      `Domino LotusScript signature for **${notesType}.${hit.memberName}**.${returnLine}`
    );
    help.signatures = [sig];
    help.activeSignature = 0;
    help.activeParameter = Math.min(ctx.argIndex, Math.max(0, params.length - 1));
    return help;
  },
};

/** @param {vscode.ExtensionContext} context */
function registerLotusScriptSignatureHelp(context) {
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(LOTUSSCRIPT_OR_LSS, provider, "(", ",")
  );
}

module.exports = { registerLotusScriptSignatureHelp, parseCallContext };
