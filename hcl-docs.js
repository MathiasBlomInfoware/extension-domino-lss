// @ts-check
const vscode = require("vscode");

/** Built-ins from grammar (Print …) plus common aliases */
const BUILTIN_NAMES = [
  "Print",
  "Msgbox",
  "Messagebox",
  "Inputbox",
  "CreateObject",
  "GetObject",
  "Cbool",
  "Cbyte",
  "Ccur",
  "Cdate",
  "Cdbl",
  "Cint",
  "Clng",
  "Csng",
  "Cstr",
  "Cvar",
  "Cvdate",
  "Format",
  "Ucase",
  "Lcase",
  "Trim",
  "Ltrim",
  "Rtrim",
  "Len",
  "Left",
  "Right",
  "Mid",
  "InStr",
  "Replace",
  "Split",
  "Join",
  "Array",
  "Erase",
  "Lbound",
  "Ubound",
  "Asc",
  "Chr",
  "Str",
  "Val",
  "Hex",
  "Oct",
  "Abs",
  "Int",
  "Fix",
  "Sgn",
  "Sqr",
  "Rnd",
  "Sin",
  "Cos",
  "Tan",
  "Atn",
  "Exp",
  "Log",
  "Randomize",
  "Timer",
  "Date",
  "Time",
  "Now",
  "Day",
  "Month",
  "Year",
  "Hour",
  "Minute",
  "Second",
  "Datevalue",
  "Timevalue",
  "Weekday",
  "Monthname",
  "Formatdatetime",
  "Edate",
  "Eomonth",
  "Isdate",
  "Isnumeric",
  "Isarray",
  "Isempty",
  "Isnull",
  "Typename",
  "Vartype",
  "Me",
  "GetThreadInfo",
  "Lsi_info",
  "Err",
  "Erl",
  "Error",
  "Resume",
  "Environ",
  "Shell",
  "Sleep",
  "Beep",
  "Choose",
  "IIf",
  "Switch",
  "Eof",
  "Lof",
  "FileLen",
  "Dir",
  "FreeFile",
  "Round",
  "DateAdd",
  "DateDiff",
  "DatePart",
  "DateNumber",
  "DateSerial",
  "TimeNumber",
  "TimeSerial",
  "StrComp",
  "StrToken",
  "Space",
  "String",
];

/** Frequent Domino LotusScript classes (used to seed completion entries; HCL classes A–Z is the canonical index). */
const NOTES_CLASSES = [
  "NotesACL",
  "NotesACLEntry",
  "NotesAdministrationProcess",
  "NotesAgent",
  "NotesAgentContext",
  "NotesCalendar",
  "NotesCalendarEntry",
  "NotesCalendarNotice",
  "NotesColorObject",
  "NotesDatabase",
  "NotesDateRange",
  "NotesDateTime",
  "NotesDbDirectory",
  "NotesDirectory",
  "NotesDirectoryNavigator",
  "NotesDocument",
  "NotesDocumentCollection",
  "NotesDOMParser",
  "NotesDXLExporter",
  "NotesDXLImporter",
  "NotesEmbeddedObject",
  "NotesForm",
  "NotesInternational",
  "NotesItem",
  "NotesLog",
  "NotesMimeEntity",
  "NotesMimeHeader",
  "NotesName",
  "NotesNewsletter",
  "NotesNoteCollection",
  "NotesOutline",
  "NotesOutlineEntry",
  "NotesRegistration",
  "NotesReplication",
  "NotesReplicationEntry",
  "NotesRichTextDocLink",
  "NotesRichTextItem",
  "NotesRichTextNavigator",
  "NotesRichTextParagraphStyle",
  "NotesRichTextRange",
  "NotesRichTextSection",
  "NotesRichTextStyle",
  "NotesRichTextTab",
  "NotesRichTextTable",
  "NotesSAXParser",
  "NotesSession",
  "NotesStream",
  "NotesTimer",
  "NotesUIDatabase",
  "NotesUIDocument",
  "NotesUIView",
  "NotesUIWorkspace",
  "NotesView",
  "NotesViewColumn",
  "NotesViewEntry",
  "NotesViewEntryCollection",
  "NotesViewNavigator",
  "NotesXSLTransformer",
];

