'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const AND_OPTIONS = [
  'surface_exact', 'surface', 'number', 'loopline_exact', 'loopline',
  'ignoreloopline', 'loopedge_exact', 'loopedge', 'ignoreborder', 'wall',
  'square', 'circle', 'tri', 'arrow', 'math', 'battleship', 'tent', 'star',
  'akari', 'mine',
];
const OR_OPTIONS = AND_OPTIONS.filter(name => !['ignoreloopline', 'ignoreborder'].includes(name));
const clone = value => JSON.parse(JSON.stringify(value));
const deflate = value => zlib.deflateRawSync(Buffer.from(value, 'utf8')).toString('base64');
const inflate = value => zlib.inflateRawSync(Buffer.from(value, 'base64')).toString('utf8');

function createReference(options = {}) {
  const ids = {};
  const and = AND_OPTIONS.map(name => ids['sol_' + name] = {
    id: 'sol_' + name, checked: (options.settings || []).includes(name),
  });
  const or = OR_OPTIONS.map(name => ids['sol_or_' + name] = {
    id: 'sol_or_' + name, checked: (options.orSettings || []).includes(name),
  });
  const values = {
    saveinfotitle: options.title ?? 'Reference puzzle',
    saveinfoauthor: options.author ?? 'Test author',
    saveinfosource: options.source ?? 'https://example.com/puzzle',
    saveinforules: options.rules ?? 'Use every clue.',
    custom_message: 'Well done!\nSolved, with care &=',
  };
  for (const [id, value] of Object.entries(values)) ids[id] = { value };
  ids.canvas = { getContext: () => ({}) };
  ids.dvique = {};
  ids.answersetting = { getElementsByClassName: name => name === 'solcheck' ? and : or };
  ids.save_undo = { checked: false };
  const context = vm.createContext({
    console,
    document: { getElementById: id => ids[id] || { checked: false, value: '' }, addEventListener() {} },
    Conflicts: function Conflicts() {},
    UserSettings: {
      draw_edges: true, tab_settings: ['surface', 'number', 'symbol'],
      custom_colors_on: options.customColors ?? false, shorten_links: false,
      ignore_line_style: false,
    },
    $: () => ({ select2: () => options.tags || [] }),
    location: { href: 'https://swaroopg92.github.io/penpa-edit/#m=edit', hash: '#m=edit' },
    encrypt_data: deflate,
    sw_timer: { getTimeValues: () => ({ toString: () => '00:00:03:21:4' }) },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'reference/penpa-reference.js'), 'utf8'), context);
  const { Puzzle, COMPRESS_SUB } = context.PenpaReference;
  const puzzle = new Puzzle(options.gridtype || 'square');
  for (const name of ['pu_q', 'pu_a', 'pu_q_col', 'pu_a_col']) {
    puzzle.reset_puzzle(name);
    Object.assign(puzzle[name], clone(options[name] || {}));
  }
  Object.assign(puzzle, {
    nx: 4, ny: 3, nx0: 8, ny0: 7, size: 38, canvasx: 250, canvasy: 200,
    center_n: 26, center_n0: 26, centerlist: [18, 19, 20, 21, 26, 27, 28, 29, 34, 35, 36, 37],
    space: [0, 0, 0, 0], sudoku: [0, 0, 0, 0], cellsoutsideFrame: [], frame: {},
    ...clone(options.puzzle || {}),
  });
  function expand(text) {
    for (const [full, short] of [...COMPRESS_SUB].reverse()) text = text.split(short).join(full);
    return text;
  }
  function compress(text) {
    for (const [full, short] of COMPRESS_SUB) text = text.split(full).join(short);
    return text;
  }
  function readUrl(url) {
    const data = Object.fromEntries(url.split(/[?#]/).pop().split('&').map(part => {
      const split = part.indexOf('=');
      return [decodeURIComponent(part.slice(0, split)), decodeURIComponent(part.slice(split + 1))];
    }));
    const raw = inflate(data.p);
    const lines = expand(raw).split('\n');
    return { data, raw, lines, answer: lines[4] ? JSON.parse(lines[4]) : null };
  }
  function generate(solvedup = false) {
    const check = clone(puzzle.make_solution());
    if (!solvedup) return { url: puzzle.maketext_solve_solution(), check };
    puzzle.mmode = 'solve';
    if (options.savedProgress) {
      puzzle.reset_puzzle('pu_a');
      Object.assign(puzzle.pu_a, clone(options.savedProgress));
    }
    if (options.savedColors) Object.assign(puzzle.pu_a_col, clone(options.savedColors));
    puzzle.solution = puzzle.multisolution ? check : JSON.stringify(check);
    const url = puzzle.maketext_duplicate().replace('#m=edit&', '#m=solve&l=solvedup&');
    return { url, check };
  }
  function checkAnswer(answer) {
    puzzle.pu_a = clone(answer);
    return clone(puzzle.make_solution());
  }
  return { puzzle, generate, readUrl, checkAnswer, expand, compress, settings: clone(Object.fromEntries(and.map(c => [c.id, c.checked]))), orSettings: clone(Object.fromEntries(or.map(c => [c.id, c.checked]))) };
}

function loadConverter(fetchImpl, runtime = {}) {
  const network = [];
  const context = vm.createContext({
    console, TextEncoder, TextDecoder, Uint8Array, URL, URLSearchParams,
    AbortController, setTimeout, clearTimeout,
    atob: input => atob(input), btoa: input => btoa(input),
    pako: {
      inflateRaw: (input, options) => {
        const result = zlib.inflateRawSync(input);
        return options?.to === 'string' ? result.toString('utf8') : new Uint8Array(result);
      },
      deflateRaw: (input, options) => new Uint8Array(zlib.deflateRawSync(input, options)),
    },
    fetch: async (...args) => {
      network.push(args);
      if (fetchImpl) return fetchImpl(...args);
      throw new Error('Unexpected network request during offline conversion');
    },
    module: { exports: {} }, exports: {},
    ...runtime,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../converter.js'), 'utf8'), context);
  const api = vm.runInContext(`({
    parsePenpaParams, inflateRawB64, deflateRawB64, buildAnswerObject,
    convertPenpaUrl,
    expandShortUrl: expandShortUrlIfNeeded,
    detailed: typeof convertPenpaUrlDetailed === 'function' ? convertPenpaUrlDetailed : undefined,
    expand: typeof expandPuzzleText === 'function' ? expandPuzzleText : undefined,
    compress: typeof compressPuzzleText === 'function' ? compressPuzzleText : undefined
  })`, context);
  return { ...api, network,
    convertPenpaUrl: (url, options) => api.convertPenpaUrl(url, { log: false, ...options }),
    detailed: api.detailed && ((url, options) => api.detailed(url, { log: false, ...options })),
  };
}

module.exports = { createReference, loadConverter, clone, deflate, inflate, AND_OPTIONS, OR_OPTIONS };
