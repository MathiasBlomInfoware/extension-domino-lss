# Find references, rename, generate %REM

The extension provides true workspace-wide navigation and refactoring for LotusScript:

- **Go to Definition** (`F12`) — jump to the `Sub`, `Function`, `Property`, `Class`, `Const`, `Type` or `Enum` declaration.
- **Find All References** (`Shift+F12`) — every read/write of an identifier in the workspace, with comments and string literals safely filtered out.
- **Rename Symbol** (`F2`) — rename across all `.lss` files at once. Reserved keywords and `Notes*` class names are protected.
- **Document Highlight** — every occurrence of the symbol under your cursor is highlighted in the active editor.
- **CodeLens** — `N references` above each `Sub`/`Function`/`Property`/`Class`, plus `Open <Class> in HCL help` for Notes types.

Quick Fix offers refactorings on declaration lines:

- **Generate %REM block above Sub/Function/Property** — inserts a documentation block with `Description:` and `Parameters:` slots.
- **Add error handler skeleton to Sub/Function/Property** — appends `On Error GoTo ErrorHandler` plus the `ErrorHandler:` label and `Exit …` guard.

> Tip: snippets `pctrem`, `subblock`, `funcblock`, `iferr`, `forcoll`, … are also available — start typing the prefix and `Tab`.