const BUILTIN_DOC_OVERRIDES = {
  msgbox: "LSAZ_MESSAGEBOX_FUNCTION_AND_STATEMENT.html",
  messagebox: "LSAZ_MESSAGEBOX_FUNCTION_AND_STATEMENT.html",
  formatdatetime: "LSAZ_DATES.html",
  me: "LSAZ_CHAPTER_7_STATEMENTS_BUILTIN_FUNCTIONS_SUBS_DATA_TYPES_AND_DIRECTIVES.html",
  // GetThreadInfo and its alias Lsi_Info share the same topic (see HCL).
  lsi_info: "LSAZ_GETTHREADINFO_FUNCTION.html",
  lsiinfo: "LSAZ_GETTHREADINFO_FUNCTION.html",
  // Err, Error, Resume have function+statement variants.
  err: "LSAZ_ERR_FUNCTION_AND_STATEMENT.html",
  error: "LSAZ_ERROR_FUNCTION_AND_STATEMENT.html",
  resume: "LSAZ_RESUME_STATEMENT.html",
  // Disk/console statements (not functions).
  beep: "LSAZ_BEEP_STATEMENT.html",
  sleep: "LSAZ_SLEEP_STATEMENT.html",
};

const CHAPTER7 = "LSAZ_CHAPTER_7_STATEMENTS_BUILTIN_FUNCTIONS_SUBS_DATA_TYPES_AND_DIRECTIVES.html";
const CLASSES_AZ = "H_4_LOTUSSCRIPT_NOTES_CLASSES_REFERENCE.html";

/**
 * Paths under `https://help.hcl-software.com/dom_designer/{version}/…` (from 14.5.1 portal; verify after upgrades).
 * Use with {@link markdownDesignerPublicationDoc}.
 */
const DESIGNER_PUBLICATION = {
  index: "index.html",
  userGuide: "basic/domino_designer_basic_user_guide_and_reference.html",
  programmingOverview: "basic/H_PROGRAMMING_OVERVIEW_AND_USER_INTERFACE_CHAP.html",
  lotusScriptUiIntro: "basic/H_2_LOTUSSCRIPT_UNDERSTANDING_THE_PROGRAMMING_ENVIRONMENT.html",
  lotusScriptProgrammersPane: "basic/H_WRITING_LOTUSSCRIPT_IN_THE_PROGRAMMER_S_PANE.html",
  lotusScriptComOleSection: "basic/H_LOTUSSCRIPT_NOTES_CLASSES.html",
  /** Server-side XPages JS reference (not LotusScript). */
  xpagesJsReferenceIntro: "reference/r_wpdr_intro_c.html",
};

