// @ts-check
const vscode = require("vscode");
const { basicBase, notesClassDocFile } = require("./hcl-docs.js");
/** @type {Record<string, Array<{ name: string; kind: string; summary: string }>>} */
const NOTES_MEMBERS = require("./data/notes-members.json");

/**
 * Map identifier (lowercase) -> Notes* type from Dim and simple parameter lists.
 * @param {string} source
 */
function buildNotesVarTypeMap(source) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const lines = source.split(/\r?\n/);

  for (const line of lines) {
    let m = line.match(/^\s*(?:Public|Private)?\s*Dim\s+(\w+)\s+As\s+New\s+(Notes\w+)/i);
    if (m) {
      map.set(m[1].toLowerCase(), m[2]);
      continue;
    }
    m = line.match(/^\s*(?:Public|Private)?\s*Dim\s+(\w+)\s+As\s+(Notes\w+)/i);
    if (m) {
      map.set(m[1].toLowerCase(), m[2]);
      continue;
    }

    m = line.match(
      /^\s*(?:Public|Private)?\s*(?:Sub|Function|Property\s+(?:Get|Set))\s+\w+\s*\(([^)]*)\)/i
    );
    if (m && m[1]) {
      for (const chunk of splitTopLevelParams(m[1])) {
        const pm = chunk.match(/\b(\w+)\s+As\s+(Notes\w+)/i);
        if (pm) {
          map.set(pm[1].toLowerCase(), pm[2]);
        }
      }
    }
  }

  return map;
}

/**
 * @param {string} paramList
 */
function splitTopLevelParams(paramList) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < paramList.length; i++) {
    const c = paramList[i];
    if (c === "(") {
      depth++;
    } else if (c === ")") {
      depth--;
    }
    if (c === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim()) {
    out.push(cur.trim());
  }
  return out;
}

/**
 * @param {string} version
 * @param {string} className
 * @param {string} filterLower prefix after dot, lowercase
 */
/**
 * @param {string} version
 * @param {string} className
 * @param {{ name: string; kind: string; summary: string }} member
 */
function memberHoverMarkdown(version, className, member) {
  const classUrl = basicBase(version) + notesClassDocFile(className);
  const md = new vscode.MarkdownString(
    `### ${className}.${member.name}\n\n**${member.kind}** — ${member.summary}\n\n---\n\n[HCL class reference — ${className}](${classUrl})`
  );
  md.isTrusted = true;
  return md;
}

/**
 * Hover for `obj.Member` when `obj` is typed as Notes* and Member is in the curated list.
 * @param {string} fullText
 * @param {string} lineText
 * @param {string} word identifier under cursor
 * @param {number} wordStartCol 0-based column where `word` starts
 * @param {string} version
 * @returns {vscode.MarkdownString | undefined}
 */
function tryNotesMemberHover(fullText, lineText, word, wordStartCol, version) {
  const before = lineText.slice(0, wordStartCol);
  const m = before.match(/(\w+)\.\s*$/);
  if (!m) {
    return undefined;
  }
  const obj = m[1];
  const map = buildNotesVarTypeMap(fullText);
  const notesType = map.get(obj.toLowerCase());
  if (!notesType || !NOTES_MEMBERS[notesType]) {
    return undefined;
  }
  const w = word.replace(/\$/g, "").trim();
  const member = NOTES_MEMBERS[notesType].find((x) => x.name.toLowerCase() === w.toLowerCase());
  if (!member) {
    return undefined;
  }
  return memberHoverMarkdown(version, notesType, member);
}

function memberCompletionItems(version, className, filterLower) {
  const list = NOTES_MEMBERS[className];
  if (!list) {
    return [];
  }
  const classUrl = basicBase(version) + notesClassDocFile(className);
  /** @type {vscode.CompletionItem[]} */
  const items = [];
  for (const m of list) {
    const nl = m.name.toLowerCase();
    if (filterLower && !nl.startsWith(filterLower)) {
      continue;
    }
    const kind =
      m.kind === "method" ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Property;
    const it = new vscode.CompletionItem(m.name, kind);
    it.detail = `${className}.${m.name} (${m.kind}, HCL LotusScript)`;
    const doc = new vscode.MarkdownString(
      `**${className}.${m.name}** · ${m.kind}\n\n${m.summary}\n\n[HCL class reference — ${className}](${classUrl})`
    );
    doc.isTrusted = true;
    it.documentation = doc;
    it.sortText = m.name.toLowerCase();
    items.push(it);
  }
  return items;
}

/**
 * If cursor is after `obj.` or `obj.partial`, return member completions or empty when filtered-only mode.
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @param {string} version
 * @param {boolean} membersOnlyWhenDot suppress non-member suggestions after any `id.`
 */
function tryNotesMemberCompletion(document, position, version, membersOnlyWhenDot) {
  const line = document.lineAt(position.line).text;
  const before = line.slice(0, position.character);
  const dot = before.match(/(\w+)\.(\w*)$/);
  if (!dot) {
    return undefined;
  }

  const obj = dot[1];
  const partial = (dot[2] || "").toLowerCase();
  const map = buildNotesVarTypeMap(document.getText());
  const notesType = map.get(obj.toLowerCase());
  if (notesType) {
    if (NOTES_MEMBERS[notesType]) {
      return memberCompletionItems(version, notesType, partial);
    }
    if (membersOnlyWhenDot) {
      return [];
    }
    return undefined;
  }

  if (membersOnlyWhenDot) {
    return [];
  }
  return undefined;
}

module.exports = {
  NOTES_MEMBERS,
  buildNotesVarTypeMap,
  tryNotesMemberCompletion,
  tryNotesMemberHover,
};
