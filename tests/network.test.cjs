'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReference, loadConverter } = require('./harness.cjs');

function fakeTimers() {
  const scheduled = [];
  return {
    scheduled,
    setTimeout(callback, delay) {
      const timer = { callback, delay, cleared: false };
      scheduled.push(timer);
      return timer;
    },
    clearTimeout(timer) { timer.cleared = true; },
  };
}
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

for (const url of [
  'https://evil.example/tinyurl.com/test',
  'https://tinyurl.com.evil.example/test',
  'https://evil.example/?redirect=https://tinyurl.com/test',
  'https://tinyurl.com@evil.example/test',
  'https://not-tinyurl.com/test',
]) {
  test(`short-link expander ignores lookalike host or path: ${url}`, async () => {
    const api = loadConverter();
    assert.equal(await api.expandShortUrl(url), url);
    assert.equal(api.network.length, 0);
  });
}

for (const hostname of ['tinyurl.com', 'www.tinyurl.com', 'TINYURL.COM']) {
  test(`exact TinyURL hostname resolves while preserving literal base64 plus: ${hostname}`, async () => {
    const destination = 'https://swaroopg92.github.io/penpa-edit/#m=solve&p=a+b/c==&a=x+y/z==';
    const timers = fakeTimers();
    const api = loadConverter(async () => ({ ok: true, json: async () => ({ success: true, longurl: destination }) }), timers);
    const input = `https://${hostname}/test-code`;
    assert.equal(await api.expandShortUrl(input), destination);
    assert.equal(api.network.length, 1);
    const request = new URL(api.network[0][0]);
    assert.equal(request.hostname, 'tinyurl-expand.cyddrdrd.workers.dev');
    assert.equal(request.searchParams.get('url'), new URL(input).href);
    assert.equal(timers.scheduled[0].delay, 15000);
    assert.equal(timers.scheduled[0].cleared, true);
  });
}

for (const [name, response, message] of [
  ['non-OK HTTP response', { ok: false, status: 503 }, /HTTP 503/],
  ['JSON decoding failure', { ok: true, json: async () => { throw new Error('Invalid service JSON'); } }, /Invalid service JSON/],
  ['missing result', { ok: true, json: async () => ({ success: true }) }, /No expanded URL/],
  ['unsuccessful result', { ok: true, json: async () => ({ success: false, error: 'Code not found' }) }, /Code not found/],
  ['non-string destination', { ok: true, json: async () => ({ success: true, longurl: 123 }) }, /No expanded URL/],
  ['missing answer payload', { ok: true, json: async () => ({ success: true, longurl: 'https://example.com/#p=abc' }) }, /no answer-check data/],
  ['missing puzzle payload', { ok: true, json: async () => ({ success: true, longurl: 'https://example.com/#a=abc' }) }, /no answer-check data/],
  ['unsafe destination protocol', { ok: true, json: async () => ({ success: true, longurl: 'javascript:alert(1)' }) }, /http or https/],
]) {
  test(`TinyURL failure explains full-link fallback: ${name}`, async () => {
    const timers = fakeTimers();
    const api = loadConverter(async () => response, timers);
    await assert.rejects(api.expandShortUrl('https://tinyurl.com/test-code'), error => {
      assert.match(error.message, /Could not expand TinyURL\. Paste the full Penpa link instead/);
      assert.match(error.message, message);
      return true;
    });
    assert.equal(api.network.length, 1);
    assert.equal(timers.scheduled[0].cleared, true);
  });
}

test('TinyURL timeout aborts the mocked request and clears its timer', async () => {
  const timers = fakeTimers();
  const api = loadConverter((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Request aborted')));
    queueMicrotask(() => timers.scheduled[0].callback());
  }), timers);
  await assert.rejects(api.expandShortUrl('https://tinyurl.com/test-code'), /Request aborted/);
  assert.equal(api.network[0][1].signal.aborted, true);
  assert.equal(timers.scheduled[0].delay, 15000);
  assert.equal(timers.scheduled[0].cleared, true);
});

test('a resolved TinyURL converts a real source-generated Penpa answer', async () => {
  const reference = createReference({ settings: ['number'], pu_a: { number: { 18: ['123', 2, '1'], 19: ['7', 2, '1'] } } });
  const fixture = reference.generate();
  const timers = fakeTimers();
  const api = loadConverter(async () => ({ ok: true, json: async () => ({ success: true, longurl: fixture.url }) }), timers);
  const result = reference.readUrl(await api.convertPenpaUrl('https://tinyurl.com/test-code'));
  assert.deepEqual(reference.checkAnswer(result.answer), fixture.check);
  assert.equal(api.network.length, 1);
  assert.equal(timers.scheduled[0].cleared, true);
});

test('logging remains optional and disabled conversion issues no request', async () => {
  const reference = createReference({ settings: ['number'], pu_a: { number: { 18: ['123', 2, '1'] } } });
  const api = loadConverter();
  await api.convertPenpaUrl(reference.generate().url, { log: false });
  assert.equal(api.network.length, 0);
});

test('pending logging never delays conversion; later rejection is handled', { timeout: 1000 }, async () => {
  const reference = createReference({ settings: ['number'], pu_a: { number: { 18: ['123', 2, '1'] } } });
  const fixture = reference.generate();
  const timers = fakeTimers();
  const warnings = [];
  let rejectLog;
  const api = loadConverter(() => new Promise((_resolve, reject) => { rejectLog = reject; }), {
    ...timers, console: { warn: (...args) => warnings.push(args) },
  });
  const result = await api.convertPenpaUrl(fixture.url, { log: true });
  assert.deepEqual(reference.checkAnswer(reference.readUrl(result).answer), fixture.check);
  assert.equal(api.network.length, 1);
  assert.equal(api.network[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(api.network[0][1].body), { input_url: fixture.url, output_url: result });
  assert.equal(timers.scheduled[0].delay, 8000);
  assert.equal(timers.scheduled[0].cleared, false, 'conversion returned while logging was still pending');
  rejectLog(new Error('Simulated logging failure'));
  await nextTurn();
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].join(' '), /Simulated logging failure/);
  assert.equal(timers.scheduled[0].cleared, true);
});

test('logging timeout is handled after conversion has already succeeded', { timeout: 1000 }, async () => {
  const reference = createReference({ settings: ['number'], pu_a: { number: { 18: ['7', 2, '1'] } } });
  const timers = fakeTimers();
  const warnings = [];
  const api = loadConverter((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Logging aborted')));
  }), { ...timers, console: { warn: (...args) => warnings.push(args) } });
  const result = await api.convertPenpaUrl(reference.generate().url, { log: true });
  assert.equal(typeof result, 'string');
  timers.scheduled[0].callback();
  await nextTurn();
  assert.equal(api.network[0][1].signal.aborted, true);
  assert.equal(timers.scheduled[0].cleared, true);
  assert.equal(warnings.length, 1);
});
