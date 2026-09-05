# Progress — 0.8.0

Status: implementation and local verification complete. The owner has signed into GitHub, and the update is being staged on the remote `update-0.8.0` branch. Publication to the live site has not yet been verified.

## Completed

- [x] Reviewed the entire earlier “Penpa URL Decoder” conversation and the current repository.
- [x] Saved the original repository at commit `4778f5a` as a ZIP and a verified full-history Git bundle.
- [x] Worked on a separate local branch, `fix/decoder-coverage`.
- [x] Audited Penpa+ 3.2.4 source at `34e3fe97804e518288870b70d919e7e76ee18b4d`.
- [x] Replaced compressed-text surgery with full expansion, JSON reconstruction, and correct re-encoding.
- [x] Restored all currently encoded symbol families, walls, exact styles, double lines/edges, multicolour shading, tight-fit corner numbers, and edge-position identifiers.
- [x] Preserved full number/text values, including commas and reserved compression characters.
- [x] Added OR alternative selection and explanations of information lost by Penpa through the detailed converter API. The unchanged webpage uses the first alternative.
- [x] Normalized saved-progress links locally and cleared obsolete answer progress/history/colours.
- [x] Preserved original givens, geometry, cropped/irregular cell lists, transforms, metadata, and rules.
- [x] Rejected malformed or unsupported data rather than silently omitting answers.
- [x] Improved asynchronous opening and prevented overlapping conversions in the page.
- [x] Ran 110 automated regression tests, all passing; re-ran the suite after restoring the original README and webpage wording with the same result.
- [x] Restored the README byte-for-byte from the original 0.7.0 repository and preserved all original webpage wording, including its 0.7.0 heading and status messages. An independent diff audit passed.
- [x] Re-tested three authentic input links from the earlier conversation, all passing independent Penpa checker comparisons.
- [x] Ran real browser loading/rendering/checker tests on all 14 current grid types and the historical links: 20 checks passed, zero failed. Three of these checks also verified saved intermediate conversions, so the historical source set remains three distinct puzzles.
- [x] Tested the live TinyURL expansion Worker with the historical saved-progress short link; it expanded and reconstructed all 196 line segments with logging disabled.
- [x] Opened a generated URL directly on the public Penpa site and visually confirmed mixed `7`, `12`, `123` answers in setter mode.
- [x] Prepared an update ZIP, change log, audit, test report, and rollback/upload guide.

## Confirmed original problems and fixes

| Problem | Finding and result |
| --- | --- |
| Multi-digit and mixed numbers | Original simple digit parser alone did not reproduce a general digit-length failure. Real mixed-number and broad generated cases pass. Confirmed comma truncation, compression-token escaping, and tight-fit storage defects are fixed. |
| Shapes | Original code ignored the entire symbol-answer category. Every symbol family encoded by the current checker is now reconstructed. |
| Walls | Original code expected a nonexistent third style field and skipped valid walls. Fixed. |
| Double lines/edges | Normalized code 2 must become Penpa style 30. Fixed while preserving exact raw styles. |
| Multicolour cells | Flattened arrays are now reconstructed as arrays. |
| Saved-progress layout | Timer/settings positions are normalized correctly in the browser; the clone Worker is no longer required. |
| Irregular grids | Original geometry and active point lists are preserved. Actual constructors for all 14 current grid types passed browser tests. |
| OR checking | Ordered alternatives are decoded separately. The detailed API accepts `alternativeIndex` and returns warnings about lost orientation/variant information. The unchanged webpage displays the first alternative. |
| Very long links | Opening begins inside the button click to avoid the common asynchronous popup issue. Browser URL limits can still require Penpa's Load dialog. |

## Remaining limits and release decision

- This is **0.8.0**, not 1.0.0. It does not claim to recreate information absent from an answer-check link.
- The visible heading still says **0.7.0** to preserve the owner's wording. The README is intentionally unchanged, so descriptions such as its clone-backend explanation reflect the original 0.7.0 behavior; this log and the technical documentation describe the updated runtime.
- The webpage has no OR selector or conversion-notes panel. Use `convertPenpaUrlDetailed(input, { alternativeIndex })` to select another alternative and read recovery warnings.
- Unchecked solution decorations, original fonts and some colours, several symbol variants, and OR symbol orientations cannot always be recovered.
- Links without `a=` and legacy numerical-header Penpa v1 links are unsupported with explicit errors.
- Browser checks used Chromium on macOS. iPhone Safari and Firefox were not tested in this environment.
- The existing TinyURL and logging services are external dependencies. A live expansion smoke test passed; ongoing service availability and server-side correctness are not guaranteed by the offline tests. No Worker code was changed.
- The historical request to test every puzzle by the author is not claimed as completed; this work tested the three recovered historical links and the documented generated fixtures.
- The signed-in GitHub session is available for staging and publication. The remote update branch must be completed, merged, and checked on GitHub Pages before deployment is marked complete. Follow [UPDATE_GUIDE.md](UPDATE_GUIDE.md).

Private conversation excerpts and original URLs are kept outside the update repository and ZIP. The shipped regression fixtures are generated, and the upstream test source carries its original licence.