/** Short hover copy (English). Keys are lowercase; use for Msgbox/Messagebox via lookup. */
/** @type {Record<string, string>} */
const BUILTIN_HOVER = {
  print: "Writes values to the **current output** (client window, server log, etc., depending on context).\n\n**Example:** `Print \"x=\" ; x`",
  msgbox:
    "Shows a **modal dialog** with a message and buttons; the **function** form returns which button was pressed.\n\n**Typical:** `answer% = Msgbox(prompt, buttons + icon [, title])`\n\n**Tip:** Prefer named constants from `%Include \"lsconst.lss\"` instead of numeric literals.",
  messagebox:
    "Same as **Msgbox** (MessageBox is the canonical name in HCL docs).\n\n**Typical:** `answer% = Messagebox(prompt, buttons + icon [, title])`",
  inputbox:
    "Prompts the user in a **small dialog** and returns the entered text as a **String** (or `Inputbox$`).\n\n**Typical:** `s$ = Inputbox(prompt [, title [, default]])`",
  createobject:
    "Creates an **OLE Automation** object (`IDispatch`). Not supported on all platforms.\n\n**Typical:** `Set v = CreateObject(\"Excel.Application\")`",
  getobject:
    "Attaches to an **existing OLE** instance (class/path varies by application).",
  format:
    "Formats a **number, date/time, or string** using a format string or named format.\n\n**Typical:** `s = Format(n, \"0.00\")` / `Format(dt, \"Short Date\")`",
  formatdatetime:
    "Formats a **date/time** for display (see HCL **Dates and times** topic for details and locale behavior).",
  len: "Returns the **length** of a string in characters (not bytes, unless byte semantics apply).",
  left: "Returns the **leftmost** *n* characters of a string.",
  right: "Returns the **rightmost** *n* characters of a string.",
  mid: "Returns a **substring** starting at a position, with optional length.",
  instr: "Finds a **substring** inside a string (start position optional); returns position or 0.",
  replace: "Returns a string with **occurrences replaced** (count/locale options vary by platform).",
  split: "Splits a string into a **Variant array** using a delimiter.",
  join: "Joins an **array of strings** with a delimiter into one string.",
  trim: "Removes leading and trailing **spaces** (and related whitespace where supported).",
  ltrim: "Removes leading spaces.",
  rtrim: "Removes trailing spaces.",
  ucase: "Uppercase conversion.",
  lcase: "Lowercase conversion.",
  cstr: "Converts a value to **String**.",
  cint: "Converts to **Integer** (raises error on overflow/invalid).",
  clng: "Converts to **Long**.",
  cdbl: "Converts to **Double**.",
  cbool: "Converts to **Boolean**.",
  cbyte: "Converts to **Byte**.",
  ccur: "Converts to **Currency**.",
  cdate: "Converts to a **date/time** Variant.",
  csng: "Converts to **Single**.",
  cvar: "Converts to **Variant**.",
  cvdate: "Legacy conversion to date/time; prefer **Cdate** where appropriate.",
  asc: "Returns the **character code** for the first character.",
  chr: "Returns the character for a **code point**.",
  str: "Formats a number as a string (often with a leading space for positives).",
  val: "Parses a leading numeric portion from a string.",
  hex: "Hexadecimal string for an integer.",
  oct: "Octal string for an integer.",
  abs: "Absolute value.",
  int: "Nearest integer **toward negative infinity**.",
  fix: "Truncates fractional part **toward zero**.",
  sgn: "Sign (-1, 0, 1).",
  sqr: "Square root.",
  rnd: "Pseudo-random number (call **Randomize** once for less predictable sequences).",
  sin: "Sine (radians).",
  cos: "Cosine (radians).",
  tan: "Tangent (radians).",
  atn: "Arctangent.",
  exp: "Exponential.",
  log: "Natural logarithm.",
  randomize: "Seeds the random number generator.",
  timer: "Seconds since midnight (useful for timing).",
  date: "Current date (or assignment in some contexts).",
  time: "Current time.",
  now: "Current **date and time**.",
  day: "Day of month from a date/time value.",
  month: "Month from a date/time value.",
  year: "Year from a date/time value.",
  hour: "Hour from a date/time value.",
  minute: "Minute from a date/time value.",
  second: "Second from a date/time value.",
  datevalue: "Parses a **date** from a string into a date/time Variant.",
  timevalue: "Parses a **time** from a string into a date/time Variant.",
  weekday: "Weekday index for a date (rules depend on optional first-day-of-week argument).",
  monthname: "Localized month name from month number.",
  edate: "Adds months to a date (Excel-style helper where available).",
  eomonth: "End-of-month date offset by months (where available).",
  isdate: "True if the expression can be interpreted as a **date/time**.",
  isnumeric: "True if the expression can be interpreted as a **number**.",
  isarray: "True if the variable holds an **array**.",
  isempty: "True if **Variant** is uninitialized (distinct from Null).",
  isnull: "True if the value is **Null**.",
  typename: "Returns the **type name** string for a Variant value.",
  vartype: "Returns the **VarType** code for a Variant.",
  array: "Creates a **Variant array** (dimensions vary by call form).",
  erase: "Clears **fixed arrays** or releases **dynamic array** storage.",
  lbound: "Lower bound of an array dimension.",
  ubound: "Upper bound of an array dimension.",
  me: "Refers to the **current module instance** in script/class contexts (see language reference).",

  getthreadinfo:
    "Returns runtime info about the **current LotusScript thread**: current Sub/Function name, current line, calling proc/line, library, etc. Used in error handlers and tracing.\n\n**Typical:** `Print GetThreadInfo(LSI_THREAD_PROC) & \" line \" & GetThreadInfo(LSI_THREAD_LINE)`\n\n**Argument:** an `LSI_THREAD_*` constant — `LSI_THREAD_PROC`, `LSI_THREAD_LINE`, `LSI_THREAD_VERSION`, `LSI_THREAD_VARIANT`, `LSI_THREAD_CALLPROC`, `LSI_THREAD_CALLLINE`, `LSI_THREAD_CLASS`, `LSI_THREAD_LIBRARY`, … (defined in `lsconst.lss`).",
  lsi_info:
    "Synonym of **GetThreadInfo** kept for backwards compatibility.\n\n**Typical:** `Print Lsi_info(LSI_THREAD_PROC)`",
  err:
    "**Error number** of the most recent run-time error.\n\nUsed inside an `On Error Goto` handler. Reset by `Resume`, `Exit`, `End Sub/Function`, or by assigning `Err = 0`.",
  erl:
    "**Line number** of the most recent run-time error (0 if none).",
  error:
    "Function form: `Error([errnum])` returns the **error message string** for an error number (or the current error).\n\nStatement form: `Error errnum` raises a run-time error.",
  resume:
    "Resumes execution after an error has been handled.\n\n* `Resume` — re-execute the offending statement.\n* `Resume Next` — continue at the statement after the offending one.\n* `Resume label` — jump to a label.",
  environ:
    "Reads an **environment variable** by name (or the *n*-th `name=value` pair as a single string when given a number).",
  shell:
    "Launches an external program. Returns the **task ID** (Variant) on success.\n\n**Typical:** `Shell \"notepad.exe\", 1`",
  sleep:
    "**Pauses** the current thread for the given number of seconds.\n\n**Typical:** `Sleep 0.5`",
  beep: "Sounds the system beep.",
  choose:
    "`Choose(index, val0, val1, …)` — picks the value at *index* from the argument list (1-based).",
  iif:
    "Inline if: `IIf(condition, trueValue, falseValue)`.\n\n**Note:** all branches are evaluated; guard side-effects with a real `If`.",
  switch:
    "`Switch(c1, v1, c2, v2, …)` — returns the first *vN* whose *cN* is True. Returns Null if none match.",
  eof: "True when the file pointer is at the **end of file**. `Eof(filenum)`.",
  lof: "Length of an open file in bytes. `Lof(filenum)`.",
  filelen: "Length of a file by **path**, in bytes.",
  dir: "Returns the next file matching a pattern (`Dir(pattern[, attr])`); subsequent calls without arguments continue the iteration.",
  freefile: "Returns an unused **file number** for use with `Open`.",
  round: "Rounds a number to a given number of decimal places (banker's rounding on some platforms).",
  dateadd: "Adds an interval to a date/time (`\"d\"`, `\"m\"`, `\"yyyy\"`, `\"h\"`, `\"n\"`, `\"s\"`, …).",
  datediff: "Difference between two dates in a given interval.",
  datepart: "Extracts a part (year, quarter, month, …) from a date.",
  datenumber: "Builds a **date** from year, month, day.",
  dateserial: "Synonym of **DateNumber** (year, month, day).",
  timenumber: "Builds a **time** from hour, minute, second.",
  timeserial: "Synonym of **TimeNumber** (hour, minute, second).",
  strcomp: "Compares two strings (0/-1/1). Optional 3rd argument controls case sensitivity.",
  strtoken: "Splits a string by a delimiter and returns the *n*-th token.",
  space: "Returns a string of *n* spaces.",
  string: "Returns a string of *n* copies of a character.",
};

