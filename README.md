## Disclaimer ##

This tool is intended for puzzle setters, testers, and technical inspection of Penpa+ links. 
Please respect puzzle authors and do not use this tool to spoil puzzles for others without permission.

This tool may log conversion time, input/output URLs, etc for debugging.

---

# Penpa+ Spoiler

Penpa+ Spoiler is a small web tool for converting Penpa+ answer-check links into Penpa+ solution links (setter mode).
It is designed for puzzle setters, testers, and those who want to recover or inspect the solution from a Penpa+ answer-check link.

Website: https://cyddrdrd.github.io/penpa_spoiler/ 

## What it does

Penpa+ answer-check links usually contain:

- the puzzle grid in p=...
- the answer-check data in a=...

This tool decodes the link, reconstructs the answer-check data as a solution layer, and generates a new Penpa link for setter mode.

## Supported inputs

The converter supports:

- full Penpa+ answer-check links
  - links using #m=solve&p=...&a=...
  - links using ?m=solve&p=...&a=...
  - solvedup links using #m=edit&p=...&a=...&l=solvedup
  - solvedup links using ?m=edit&p=...&a=...&l=solvedup
- tinyurl.com links pointing to Penpa+ answer-check links


## Features

- Decode Penpa+ answer-check links into solution links in setter mode.
- Reconstruct answer-check objects such as:
  - colours
  - numbers / sudokus
  - lines
  - edges
  - ...
- Add (solution) to the puzzle title automatically.
- Support TinyURL expansion through a Cloudflare Worker backend.
- Support solvedup links through automatic Penpa+ clone normalization.
- Provide a simple browser-based interface:
  - Convert and Open
  - Convert only
  - Copy generated URL to clipboard

## Browser recommendation
- Chrome or Firefox is recommended
- iPhone Safari is not recommended

Generated Penpa+ links may be extremely long. If a generated URL is too long to open directly in your browser, try using "load" in an empty Penpa+.

## How it works

The project has three main frontend files:

  - text index.html for the Webpage 
  - structure page.js for the Button logic and page interaction
  - converter.js for the Main Penpa+ decoding/conversion logic 

The frontend performs the main Penpa+ decoding in the browser using JavaScript and pako for raw deflate/inflate compression.

Two Cloudflare Workers are used for special cases:

  - tinyurl-expand expands tinyurl.com links into full Penpa+ links
  - penpa-clone uses Penpa+'s own clone logic to normalize solvedup links 

Normal answer-check links are converted directly in the browser. Solvedup links require the clone backend and may take several seconds longer.

## Changelog

See CHANGELOG.md for version history.
