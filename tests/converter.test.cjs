'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReference, loadConverter, clone, deflate } = require('./harness.cjs');

async function roundtrip(options, { solvedup = false } = {}) {
  const reference = createReference(options);
  const fixture = reference.generate(solvedup);
  const api = loadConverter();
  const result = await api.convertPenpaUrl(fixture.url);
  const converted = reference.readUrl(result);
  assert.equal(converted.data.m, 'edit');
  assert.deepEqual(reference.checkAnswer(converted.answer), fixture.check,
    'Penpa itself must generate the identical answer-check payload from the reconstruction');
  assert.deepEqual(JSON.parse(converted.lines[3]), clone(reference.puzzle.pu_q), 'givens must survive');
  assert.deepEqual(converted.answer.command_redo.__a, []);
  assert.deepEqual(converted.answer.command_undo.__a, []);
  assert.deepEqual(converted.answer.command_replay.__a, []);
  assert.equal(api.network.length, 0, 'full Penpa URLs must work entirely offline');
  return { reference, fixture, api, result, ...converted };
}

const numbers = values => Object.fromEntries(values.map((value, i) => [[18, 19, 20, 21, 26, 27, 28, 29, 34, 35, 36, 37][i], [value, 2, '1']]));

test('mixed single and multi-digit numbers roundtrip through the upstream checker', async () => {
  const values = ['12', '7', '345', '0', '-42', '3.14', '1e6', 'A', 'zN', '007', '9', '123456789'];
  const result = await roundtrip({ settings: ['number'], pu_a: { number: numbers(values) } });
  assert.deepEqual(Object.values(result.answer.number).map(entry => entry[0]), values);
});

test('comma-bearing text, quotes, backslashes, Unicode and reserved compression strings remain literal', async () => {
  const values = ['1,234', 'A,B,C', 'zS', 'zZ', '"number"', 'null', 'z_', '\\', '日本語,7', 'a\nb'];
  const result = await roundtrip({ settings: ['number'], tags: ['non-alphanumeric'], pu_a: { number: numbers(values) } });
  assert.deepEqual(Object.values(result.answer.number).map(entry => entry[0]), values);
});

test('given numbers are preserved and excluded exactly as in Penpa', async () => {
  const { answer } = await roundtrip({ settings: ['number'],
    pu_q: { number: { 18: ['3', 1, '1'], 19: ['ABC', 1, '10'] } },
    pu_a: { number: numbers(['3', 'ABC', '456', '7']) },
  });
  assert.equal(answer.number[18], undefined);
  assert.equal(answer.number[19], undefined);
});

test('single remaining candidates and alphabet normalization preserve checker meaning', async () => {
  await roundtrip({ settings: ['number'], pu_a: { number: {
    18: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 9, '7'],
    19: ['12', 10, '6'], 20: ['4', 8, '10'],
  } } });
  await roundtrip({ settings: ['number'], tags: ['alphabet'], pu_a: { number: numbers(['ABC', 'd', 'zN']) } });
});

test('tight-fit corner numbers return to numberS while regular numbers stay in number', async () => {
  const { answer } = await roundtrip({ settings: ['number'], tags: ['tightfit'], pu_a: {
    number: { 19: ['12', 2, '1'] },
    numberS: { 296: ['3', 2], 299: ['47', 8] },
  } });
  assert.equal(answer.number[19][0], '12');
  assert.equal(answer.numberS[296][0], '3');
  assert.equal(answer.numberS[299][0], '47');
  assert.equal(answer.number[296], undefined);
});

test('normal shading and square symbol checker channels are both reconstructed', async () => {
  await roundtrip({ settings: ['surface'], pu_q: { surface: { 18: 1 } }, pu_a: { surface: { 18: 3, 19: 1, 20: 3, 21: 4, 26: 8, 27: 2 } } });
  const square = await roundtrip({ settings: ['square'], pu_a: { symbol: { 18: [2, 'square_LL', 2] } } });
  assert.equal(square.answer.symbol[18][1], 'square_LL');
});

test('exact surface colors include multicolor cell arrays', async () => {
  const { answer } = await roundtrip({ settings: ['surface_exact'], pu_a: {
    surface: { 18: 2, 19: 10, 20: [1, 2, 3, 4], 21: [3, 5] },
  } });
  assert.deepEqual(answer.surface, { 18: 2, 19: 10, 20: [1, 2, 3, 4], 21: [3, 5] });
});

