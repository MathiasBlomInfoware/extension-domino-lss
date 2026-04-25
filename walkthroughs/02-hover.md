# Hover for HCL help

Hover any identifier in a `.lss` file to see contextual documentation.

The extension recognises:

- **Built-in statements & functions** — `Msgbox`, `Print`, `MkDir`, `Kill`, `FileCopy`, `Lcase`, `CStr`, …
- **Primitive types** — `Boolean`, `Integer`, `Long`, `Double`, `String`, `Variant`, `Date`, `Object`, `List`, `Currency`, `Single`.
- **Notes/Domino classes** — `NotesSession`, `NotesDatabase`, `NotesDocument`, `NotesView`, `NotesXSPDocument`, `NotesViewEntry`, …
- **Notes class members** — `db.GetView`, `doc.ReplaceItemValue`, … (when the variable is `Dim … As Notes…`).
- **Constants** — `MB_OK`, `LSI_THREAD_PROC`, `ATTR_DIRECTORY`, …
- **Keywords & flow control** — `Class`, `End Class`, `ForAll`, `Declare`, `Stop`, `Implements`, …
- **Preprocessor directives** — `%Include`, `%REM`, `%If`, `%Pragma`, …

Each hover ends with a **direct deep link** into the matching topic on `help.hcl-software.com` for the version you've configured (`domino-lss-lotusscript.helpVersion`).

> Tip: hover ignores comments and string literals, so you only get docs where you'd expect them.