/** @type {Record<string, string>} */
const NOTES_HOVER = {
  notessession:
    "Root **Notes runtime** context: current user, environment, and factories for many Domino objects (constructor pattern: New NotesSession).",
  notesdatabase:
    "A **.nsf** database open in your script: documents, views, ACL, replication, and full-text search entry points.",
  notesdocument:
    "A **document** (record): items/fields, attachments, responses, and save/remove operations.",
  notesdocumentcollection:
    "A **collection of documents** (often from a search or `AllDocuments`).",
  notesview:
    "A **view or folder** design element used to read/navigate documents efficiently.",
  notesuiworkspace:
    "Front-end **UI** entry point: dialogs, workspace navigation, and current UI document helpers (not for background agents).",
  notesuidocument:
    "The **document currently open in the Notes client** UI (fields, refresh, close).",
  notesuidatabase:
    "UI wrapper around a database selection (open, icons, etc.).",
  notesuiview:
    "UI wrapper around a view/folder surface.",
  notesitem:
    "A **field/item** on a document (text, numbers, date/times, rich text, MIME, readers/authors, etc.).",
  notesrichtextitem:
    "Rich text body and embedded objects; navigate/edit with rich-text APIs.",
  notesdatetime:
    "Domino date/time helper (create/compare/adjust) used heavily in server scripts.",
  notesname:
    "Represents a **name** (canonical, abbreviated, LDAP-style) and common name operations.",
  notesdbdirectory:
    "Iterate **databases** on a server or locally (`New NotesDbDirectory`).",
  notesacl:
    "Database **ACL** entries and roles.",
  notesaclentry:
    "One ACL entry (name, level, roles, flags).",
  notesagent:
    "Design **agent** metadata and `Run` (server/client rules apply).",
  notesstream:
    "Binary/text **stream** I/O for files and attachments in many patterns.",
  noteslog:
    "Structured **logging** helper for agents and libraries.",
  notesmimeentity:
    "MIME tree access for mail/HTTP-style parts.",
};