test('ordinary green and double lines and edges map to Penpa styles 3 and 30', async () => {
  const { answer } = await roundtrip({ settings: ['loopline', 'loopedge'], pu_a: {
    line: { '18,19': 3, '19,20': 30 }, lineE: { '74,75': 3, '75,76': 30 },
  } });
  assert.deepEqual(answer.line, { '18,19': 3, '19,20': 30 });
  assert.deepEqual(answer.lineE, { '74,75': 3, '75,76': 30 });
});

test('exact line and edge styles are not remapped as ordinary checker codes', async () => {
  const styles = [1, 2, 3, 12, 13, 30, 80];
  const lines = Object.fromEntries(styles.map((style, i) => [`${18 + i},${19 + i}`, style]));
  const { answer } = await roundtrip({ settings: ['loopline_exact', 'loopedge_exact'], pu_a: { line: lines, lineE: lines } });
  assert.deepEqual(answer.line, lines);
  assert.deepEqual(answer.lineE, lines);
});

test('given line and border exclusion remains consistent with upstream', async () => {
  await roundtrip({ settings: ['ignoreloopline', 'ignoreborder'],
    pu_q: { line: { '18,19': 2 }, lineE: { '74,75': 2 } },
    pu_a: { line: { '18,19': 3, '19,20': 30 }, lineE: { '74,75': 3, '75,76': 3 } },
  });
});

test('walls use the two-endpoint encoding and return as green walls', async () => {
  const { answer } = await roundtrip({ settings: ['wall'], pu_a: { wall: { '130,131': 3, '131,132': 3, '132,133': 2 } } });
  assert.deepEqual(answer.wall, { '130,131': 3, '131,132': 3 });
});

const symbolCases = [
  ['circle', 'circle_M', [1, 2]], ['tri', 'tri', [1, 2, 3, 4]],
  ['arrow', 'arrow_S', [1, 2, 3, 4, 5, 6, 7, 8]],
  ['battleship', 'battleship_B', [1, 2, 3, 4, 5, 6]],
  ['battleship', 'battleship_B+', [1, 2, 3, 4]], ['star', 'star', [1, 2, 3]],
  ['tent', 'tents', [2]], ['math', 'math', [2, 3]], ['math', 'math_G', [2, 3]],
  ['akari', 'sun_moon', [3]], ['mine', 'sun_moon', [4, 5]],
];
for (const [setting, type, variants] of symbolCases) {
  test(`AND symbols: ${type} variants ${variants.join(', ')}`, async () => {
    const symbols = Object.fromEntries(variants.map((variant, i) => [18 + i, [variant, type, 2]]));
    await roundtrip({ settings: [setting], pu_a: { symbol: symbols } });
  });
}

test('default check-all combines all six answer channels', async () => {
  await roundtrip({ pu_a: {
    surface: { 18: 3 }, line: { '19,20': 30 }, lineE: { '74,75': 3 },
    wall: { '130,131': 3 }, number: { 21: ['321', 2, '1'], 26: ['7', 2, '1'] },
    symbol: { 27: [4, 'tri', 2], 28: [2, 'square_LL', 2] },
  } });
});

const orCases = [
  ['surface', { surface: { 18: 3, 19: 8 } }],
  ['surface_exact', { surface: { 18: [2, 3], 19: 7 } }],
  ['number', { number: numbers(['12', '7', '1,234']) }, ['non-alphanumeric']],
  ['loopline', { line: { '18,19': 3, '19,20': 30 } }],
  ['loopline_exact', { line: { '18,19': 1, '19,20': 2 } }],
  ['loopedge', { lineE: { '74,75': 3, '75,76': 30 } }],
  ['loopedge_exact', { lineE: { '74,75': 1, '75,76': 2 } }],
  ['wall', { wall: { '130,131': 3 } }],
  ['square', { symbol: { 18: [2, 'square_LL', 2] } }],
  ...symbolCases.map(([setting, type, variants]) => [setting, { symbol: { 18: [variants.at(-1), type, 2] } }]),
];
for (const [setting, layer, tags] of orCases) {
  test(`OR option: ${setting}${layer.symbol ? ' / ' + layer.symbol[18][1] : ''}`, async () => {
    await roundtrip({ orSettings: [setting], tags, pu_a: layer });
  });
}

