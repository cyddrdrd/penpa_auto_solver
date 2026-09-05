# Changelog

All notable changes to this project are documented here.

## [0.8.0] - 2026-09-06

### Fixed
- Decode all answer-check symbol families, walls, multicolour surfaces, and tight-fit corner numbers.
- Preserve complete number/text values, commas, Unicode, and literal compression tokens.
- Distinguish normalized green/double line codes from exact line/edge styles.
- Handle squares combined with shading, including squares over given shading and edge-position IDs.
- Normalize saved-progress links locally while preserving geometry, clues, metadata, and rules; remove the clone Worker dependency.
- Clear stale solution progress, history, and custom colours when rebuilding the answer layer.
- Open the result window during the user's click and prevent concurrent conversions.
- Keep logging from delaying or failing conversion.

### Added
- OR answer alternative selection and notes about omitted orientation/variant information through `convertPenpaUrlDetailed(input, { alternativeIndex })`.
- Explicit rejection of malformed and unsupported input instead of silent data loss.
- 110 independent offline regression tests, a pinned source-format audit, browser test report, progress log, and update/rollback guide.

### Release scope
- The original 0.7.0 README and webpage wording are preserved at the owner's request, including the visible 0.7.0 heading. The runtime update is 0.8.0.
- The unchanged webpage displays the first OR alternative. Alternative selection and reconstruction warnings are available through the detailed API; no selector or conversion-notes panel is shipped.
- The README intentionally retains its original descriptions, including the former clone backend. This changelog and the technical documentation describe the updated behavior.
- Reconstructs information stored by the answer checker; does not promise restoration of unchecked decorations or omitted visual choices.
- Held at 0.8.0 rather than 1.0.0 because universal recovery is not justified.

---

## [0.7.0] - 2026-06-02

### Added
- Added a private log to record uses, including time, input, output...

---

## [0.6.0] - 2026-06-02

### Added
- Added changelog to record updates.
- Added readme.

---

## [0.5.1] - 2026-06-02

### Changed
- Bug fixes.
- Normal answer-check links continue to be decoded directly for faster conversion.

---

## [0.5.0] - 2026-06-02

### Added
- Added support for l=solvedup Penpa links. (This is for you Agent!)
  - Added automatic Penpa clone/normalization backend for special solved duplicate links.
  - Solvedup links are now processed transparently: users can paste them the same way as normal Penpa answer-check links.
    Up to ~100 links can be processed per day.
    
---

## [0.4.1] - 2026-06-01

### Added
- Added support for redirect-chain handling, including TinyURL preview/deprecated links.

---

## [0.4.0] - 2026-06-01

### Added
- Added support for tinyurl.com links.
  - Added a Cloudflare Worker backend to expand TinyURL links before conversion.

---

## [0.3.0] - 2026-06-01

### Changed
- Simplified the web page interface.
  - Updated the button layout to improve usability for long generated Penpa URLs.

---

## [0.2.0] - 2026-06-01

### Changed
- Separated the project into multiple files:
  - index.html for the webpage structure.
  - page.js for page interaction and button logic.
  - converter.js for the main Penpa conversion code.

---

## [0.1.1] - 2026-06-01

### Added
- Added title modification so converted puzzles are renamed with (solution).

---

## [0.1.0] - 2026-06-01

### Added
- First working version of the converter.
