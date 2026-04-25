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
  "MkDir",
  "RmDir",
  "ChDir",
  "ChDrive",
  "Kill",
  "FileCopy",
  "CurDir",
  "GetFileAttr",
  "SetFileAttr",
  "FileDateTime",
  "Open",
  "Close",
  "Get",
  "Put",
  "Seek",
  "Loc",
  "Lock",
  "Unlock",
  "Reset",
  "Width",
  "Spc",
  "Tab",
  "Input",
  "LineInput",
  "Name",
  "Bin",
  "IsObject",
  "IsScalar",
  "IsList",
  "IsResponse",
  "Yield",
  "Stop",
  "Nothing",
  "Pi",
  "True",
  "False",
  "Null",
  "Empty",
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
  // File / directory statements.
  mkdir: "LSAZ_MKDIR_STATEMENT.html",
  rmdir: "LSAZ_RMDIR_STATEMENT.html",
  chdir: "LSAZ_CHDIR_STATEMENT.html",
  chdrive: "LSAZ_CHDRIVE_STATEMENT.html",
  kill: "LSAZ_KILL_STATEMENT.html",
  filecopy: "LSAZ_FILECOPY_STATEMENT.html",
  setfileattr: "LSAZ_SETFILEATTR_STATEMENT.html",
  open: "LSAZ_OPEN_STATEMENT.html",
  close: "LSAZ_CLOSE_STATEMENT.html",
  get: "LSAZ_GET_STATEMENT.html",
  put: "LSAZ_PUT_STATEMENT.html",
  seek: "LSAZ_SEEK_STATEMENT_AND_FUNCTION.html",
  loc: "LSAZ_LOC_FUNCTION.html",
  lock: "LSAZ_LOCK_AND_UNLOCK_STATEMENTS.html",
  unlock: "LSAZ_LOCK_AND_UNLOCK_STATEMENTS.html",
  reset: "LSAZ_RESET_STATEMENT.html",
  width: "LSAZ_WIDTH_STATEMENT.html",
  spc: "LSAZ_SPC_FUNCTION.html",
  tab: "LSAZ_TAB_FUNCTION.html",
  input: "LSAZ_INPUT_STATEMENT.html",
  lineinput: "LSAZ_LINE_INPUT_STATEMENT.html",
  name: "LSAZ_NAME_STATEMENT.html",
  bin: "LSAZ_BIN_FUNCTION.html",
  isobject: "LSAZ_ISOBJECT_FUNCTION.html",
  isscalar: "LSAZ_ISSCALAR_FUNCTION.html",
  islist: "LSAZ_ISLIST_FUNCTION.html",
  isresponse: "LSAZ_ISRESPONSE_FUNCTION.html",
  yield: "LSAZ_YIELD_FUNCTION_AND_STATEMENT.html",
  stop: "LSAZ_STOP_STATEMENT.html",
  nothing: "LSAZ_NOTHING_VALUE.html",
  pi: "LSAZ_PI_VALUE.html",
  true: "LSAZ_TRUE_FALSE_VALUES.html",
  false: "LSAZ_TRUE_FALSE_VALUES.html",
  null: "LSAZ_NULL_VALUE.html",
  empty: "LSAZ_EMPTY_VALUE.html",
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

  mkdir:
    "**Creates a directory.**\n\n**Syntax:** `MkDir path`\n\n* `path` is a `String` (drive letter optional — defaults to current drive; relative paths allowed).\n* Raises a runtime error if the directory cannot be created (e.g. it already exists or the parent is missing).\n* Often paired with `Dir$(path, ATTR_DIRECTORY) = \"\"` as an existence guard.",
  rmdir:
    "**Removes a directory** (must be empty).\n\n**Syntax:** `RmDir path`\n\nUse `Kill` to delete files first if needed.",
  chdir:
    "Changes the **current directory** on the current (or given) drive.\n\n**Syntax:** `ChDir path`",
  chdrive:
    "Changes the **current drive** (Windows).\n\n**Syntax:** `ChDrive drive$` — uses the first character of `drive$`.",
  kill:
    "**Deletes one or more files** matching a path pattern.\n\n**Syntax:** `Kill pathPattern`\n\nWildcards (`*`, `?`) are supported on most platforms. Errors if no file matches.",
  filecopy:
    "Copies a file.\n\n**Syntax:** `FileCopy source, destination`\n\n*source* and *destination* are strings. Overwrites *destination* if it already exists.",
  curdir:
    "Returns the **current directory** for a drive (current drive if omitted).\n\n**Typical:** `s$ = CurDir$()` or `CurDir$(\"D\")`.",
  getfileattr:
    "Returns the **attribute bits** of a file or directory.\n\n**Typical:** `If (GetFileAttr(path) And ATTR_DIRECTORY) Then …`\n\nCombine via bitwise `And` with `ATTR_NORMAL`, `ATTR_READ_ONLY`, `ATTR_HIDDEN`, `ATTR_SYSTEM`, `ATTR_VOLUME`, `ATTR_DIRECTORY`, `ATTR_ARCHIVE`.",
  setfileattr:
    "**Sets the attribute bits** of a file.\n\n**Syntax:** `SetFileAttr path, attributes` — combine constants with `Or` (e.g. `ATTR_HIDDEN Or ATTR_READ_ONLY`).",
  filedatetime:
    "Returns the **last-modified date/time** of a file as a Variant.\n\n**Typical:** `dt = FileDateTime(path)`",

  open:
    "**Opens a file** and assigns it a file number.\n\n" +
    "**Syntax:** `Open path For mode [Access access] [lock] As [#]filenumber [Len = recordLen]`\n\n" +
    "* **mode**: `Input`, `Output`, `Append`, `Random` (default), `Binary`.\n" +
    "* **access**: `Read`, `Write`, `Read Write`.\n" +
    "* **lock**: `Shared`, `Lock Read`, `Lock Write`, `Lock Read Write`.\n" +
    "* Use `FreeFile` to obtain an unused number; `Close [#filenumber]` to release.",
  close:
    "Closes one or more open files.\n\n**Syntax:** `Close [#fileNumber [, #fileNumber] …]` — without arguments, closes **all** open files.",
  get:
    "Reads from a `Random` or `Binary` file into a variable.\n\n**Syntax:** `Get [#]fileNumber, [recordNumber], variable`",
  put:
    "Writes a variable to a `Random` or `Binary` file.\n\n**Syntax:** `Put [#]fileNumber, [recordNumber], variable`",
  seek:
    "Sets (statement) or returns (function) the **current byte/record position** of an open file.\n\n**Syntax:** `Seek [#]fileNumber, position` / `Seek(fileNumber)`",
  loc:
    "Returns the **current record/byte offset** of an open file.\n\n**Typical:** `n& = Loc(fileNumber)`",
  lock:
    "**Locks** a region of an open file from concurrent reads/writes by other processes.\n\n**Syntax:** `Lock [#]fileNumber [, recordRange]` — pair with `Unlock`.",
  unlock:
    "**Unlocks** a region previously locked with `Lock`.\n\n**Syntax:** `Unlock [#]fileNumber [, recordRange]`",
  reset:
    "**Closes all open files** and writes their buffers to disk.",
  width:
    "Sets the **line width** for `Print #` output on an open file.\n\n**Syntax:** `Width #fileNumber, columns%`",
  spc:
    "In a `Print` list, inserts *n* **spaces**.\n\n**Typical:** `Print \"name\"; Spc(4); value`",
  tab:
    "In a `Print` list, advances to **column** *n* (1-based).\n\n**Typical:** `Print \"name\"; Tab(20); value`",
  input:
    "Reads *n* characters from a sequential file or input source.\n\n**Function form:** `Input(n, fileNumber)` returns a `String`.\n\nAlso the **statement** `Input #f, var1, var2, …` for comma-delimited reads.",
  lineinput:
    "Reads **one line** from a sequential file (or `Input #` source) into a String, stopping at CR/LF.\n\n**Syntax:** `Line Input [#]fileNumber, stringVar$`",
  name:
    "**Renames or moves** a file.\n\n**Syntax:** `Name oldPath As newPath`",
  bin:
    "Returns the **binary** (base-2) representation of an integer as a string. Often `Bin$()`.",
  isobject:
    "True if the variable is an **object reference** (including `Nothing`).",
  isscalar:
    "True if the value is a **scalar** (not array, list, object).",
  islist:
    "True if the variable was declared as a **List**.",
  isresponse:
    "True if a `NotesDocument` is a **response** document (Domino-specific).",
  yield:
    "**Function** form returns a Boolean indicating whether the user pressed Ctrl+Break since the last call.\n\n**Statement** form: `Yield` — releases the CPU briefly so the OS can process events (useful in long agent loops).",
  stop:
    "Stops execution and **enters the debugger** (when one is attached). Otherwise behaves like `End`.",
  nothing:
    "**Object null** literal. Assigned to an object reference to release it.\n\n**Typical:** `Set doc = Nothing` / `If session Is Nothing Then …`",
  pi:
    "Mathematical **π** (≈ 3.14159265358979). Use directly in expressions: `circ# = 2 * Pi * r#`.",
  true:
    "Boolean **True** (numeric value `-1`). Result of comparison and logical operators.",
  false:
    "Boolean **False** (numeric value `0`). Result of comparison and logical operators.",
  null:
    "Variant value representing **'no valid data'**. Test with `IsNull(v)`. Distinct from `Empty`, `Nothing`, and zero-length `\"\"`.",
  empty:
    "Variant value for an **uninitialized** Variant. Test with `IsEmpty(v)`. Distinct from `Null`.",
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