/** @type {Record<string, string>} */
const KEYWORD_HOVER = {
  dim: "Declares **variables** or arrays (`As` type, `List`, `Public`/`Private` scope rules apply).",
  redim: "Changes **dynamic array** bounds; `Preserve` keeps existing elements when resizing.",
  set: "Assigns an **object reference** (reference types); distinct from `Let` for non-objects.",
  if: "Conditional branch; combine with **Then** / **Else** / **Elseif** / **End If**.",
  then: "Part of **If** syntax; may start the statement block on the same line.",
  else: "Alternative branch when the **If** condition is false.",
  elseif: "Extra conditional branch before **Else**.",
  endif: "Ends an **If** block (`End If`).",
  select: "Starts **Select Case** multi-way branching.",
  case: "A **Select Case** branch label or comparison list.",
  for: "Numeric **For … To … Step … Next** loop or `For Each` iteration.",
  to: "Upper bound in **For index = start To end** (inclusive).",
  step: "Optional increment/decrement in a **For** loop (default 1).",
  let: "Assigns non-object values; often implicit without the **Let** keyword.",
  preserve: "Used with **ReDim** to keep existing array elements when bounds change.",
  next: "Closes a **For** loop.",
  each: "Used in **For Each** to iterate elements/collections.",
  in: "Used in **For Each … In**.",
  while: "**While … Wend** loop (legacy style in LotusScript).",
  wend: "Ends a **While** loop.",
  do: "Starts **Do … Loop** (test at top/bottom, `Until`/`While`).",
  loop: "Ends a **Do** loop iteration.",
  until: "Loop condition for **Do … Loop Until**.",
  exit: "Exits **For/Do/Function/Sub/Property** early (`Exit For`, `Exit Do`, …).",
  sub: "Defines a **Subroutine** procedure.",
  function: "Defines a **Function** that returns a value.",
  property: "Defines **Property Get/Set/Let** members (classes/design elements).",
  get: "Used with **Property Get**.",
  end: "Ends many blocks (**End Sub**, **End Function**, **End If**, …).",
  with: "Caches an object for repeated **member access** (`With … End With`).",
  const: "Declares a **compile-time constant**.",
  public: "Module/global **visibility** (also `Option Public`).",
  private: "Restricts visibility to **module** scope (typical pattern).",
  call: "Calls a **Sub** (optional style; parentheses required when using `Call`).",
  on: "Used with **On Error** flow control.",
  error: "Used with **On Error GoTo** / **On Error Resume Next**.",
  resume: "Continues after an error handler (**Resume**, **Resume Next**, **Resume label**).",
  rem: "Line **comment** (alternative to leading apostrophe `'`).",
  option: "`Option Explicit`, `Declare`, `Public`, `Private` — compile-time module options.",
  type: "Defines a **user-defined type** (`Type … End Type`).",
  enum: "Defines named **numeric constants** (`Enum … End Enum`).",
  byval: "Parameter passed **by value**.",
  byref: "Parameter passed **by reference** (default for many types).",
  new: "Creates a **New** instance (`Dim x As New NotesSession`).",
  return: "Exits a **Function/Property Get** and returns a value (or early exit).",
  goto: "Transfers control to a **label** (sparingly; hurts readability).",
  gosub: "Classic **subroutine jump** to a label (legacy).",
};

