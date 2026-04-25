# LotusScript & .lss

Syntax highlighting and language basics for **LotusScript** and HCL Domino **`.lss`** library source files, with one-click links into the official **HCL Domino Designer** online help (default: tree `14.5.1`).

> Publisher: `infoware` · Extension id: `infoware.domino-lss-lotusscript`

## Features

- **Syntax highlighting** for `.lss` and the `lotusscript` language id (TextMate grammar).
- **Snippets** for control flow (`If/Then/Else`, `For/Next`, `ForAll`, `Do/While`, `Select Case`, `With`), classes (`Class`, `Property Get/Set/Let`), error handling (`On Error Goto`), and Domino-style helpers (`%REM`-headers, NotesSession bootstrap, doc-collection loop, view-navigator iteration, DXL export/import, `NotesStream`, `NotesLog`).
- **Hover help** for built-ins (`Print`, `Msgbox`, `Format`, …), Notes classes (`NotesSession`, `NotesDatabase`, …), Notes constants (`ACLLEVEL_*`, `EMBED_*`, `FT_*`, `PROMPT_*`, `DBTYPE_*`, …), and core keywords. Each hover opens the topic on `help.hcl-software.com` through a sandboxed command link.
- **Member completion** after `obj.` when `obj` is `Dim … As Notes…`, `Dim … As New Notes…`, declared in a `Sub`/`Function` parameter list, or assigned via `Set obj = New Notes…` — driven by curated members in `data/notes-members.json`.
- **Signature help** with parameter docs while you type `obj.Method(` for ~120 of the most-used Notes APIs (`NotesSession`, `NotesDatabase`, `NotesDocument`, `NotesDocumentCollection`, `NotesView`, `NotesItem`, `NotesDateTime`, `NotesStream`, `NotesACL`, `NotesDXLExporter/Importer`, `NotesUIWorkspace`, `NotesUIDocument`, `NotesLog`, `NotesRichTextItem`).
- **Outline / Document Symbols** for `Class` / `Sub` / `Function` / `Property` / top-level `Dim` and `Const` (powers Outline view, sticky scroll, breadcrumbs, “Go to Symbol in File…”).
- **Workspace Symbols** (`Ctrl+T`) and **Go to Definition** (`F12`) across all `.lss` files in the workspace.
- **Find References** (`Shift+F12`), **Rename Symbol** (`F2`), **Document Highlight**, **Go to Type Definition**, and **Go to Implementation** for LotusScript identifiers.
- **Folding ranges** for `%REM … %END REM` blocks (comment-kind), `Sub`/`Function`/`Property`/`Class`, and `'#region … '#endregion` markers.
- **Format Document** (`Shift+Alt+F`) re-indents structural blocks (Sub/Function/Property/Class/If/Else/ElseIf/For/ForAll/Do/While/With/Select/Case) using your editor’s tab settings, and trims trailing whitespace. `%REM` blocks are left untouched.
- **CodeLens** *“Open <NotesClass> in HCL help”* above each `Dim … As Notes*` declaration and `Set … = New Notes*` (toggle with `enableCodeLens`).
- **Reference CodeLens** *“N references”* above `Sub`/`Function`/`Property`/`Class` declarations (toggle with `enableReferenceCodeLens`).
- **Semantic tokens** that distinguish user symbols, Notes classes/types, parameters, and deprecated calls (toggle with `enableSemanticTokens`).
- **Document links** for `%Include "..."` targets and inline `http(s)` URLs.
- **Status bar** context for current symbol + per-file LotusScript diagnostic counts.
- **Notes constants** (~100 across ACL levels, ACL types, DB types, embedded objects, FT search options, picklist/prompt types, item types, DXL options, stream EOL kinds, …) suggested in completion and explained on hover.
- **Diagnostics** (each toggleable):
  - `diagnosticsProfile` — preset defaults (`strict`, `balanced`, `legacy`) for diagnostics behavior.
  - `requireAsciiComments` — non-ASCII characters in comments (live, ~200 ms debounce).
  - `highlightTodos` — surfaces `TODO` / `FIXME` / `XXX` / `HACK` / `BUG` markers in **Problems** as Information.
  - `warnMissingOptionDeclare` — Hint when a `.lss` file has no `Option Declare`.
  - `checkStructuralBlocks` — Warning for unclosed / mismatched `Sub`/`Function`/`Property`/`Class`/`If`/`For`/`ForAll`/`Do`/`While`/`With`/`Select Case` blocks.
- **HCL doc reference suggestions**: top-level entries like *“HCL LotusScript A–Z”*, *“HCL Notes classes A–Z”*, *“HCL Designer help portal”*, etc.
- Robust **`helpVersion`** handling: pasted full URLs, full-width digits, and pre-`14.5.1` versions are normalised and **floored to `14.5.1`**.

