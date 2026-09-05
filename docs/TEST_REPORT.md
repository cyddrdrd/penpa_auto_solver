# Verification report — 0.8.0

## Automated regression suite

`npm test`: **110 passed, 0 failed**, Node.js 24.16.0. The tests are self-contained and use pinned, unmodified Penpa+ exporter/checker methods as their reference.

The suite was re-run after restoring the original README and webpage wording: **110 passed, 0 failed**.

Coverage includes mixed/multi-digit values; negatives/decimals; text, commas and Unicode; quote and compression escaping; candidate and alphabet checking; Tight Fit corner numbers; every supported AND symbol variant and OR category; exact/multicolour shading; given-shade/square overlaps; ordinary and exact lines/edges; walls; edge-position IDs; saved-progress cleanup; geometry and metadata preservation; malformed input rejection; mocked TinyURL success/failure/timeout handling; and nonblocking logging failure/timeout behavior.

## Authentic historical puzzles

All three recovered input links passed both the independent offline checker and real browser loading/rendering. No private URLs are included in this report.

| Fixture | Recovered entries | Result |
| --- | --- | --- |
| Saved-progress puzzle | 196 lines | Passed; original geometry and givens retained |
| Puzzle with question-mark clues and long rules | 10 shading marks | Passed; outside clues and metadata retained |
| Cropped mixed-elements puzzle | 4 shading marks, 14 lines, 7 exact edges, 5 numbers | Passed; full number strings retained |

## Real browser integration

The local full Penpa+ 3.2.4 application loaded both input and output links, drew their canvases, re-ran its answer checker, and compared runtime geometry including every point and connectivity field. Original clue and clue-colour layers were compared as well. Converter logging was disabled.

Chromium 152 on macOS: **20 passed, 0 failed**. This comprises 14 distinct generated grids, three current historical conversions, and three saved intermediate historical conversions. It is not 20 distinct historical puzzles.

| Actual Penpa grid type | Active cells | Result |
| --- | ---: | --- |
| square | 25 | Pass |
| hex | 61 | Pass |
| tri | 25 | Pass |
| pyramid | 15 | Pass |
| iso | 75 | Pass |
| sudoku | 81 | Pass |
| kakuro | 25 | Pass |
| truncated_square | 100 | Pass |
| tetrakis_square | 200 | Pass |
| snub_square | 150 | Pass |
| cairo_pentagonal | 100 | Pass |
| rhombitrihexagonal | 150 | Pass |
| deltoidal_trihexagonal | 140 | Pass |
| penrose_P3 | 40 | Pass |

Generated browser fixtures contained mixed number lengths and the supported symbol families wherever the grid had enough cells. Visual inspection additionally covered the saved-progress puzzle, historical cropped board, and generated hexagonal board. A direct link to the public Penpa site opened in setter mode and displayed `7`, `12`, and `123` together.

Earlier page smoke checks covered missing-answer errors and successful conversion. The final page preserves the original 0.7.0 interface: it uses the first OR alternative and does not display an alternative selector or orientation-loss notes. The automated suite verifies alternative selection and warnings through the detailed converter API. Popup handling also has a focused behavior check; browser/platform URL limits remain outside a universal guarantee.

The existing TinyURL expansion Worker was also tested live against the historical saved-progress short link: expansion succeeded and all 196 line segments were reconstructed, with conversion logging disabled. A genuine generated hexagonal fixture also opened directly on the public Penpa site and displayed its mixed numbers and shapes.

## Original wording preservation

An independent diff audit against original commit `4778f5a` confirmed that `README.md` is unchanged byte-for-byte. `index.html` differs only in its two script cache version parameters; the heading, title, paragraph, labels, placeholders, and buttons retain their original wording and visible 0.7.0 version. `page.js` retains every original user-facing status message while keeping busy controls, popup preopening, and stale-output clearing. No blocking behavior issue was found in that review.

The README intentionally preserves its original descriptions, including the former clone backend. The updated 0.8.0 runtime normalizes saved-progress links locally, as documented in the changelog and format audit.

## Public deployment verification — 2026-09-06

[Pull request #2](https://github.com/cyddrdrd/penpa_spoiler/pull/2) merged as `ee1b98c`. The complete uploaded source tree matched the tested local tree. The live `index.html`, `converter.js`, and `page.js` then matched the tested files byte-for-byte.

A generated fixture was converted using the public webpage. The output preserved `7`, `12`, `123`, triangle variant 3, and arrow variant 6, and regenerated the original answer through the independent Penpa checker. The public Convert and Open button opened the generated result in a new Penpa tab. This is a deployment smoke check in addition to the broader integration tests above.

The remote backup branch `backup/pre-0.8.0-2026-09-06` was verified at original commit `4778f5a` before merging. The original README remains unchanged.

## Interpretation

Matching Penpa's checker establishes recovery of its saved answer information for the tested cases. It does not prove recovery of omitted drawings or exact original appearance. All 14 grid types were genuinely instantiated and rendered, but not every possible size, tool combination, Penpa version, browser, or puzzle was tested. Deployment verification is limited to the checks described above.