/**
 * Build a markdown link. Parentheses in [text](url) break CommonMark — strip them from titles.
 * @param {string} text
 * @param {string} url
 */
function mdLink(text, url) {
  const safe = text.replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim();
  return `[${safe}](${url})`;
}

const DESIGNER_HELP_PREFIX = "https://help.hcl-software.com/";
const OPEN_DESIGNER_HELP_CMD = "domino-lss-lotusscript.openDesignerHelp";

/**
 * Prefer a command: link so the full URL (path + ?hl=) reaches the browser; plain https links in hovers
 * have been observed to open only the site root / index.
 * @param {string} text
 * @param {string} url
 */
function designerHelpMarkdownLink(text, url) {
  const u = String(url);
  const safe = text.replace(/[\[\]()]/g, " ").replace(/\s+/g, " ").trim();
  if (!u.startsWith(DESIGNER_HELP_PREFIX)) {
    return `[${safe}](${u})`;
  }
  const payload = encodeURIComponent(JSON.stringify([u]));
  return `[${safe}](command:${OPEN_DESIGNER_HELP_CMD}?${payload})`;
}

/**
 * Version segment for `…/dom_designer/{version}/…` URLs (e.g. from `helpVersion` or a pasted help URL).
 * @param {unknown} raw from `getConfiguration(...).get("helpVersion")` or any caller
 * @returns {string}
 */
