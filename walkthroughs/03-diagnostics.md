# Lint & quick fixes

Open the **Problems** panel (`Ctrl+Shift+M`) — every saved or open `.lss` file is scanned in the background. Most warnings come with a Quick Fix (lightbulb / `Ctrl+.`).

| Diagnostic | What it catches | Quick Fix |
| --- | --- | --- |
| `missing-option-declare` | The file has no `Option Declare` and risks implicit Variants. | Insert `Option Declare` at the top. |
| `fall-through-error-handler` | Code can fall through into an `ErrorHandler:` label without an explicit `Exit Sub/Function/Property`. | Insert the matching `Exit …` line. |
| `set-new-untyped` | `Set x = New ClassName` where `x` was not previously declared `As ClassName`. | Insert the `Dim x As ClassName` line. |
| `deprecated-call` | Use of `Lsi_info` and other legacy calls. | Replace with the canonical replacement (e.g. `GetThreadInfo`). |
| `msgbox-magic-number` | `Msgbox` is called with raw numeric flags. | Add `%Include "lsconst.lss"` so you can use `MB_OK Or MB_ICONINFORMATION`. |
| `notes-class-typo` | `As [New] Notes…` references a class name that doesn't exist. | Suggest the closest real class via Levenshtein distance. |
| `unclosed-block` / `block-mismatch` | Missing or wrong `End Sub/Function/Property/Class/If/With/Select`. | — (look at the squiggle). |
| `ascii-comment` | Non-ASCII characters in comments (configurable, off-by-default for some teams). | — |
| `todo` | `TODO`, `FIXME`, `XXX`, `HACK`, `BUG` markers in comments. | — |

All diagnostics can be toggled individually under **Settings → Extensions → LotusScript (.lss)**.
