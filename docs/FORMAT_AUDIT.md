# Penpa+ answer format audit

Audited on 2026-09-06 against upstream Penpa+ commit
[`34e3fe97804e518288870b70d919e7e76ee18b4d`](https://github.com/swaroopg92/penpa-edit/tree/34e3fe97804e518288870b70d919e7e76ee18b4d).
The original spoiler implementation inspected was commit
[`4778f5ab366e7e6a1cc8d59b0bee2d74c7baa3f5`](https://github.com/cyddrdrd/penpa_spoiler/tree/4778f5ab366e7e6a1cc8d59b0bee2d74c7baa3f5).

## What decoding can promise

The `a=` payload contains the data used by Penpa+'s selected answer checks. It is
not a copy of the author's complete solution layer. A converter can recover the
stored positions and values, and construct an answer that matches the selected
check. It cannot reliably recover distinctions that Penpa+ discarded before
creating the link. Restoring a checker-equivalent answer and restoring the exact
original drawing are different guarantees.

This follows directly from upstream
[`make_solution()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2606),
which filters the solution by enabled options, colors, types, and given clues.
Future upstream answer categories need an explicit implementation and tests;
they must not be silently ignored.

## Confirmed defects in the original spoiler

| Area | Original behavior | Required correction |
| --- | --- | --- |
| Symbols | Discards the entire sixth answer group. | Restore the supported symbol families and variants below. |
| Walls | Requires three comma-separated components. Upstream stores only two. | Read `point1,point2` and restore style 3. |
| Double lines/edges | Converts answer code 1 to style 3 but leaves code 2 as style 2. | Under normal checking, code 2 means double-line style 30. |
| Exact line styles | Changes raw style 1 to 3. | Read answer-check settings and preserve raw styles in exact mode. |
| Exact/multiple shading | Converts array entries to strings and keeps one style component. | Preserve `[cell,style]` and `[cell,...multipleStyles]` structure. |
| Numbers containing commas | Treats the third component as a numeric style. | Split at the first comma; the remainder is the complete text. |
| Token-like answer text | Inserts text directly into compressed-token syntax. | Expand substitutions, edit plain JSON, then apply the complete substitution table. |
| Tight Fit numbers | Writes all values into `number`. | Restore small-corner entries into `numberS` when their positions and genre identify them. |
| OR checks | Assumes fixed six-category answer layout. | Use OR settings to identify each alternative's category. |
| Saved progress | Relies on a remote clone worker for `solvedup` links. | Normalize the known local payload layout and clear obsolete answer history/colors. |
| Earlier/unknown formats | Uses object-line heuristics and assumes modern positional layout. | Recognize supported layouts explicitly; reject others with an explanation. |

### Status of the reported multi-digit problem

The original `buildAnswerObject()` and `buildAnswerHistoryObject()` were executed
with a mixed answer containing `1`, `12`, `123`, `-12`, `0`, and `3.14`. Both
functions retained every full string. The audited upstream square-grid
`draw_number()` method was also executed with the corresponding reconstructed
normal-number objects and a recording canvas stub. It passed all six strings
unchanged to the text renderer, with no branch dependent on another cell's
number of digits.

Consequently, a general failure of ordinary mixed single- and multi-digit values
was **not reproduced by these focused checks**. This does not establish that the
original reported links work end to end. It means there is no evidence to call a
generic digit-splitting bug the cause. An original failing URL is needed to
identify that specific failure reliably. Number text containing commas, token
escaping, Tight Fit placement, and URL-opening behavior are separate issues.
The old page opens its output only after awaiting conversion and logging; popup
blocking is a plausible explanation for failure to open, but was not established
as the reported numeric issue.

Upstream renders normal numbers as complete strings in
[`class_square.js:1488–1547`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_square.js#L1488).
No claim of browser rendering or URL-length testing is implied by the recording
canvas check.

## Encoding rules

### Compression and escaping

Both `p=` and `a=` use base64 over raw DEFLATE over UTF-8 text. Literal `+` is a
base64 character and must not be converted to a space as in form encoding.
Upstream compression functions are
[`encrypt_data()` and `decrypt_data()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/general.js#L3229).

The puzzle text additionally uses the ordered
[`COMPRESS_SUB` table](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L54).
Encoding first escapes `z` as `zZ`, then replaces complete JSON strings such as
`"number"` with `zN`. Decode in reverse table order; encode in forward order.
Apply the table to the complete puzzle text. Do not evaluate token syntax as
JavaScript and do not splice unescaped answer strings directly into it.

### AND/default answer layout

The default layout is six arrays in this order:

| Index | Meaning | Stored entry | Reconstruction |
| --- | --- | --- | --- |
| 0 | Shading and/or large-square symbols | `"cell"` | Accepted shading, or a square when the check selects squares. |
| 0 | Exact shading | `[cell,style]` or `[cell,...styles]` | Restore scalar style or the remaining style array. |
| 1 | Lines | `"p1,p2,code"` | Normal code 1 → style 3, code 2 → style 30; exact mode → raw code. |
| 2 | Edges | `"p1,p2,code"` | Same style rules as lines. |
| 3 | Walls | `"p1,p2"` | Wall style 3. |
| 4 | Numbers/text | `"position,complete text"` | Preserve everything after the first comma as text. |
| 5 | Symbols | `"position,variantFamily"` | Map family and variant below. |

The shading and line rules come from
[`get_surface_solution()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2435),
[`get_line_solution()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2461),
and [`get_edge_solution()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2502).

Number color and number submode are not present in `a=`. Use an accepted answer
color, such as green 2, and normal-number submode `"1"` for ordinary text.
Upstream accepts answer colors 2, 8, 9, and 10 and normal/M/S/L submodes. A
candidate list contributes only when exactly one candidate is selected. The
alphabet genre lowercases accepted text. The non-alphanumeric genre admits
additional text, including commas. Black normal/large problem numbers suppress
answer numbers at the same position. See
[`number extraction`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2666).

Positions are Penpa point identifiers, not row/column pairs. Number and symbol
identifiers may have an `E` suffix for edge overwrite. Preserve that suffix;
upstream handles it in
[`draw_symbol()`/`draw_number()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_square.js#L1471).

### Symbols

These are the families encoded by the AND/default checker:

| Code suffix | Penpa symbol name | Stored variants |
| --- | --- | --- |
| A | `circle_M` | 1–2 |
| B | `tri` | 1–4 |
| C | `arrow_S` | 1–8 |
| D | `battleship_B` | 1–6 |
| D+ | `battleship_B+` | 1–4 |
| E | `star` | 1; original variants 1–3 are merged |
| F | `tents` | 2 |
| G | `math` or `math_G` | 2–3; original family distinction is merged |
| H | `sun_moon` | 3 |
| I | `sun_moon` | 4–5 |

Store reconstructed symbols as `[variant,name,2]` using the ordinary symbol
drawing layer. That display-layer choice is not encoded in `a=`. The source
mapping is the
[`symbol switch`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2730).
Large black squares (`square_LL`, variant 2) are folded into group 0 separately.

### Tight Fit and unusual grids

With the `tightfit` genre tag, upstream appends `numberS` entries to the same
answer group as ordinary numbers. For square-family geometry, let
`N = (nx + 4) * (ny + 4)`. Cell centers, vertices, and ordinary edge points occupy
the first `4*N` point IDs. The following `4*N` IDs are corner positions; the next
`4*N` are side positions. This geometry is defined by
[`Puzzle_square.create_point()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_square.js#L47).
Use recognized geometry plus the genre, rather than interpreting all large IDs
as small numbers on every grid type. Small-number rendering is a separate loop
in [`draw_number()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_square.js#L1810).

The puzzle payload already contains the grid type, dimensions, transformations,
spaces, and delta-encoded active-cell list. Preserve them. Irregular and
non-square boards do not require converting positions to square coordinates.
Generic point preservation alone is not evidence that every grid variant has
been visually tested.

### OR alternatives

When metadata field 20 is `true`, `a=` is a list of alternatives corresponding
to checked OR options in the original UI order. It is **not** the six-array
AND structure. The pinned
[`answer-check UI`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/index.html#L1240)
orders categories as:

`surface_exact`, `surface`, `number`, `loopline_exact`, `loopline`,
`loopedge_exact`, `loopedge`, `wall`, `square`, `circle`, `tri`, `arrow`,
`math`, `battleship`, `tent`, `star`, `akari`, `mine`.

Numbers, shading, lines, and walls follow their category's rules above. OR math
stores `"position,variant"`. Other OR symbol categories store only positions;
circles lose white/black identity, triangles/arrows lose orientation,
battleships lose the part/family, and mines lose the variant. A representative
symbol can pass that check, but must not be presented as recovery of the exact
author drawing. Decode alternatives independently, since merging all
alternatives may overwrite symbols or combine incompatible drawings.
See the [`OR extraction branches`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2820).

The 0.8.0 runtime exposes independent selection through
`convertPenpaUrlDetailed(input, { alternativeIndex })`, which also returns
available alternatives and recovery warnings. At the owner's request, the
webpage preserves its original 0.7.0 wording and interface, so it displays the
first alternative and has no added selector or conversion-notes panel. The
README is likewise preserved verbatim; its clone-backend description reflects
the original release, while the local normalization rules below describe the
updated runtime.

## Modern puzzle payload layout

After decompressing and reversing token substitution, use these zero-based
line positions:

| Line | Ordinary solve/edit URL | Saved solve (`l=solvedup`) |
| --- | --- | --- |
| 0 | Grid/title/author/rules metadata | Same |
| 1 | Spaces | Same |
| 2 | Compact solve mode or full edit mode | Full mode |
| 3 | Problem layer | Same |
| 4 | Empty solve slot or edit answer layer | Solver's progress |
| 5 | Delta-encoded active-cell list | Same |
| 6 | Tool-tab settings | Same |
| 7 | AND answer-check settings | Timer |
| 8 | Timer placeholder | AND answer-check settings |
| 9 | Competition/placeholder | Same |
| 10 | Version | Same |
| 11 | Full mode state | Same |
| 12 | Theme/placeholder | Same |
| 13 | Custom-colors flag | Same |
| 14 | Problem custom-colors layer | Same |
| 15 | Answer custom-colors layer/placeholder | Progress custom colors/history |
| 16 | OR answer-check settings | Same |
| 17 | Genre tags | Same |
| 18 | Custom answer message | Same |

The source exporters are
[`maketext()`/`maketext_duplicate()`/`maketext_solve()`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/class_p.js#L2047).
The loader reads these exact offsets in
[`general.js`](https://github.com/swaroopg92/penpa-edit/blob/34e3fe97804e518288870b70d919e7e76ee18b4d/docs/js/general.js#L2236).

To produce a modern edit URL from saved progress, move line 8's settings to
line 7, reset line 8 to the JSON string `"x"`, replace line 4, and clear stale
answer custom colors and history in line 15. Set valid full modes in both
lines 2 and 11, since the later full mode overrides the earlier one. Keep the
rest in place and omit `l=solvedup` in the resulting edit link. Synthesizing
replay operations is unnecessary for a static reconstructed answer.

## Information that may be absent permanently

- Unselected check categories, unaccepted decorative symbols, annotations,
  pencil marks with multiple candidates, special drawings, and solution history.
- Original colors and font sizes for ordinary numbers; original candidates,
  uppercase alphabet text, text direction, and other number presentation.
- Original shading colors in ordinary shading mode, and shading-versus-square
  identity when both are folded into the same group.
- Original non-double line style when the checker normalizes it, and original
  drawing choices when genre-specific shading is converted into region edges.
- Star variants, the `math` versus `math_G` distinction, and symbol drawing layer.
- Several symbol variants and orientations in OR mode, as described above.
- The intended complete answer when only one constraint or a subset of the
  solution was saved for checking.

These are format limitations, not promises that additional converter logic can
recover the missing data. A release should state its tested coverage and known
limits rather than claim it can decode everything.

## Recommended regression evidence

1. Mixed ordinary numbers (`1`, `12`, `123`, `0`, negative and decimal text),
   plus commas, Unicode, quotes, backslashes, `zN`, `zS`, and `null` text.
2. Tight Fit corner and side entries alongside ordinary numbers.
3. All listed AND symbol families, including `D+` and `E`-suffix positions.
4. Walls, normal double lines/edges, and exact styles 1, 2, 3, and 30.
5. Scalar and multi-style exact shading, and square-only checking.
6. Every OR category and multiple alternatives, with an explicit ambiguity
   notice where only locations were saved.
7. A normal solve URL and a saved-progress URL containing timer, stale answers,
   custom colors, and history; verify the original geometry/problem survives.
8. Actual upstream loading and screenshots for representative rectangular,
   irregular, rotated/reflected, and non-square grids.
9. Unsupported/unknown categories and legacy layouts fail clearly instead of
   returning a partial answer with a success message.

Prefer a round trip through the pinned upstream `make_solution()` as the
semantic oracle: reconstructed data should regenerate the saved answer for the
selected check. Compression round trips alone establish byte integrity, not
Penpa compatibility or correct visible output.
