// @ts-check
const vscode = require("vscode");
const { notesClassTopicUrl, designerHelpMarkdownLink } = require("./hcl-docs.js");
/** @type {Record<string, Array<{ name: string; kind: string; summary: string }>>} */
const NOTES_MEMBERS = require("./data/notes-members.json");

/** Match `<name> As [New] Notes<Type>`; reused for class fields and parameter declarations. */
const VAR_AS_NOTES = /\b(\w+)\s+As\s+(?:New\s+)?(Notes\w+)/gi;

/**
 * Map identifier (lowercase) -> Notes* type from various LotusScript declarations.
 * Recognises:
 * - `Dim a As Notes…`, `Dim a As New Notes…`, `Public/Private Dim …`
 * - Multi-decl: `Dim a As NotesSession, b As NotesDatabase`
 * - Class fields: `Private db As NotesDatabase` / `Public Foo As New NotesView`
 * - Sub/Function/Property params: `Sub Foo(doc As NotesDocument, db As NotesDatabase)`
 * - `Set x = New Notes…` (assignment-by-construction)
 * @param {string} source
 */
function buildNotesVarTypeMap(source) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const lines = source.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/'.*$/, "");

    const setNew = line.match(/^\s*Set\s+(\w+)\s*=\s*New\s+(Notes\w+)\b/i);
    if (setNew) {
      map.set(setNew[1].toLowerCase(), setNew[2]);
      continue;
    }

    const params = line.match(
      /^\s*(?:Public|Private|Static)?\s*(?:Sub|Function|Property\s+(?:Get|Set|Let))\s+\w+\s*\(([^)]*)\)/i
    );
    if (params && params[1]) {
      for (const chunk of splitTopLevelParams(params[1])) {
        const pm = chunk.match(/\b(\w+)\s+As\s+(?:New\s+)?(Notes\w+)/i);
        if (pm) {
          map.set(pm[1].toLowerCase(), pm[2]);
        }
      }
      continue;
    }

    const isDecl = /^\s*(?:Public|Private|Static)?\s*(?:Dim\b|Public\b|Private\b|Static\b)/i.test(line);
    const declBody = isDecl ? line.replace(/^\s*(?:Dim|Public|Private|Static)\b/i, "") : line;
    if (!isDecl && !/\bAs\s+(?:New\s+)?Notes\w+/i.test(line)) {
      continue;
    }

    VAR_AS_NOTES.lastIndex = 0;
    let m;
    while ((m = VAR_AS_NOTES.exec(declBody)) !== null) {
      map.set(m[1].toLowerCase(), m[2]);
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
 * Per-document cache for {@link buildNotesVarTypeMap}; rebuilt on `document.version` change.
 * Keyed by `document.uri.toString()`.
 * @type {Map<string, { version: number; map: Map<string, string> }>}
 */
const VAR_TYPE_CACHE = new Map();

/**
 * @param {vscode.TextDocument} document
 */
function getNotesVarTypeMap(document) {
  const key = document.uri.toString();
  const ver = document.version;
  const hit = VAR_TYPE_CACHE.get(key);
  if (hit && hit.version === ver) {
    return hit.map;
  }
  const map = buildNotesVarTypeMap(document.getText());
  VAR_TYPE_CACHE.set(key, { version: ver, map });
  if (VAR_TYPE_CACHE.size > 64) {
    const firstKey = VAR_TYPE_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      VAR_TYPE_CACHE.delete(firstKey);
    }
  }
  return map;
}

/**
 * @param {vscode.Uri} uri
 */
function dropNotesVarTypeMapForUri(uri) {
  VAR_TYPE_CACHE.delete(uri.toString());
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
  const classUrl = notesClassTopicUrl(version, className);
  const md = new vscode.MarkdownString(
    `### ${className}.${member.name}\n\n**${member.kind}** — ${member.summary}\n\n---\n\n${designerHelpMarkdownLink(
      `HCL class reference — ${className}`,
      classUrl
    )}`
  );
  md.isTrusted = true;
  return md;
}

/**
 * Hover for `obj.Member` when `obj` is typed as Notes* and Member is in the curated list.
 * @param {vscode.TextDocument} document
 * @param {string} lineText
 * @param {string} word identifier under cursor
 * @param {number} wordStartCol 0-based column where `word` starts
 * @param {string} version
 * @returns {vscode.MarkdownString | undefined}
 */
function tryNotesMemberHover(document, lineText, word, wordStartCol, version) {
  const before = lineText.slice(0, wordStartCol);
  const m = before.match(/(\w+)\.\s*$/);
  if (!m) {
    return undefined;
  }
  const obj = m[1];
  const map = getNotesVarTypeMap(document);
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
  const classUrl = notesClassTopicUrl(version, className);
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
      `**${className}.${m.name}** · ${m.kind}\n\n${m.summary}\n\n${designerHelpMarkdownLink(
        `HCL class reference — ${className}`,
        classUrl
      )}`
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
  const map = getNotesVarTypeMap(document);
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
  getNotesVarTypeMap,
  dropNotesVarTypeMapForUri,
  tryNotesMemberCompletion,
  tryNotesMemberHover,
};
