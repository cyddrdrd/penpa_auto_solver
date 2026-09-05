/* Penpa+ answer-check reconstruction. See docs/FORMAT_AUDIT.md for the format. */
const PENPA_BASE = "https://swaroopg92.github.io/penpa-edit/";
const TINYURL_EXPANDER_WORKER = "https://tinyurl-expand.cyddrdrd.workers.dev/";
const LOG_WORKER = "https://penpa-spoiler-log.cyddrdrd.workers.dev/";

// Same ordered substitutions as Penpa+. Escape literal z before substituting keys.
const COMPRESS_SUB = [["z", "zZ"], ...[
  ["qa", "9"], ["pu_q", "Q"], ["pu_a", "A"], ["grid", "G"],
  ["edit_mode", "M"], ["surface", "S"], ["line", "L"], ["lineE", "E"],
  ["wall", "W"], ["cage", "C"], ["number", "N"], ["symbol", "Y"],
  ["special", "P"], ["board", "B"], ["command_redo", "R"],
  ["command_undo", "U"], ["command_replay", "8"], ["numberS", "1"],
  ["freeline", "F"], ["freelineE", "2"], ["thermo", "T"], ["arrows", "3"],
  ["direction", "D"], ["squareframe", "0"], ["polygon", "5"],
  ["deletelineE", "4"], ["killercages", "6"], ["nobulbthermo", "7"], ["__a", "_"]
].map(([key, token]) => [JSON.stringify(key), "z" + token]), ["null", "zO"]];