/**
 * LotusScript scalar / aggregate data types. Keys are lowercase; values are
 * `{ canonical, file, body }` where `file` is the topic under
 * `…/dom_designer/{version}/basic/`. Use {@link typeHoverMarkdown}.
 *
 * @type {Record<string, { canonical: string; file: string; body: string }>}
 */
const TYPE_HOVER = {
  boolean: {
    canonical: "Boolean",
    file: "LSAZ_BOOLEAN_DATA_TYPE.html",
    body:
      "Holds **True (-1) / False (0)** only. Stored as a 16-bit (2-byte) integer.\n\n" +
      "* **Initial value:** `False`\n" +
      "* **No type-suffix character.**\n" +
      "* Numeric→Boolean: `0` becomes `False`, anything else `True`. Boolean→Numeric: `True`→`-1`, `False`→`0`.\n" +
      "* `Print` shows `True` / `False`; `Write #` shows `#TRUE#` / `#FALSE#`.\n\n" +
      "_New in Domino R6._",
  },
  byte: {
    canonical: "Byte",
    file: "LSAZ_BYTE_DATA_TYPE.html",
    body:
      "Unsigned 8-bit integer, **0 to 255**. 1 byte.\n\n* **Initial value:** `0`\n* **No type-suffix character.**",
  },
  integer: {
    canonical: "Integer",
    file: "LSAZ_INTEGER_DATA_TYPE.html",
    body:
      "Signed **16-bit** integer, **-32,768 to 32,767**. 2 bytes.\n\n* **Initial value:** `0`\n* **Suffix:** `%` (e.g. `count%`)",
  },
  long: {
    canonical: "Long",
    file: "LSAZ_LONG_DATA_TYPE.html",
    body:
      "Signed **32-bit** integer, **-2,147,483,648 to 2,147,483,647**. 4 bytes.\n\n* **Initial value:** `0`\n* **Suffix:** `&` (e.g. `total&`)",
  },
  single: {
    canonical: "Single",
    file: "LSAZ_SINGLE_DATA_TYPE.html",
    body:
      "**Single-precision** floating point (~7 digits). 4 bytes.\n\n* **Range:** ±3.402823E+38\n* **Initial value:** `0`\n* **Suffix:** `!`",
  },
  double: {
    canonical: "Double",
    file: "LSAZ_DOUBLE_DATA_TYPE.html",
    body:
      "**Double-precision** floating point (~15 digits). 8 bytes.\n\n* **Range:** ±1.7976931348623158E+308\n* **Initial value:** `0`\n* **Suffix:** `#`",
  },
  currency: {
    canonical: "Currency",
    file: "LSAZ_CURRENCY_DATA_TYPE.html",
    body:
      "Fixed-point integer scaled to **4 decimal places**. 8 bytes.\n\n* **Range:** ±922,337,203,685,477.5807\n* **Initial value:** `0`\n* **Suffix:** `@`",
  },
  string: {
    canonical: "String",
    file: "LSAZ_STRING_DATA_TYPE.html",
    body:
      "Variable-length **String** (limited by available memory). 2 bytes/character.\n\n" +
      "* **Initial value:** `\"\"` (empty)\n" +
      "* **Suffix:** `$` (e.g. `name$`)\n" +
      "* **Fixed-length form:** `Dim s As String * 32` (32-character buffer, padded with spaces).",
  },
  variant: {
    canonical: "Variant",
    file: "LSAZ_VARIANT_DATA_TYPE.html",
    body:
      "Holds **any** scalar value, array, list, or object reference (also dates and Booleans). 16 bytes.\n\n" +
      "* **Initial value:** `EMPTY` (test with `IsEmpty`)\n" +
      "* Use `Typename(v)` / `VarType(v)` to inspect the contained type.\n" +
      "* Without `Option Declare`, undeclared variables become `Variant`.",
  },
  list: {
    canonical: "List",
    file: "LSAZ_DATA_TYPES.html",
    body:
      "**List modifier** — declares a one-dimensional associative collection keyed by name (not by index).\n\n" +
      "**Typical:** `Dim Cache List As String` then `Cache(\"abc\") = \"value\"`\n\n" +
      "* `IsElement(Cache(\"abc\"))` — exists?\n" +
      "* `Erase Cache(\"abc\")` — remove one entry; `Erase Cache` clears all.\n" +
      "* `ForAll v In Cache` — iterate (use `ListTag(v)` for the key).",
  },
  object: {
    canonical: "Object",
    file: "LSAZ_DATA_TYPES.html",
    body:
      "Generic **object reference** — pointer to a class instance (LotusScript class, Notes class, OLE Automation, or Java object). 4 bytes.\n\n" +
      "**Typical:** `Dim x As Object` then `Set x = CreateObject(...)`.\n\n" +
      "Prefer the **specific class** (`As NotesSession`, `As MyClass`) when known — gives you completion, signature help, and member hover.",
  },
  date: {
    canonical: "Date",
    file: "LSAZ_DATA_TYPES.html",
    body:
      "LotusScript has **no stand-alone Date type** — date/time values live inside a `Variant`.\n\n" +
      "**Typical:** `Dim d As Variant` / `d = Now` / `d = DateNumber(2026, 4, 25)`.\n\n" +
      "For Domino-aware date/time arithmetic across time zones, use **NotesDateTime** instead.",
  },
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
  lib: "External library name in a `Declare … Lib \"libname\"` statement.",
  alias: "Real export name when it differs from the LotusScript-side name in a `Declare … Lib … Alias \"export\"` statement.",
  class:
    "Defines a **class** (member variables + procedures). Closed by **End Class**.\n\n" +
    "**Syntax:** `[Public | Private] Class className [As baseClass]`\n\n" +
    "* Module-scope only — never inside a procedure or another class.\n" +
    "* Class is **Private by default**. Use `Public` to expose it.\n" +
    "* **Constructor:** a `Sub New(...)`; **destructor:** a `Sub Delete()`.\n" +
    "* Member procedures are **Public by default**; member variables are **Private by default**.\n" +
    "* Refer to members with `obj.member`, or `Me.member` from inside the class.\n" +
    "* Inheritance: `As baseClass`; reach a hidden base member with `baseClass..member`.",
  forall:
    "Iterates **once per element** of an array, list, or collection (alias `Each`).\n\n" +
    "**Syntax:** `ForAll var In container … End ForAll`\n\n" +
    "* `var` is a **read-write reference** to each element (changes are reflected).\n" +
    "* For lists: use `ListTag(var)` to read the current key.\n" +
    "* End the block with `End ForAll`.",
  declare:
    "**Forward-declares** a procedure or names an external (DLL/shared-library) function.\n\n" +
    "**LotusScript form:** `Declare Sub|Function name(args) [As type]` — lets you call a procedure that is defined later in the same module.\n\n" +
    "**External form (Lib …):** `Declare [Public|Private] Sub|Function name Lib \"libname\" [Alias \"export\"] (args) [As type]` — binds to a C-callable export in a Windows DLL or platform-equivalent shared library.\n\n" +
    "* `Lib` — name of the shared library (e.g. `\"kernel32\"`).\n" +
    "* `Alias` — actual export name when it differs from `name` or contains illegal characters.\n" +
    "* Argument calling-convention rules (`ByVal`, `ByRef`, type matching) must match the C signature exactly or you get a stack/memory corruption.",
  use:
    "**Loads a Domino script library** so its `Public` Subs/Functions/Classes/Constants become callable from this module.\n\n" +
    "**Syntax:** `Use \"LibraryName\"`\n\n" +
    "* Place at the **top of the module**, after `Option …` lines.\n" +
    "* `LibraryName` is the design-element name (case-insensitive).\n" +
    "* For LSX (C-loadable extension), use `UseLSX \"*lsxname\"`.",
  uselsx:
    "Loads an **LSX (LotusScript eXtension)** — a platform-native shared library that exposes Notes-style classes.\n\n" +
    "**Syntax:** `UseLSX \"*libname\"`\n\n" +
    "* The `*` prefix marks the symbolic LSX name (e.g. `\"*lsxodbc\"`).\n" +
    "* Place at the top of the module, before any code that uses the LSX classes.",
  event:
    "Used in `On Event eventName From source Call handler` (UI/agent event wiring) or as a placeholder in some class-event declarations.",
  implements:
    "(Reserved) — declares that a class implements an interface. In current LotusScript this is **rarely used**; member parity is usually enforced by convention.",
  stop:
    "Halts execution and **enters the debugger** (when attached). Useful as a hard breakpoint.",
  not: "Logical **negation**. Bitwise on integers, boolean on Boolean values. (`Not True` is `False`.)",
  and: "Logical / bitwise **AND**. Combine flags with `And`, test with `If x And FLAG Then`.",
  or: "Logical / bitwise **OR**. Combine flag bits: `MB_OK Or MB_ICONINFORMATION`.",
  xor: "Logical / bitwise **exclusive OR**.",
  eqv: "Logical / bitwise **equivalence** (`A Eqv B` is true when both bits are equal).",
  imp: "Logical / bitwise **implication** (`A Imp B` ≡ `Not A Or B`).",
  mod: "Integer **modulus** (remainder of `A \\ B`).",
  like: "**Pattern match** operator: `s Like \"foo*bar?baz\"`. Wildcards: `*` (any), `?` (one char), `#` (digit), `[abc]` / `[!abc]` (character class).",
  is: "Object **identity** test (`If a Is Nothing Then`, `If x Is y Then`). For class types only.",
  typeof: "Inside `Select Case`: matches the **declared object class** (`Case TypeOf NotesDocument`).",
  static: "Inside a procedure: variables keep their values **between calls**.\n\nAt module scope: similar to `Private` but not exported.",
  global: "**Module-scope** variable visible to all procedures in the module.",
  shared: "Used in `Open` lock clauses (`Shared`, `Lock Read`, …) and in some legacy declarations.",
  nothing: "Object null literal. `Set obj = Nothing` releases the reference.",
  pi: "Mathematical π — use directly in numeric expressions.",
  true: "Boolean True (numeric `-1`).",
  false: "Boolean False (numeric `0`).",
  null: "Variant 'no value'. Test with `IsNull(v)`.",
  empty: "Uninitialised Variant. Test with `IsEmpty(v)`.",
};