## Settings

All under **`domino-lss-lotusscript.*`**:

| Setting | Default | What it does |
| --- | --- | --- |
| `helpVersion` | `14.5.1` | Version segment for HCL URLs (e.g. `14.5.1`). **Do not paste a full URL.** Values below `14.5.1` are floored. |
| `enableHclDocCompletions` | `true` | Suggest built-ins / Notes classes with HCL doc links. |
| `enableHclDocHover` | `true` | Show HCL doc hover for identifiers. |
| `membersOnlyAfterDot` | `true` | After `obj.`, show only curated Notes members when `obj` resolves to `Notes*`; otherwise an empty list. Disable to fall through to general suggestions. |
| `diagnosticsProfile` | `balanced` | Diagnostic preset: `strict` (max checks), `balanced` (recommended), `legacy` (reduced noise for older code). Explicit per-check settings still override. |
| `requireAsciiComments` | `true` | Warn when comments contain non-ASCII characters. |
| `highlightTodos` | `true` | Surface `TODO` / `FIXME` / `XXX` / `HACK` / `BUG` markers in **Problems**. |
| `warnMissingOptionDeclare` | `true` | Hint when a `.lss` file is missing `Option Declare`. |
| `checkStructuralBlocks` | `true` | Warn about unclosed / mismatched block constructs. |
| `enableCodeLens` | `true` | Show *“Open <NotesClass> in HCL help”* above declarations. |
| `enableReferenceCodeLens` | `true` | Show *“N references”* above declarations. |
| `enableSemanticTokens` | `true` | Enable semantic token classification for richer theming. |
| `enableStatusBar` | `true` | Show current symbol and file diagnostics in status bar. |
| `warnFallThroughErrorHandler` | `true` | Warn on implicit fall-through into `ErrorHandler:` labels. |
| `warnSetNewWithoutDim` | `true` | Warn when `Set x = New ...` has no typed prior `Dim x As ...`. |
| `warnDeprecatedCalls` | `true` | Warn on deprecated calls like `Lsi_info`. |
| `warnMagicMsgboxConstants` | `true` | Warn on numeric Msgbox flags and suggest `MB_*` constants. |
| `warnNotesClassTypo` | `true` | Suggest nearest Notes class when type name seems misspelled. |
| `warnUnusedSymbols` | `true` | Hint for unused local variables, parameters, and private class members. |

### Refactor actions

Available from lightbulb/code actions in `.lss` files:

- Generate `%REM` header for Sub/Function/Property declarations.
- Add error-handler skeleton to Sub/Function/Property.
- Extract selected literal to local `Const`.
- Wrap selected lines with `On Error GoTo ErrorHandler`.
- Generate `Property Get/Let` or `Property Get/Set` from `Private field As Type`.

## Theme tuning (semantic tokens)

To clearly separate **HCL/library symbols** from **your own code**, keep semantic highlighting enabled:

```json
"editor.semanticHighlighting.enabled": true
```

Then add token-color customizations in your `settings.json`:

```json
"editor.semanticTokenColorCustomizations": {
  "enabled": true,
  "rules": {
    "class.defaultLibrary": "#4FC1FF",
    "function.defaultLibrary": "#DCDCAA",
    "function.defaultLibrary.deprecated": {
      "foreground": "#D16969",
      "fontStyle": "strikethrough"
    },
    "class.declaration": {
      "foreground": "#4EC9B0",
      "fontStyle": "bold"
    },
    "function.declaration": {
      "foreground": "#C586C0",
      "fontStyle": "bold"
    },
    "method.declaration": {
      "foreground": "#C586C0",
      "fontStyle": "bold"
    },
    "property.declaration": {
      "foreground": "#9CDCFE",
      "fontStyle": "bold"
    },
    "parameter": "#9CDCFE"
  }
}
```

Suggested visual mapping:

- `*.defaultLibrary` = HCL/Notes built-ins and classes (`NotesDocument`, `GetThreadInfo`, `Msgbox`)
- `*.declaration` = your own declarations (`Class DemoExporter`, `Sub Initialize`, `Function Foo`)
- `function.defaultLibrary.deprecated` = old calls such as `Lsi_info`

## Commands

- **`Open HCL Domino Designer help in browser`** (`domino-lss-lotusscript.openDesignerHelp`) — internal command used by hover/completion links. Restricted to `https://help.hcl-software.com/` URLs.
- **`Insert agent skeleton (Initialize + NotesLog + error handler)`** (`domino-lss-lotusscript.insertAgentSkeleton`)
- **`Insert NotesSession + CurrentDatabase boilerplate`** (`domino-lss-lotusscript.insertSessionAndDb`)
- **`Toggle 'Option Declare' at top of file`** (`domino-lss-lotusscript.toggleOptionDeclare`)
- **`Open lsconst.lss constants reference (HCL help)`** (`domino-lss-lotusscript.openLsconstReference`)
- **`Jump to first executable line`** (`domino-lss-lotusscript.insertAtFirstCode`)