test('multiple OR groups follow Penpa checkbox order, including empty groups', async () => {
  const reference = createReference({ orSettings: ['number', 'surface', 'wall', 'tri'], pu_a: {
    surface: { 18: 3 }, number: numbers(['12', '7']), symbol: { 20: [4, 'tri', 2] },
  } });
  const fixture = reference.generate();
  const kinds = ['surface', 'number', 'wall', 'tri'];
  for (let alternativeIndex = 0; alternativeIndex < kinds.length; alternativeIndex++) {
    const result = await loadConverter().detailed(fixture.url, { alternativeIndex });
    assert.equal(result.selectedAlternative, alternativeIndex);
    assert.equal(result.alternatives.length, 4);
    const decoded = reference.readUrl(result.url);
    assert.deepEqual(reference.checkAnswer(decoded.answer)[alternativeIndex], fixture.check[alternativeIndex]);
    const activeAnd = Object.entries(JSON.parse(decoded.lines[7])).filter(([, enabled]) => enabled).map(([key]) => key);
    assert.deepEqual(activeAnd, ['sol_' + kinds[alternativeIndex]]);
    assert.equal(Object.values(JSON.parse(decoded.lines[16])).some(Boolean), false);
    assert.equal(decoded.lines[0].split(',')[20], 'false');
  }
  await assert.rejects(loadConverter().detailed(fixture.url, { alternativeIndex: 4 }));
});

for (const solvedup of [false, true]) {
  test(`${solvedup ? 'solvedup' : 'solve'} preserves irregular board, givens, metadata, and question colors`, async () => {
    const options = {
      title: 'zN, the puzzle', author: 'Author, zS', rules: 'Rule, one\nRule &= two',
      source: 'https://example.com/puzzle', customColors: true, settings: ['number'],
      puzzle: { centerlist: [18, 19, 20, 26, 34, 35, 36, 37], theta: 90, reflect: [-1, 1] },
      pu_q: { number: { 18: ['9', 1, '1'] }, symbol: { 19: [4, 'tri', 1] },
        deletelineE: { '74,75': 1 }, thermo: [[20, 21, 29]], killercages: [[26, 27]] },
      pu_q_col: { number: { 18: '#123456' }, symbol: { 19: '#abcdef' } },
      pu_a: { number: { 20: ['12', 2, '1'], 26: ['7', 2, '1'] } },
    };
    const { reference, fixture, lines } = await roundtrip(options, { solvedup });
    const before = reference.readUrl(fixture.url).lines;
    assert.deepEqual(lines[0].split(',').slice(0, 15), before[0].split(',').slice(0, 15));
    assert.match(lines[0], /Title: zN%2C the puzzle \(solution\)/);
    assert.match(lines[0], /Author: Author%2C zS/);
    assert.match(lines[0], /Rule%2C one%2DRule %2E%2F two/);
    for (const index of [1, 3, 5, 6, 10, 13, 14, 16, 17, 18]) {
      assert.equal(lines[index], before[index], `structural line ${index} must not move or change`);
    }
    assert.equal(JSON.parse(lines[2]).grid.join(','), '1,2,1');
  });
}

for (const gridtype of ['hex', 'tri', 'pyramid', 'iso', 'sudoku', 'kakuro', 'tetrakis_square', 'truncated_square', 'snub_square', 'cairo_pentagonal', 'rhombitrihexagonal', 'deltoidal_trihexagonal', 'penrose_P3']) {
  test(`grid metadata and point identifiers remain intact: ${gridtype}`, async () => {
    const { lines } = await roundtrip({ gridtype, settings: ['number'], pu_a: { number: numbers(['123', '7']) } });
    assert.equal(lines[0].split(',')[0], gridtype);
  });
}

test('literal + and URL-escaped payload parameters are preserved', async () => {
  const api = loadConverter();
  assert.equal(api.parsePenpaParams('https://example.com/#m=solve&p=a+b/c==&a=x%2By%2Fz%3D').p, 'a+b/c==');
  assert.equal(api.parsePenpaParams('https://example.com/?m=solve&p=a+b/c==&a=x%2By%2Fz%3D').a, 'x+y/z=');
  const reference = createReference({ settings: ['number'], pu_a: { number: numbers(['123', '7']) } });
  const fixture = reference.generate();
  const params = api.parsePenpaParams(fixture.url);
  const queryUrl = `https://swaroopg92.github.io/penpa-edit/?m=solve&p=${encodeURIComponent(params.p)}&a=${encodeURIComponent(params.a)}`;
  const result = reference.readUrl(await api.convertPenpaUrl(queryUrl));
  assert.deepEqual(reference.checkAnswer(result.answer), fixture.check);
});