function expandPuzzleText(text) {
  for (const [plain, token] of [...COMPRESS_SUB].reverse()) text = text.split(token).join(plain);
  return text;
}
function compressPuzzleText(text) {
  for (const [plain, token] of COMPRESS_SUB) text = text.split(plain).join(token);
  return text;
}
function parsePenpaParams(input) {
  const url = new URL(input.trim());
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Please use an http or https Penpa URL.");
  const params = Object.create(null);
  // Parse manually: URLSearchParams would turn literal base64 + into a space.
  for (const text of [url.search.slice(1), url.hash.slice(1)]) {
    for (const part of text.split("&")) {
      if (!part) continue;
      const eq = part.indexOf("=");
      const key = decodeURIComponent(eq < 0 ? part : part.slice(0, eq));
      const value = decodeURIComponent(eq < 0 ? "" : part.slice(eq + 1));
      if (Object.hasOwn(params, key) && params[key] !== value) throw new Error(`Conflicting URL parameter: ${key}.`);
      params[key] = value;
    }
  }
  return params;
}
function base64ToBytes(b64) {
  const binary = atob(b64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function inflateRawB64(b64) {
  return new TextDecoder("utf-8", {fatal: true}).decode(pako.inflateRaw(base64ToBytes(b64)));
}
function deflateRawB64(text) {
  return bytesToBase64(pako.deflateRaw(new TextEncoder().encode(text), {level: 9}));
}
async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {...options, signal: controller.signal});
    if (!response.ok) throw new Error(`Service returned HTTP ${response.status}.`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function expandShortUrlIfNeeded(input) {
  const url = new URL(input.trim());
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Please use an http or https URL.");
  if (!["tinyurl.com", "www.tinyurl.com"].includes(url.hostname.toLowerCase())) return input.trim();
  try {
    const data = await fetchJSON(TINYURL_EXPANDER_WORKER + "?url=" + encodeURIComponent(url.href));
    if (!data.success || typeof data.longurl !== "string") throw new Error(data.error || "No expanded URL returned.");
    const params = parsePenpaParams(data.longurl);
    if (!params.p || !params.a) throw new Error("The destination has no answer-check data.");
    return data.longurl;
  } catch (err) {
    throw new Error("Could not expand TinyURL. Paste the full Penpa link instead. " + err.message);
  }
}
async function logConversion(inputUrl, outputUrl) {
  // Preserve the existing logging feature, but never delay or fail a conversion.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(LOG_WORKER + "log", {method: "POST", signal: controller.signal,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({input_url: inputUrl, output_url: outputUrl})});
  } catch (err) { console.warn("Logging failed:", err.message); }
  finally { clearTimeout(timer); }
}
function emptyPenpaObject() {
  const layer = {};
  for (const key of ["command_redo", "command_undo", "command_replay"]) layer[key] = {__a: []};
  for (const key of ["surface", "number", "numberS", "symbol", "line", "lineE", "wall", "cage", "deletelineE", "freeline", "freelineE"]) layer[key] = {};
  for (const key of ["thermo", "arrows", "direction", "squareframe", "polygon", "killercages", "nobulbthermo"]) layer[key] = [];
  return layer;
}
function objectValue(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${name}: expected an object.`);
  return value;
}
function parseJSON(text, name) {
  try { return JSON.parse(text); } catch { throw new Error(`Invalid ${name} in the Penpa payload.`); }
}
function cellId(value, allowEdge = false) {
  const id = String(value);
  if (!(allowEdge ? /^\d+E?$/ : /^\d+$/).test(id) || !Number.isSafeInteger(Number(id.replace(/E$/, "")))) throw new Error(`Invalid answer point ID: ${id}.`);
  return id;
}
function styleNumber(value) {
  if (!Number.isSafeInteger(Number(value)) || !/^\d+$/.test(String(value))) throw new Error("Invalid answer style.");
  return Number(value);
}
function setEntry(layer, key, id, value) {
  if (Object.hasOwn(layer[key], id) && JSON.stringify(layer[key][id]) !== JSON.stringify(value)) {
    throw new Error(`Conflicting ${key} answers at point ${id}.`);
  }
  layer[key][id] = value;
}
const SYMBOLS = {
  A: ["circle_M", [1, 2]], B: ["tri", [1, 2, 3, 4]],
  C: ["arrow_S", [1, 2, 3, 4, 5, 6, 7, 8]], D: ["battleship_B", [1, 2, 3, 4, 5, 6]],
  "D+": ["battleship_B+", [1, 2, 3, 4]], E: ["star", [1]], F: ["tents", [2]],
  G: ["math", [2, 3]], H: ["sun_moon", [3]], I: ["sun_moon", [4, 5]]
};
const OR_LABELS = {
  surface_exact: "Exact colours", surface: "Shading", number: "Numbers",
  loopline_exact: "Exact lines", loopline: "Lines", loopedge_exact: "Exact edges", loopedge: "Edges",
  wall: "Walls", square: "Squares", circle: "Circles", tri: "Triangles", arrow: "Arrows",
  math: "Math symbols", battleship: "Battleships", tent: "Tents", star: "Stars", akari: "Light bulbs", mine: "Mines"
};
const GRID_TYPES = new Set(["square", "hex", "tri", "pyramid", "iso", "sudoku", "kakuro",
  "tetrakis_square", "truncated_square", "snub_square", "cairo_pentagonal",
  "rhombitrihexagonal", "deltoidal_trihexagonal", "penrose_P3"]);
function validateLayout(metadata, spaces) {
  if (!GRID_TYPES.has(metadata[0])) throw new Error(`Unsupported Penpa grid type: ${metadata[0]}.`);
  if (metadata.length < 11 || [1, 2, 3, 7, 8].some(i => !Number.isFinite(Number(metadata[i])) || Number(metadata[i]) <= 0) ||
    [4, 5, 6, 9, 10].some(i => metadata[i] === "" || !Number.isFinite(Number(metadata[i])))) {
    throw new Error("Invalid Penpa grid dimensions or layout.");
  }
  if (metadata[20] && !["true", "false"].includes(metadata[20])) throw new Error("Invalid multiple-answer marker.");
  if (!Array.isArray(spaces) || spaces.length > 4 || spaces.some(n => !Number.isInteger(n) || n < 0)) throw new Error("Invalid Penpa grid margins.");
}
function validateSettings(settings, prefix) {
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value !== "boolean") throw new Error(`Invalid answer-check setting: ${key}.`);
    const kind = key.slice(prefix.length);
    if (value && (!key.startsWith(prefix) || !(Object.hasOwn(OR_LABELS, kind) ||
      (prefix === "sol_" && ["ignoreloopline", "ignoreborder"].includes(kind))))) {
      throw new Error(`Unsupported active answer-check setting: ${key}.`);
    }
  }
}
function reconstructAnswer(answer, options = {}) {
  if (!Array.isArray(answer) || answer.some(items => !Array.isArray(items))) throw new Error("Invalid answer-check data: expected lists of answers.");
  const layer = emptyPenpaObject();
  const warnings = [];
  const settings = options.settings || {};
  const tags = options.tags || [];
  const squareAllowed = settings.sol_square === true || !Object.values(settings).some(value => value === true);
  const addSurface = (items, exact = false, square = false) => {
    for (const item of items) {
      if (Array.isArray(item)) {
        if (item.length < 2) throw new Error("Invalid exact-colour answer.");
        const colours = item.slice(1).map(styleNumber);
        setEntry(layer, "surface", cellId(item[0]), colours.length === 1 ? colours[0] : colours);
      } else if (square || (!exact && !options.multisolution && squareAllowed &&
        (String(item).endsWith("E") || [1, 3, 4, 8].includes(options.problem?.surface?.[item])))) {
        setEntry(layer, "symbol", cellId(item, true), [2, "square_LL", 2]);
      }
      else {
        if (exact) throw new Error("Exact-colour answer is missing its colour data.");
        setEntry(layer, "surface", cellId(item), 1);
      }
    }
  };
  const addSegments = (items, key, exact = false) => {
    for (const item of items) {
      if (typeof item !== "string") throw new Error(`Invalid ${key} answer.`);
      const parts = item.split(",");
      if (parts.length !== (key === "wall" ? 2 : 3)) throw new Error(`Invalid ${key} answer: ${item}.`);
      const id = cellId(parts[0]) + "," + cellId(parts[1]);
      let style = key === "wall" ? 3 : styleNumber(parts[2]);
      if (key !== "wall" && !exact) {
        if (![1, 2].includes(style)) throw new Error(`Unknown normalized ${key} style ${style}.`);
        style = style === 1 ? 3 : 30;
      }
      setEntry(layer, key, id, style);
    }
  };
  const addNumbers = items => {
    for (const item of items) {
      if (typeof item !== "string" || item.indexOf(",") < 1) throw new Error("Invalid number answer.");
      const comma = item.indexOf(",");
      const id = cellId(item.slice(0, comma), true);
      const value = item.slice(comma + 1); // All remaining text is the value, never a colour/style.
      let small = false;
      if (tags.includes("tightfit")) {
        if (!Number.isSafeInteger(options.pointCount)) throw new Error("Tight-fit numbers require a supported square-grid layout.");
        small = Number(id) >= options.pointCount;
      }
      setEntry(layer, small ? "numberS" : "number", id, small ? [value, 2] : [value, 2, "1"]);
    }
  };
  const addSymbols = items => {
    for (const item of items) {
      const match = typeof item === "string" && item.match(/^(\d+E?),(\d+)([A-I]\+?)$/);
      const spec = match && SYMBOLS[match[3]];
      if (!spec || !spec[1].includes(Number(match[2]))) throw new Error(`Unsupported symbol answer: ${String(item)}.`);
      setEntry(layer, "symbol", cellId(match[1], true), [Number(match[2]), spec[0], 2]);
    }
  };
  let alternatives = [], selectedAlternative = 0, selectedKind = null;
  if (options.multisolution) {
    // The saved object preserves Penpa's checkbox order, including older versions.
    const keys = Object.keys(options.orSettings || {}).filter(k => options.orSettings[k] === true);
    if (!keys.length || keys.length !== answer.length || keys.some(k => !k.startsWith("sol_or_") || !Object.hasOwn(OR_LABELS, k.slice(7)))) {
      throw new Error("Cannot match OR answers to their saved answer-check settings.");
    }
    alternatives = keys.map((key, index) => ({index, label: OR_LABELS[key.slice(7)]}));
    selectedAlternative = options.alternativeIndex ?? 0;
    if (!Number.isInteger(selectedAlternative) || selectedAlternative < 0 || selectedAlternative >= keys.length) throw new Error("Invalid answer alternative.");
    selectedKind = keys[selectedAlternative].slice(7);
    const items = answer[selectedAlternative];
    switch (selectedKind) {
      case "surface": case "surface_exact": case "square":
        addSurface(items, selectedKind === "surface_exact", selectedKind === "square"); break;
      case "loopline": case "loopline_exact": addSegments(items, "line", selectedKind.endsWith("_exact")); break;
      case "loopedge": case "loopedge_exact": addSegments(items, "lineE", selectedKind.endsWith("_exact")); break;
      case "wall": addSegments(items, "wall"); break;
      case "number": addNumbers(items); break;
      case "math":
        addSymbols(items.map(item => String(item) + "G")); break;
      default: {
        const reps = {circle: "1A", tri: "1B", arrow: "1C", battleship: "1D", tent: "2F", star: "1E", akari: "3H", mine: "4I"};
        addSymbols(items.map(id => cellId(id, true) + "," + reps[selectedKind]));
        if (items.length && ["circle", "tri", "arrow", "battleship", "mine"].includes(selectedKind)) warnings.push(`${OR_LABELS[selectedKind]}: this OR check stores positions only. The displayed variants are examples; the original orientations or variants cannot be recovered.`);
      }
    }
    warnings.push("This link accepts alternative answer checks. The generated link shows only the selected alternative.");
  } else {
    if (answer.length !== 6) throw new Error("Unsupported answer-check format: expected six answer categories.");
    const squareOnly = settings.sol_square === true && !settings.sol_surface && !settings.sol_surface_exact;
    addSurface(answer[0], settings.sol_surface_exact === true,
      squareOnly || (settings.sol_surface_exact === true && settings.sol_square === true));
    addSegments(answer[1], "line", settings.sol_loopline_exact === true);
    addSegments(answer[2], "lineE", settings.sol_loopedge_exact === true);
    addSegments(answer[3], "wall");
    addNumbers(answer[4]);
    addSymbols(answer[5]);
    if (answer[0].some(item => !Array.isArray(item)) && !squareOnly && !settings.sol_surface_exact) warnings.push("Shading checks may combine filled squares and shaded cells. The reconstruction uses marks that satisfy the check; the original distinction is not always stored.");
  }
  const counts = Object.fromEntries(["surface", "line", "lineE", "wall", "number", "numberS", "symbol"].map(k => [k, Object.keys(layer[k]).length]));
  if (!Object.values(counts).some(Boolean)) warnings.push("The selected answer check contains no recoverable marks.");
  return {layer, warnings, counts, alternatives, selectedAlternative, selectedKind};
}
function buildAnswerObject(answer, options = {}) { return reconstructAnswer(answer, options).layer; }
function defaultMode() {
  const tool = colour => ({edit_mode: "number", surface: ["", 1], multicolor: ["", 1],
    line: ["1", colour === 1 ? 2 : 3], lineE: ["1", colour === 1 ? 2 : 3], wall: ["", 3],
    cage: ["1", 10], number: ["1", colour], symbol: ["circle_L", 1], special: ["thermo", ""],
    board: ["", ""], move: ["1", ""], combi: ["battleship", 3], sudoku: ["1", colour]});
  return {qa: "pu_a", grid: ["1", "2", "1"], pu_q: tool(1), pu_a: tool(2)};
}
function upgradeToolState(lines) {
  const base = defaultMode();
  let mode;
  if (lines[2].trim().startsWith("{")) mode = objectValue(parseJSON(lines[2], "tool settings"), "tool settings");
  else {
    if (lines[11]?.trim().startsWith("{")) mode = objectValue(parseJSON(lines[11], "saved tool settings"), "saved tool settings");
    else mode = {};
    const pieces = lines[2].split("~");
    mode.grid = parseJSON(pieces[0], "grid settings");
    if (pieces.length >= 3) {
      const tool = parseJSON(pieces[1], "selected tool");
      if (typeof tool !== "string" || !Object.hasOwn(base.pu_a, tool)) throw new Error("Unsupported selected Penpa tool.");
      mode.pu_a = {...(mode.pu_a || {}), edit_mode: tool, [tool]: parseJSON(pieces[2], "selected tool settings")};
    }
  }
  const result = {...base, ...mode, qa: "pu_a", pu_q: {...base.pu_q, ...mode.pu_q}, pu_a: {...base.pu_a, ...mode.pu_a}};
  if (!Array.isArray(result.grid) || result.grid.length < 3) throw new Error("Invalid Penpa grid settings.");
  lines[2] = JSON.stringify(result);
  if (lines.length > 11) lines[11] = lines[2];
}
function addSolutionSuffixToTitle(lines) {
  // Header fields are positional. Never append to geometry/background fields.
  const fields = lines[0].split(",");
  const idx = fields.findIndex(field => field.startsWith("Title: "));
  if (idx >= 0 && !fields[idx].trim().toLowerCase().endsWith("(solution)")) fields[idx] += " (solution)";
  lines[0] = fields.join(",");
}
async function convertPenpaUrlDetailed(inputUrl, options = {}) {
  const expandedUrl = await expandShortUrlIfNeeded(inputUrl);
  const params = parsePenpaParams(expandedUrl);
  if (!params.p) throw new Error("Input URL has no p= puzzle payload.");
  if (!params.a) throw new Error("Input URL has no a= answer-check payload. A solution cannot be recovered without it.");
  let pText, answer;
  try { pText = expandPuzzleText(inflateRawB64(params.p)); }
  catch { throw new Error("The p= puzzle payload is not valid compressed Penpa data."); }
  try { answer = JSON.parse(inflateRawB64(params.a)); }
  catch { throw new Error("The a= answer-check payload is not valid compressed JSON."); }
  const lines = pText.split("\n");
  if (lines.length < 6 || /^\d/.test(lines[0])) throw new Error("Unsupported legacy or incomplete Penpa puzzle format.");
  const metadata = lines[0].split(",");
  validateLayout(metadata, parseJSON(lines[1], "grid margins"));
  const problem = objectValue(parseJSON(lines[3], "problem layer"), "problem layer");
  if (!Array.isArray(parseJSON(lines[5], "grid point list"))) throw new Error("Invalid grid point list.");
  const solvedup = params.l === "solvedup";
  const settingsIndex = solvedup ? 8 : 7;
  const settings = lines[settingsIndex] ? objectValue(parseJSON(lines[settingsIndex], "answer settings"), "answer settings") : {};
  const orSettings = lines[16] ? objectValue(parseJSON(lines[16], "OR answer settings"), "OR answer settings") : {};
  validateSettings(settings, "sol_");
  validateSettings(orSettings, "sol_or_");
  const tags = lines[17] ? parseJSON(lines[17], "genre tags") : [];
  if (!Array.isArray(tags)) throw new Error("Invalid genre tags.");
  const pointCount = ["square", "sudoku", "kakuro"].includes(metadata[0]) ? 4 * (Number(metadata[1]) + 4) * (Number(metadata[2]) + 4) : undefined;
  const result = reconstructAnswer(answer, {...options, settings, orSettings, tags, pointCount, problem, multisolution: metadata[20] === "true"});
  addSolutionSuffixToTitle(lines);
  upgradeToolState(lines);
  lines[4] = JSON.stringify(result.layer);
  if (solvedup) {
    lines[7] = lines[8];
    lines[8] = JSON.stringify("x");
  }
  // Edit links require an answer colour object, not solve-mode's "x" placeholder.
  if (lines.length > 14 && lines[14]) {
    objectValue(parseJSON(lines[14], "problem colour layer"), "problem colour layer");
    lines[15] = JSON.stringify(emptyPenpaObject());
  }
  // Convert a selected OR branch into an ordinary edit-mode check of that branch.
  if (result.selectedKind) {
    const and = Object.fromEntries(Object.keys(settings).map(k => [k, false]));
    and["sol_" + result.selectedKind] = true;
    // Penpa's OR line/edge branches always ignore given segments/borders.
    if (result.selectedKind.startsWith("loopline")) and.sol_ignoreloopline = true;
    if (result.selectedKind.startsWith("loopedge")) and.sol_ignoreborder = true;
    lines[7] = JSON.stringify(and);
    lines[16] = JSON.stringify(Object.fromEntries(Object.keys(orSettings).map(k => [k, false])));
    const fields = lines[0].split(","); fields[20] = "false"; lines[0] = fields.join(",");
  }
  const newText = compressPuzzleText(lines.join("\n"));
  const newP = deflateRawB64(newText);
  if (inflateRawB64(newP) !== newText) throw new Error("Compression round-trip failed.");
  const url = PENPA_BASE + "#m=edit&p=" + newP;
  if (options.log !== false) void logConversion(inputUrl, url);
  return {url, warnings: result.warnings, counts: result.counts, alternatives: result.alternatives,
    selectedAlternative: result.selectedAlternative, expandedUrl};
}
async function convertPenpaUrl(inputUrl, options = {}) { return (await convertPenpaUrlDetailed(inputUrl, options)).url; }

if (typeof module !== "undefined" && module.exports) module.exports = {
  parsePenpaParams, inflateRawB64, deflateRawB64, expandPuzzleText, compressPuzzleText,
  buildAnswerObject, emptyPenpaObject, convertPenpaUrl, convertPenpaUrlDetailed,
  expandShortUrlIfNeeded, reconstructAnswer, addSolutionSuffixToTitle
};
