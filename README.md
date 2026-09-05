# Penpa+ Spoiler 0.8.0

Recover the answer information stored in a Penpa+ answer-check link and open it in setter mode.

Website: https://cyddrdrd.github.io/penpa_spoiler/

## Use

1. Paste a full Penpa+ link containing `p=` and `a=`, or a TinyURL pointing to one.
2. Choose **Convert Only** or **Convert and Open**.
3. Read any conversion notes. For an OR check, choose the answer alternative to display.
4. Copy the generated URL if needed. If your browser cannot open a very long URL, use Penpa+'s Load dialog.

Fragment (`#`) and query (`?`) URLs, ordinary solve links, and saved-progress `l=solvedup` links are supported. Full links are decoded and normalized in the browser. Saved-progress links no longer require the clone Worker or its daily quota. TinyURL expansion still uses the existing expansion Worker and needs an internet connection.

## Recovery coverage

- Numbers with one or multiple digits, mixed lengths, negatives, decimals, alphabet entries, and checked text containing commas or Unicode.
- Tight-fit Sudoku corner numbers on square, Sudoku, and Kakuro grids.
- Shading, exact colours, and multicolour cell arrays.
- Green and double lines/edges, exact line/edge styles, and walls.
- Every symbol family represented in Penpa+'s current answer checker: circles, triangles, arrows, battleships including B+, stars, tents, math signs, light bulbs, and mines.
- Every current OR answer category, with separate selection of alternatives and notes when orientations or variants were omitted.
- Original givens, irregular/cropped cell lists, grid geometry, rotation, reflection, metadata, rules, and question custom colours are preserved.

Unknown checker encodings and malformed payloads produce an error instead of silently dropping entries. The audited format is Penpa+ 3.2.4; old numerical-header Penpa v1 links are explicitly unsupported.

## Limits

An answer-check link is not a complete copy of the author's solution layer. Penpa discards unchecked annotations, some colours and font sizes, certain symbol variants, and other presentation details. OR checks for circles, triangles, arrows, battleships, and mines save positions without all variants/orientations. The converter shows a representative accepted mark and explains that limitation.

Shading checks can merge shaded cells and filled-square symbols. Star styles and math colours are also normalized. These original visual choices cannot always be recovered. Custom solution colours and solver progress are not treated as authoritative answer data.

A link without `a=` does not contain an answer to recover. This tool cannot infer that missing solution. Version 0.8.0 is therefore not labelled “decodes everything” or 1.0.0.

## Development and verification

Run `npm test` with Node.js 18 or later. No dependency installation or network is needed for the regression suite. The tests use pinned Penpa+ export and checker methods as an independent reference; see [tests/README.md](tests/README.md).

The website needs no build step. Serve this directory with a static web server to try it locally. Its existing pako 2.1.0 browser dependency is loaded from jsDelivr.

- `converter.js`: URL parsing, reconstruction, and local saved-progress normalization.
- `page.js`: buttons, clipboard, conversion notes, and OR alternative selector.
- `index.html`: page structure and styling.
- [docs/FORMAT_AUDIT.md](docs/FORMAT_AUDIT.md): source-based format audit.
- [PROGRESS.md](PROGRESS.md): completed work, validation, and remaining release limits.
- [UPDATE_GUIDE.md](UPDATE_GUIDE.md): upload and rollback instructions.
- [CHANGELOG.md](CHANGELOG.md): version history.

`convertPenpaUrl(input, options)` returns a URL. `convertPenpaUrlDetailed(input, options)` additionally returns warnings, recovered-object counts, available alternatives, and the selected alternative. Pass `alternativeIndex` to choose an OR branch.

## Intended use and existing logging

This tool is intended for puzzle setters, testers, and technical inspection. Respect puzzle authors and avoid spoiling puzzles for others without permission.

The existing private logging feature sends input and output URLs to the project's logging Worker. Logging is now nonblocking and cannot delay a conversion; failures are ignored. Programmatic callers can pass `{log: false}`. Automated and local integration tests disable logging. TinyURL expansion sends the short link to the expansion Worker. The former clone Worker is not used by this version.
