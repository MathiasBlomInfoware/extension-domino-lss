# LotusScript & .lss

Syntax highlighting and language basics for **LotusScript** and HCL Domino **`.lss`** library source files, with one-click links into the official **HCL Domino Designer** online help (default: tree `14.5.1`).

> Publisher: `infoware` · Extension id: `infoware.domino-lss-lotusscript`

## Features

- **Syntax highlighting** for `.lss` and the `lotusscript` language id (TextMate grammar).
- **Snippets** for `Sub`/`Function`/`%REM` (Domino-style headers) — see `snippets/lotusscript.json`.
- **Hover help** for built-ins (`Print`, `Msgbox`, `Format`, …), Notes classes (`NotesSession`, `NotesDatabase`, …), and core keywords. Each hover opens the topic on `help.hcl-software.com` (path + `?hl=` is preserved through a command-link, since plain `https://` links in hovers can land on the site root in some VS Code builds).
- **Member completion** after `obj.` when `obj` is `Dim … As Notes…`, `Dim … As New Notes…`, declared in a `Sub`/`Function` parameter list, or assigned via `Set obj = New Notes…` — driven by curated members in `data/notes-members.json`.
- **HCL doc reference suggestions**: top-level entries like *“HCL LotusScript A–Z”*, *“HCL Notes classes A–Z”*, *“HCL Designer help portal”*, etc.
- **Diagnostic** (`requireAsciiComments`, default **on**) flags non-ASCII characters inside `'` line comments, `Rem` lines, and `%REM … %END REM` blocks. Now updates **live** with debouncing (~200 ms).
- Robust **`helpVersion`** handling: pasted full URLs, full-width digits, and pre-`14.5.1` versions are normalised and **floored to `14.5.1`**.

## Settings

All under **`domino-lss-lotusscript.*`**:

| Setting | Default | What it does |
| --- | --- | --- |
| `helpVersion` | `14.5.1` | Version segment for HCL URLs (e.g. `14.5.1`). **Do not paste a full URL.** Values below `14.5.1` are floored. |
| `enableHclDocCompletions` | `true` | Suggest built-ins / Notes classes with HCL doc links. |
| `enableHclDocHover` | `true` | Show HCL doc hover for identifiers. |
| `membersOnlyAfterDot` | `true` | After `obj.`, show only curated Notes members when `obj` resolves to `Notes*`; otherwise an empty list. Disable to fall through to general suggestions. |
| `requireAsciiComments` | `true` | Warn when comments contain non-ASCII characters. |

## Commands

- **`Open HCL Domino Designer help in browser`** (`domino-lss-lotusscript.openDesignerHelp`) — internal command used by hover/completion links. Restricted to `https://help.hcl-software.com/` URLs.

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

## Project layout

```
extension.js                 Activation, diagnostics, openDesignerHelp command, helpVersion migration
hcl-docs.js                  URL building, version normalisation/flooring, hover/completion markdown
hover.js                     Hover provider (built-ins, classes, keywords, Notes member hover)
completion.js                Completion provider (built-ins, classes, doc references)
notes-member-completion.js   `obj.` member completion + hover from data/notes-members.json
document-selectors.js        DocumentSelector / isLssDocument helper
data/notes-members.json      Curated Notes class members (name/kind/summary)
syntaxes/lotusscript.tmLanguage.json
snippets/lotusscript.json
language-configuration.json
```

## License

MIT © Infoware AB / Mathias Blom
