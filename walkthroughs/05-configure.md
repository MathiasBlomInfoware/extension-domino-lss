# Tune to your team's style

Every feature is opt-out. Search settings for `domino-lss-lotusscript` and toggle what you don't want:

| Setting | Purpose |
| --- | --- |
| `helpVersion` | HCL Domino help version segment (e.g. `14.5.1`). Used in every hover/CodeLens link. |
| `enableHclDocCompletions` | Suggest LotusScript built-ins and Notes classes in completion. |
| `enableHclDocHover` | Show hover documentation. |
| `enableCodeLens` | Show `Open <NotesClass> in HCL help` lenses. |
| `enableReferenceCodeLens` | Show `N references` lenses on Sub/Function/Property/Class. |
| `enableStatusBar` | Show the current `Class.Method` in the status bar. |
| `membersOnlyAfterDot` | After `obj.`, only suggest curated Notes members for typed `obj`. |
| `diagnosticsProfile` | Preset diagnostics defaults: `strict`, `balanced`, `legacy`. |
| `requireAsciiComments` | Warn when comments contain non-ASCII characters. |
| `highlightTodos` | Surface `TODO`/`FIXME`/`XXX`/`HACK`/`BUG` in Problems. |
| `warnMissingOptionDeclare` | Hint when `Option Declare` is missing. |
| `checkStructuralBlocks` | Detect unclosed/mismatched `Sub`/`If`/`For`/etc. |
| `warnFallThroughErrorHandler` | Catch implicit fall-through into `ErrorHandler:`. |
| `warnSetNewWithoutDim` | Catch `Set x = New …` without a typed `Dim`. |
| `warnDeprecatedCalls` | Flag deprecated calls and suggest the replacement. |
| `warnMagicMsgboxConstants` | Hint about magic numbers in `Msgbox`. |
| `warnNotesClassTypo` | Suggest the closest Notes class on typos. |
| `warnUnusedSymbols` | Hint on unused local vars, parameters, and private class members. |

> Tip: changes apply immediately — every open `.lss` file is re-scanned automatically.