/**
 * `%`-prefixed compile-time directives (preprocessor + module options spelled with `%`).
 * Keys are lowercase **without** the leading `%`. Use {@link directiveHoverMarkdown}.
 *
 * @type {Record<string, { canonical: string; file: string; body: string }>}
 */
const DIRECTIVE_HOVER = {
  include: {
    canonical: "%Include",
    file: "LSAZ_INCLUDE_DIRECTIVE.html",
    body:
      "Inlines the contents of another file at compile time.\n\n" +
      "**Syntax:** `%Include \"filename\"`\n\n" +
      "* The most common use: `%Include \"lsconst.lss\"` to import the standard LotusScript constants (`MB_OK`, `LSI_THREAD_*`, `ATTR_*`, …).\n" +
      "* The file is resolved relative to the **library search path** (Notes/Designer install).\n" +
      "* Acts as if its source were pasted in place — declarations, constants, and types from it become visible to the module.\n" +
      "* Synonym: `%INCLUDE`. Older code may use the bare form `#include` — prefer `%Include`.",
  },
  rem: {
    canonical: "%REM",
    file: "LSAZ_REM_STATEMENT.html",
    body:
      "Begins a **block comment**. Everything until the matching `%END REM` is ignored by the compiler.\n\n" +
      "**Syntax:**\n```\n%REM\n  …documentation…\n%END REM\n```\n\n" +
      "Designer auto-generates `%REM`-blocks above each `Sub`, `Function`, and `Property` for the design summary. Single-line comments use a leading `'` instead.",
  },
  endrem: {
    canonical: "%END REM",
    file: "LSAZ_REM_STATEMENT.html",
    body: "Closes a `%REM` block comment.",
  },
  if: {
    canonical: "%If",
    file: "LSAZ_IF_DIRECTIVE.html",
    body:
      "**Conditional compilation** based on a `%Pragma` constant or platform predicate.\n\n" +
      "**Syntax:**\n```\n%If condition\n  …code only compiled if condition is True…\n%ElseIf otherCondition\n  …\n%Else\n  …\n%End If\n```\n\n" +
      "Different from the runtime `If`: branches that don't match are stripped at compile time.",
  },
  elseif: {
    canonical: "%ElseIf",
    file: "LSAZ_IF_DIRECTIVE.html",
    body: "Additional branch in a `%If` conditional-compilation block. See `%If`.",
  },
  else: {
    canonical: "%Else",
    file: "LSAZ_IF_DIRECTIVE.html",
    body: "Fallback branch in a `%If` conditional-compilation block. See `%If`.",
  },
  endif: {
    canonical: "%End If",
    file: "LSAZ_IF_DIRECTIVE.html",
    body: "Closes a `%If` conditional-compilation block.",
  },
  pragma: {
    canonical: "%Pragma",
    file: "LSAZ_PRAGMA_DIRECTIVE.html",
    body:
      "Defines a compile-time symbol or sets a compiler option used by `%If`.\n\n" +
      "**Typical:** `%Pragma DEBUG = 1` then `%If DEBUG` …",
  },
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

/**
 * Per-keyword overrides for the HCL help URL. Keys are lowercase.
 * For everything not listed here, the keyword hover links to {@link CHAPTER7}.
 * @type {Record<string, { file: string; linkTitle?: string }>}
 */
const KEYWORD_DOC_OVERRIDES = {
  class: { file: "LSAZ_CLASS_STATEMENT.html", linkTitle: "Open Class statement in HCL help" },
  forall: { file: "LSAZ_FORALL_STATEMENT.html", linkTitle: "Open ForAll statement in HCL help" },
  sub: { file: "LSAZ_SUB_STATEMENT.html", linkTitle: "Open Sub statement in HCL help" },
  function: { file: "LSAZ_FUNCTION_STATEMENT.html", linkTitle: "Open Function statement in HCL help" },
  property: { file: "LSAZ_PROPERTY_STATEMENT.html", linkTitle: "Open Property statement in HCL help" },
  type: { file: "LSAZ_TYPE_STATEMENT.html", linkTitle: "Open Type statement in HCL help" },
  enum: { file: "LSAZ_ENUM_STATEMENT.html", linkTitle: "Open Enum statement in HCL help" },
  dim: { file: "LSAZ_DIM_STATEMENT.html", linkTitle: "Open Dim statement in HCL help" },
  redim: { file: "LSAZ_REDIM_STATEMENT.html", linkTitle: "Open Redim statement in HCL help" },
  const: { file: "LSAZ_CONST_STATEMENT.html", linkTitle: "Open Const statement in HCL help" },
  set: { file: "LSAZ_SET_STATEMENT.html", linkTitle: "Open Set statement in HCL help" },
  with: { file: "LSAZ_WITH_STATEMENT.html", linkTitle: "Open With statement in HCL help" },
  on: { file: "LSAZ_ON_ERROR_STATEMENT.html", linkTitle: "Open On Error statement in HCL help" },
  resume: { file: "LSAZ_RESUME_STATEMENT.html", linkTitle: "Open Resume statement in HCL help" },
  goto: { file: "LSAZ_GOTO_STATEMENT.html", linkTitle: "Open GoTo statement in HCL help" },
  declare: { file: "LSAZ_DECLARE_STATEMENT.html", linkTitle: "Open Declare statement in HCL help" },
  use: { file: "LSAZ_USE_STATEMENT.html", linkTitle: "Open Use statement in HCL help" },
  uselsx: { file: "LSAZ_USELSX_STATEMENT.html", linkTitle: "Open UseLSX statement in HCL help" },
  event: { file: "LSAZ_ON_EVENT_STATEMENT.html", linkTitle: "Open On Event statement in HCL help" },
  implements: { file: "LSAZ_CLASS_STATEMENT.html", linkTitle: "Open Class statement in HCL help" },
  stop: { file: "LSAZ_STOP_STATEMENT.html", linkTitle: "Open Stop statement in HCL help" },
  not: { file: "LSAZ_LOGICAL_OPERATORS.html", linkTitle: "Open logical operators in HCL help" },
  and: { file: "LSAZ_LOGICAL_OPERATORS.html", linkTitle: "Open logical operators in HCL help" },
  or: { file: "LSAZ_LOGICAL_OPERATORS.html", linkTitle: "Open logical operators in HCL help" },
  xor: { file: "LSAZ_LOGICAL_OPERATORS.html", linkTitle: "Open logical operators in HCL help" },
  eqv: { file: "LSAZ_LOGICAL_OPERATORS.html", linkTitle: "Open logical operators in HCL help" },
  imp: { file: "LSAZ_LOGICAL_OPERATORS.html", linkTitle: "Open logical operators in HCL help" },
  mod: { file: "LSAZ_ARITHMETIC_OPERATORS.html", linkTitle: "Open arithmetic operators in HCL help" },
  like: { file: "LSAZ_LIKE_OPERATOR.html", linkTitle: "Open Like operator in HCL help" },
  is: { file: "LSAZ_IS_OPERATOR.html", linkTitle: "Open Is operator in HCL help" },
  typeof: { file: "LSAZ_TYPEOF_FUNCTION.html", linkTitle: "Open TypeOf in HCL help" },
  static: { file: "LSAZ_STATIC_STATEMENT.html", linkTitle: "Open Static statement in HCL help" },
};

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
  "class",
  "forall",
  "declare",
  "lib",
  "alias",
  "use",
  "uselsx",
  "event",
  "implements",
  "stop",
  "not",
  "and",
  "or",
  "xor",
  "eqv",
  "imp",
  "mod",
  "like",
  "is",
  "typeof",
  "static",
  "global",
  "shared",
  "nothing",
  "pi",
  "true",
  "false",
  "null",
  "empty",
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
 * Build hover for a `%`-prefixed compile-time directive (`%Include`, `%REM`, `%If`, …).
 * `directive` may include or omit the leading `%`; lookup is case-insensitive
 * and tolerant of internal whitespace (e.g. `%End If`, `%END REM`).
 * @param {string} directive
 * @param {string} version help version e.g. 14.5.1
 * @returns {vscode.MarkdownString | undefined}
 */
function directiveHoverMarkdown(directive, version) {
  const v = effectiveHelpVersion(version);
  const key = String(directive ?? "")
    .replace(/^%/, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
  const t = DIRECTIVE_HOVER[key];
  if (!t) {
    return undefined;
  }
  return hoverMarkdown(
    v,
    t.file,
    `Open ${t.canonical} directive in HCL help`,
    `### ${t.canonical}\n\n${t.body}`
  );
}

/**
 * Build hover for a LotusScript primitive type (Boolean, Integer, …).
 * @param {string} word identifier under cursor (case-insensitive lookup)
 * @param {string} version help version e.g. 14.5.1
 * @returns {vscode.MarkdownString | undefined}
 */
function typeHoverMarkdown(word, version) {
  const v = effectiveHelpVersion(version);
  const key = String(word ?? "")
    .replace(/\$/g, "")
    .trim()
    .toLowerCase();
  const t = TYPE_HOVER[key];
  if (!t) {
    return undefined;
  }
  return hoverMarkdown(
    v,
    t.file,
    `Open ${t.canonical} data type in HCL help`,
    `### ${t.canonical} data type\n\n${t.body}`
  );
}

/**
 * Returns true when `word` at `wordStartCol` on `lineText` is preceded
 * (skipping whitespace) by `As` or `As New` — i.e. the word is being used
 * as a **type annotation** (e.g. `Dim x As String`).
 * @param {string | undefined} lineText
 * @param {number | undefined} wordStartCol
 */
function isTypeAnnotationContext(lineText, wordStartCol) {
  if (typeof lineText !== "string" || typeof wordStartCol !== "number") {
    return false;
  }
  const before = lineText.slice(0, wordStartCol);
  return /\bAs(?:\s+New)?\s+$/i.test(before);
}

/**
 * @param {string} word identifier under cursor
 * @param {string} version help version e.g. 14.5.1
 * @param {{ lineText?: string; wordStartCol?: number }} [ctx]
 * @returns {vscode.MarkdownString | undefined}
 */
function hoverMarkdownForWord(word, version, ctx) {
  const v = effectiveHelpVersion(version);
  const raw = word.replace(/\$/g, "").trim();
  if (!raw) {
    return undefined;
  }

  const lower = raw.toLowerCase();

  if (TYPE_HOVER[lower] && isTypeAnnotationContext(ctx?.lineText, ctx?.wordStartCol)) {
    const md = typeHoverMarkdown(raw, v);
    if (md) {
      return md;
    }
  }

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
    const ovr = KEYWORD_DOC_OVERRIDES[lower];
    return hoverMarkdown(
      v,
      ovr ? ovr.file : CHAPTER7,
      ovr?.linkTitle ?? "Open LotusScript language reference in HCL help",
      `### ${raw}\n\n${kwBody}`
    );
  }

  if (TYPE_HOVER[lower]) {
    return typeHoverMarkdown(raw, v);
  }

  return undefined;
}

/**
 * HTTPS URL for a `%…` directive token (same topic as {@link directiveHoverMarkdown}).
 * @param {string} directive
 * @param {unknown} version
 * @returns {string | undefined}
 */
function directiveHelpUrl(directive, version) {
  const v = effectiveHelpVersion(version);
  const key = String(directive ?? "")
    .replace(/^%/, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
  const t = DIRECTIVE_HOVER[key];
  if (!t) {
    return undefined;
  }
  return basicBase(v) + t.file;
}

/**
 * HTTPS URL for HCL help for an identifier (built-in, keyword, Notes class, type in `As` context).
 * @param {string} word
 * @param {unknown} version
 * @param {{ lineText?: string; wordStartCol?: number }} [ctx]
 * @returns {string | undefined}
 */
function helpUrlForWord(word, version, ctx) {
  const v = effectiveHelpVersion(version);
  const raw = word.replace(/\$/g, "").trim();
  if (!raw) {
    return undefined;
  }
  const lower = raw.toLowerCase();

  if (TYPE_HOVER[lower] && isTypeAnnotationContext(ctx?.lineText, ctx?.wordStartCol)) {
    return basicBase(v) + TYPE_HOVER[lower].file;
  }

  const builtinHit = BUILTIN_NAMES.find((n) => n.toLowerCase() === lower);
  if (builtinHit) {
    return basicBase(v) + builtinDocFile(builtinHit);
  }

  if (/^notes/i.test(raw)) {
    const cls = raw.replace(/[^A-Za-z0-9_]/g, "");
    if (cls.length >= 6) {
      return notesClassTopicUrl(v, cls);
    }
  }

  if (KEYWORD_DOC.has(lower)) {
    const ovr = KEYWORD_DOC_OVERRIDES[lower];
    return basicBase(v) + (ovr ? ovr.file : CHAPTER7);
  }

  if (TYPE_HOVER[lower]) {
    return basicBase(v) + TYPE_HOVER[lower].file;
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
  typeHoverMarkdown,
  directiveHoverMarkdown,
  directiveHelpUrl,
  helpUrlForWord,
  normalizeHelpVersion,
  effectiveHelpVersion,
};