## Snippet shortcuts

The bundled snippets are also bound to keys (only when `editorLangId == lotusscript`):

| Keys | Snippet |
| --- | --- |
| `Ctrl+K Ctrl+R` | `Sub` with `%REM` header |
| `Ctrl+K Ctrl+Y` | `Function` with `%REM` header |

Or type the prefix and press `Tab`: **`subrem`**, **`funrem`**, **`pctrem`** (see `snippets/lotusscript.json`).

## Development

```powershell
# Package a VSIX from the working tree (no marketplace publish)
npx --yes @vscode/vsce package --skip-license --no-dependencies --allow-missing-repository --out domino-lss-lotusscript-<version>.vsix

# Install locally into Cursor
cursor --install-extension .\domino-lss-lotusscript-<version>.vsix --force

# Or run the Extension Host from this folder
# .vscode/launch.json points --extensionDevelopmentPath at the workspace
```

Run fixture-based scanner regression tests:

```powershell
npm run test:fixtures
```

Verify coverage against HCL Domino Designer docs (`14.5.1`):

```powershell
npm run verify:hcl
```

This writes `tests/reports/hcl-verify-report.json` with:
- topic link health for all HCL pages referenced by the extension
- local Notes class presence in the HCL Notes class index
- member-level drift report (`strictMembers: false` by default; set `true` in `tests/hcl-verify-config.json` to fail on drift)

## Project layout

```
extension.js                 Activation, openDesignerHelp command, helpVersion migration, diagnostics wiring
hcl-docs.js                  URL building, version normalisation/flooring, hover/completion markdown
hover.js                     Hover provider (built-ins, classes, keywords, Notes member hover, constants)
completion.js                Completion provider (built-ins, classes, doc references, constants)
notes-member-completion.js   `obj.` member completion + hover from data/notes-members.json
notes-constants.js           Lookup + completion + hover for ACLLEVEL_*/EMBED_*/FT_*/PROMPT_* …
signature-help.js            SignatureHelp for Notes-typed obj.Method(…
symbols.js                   DocumentSymbol + WorkspaceSymbol + Definition providers
folding.js                   FoldingRangeProvider for %REM / Sub / Function / Property / Class
formatter.js                 Format Document (structural re-indent + trim trailing)
codelens.js                  CodeLens 'Open <NotesClass> in HCL help'
references.js                Reference / rename / document-highlight providers
code-actions.js              Quick fixes + small refactors from diagnostics
semantic-tokens.js           Semantic token provider for richer theming
impl-typedef.js              Type definition / implementation providers
document-links.js            Clickable %Include and URL links in .lss files
commands.js                  Palette commands for common LotusScript templates/actions
diagnostics.js               Diagnostic engine + profile presets + unused-symbol checks
status-bar.js                Current symbol and per-file diagnostic status items
document-selectors.js        DocumentSelector / isLssDocument helper
data/notes-members.json      Curated Notes class members (name / kind / summary)
data/notes-signatures.json   Hand-curated signatures + parameter docs (overlay)
data/notes-constants.json    Curated LotusScript / Domino constants (grouped)
syntaxes/lotusscript.tmLanguage.json
snippets/lotusscript.json
language-configuration.json
.github/workflows/release.yml  Tag-driven VSIX build + GitHub Release
```

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for the latest release notes.

### 0.3.1
- Hover for `GetThreadInfo` / `Lsi_info` (with the standard `LSI_THREAD_*` argument list spelled out), `Err`, `Erl`, `Error`, `Resume`, `Environ`, `Shell`, `Sleep`, `Beep`, `Choose`, `IIf`, `Switch`, `Eof`, `Lof`, `FileLen`, `Dir`, `FreeFile`, `Round`, `DateAdd`/`DateDiff`/`DatePart`/`DateNumber`/`DateSerial`/`TimeNumber`/`TimeSerial`, `StrComp`, `StrToken`, `Space`, `String`.
- New constant groups in `data/notes-constants.json`:
  - **LotusScript thread info** — `LSI_THREAD_LINE`, `LSI_THREAD_PROC`, `LSI_THREAD_CALLPROC`, `LSI_THREAD_CALLLINE`, `LSI_THREAD_CLASS`, `LSI_THREAD_LIBRARY`, … (16 values).
  - **Msgbox/Messagebox** buttons + icons (`MB_*`) and return values (`IDOK`, `IDCANCEL`, `IDYES`, `IDNO`, …).
- HCL-help URL overrides for `Err`/`Error`/`Resume`/`Beep`/`Sleep` (function+statement / statement-only topics) and `Lsi_info` → `GetThreadInfo` topic.

