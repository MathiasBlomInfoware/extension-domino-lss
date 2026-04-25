# Changelog

All notable changes to `infoware.domino-lss-lotusscript` are documented here.

## 1.0.0

- Stabilized core language tooling for production use: workspace references, rename, document highlights, type definition/implementation, and improved scope-aware rename/reference behavior for local variables and parameters.
- Expanded diagnostics and quick fixes with practical quality checks (`unused local/parameter/private member`, fall-through handlers, typed `Set ... = New`, deprecated calls, Msgbox constants, Notes class typos, structural blocks, missing Option Declare).
- Polished editing experience: stronger TextMate scopes and semantic token distinctions for HCL/default-library symbols vs user-defined declarations, refined completion triggering after `.`, document links for `%Include` and URLs, and richer status bar context.
- Upgraded onboarding and docs: complete `examples/demo.lss` showcase with negative-test blocks, walkthrough/docs updates, commands/snippets improvements, and marketplace-ready metadata/icon.
- Removed inlay hints after usability feedback to keep call sites visually clean.

## 0.5.0

- Added workspace-level language tooling: references, rename, document highlights, code actions, and implementation/type definition providers for LotusScript symbols.
- Added richer editor UX: parameter-name inlay hints, reference-count CodeLens, `%REM` auto-close on Enter, status bar symbol + per-file diagnostics indicator, and click-through document links for `%Include` and URLs.
- Added onboarding and marketplace polish: walkthrough, new commands, expanded snippets, and extension branding support (icon + gallery banner metadata).
- Expanded hover/documentation coverage for core LotusScript keywords, values, operators, file I/O statements/functions, and preprocessor directives, with deep links to HCL Domino Designer help.

## 0.4.0

- Added robust references/rename/highlight stack and advanced diagnostics with quick fixes (error-handler fall-through, untyped `Set ... = New`, deprecated calls, Msgbox magic numbers, Notes class typos).
- Added walkthrough experience and status bar context for current symbol.
- Added Notes-call-site inlay hints and reference-count CodeLens.
- Improved hover coverage for directives, types, and key LotusScript statements.

## 0.3.5

- Added broad hover/help coverage for LotusScript built-ins, directives, constants, and Notes objects.
- Improved grammar keyword coverage (`Class`, `ForAll`, `%Include`, etc.) and highlighting behavior for set literals.
- Expanded diagnostics and linting controls.

## 0.3.1 - 0.1.5

- Initial releases with syntax highlighting, snippets, Notes member completion/hover, signature help, symbols, formatting, folding, and package hygiene.