test('compression roundtrip safely escapes every reserved token inside user text', () => {
  const api = loadConverter();
  const raw = JSON.stringify({ number: { 18: ['zS zN zZ z_ "number" null 日本語', 2, '1'] } });
  assert.equal(api.expand(api.compress(raw)), raw);
  assert.equal(api.inflateRawB64(api.deflateRawB64(raw)), raw);
});

test('source URLs and decoded source objects are never mutated', async () => {
  const reference = createReference({ settings: ['number'], pu_a: { number: numbers(['12', '7']) } });
  const fixture = reference.generate();
  const before = JSON.stringify(fixture.check);
  const api = loadConverter();
  api.buildAnswerObject(fixture.check, { settings: reference.settings });
  assert.equal(JSON.stringify(fixture.check), before);
  const first = await api.convertPenpaUrl(fixture.url);
  const second = await api.convertPenpaUrl(fixture.url);
  assert.equal(first, second);
});

for (const [name, url] of [
  ['not a URL', 'hello'], ['missing puzzle', 'https://example.com/#a=abc'],
  ['missing answer', 'https://example.com/#p=abc'],
  ['invalid compressed payload', 'https://example.com/#p=not-base64&a=also-invalid'],
]) {
  test(`invalid input rejects: ${name}`, async () => {
    await assert.rejects(loadConverter().convertPenpaUrl(url));
  });
}

for (const [name, answer] of [
  ['object instead of answer array', {}],
  ['number bucket is an object', [[], [], [], [], {}]],
  ['non-string number item', [[], [], [], [], [42], []]],
  ['number lacks cell separator', [[], [], [], [], ['123'], []]],
  ['non-numeric cell key', [[], [], [], [], ['__proto__,12'], []]],
  ['unknown symbol code', [[], [], [], [], [], ['18,1Z']]],
  ['extra unrecognized answer category', [[], [], [], [], [], [], ['18']]],
]) {
  test(`malformed answer rejects instead of silently dropping data: ${name}`, async () => {
    const reference = createReference({ settings: ['number'], pu_a: { number: numbers(['12']) } });
    const fixture = reference.generate();
    const params = loadConverter().parsePenpaParams(fixture.url);
    const corrupt = `https://swaroopg92.github.io/penpa-edit/#m=solve&p=${params.p}&a=${deflate(JSON.stringify(answer))}`;
    await assert.rejects(loadConverter().convertPenpaUrl(corrupt));
  });
}

test('OR symbols disclose orientation loss through the detailed API', async () => {
  const reference = createReference({ orSettings: ['tri'], pu_a: { symbol: { 18: [4, 'tri', 2] } } });
  const api = loadConverter();
  const result = await api.detailed(reference.generate().url);
  assert.equal(typeof result.url, 'string');
  assert.ok(result.warnings.length > 0, 'a location-only OR answer cannot recover its original triangle direction');
});


test('edge-suffixed point identifiers survive in numbers and symbols', async () => {
  const { answer } = await roundtrip({ settings: ['number', 'tri'], pu_a: {
    number: { '74E': ['123', 2, '1'], '75E': ['7', 2, '1'] },
    symbol: { '76E': [4, 'tri', 2] },
  } });
  assert.equal(answer.number['74E'][0], '123');
  assert.equal(answer.number['75E'][0], '7');
  assert.equal(answer.symbol['76E'][0], 4);
});

test('exact surfaces and square symbols can share their checker bucket and cell', async () => {
  const { answer } = await roundtrip({ settings: ['surface_exact', 'square'], pu_a: {
    surface: { 18: 3, 19: [1, 2] }, symbol: { 18: [2, 'square_LL', 2], 20: [2, 'square_LL', 2] },
  } });
  assert.equal(answer.surface[18], 3);
  assert.deepEqual(answer.surface[19], [1, 2]);
  assert.equal(answer.symbol[18][1], 'square_LL');
  assert.equal(answer.symbol[20][1], 'square_LL');
});