### 0.3.0
- **Snippets**: control flow (`If`, `Else`/`ElseIf`, `For`, `ForAll`, `Do/While`, `Select Case`, `With`), `Class`, `Property Get/Set/Let`, `On Error Goto`, `Initialize`/`Terminate`, NotesSession bootstrap, doc-collection loop, view-navigator iteration, DXL export/import, `NotesStream`, `NotesLog`, `Use`, `'#region`. ~30 snippets total.
- **Signature help** (`vscode.SignatureHelpProvider`) for ~120 of the most-used Notes APIs across 15 classes; backed by `data/notes-signatures.json` (overlay, leaves `notes-members.json` untouched).
- **Outline / breadcrumbs** via `DocumentSymbolProvider` for Class / Sub / Function / Property / top-level Dim / Const.
- **Workspace Symbols** (`Ctrl+T`) and **Go to Definition** (`F12`) across `**/*.lss`.
- **Folding** for `%REM … %END REM` (Comment) and Sub/Function/Property/Class (Region).
- **Format Document**: indents structural blocks (Sub/Function/Property/Class/If/Else/ElseIf/For/ForAll/Do/While/With/Select/Case) using the editor’s tab settings; trims trailing whitespace; leaves `%REM` blocks untouched.
- **CodeLens** *“Open <NotesClass> in HCL help”* above each `Dim … As Notes*` declaration and `Set … = New Notes*`.
- **Notes constants** (~100): ACLLEVEL_*, ACLTYPE_*, DBTYPE_*, EMBED_*, PICKLIST_*, PROMPT_*, item types, FT_*, DXL options, EOL kinds, …) — completion + hover.
- **Diagnostics** expanded: TODO/FIXME/XXX/HACK/BUG (Information), missing `Option Declare` (Hint), unclosed/mismatched structural blocks (Warning).
- **`onEnterRules`** + `indentationRules` so VS Code auto-indents after Sub/Function/Property/Class/If/Then/For/ForAll/Do/While/With/Select Case/Case/Else/ElseIf, and outdents before End*/Next/Loop/Wend.
- **GitHub Actions**: `.github/workflows/release.yml` builds and publishes a VSIX on `v*.*.*` tags.

### 0.2.0
- Major data expansion: 58 classes / ~990 members in `data/notes-members.json`. New classes covered: `NotesACL`, `NotesACLEntry`, `NotesAdministrationProcess`, `NotesAgent`, `NotesAgentContext`, `NotesCalendar`, `NotesCalendarEntry`, `NotesCalendarNotice`, `NotesColorObject`, `NotesDateRange`, `NotesDbDirectory`, `NotesDirectory`, `NotesDirectoryNavigator`, `NotesDOMParser`, `NotesEmbeddedObject`, `NotesForm`, `NotesInternational`, `NotesMimeEntity`, `NotesMimeHeader`, `NotesNewsletter`, `NotesNoteCollection`, `NotesOutline`, `NotesOutlineEntry`, `NotesRegistration`, `NotesReplication`, `NotesReplicationEntry`, `NotesRichTextDocLink`, `NotesRichTextNavigator`, `NotesRichTextParagraphStyle`, `NotesRichTextRange`, `NotesRichTextSection`, `NotesRichTextStyle`, `NotesRichTextTab`, `NotesRichTextTable`, `NotesSAXParser`, `NotesTimer`, `NotesUIDatabase`, `NotesUIDocument`, `NotesUIView`, `NotesViewColumn`, `NotesViewEntry`, `NotesViewEntryCollection`, `NotesViewNavigator`, `NotesXSLTransformer`. Existing `NotesSession`, `NotesDatabase`, `NotesDocument`, `NotesDocumentCollection`, `NotesView`, `NotesUIWorkspace`, `NotesItem`, `NotesDateTime`, `NotesName`, `NotesRichTextItem`, `NotesDXLExporter`, `NotesDXLImporter`, `NotesStream`, `NotesLog` significantly fleshed out.
- `NOTES_CLASSES` (completion seed list) realigned alphabetically and extended to match.

### 0.1.5 / 0.1.6
- Hygiene: `README.md`, `.vscodeignore`, `package.json` metadata (license / repository / bugs / homepage / Snippets+Linters categories).
- Snippet keybindings moved to `Ctrl+K Ctrl+R` / `Ctrl+K Ctrl+Y`.
- Notes var-type parser handles multi-`Dim`, class fields, `Set = New`, and `Property Get/Set/Let` parameters; cached per `(uri, document.version)`.
- Live ASCII-comment diagnostics with 200 ms debounce.
- `helpVersion` migration also walks every WorkspaceFolder scope.
- Initial `NotesSession` Create-* fabriker + `NotesDXLExporter`/`Importer`/`Stream`/`Log`/`Name`.

## License

MIT © Infoware AB / Mathias Blom
