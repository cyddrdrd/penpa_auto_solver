# Changelog

All notable changes to this project are documented here.

## [0.8.0] - 2026-09-06

- Support multi-digit and mixed-digit numbers, tight-fit corner numbers, and complete text values.
- Decode all answer-check symbol families, walls, and multicolour shading.
- Preserve exact line and edge styles, and handle squares combined with shading.
- Convert saved-progress links locally while preserving puzzle shapes, clues, and rules.
- Decode OR answer alternatives, with alternative selection available through the converter API.

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