for (const [kind, layer, ignoreKey] of [
  ['loopline', { line: { '18,19': 3, '19,20': 30 } }, 'sol_ignoreloopline'],
  ['loopedge', { lineE: { '74,75': 3, '75,76': 30 } }, 'sol_ignoreborder'],
]) {
  test(`selected OR ${kind} keeps its given-segment exclusion setting`, async () => {
    const reference = createReference({ orSettings: [kind], pu_a: layer });
    const decoded = reference.readUrl(await loadConverter().convertPenpaUrl(reference.generate().url));
    assert.equal(JSON.parse(decoded.lines[7])[ignoreKey], true);
  });
}

test('number font-size and color checker combinations preserve mixed digit lengths', async () => {
  for (const style of [2, 8, 9, 10]) {
    for (const submode of ['1', '5', '6', '10']) {
      await roundtrip({ settings: ['number'], pu_a: { number: {
        18: ['123', style, submode], 19: ['7', style, submode],
      } } });
    }
  }
});

for (const settings of [[], ['surface', 'square']]) {
  test(`${settings.length ? 'explicit shading/square' : 'default check-all'} restores squares over given shading`, async () => {
    const { answer } = await roundtrip({ settings, pu_q: { surface: { 18: 3 } }, pu_a: {
      symbol: { 18: [2, 'square_LL', 2], '74E': [2, 'square_LL', 2] },
    } });
    assert.equal(answer.symbol[18][1], 'square_LL');
    assert.equal(answer.symbol['74E'][1], 'square_LL');
  });
}

const malformedPuzzleCases = [
  ['unknown grid type', lines => { const header = lines[0].split(','); header[0] = 'unsupported_grid'; lines[0] = header.join(','); }],
  ['non-finite grid dimension', lines => { const header = lines[0].split(','); header[1] = 'Infinity'; lines[0] = header.join(','); }],
  ['negative grid dimension', lines => { const header = lines[0].split(','); header[2] = '-2'; lines[0] = header.join(','); }],
  ['invalid multi-solution flag', lines => { const header = lines[0].split(','); header[20] = 'maybe'; lines[0] = header.join(','); }],
  ['invalid margin data', lines => { lines[1] = '{}'; }],
  ['unknown active AND check', lines => { lines[7] = JSON.stringify({ sol_number: true, sol_future_shape: true }); }],
  ['unknown active OR check', lines => { const header = lines[0].split(','); header[20] = 'true'; lines[0] = header.join(','); lines[7] = '{}'; lines[16] = JSON.stringify({ sol_or_future_shape: true }); }],
];
for (const [name, mutate] of malformedPuzzleCases) {
  test(`malformed puzzle rejects explicitly: ${name}`, async () => {
    const reference = createReference({ settings: ['number'], pu_a: { number: numbers(['12']) } });
    const fixture = reference.generate();
    const api = loadConverter();
    const params = api.parsePenpaParams(fixture.url);
    const lines = api.expand(api.inflateRawB64(params.p)).split('\n');
    mutate(lines);
    const corrupt = `https://swaroopg92.github.io/penpa-edit/#m=solve&p=${deflate(api.compress(lines.join('\n')))}&a=${params.a}`;
    await assert.rejects(api.convertPenpaUrl(corrupt));
  });
}


test('solvedup stale progress, undo/replay history and answer colors are cleared locally', async () => {
  const { answer, lines } = await roundtrip({ settings: ['number'], pu_a: { number: numbers(['12', '7']) },
    savedProgress: { number: { 18: ['999', 2, '1'], 26: ['8', 2, '1'] }, surface: { 27: 3 },
      symbol: { 28: [4, 'tri', 2] }, command_undo: { __a: [['number', 18, null, 'pu_a', 0]] },
      command_replay: { __a: [['number', 18, ['999', 2, '1'], 'pu_a', 0]] } },
    savedColors: { number: { 18: '#ff0000' }, surface: { 27: '#00ff00' } },
  }, { solvedup: true });
  assert.equal(answer.number[18][0], '12');
  assert.equal(answer.number[19][0], '7');
  assert.equal(answer.number[26], undefined);
  assert.deepEqual(answer.surface, {});
  assert.deepEqual(answer.symbol, {});
  const colors = JSON.parse(lines[15]);
  assert.deepEqual(colors.number, {});
  assert.deepEqual(colors.surface, {});
  assert.deepEqual(colors.command_replay.__a, []);
});