function normalizeHelpVersion(raw) {
  let s = String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim();
  s = s.replace(/[\u00a0\u2007\u202f]/g, " ").trim();
  s = s.replace(/\s+/g, " ").trim();
  // Strip bidi / format chars that break version parsing.
  s = s.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
  try {
    s = s.normalize("NFKC");
  } catch {
    /* ignore */
  }
  // Fullwidth digits / punctuation (common when pasting from PDF or web) → ASCII
  s = s.replace(/[\uff10-\uff19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
  s = s.replace(/\uff0e/g, ".").replace(/\uff0c/g, ",");
  // Setting sometimes contains a full help URL; only the X.Y.Z segment is valid here.
  const domMatch = s.match(/\/dom_designer\/(\d+(?:\.\d+)+)\b/i);
  if (domMatch) {
    s = domMatch[1].replace(/,/g, ".").trim();
  }
  if (!s) {
    return "14.5.1";
  }
  return s;
}

/** Lowest `dom_designer/{version}/` tree this extension targets; align with `package.json` default `helpVersion`. */
const FLOOR_HELP_VERSION = "14.5.1";

/**
 * @param {string} t
 * @returns {[number, number, number] | null}
 */
function semverTriplet(t) {
  const m = String(t)
    .trim()
    .match(/^(\d+)\.(\d+)(?:\.(\d+))?\b/);
  if (!m) {
    return null;
  }
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} -1 | 0 | 1
 */
function semverCompare(a, b) {
  const A = semverTriplet(a);
  const B = semverTriplet(b);
  if (!A || !B) {
    return 0;
  }
  for (let i = 0; i < 3; i++) {
    if (A[i] < B[i]) {
      return -1;
    }
    if (A[i] > B[i]) {
      return 1;
    }
  }
  return 0;
}

/**
 * Version used in HCL URLs: same as {@link normalizeHelpVersion}, but never below {@link FLOOR_HELP_VERSION}.
 * @param {unknown} raw
 */
function effectiveHelpVersion(raw) {
  const v = normalizeHelpVersion(raw);
  if (!semverTriplet(v)) {
    return FLOOR_HELP_VERSION;
  }
  return semverCompare(v, FLOOR_HELP_VERSION) < 0 ? FLOOR_HELP_VERSION : v;
}

/**
 * @param {string} version
 * @param {string} file
 * @param {string} linkTitle
 * @param {string} [body]
 * @param {string} [topicUrlOverride] full URL for Notes class topics (includes ?hl=)
 */
function hoverMarkdown(version, file, linkTitle, body, topicUrlOverride) {
  const v = effectiveHelpVersion(version);
  const url =
    typeof topicUrlOverride === "string" && topicUrlOverride.length > 0
      ? topicUrlOverride
      : basicBase(v) + file;
  const parts = [];
  if (body && body.trim()) {
    parts.push(body.trim());
    parts.push("---");
  }
  parts.push(designerHelpMarkdownLink(linkTitle, url));
  parts.push(`HCL Domino Designer · help tree **${v}**`);
  parts.push("_Opens the topic in your browser._");
  const md = new vscode.MarkdownString(parts.join("\n\n"));
  md.isTrusted = true;
  return md;
}

/** Common LotusScript keywords → language reference index */
const KEYWORD_DOC = new Set([
  "if",
  "then",
  "else",
  "elseif",
  "endif",
  "select",
  "case",
  "end",
  "for",
  "to",
  "step",
  "next",
  "each",
  "in",
  "while",
  "wend",
  "do",
  "loop",
  "until",
  "exit",
  "goto",
  "gosub",
  "return",
  "dim",
  "redim",
  "preserve",
  "set",
  "let",
  "const",
  "sub",
  "function",
  "property",
  "get",
  "with",
  "option",
  "public",
  "private",
  "type",
  "enum",
  "byval",
  "byref",
  "new",
  "call",
  "on",
  "error",
  "resume",
  "rem",
]);

/**
 * @param {unknown} version
 */
function basicBase(version) {
  const v = effectiveHelpVersion(version);
  return `https://help.hcl-software.com/dom_designer/${v}/basic/`;
}

/**
 * @param {string} name
 */
function builtinDocFile(name) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (BUILTIN_DOC_OVERRIDES[key]) {
    return BUILTIN_DOC_OVERRIDES[key];
  }
  const compact = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `LSAZ_${compact}_FUNCTION.html`;
}

/**
 * @param {string} className
 */
function notesClassDocFile(className) {
  const tail = className.startsWith("Notes") ? className.slice(5) : className;
  const upper = tail.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `H_NOTES${upper}_CLASS.html`;
}

/**
 * Full HCL URL for a Notes* class topic (Designer uses ?hl= lowercase class name).
 * @param {unknown} version
 * @param {string} className e.g. NotesSession
 */
function notesClassTopicUrl(version, className) {
  const file = notesClassDocFile(className);
  const hl = encodeURIComponent(className.toLowerCase());
  return `${basicBase(version)}${file}?hl=${hl}`;
}

/**
 * Any topic under `dom_designer/{version}/` (e.g. `index.html`, `basic/…`, `reference/…`).
 * @param {unknown} version
 * @param {string} pathUnderVersion no leading slash
 */
function designerPublicationUrl(version, pathUnderVersion) {
  const v = effectiveHelpVersion(version);
  const tail = String(pathUnderVersion).replace(/^\/+/, "");
  return `https://help.hcl-software.com/dom_designer/${v}/${tail}`;
}

/**
 * Like {@link markdownDoc} but for URLs outside the `basic/` root only (use `basic/…` in `pathUnderVersion`).
 * @param {unknown} version
 * @param {string} pathUnderVersion e.g. {@link DESIGNER_PUBLICATION.index}
 * @param {string} title
 */
function markdownDesignerPublicationDoc(version, pathUnderVersion, title) {
  const url = designerPublicationUrl(version, pathUnderVersion);
  const md = new vscode.MarkdownString(
    `**HCL Domino Designer help**\n\n${designerHelpMarkdownLink(title, url)}\n\n*(Opens in your browser.)*`
  );
  md.isTrusted = true;
  return md;
}

/**
 * @param {string} version
 * @param {string} file
 * @param {string} title
 * @param {string} [notesClassName] when set, use Notes class URL with ?hl=
 */
function markdownDoc(version, file, title, notesClassName) {
  const url = notesClassName ? notesClassTopicUrl(version, notesClassName) : basicBase(version) + file;
  const md = new vscode.MarkdownString(
    `**HCL Domino Designer help**\n\n${designerHelpMarkdownLink(title, url)}\n\n*(Opens in your browser.)*`
  );
  md.isTrusted = true;
  return md;
}

/**
 * @param {string} word identifier under cursor
 * @param {string} version help version e.g. 14.5.1
 * @returns {vscode.MarkdownString | undefined}
 */
function hoverMarkdownForWord(word, version) {
  const v = effectiveHelpVersion(version);
  const raw = word.replace(/\$/g, "").trim();
  if (!raw) {
    return undefined;
  }

  const lower = raw.toLowerCase();

  const builtinHit = BUILTIN_NAMES.find((n) => n.toLowerCase() === lower);
  if (builtinHit) {
    const file = builtinDocFile(builtinHit);
    const lk = builtinHit.toLowerCase();
    const detailKey = lk === "messagebox" ? "msgbox" : lk;
    const body =
      BUILTIN_HOVER[detailKey] ||
      `LotusScript built-in **${builtinHit}()**. See the HCL topic for full signature, return type, and errors.`;
    return hoverMarkdown(
      v,
      file,
      `Open ${builtinHit} in HCL help`,
      `### ${builtinHit}\n\n${body}`
    );
  }

  if (/^notes/i.test(raw)) {
    const cls = raw.replace(/[^A-Za-z0-9_]/g, "");
    if (cls.length >= 6) {
      const file = notesClassDocFile(cls);
      const clsKey = cls.toLowerCase();
      const body =
        NOTES_HOVER[clsKey] ||
        `Domino **${cls}** class from the Notes back-end or UI library. See the class topic for constructors, properties, and methods.`;
      // Avoid nested [text](url) inside the body: some VS Code builds render that as an empty hover.
      const azUrl = basicBase(v) + CLASSES_AZ;
      const bodyPlus =
        body +
        "\n\n**Also see:** " +
        designerHelpMarkdownLink("Notes classes A-Z", azUrl);
      const classTopicUrl = notesClassTopicUrl(v, cls);
      return hoverMarkdown(
        v,
        file,
        `Open ${cls} in HCL help`,
        `### ${cls}\n\n${bodyPlus}`,
        classTopicUrl
      );
    }
  }

  if (KEYWORD_DOC.has(lower)) {
    const kwBody =
      KEYWORD_HOVER[lower] ||
      `LotusScript keyword **${raw}**. See the language reference for grammar and related statements.`;
    return hoverMarkdown(
      v,
      CHAPTER7,
      "Open LotusScript language reference in HCL help",
      `### ${raw}\n\n${kwBody}`
    );
  }

  return undefined;
}

module.exports = {
  BUILTIN_NAMES,
  NOTES_CLASSES,
  CHAPTER7,
  CLASSES_AZ,
  DESIGNER_PUBLICATION,
  designerPublicationUrl,
  markdownDesignerPublicationDoc,
  basicBase,
  builtinDocFile,
  notesClassDocFile,
  notesClassTopicUrl,
  designerHelpMarkdownLink,
  markdownDoc,
  hoverMarkdownForWord,
  normalizeHelpVersion,
  effectiveHelpVersion,
};
