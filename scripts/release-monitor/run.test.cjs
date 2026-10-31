const { test } = require('node:test');
const assert = require('node:assert/strict');
const { http, readAndroid, readIos, sync, RC, PLAY } = require('./run.cjs');
const fixture = () => ({ parameters: { app_update_ios: { defaultValue: { value: '{"enabled":true,"latestVersion":"2.0.3"}' } } } });
function remote({ failAt, mismatch = false, noEtag = false } = {}) {
  const calls = []; let stored = fixture();
  return { calls, request: async (url, options = {}) => {
    calls.push({ url, ...options });
    if (failAt?.(url, options)) throw Object.assign(new Error('fixture'), { code: 'HTTP_412' });
    if (options.method === 'PUT' && url === RC && !mismatch) stored = structuredClone(options.body);
    return { data: structuredClone(stored), etag: noEtag ? null : 'original-etag' };
  } };
}
test('dry-run validates with ETag but never publishes or backs up', async () => {
  const x = remote(); let backedUp = false;
  const result = await sync({ request: x.request, candidates: { ios: '2.0.4' }, backup: () => { backedUp = true; } });
  assert.equal(result.published, false); assert.equal(backedUp, false);
  assert.equal(x.calls.length, 2);
  assert.match(x.calls[1].url, /validate_only=true/);
  assert.equal(x.calls[1].etag, 'original-etag');
});
test('publish backs up before write, validates, uses original ETag and reads back', async () => {
  const x = remote(); let backup;
  const result = await sync({ request: x.request, candidates: { ios: '2.0.4' }, publish: true, backup: data => {
    assert.equal(x.calls.length, 2); backup = data;
  } });
  assert.equal(backup.etag, 'original-etag'); assert.deepEqual(backup.template, fixture());
  assert.equal(result.published, true); assert.equal(x.calls.length, 4);
  assert.equal(x.calls[2].etag, 'original-etag'); assert.equal(x.calls[2].url, RC);
  assert.equal(x.calls[3].method, undefined);
});
test('idempotent and older release checks do not write', async () => {
  for (const version of ['2.0.3', '2.0.2', null]) {
    const x = remote(); await sync({ request: x.request, candidates: { ios: version }, publish: true });
    assert.equal(x.calls.length, 1);
  }
});
test('validation/concurrency failures stop, with no force write or retry', async () => {
  const invalid = remote({ failAt: url => url.includes('validate_only') });
  await assert.rejects(sync({ request: invalid.request, candidates: { ios: '2.0.4' }, publish: true }));
  assert.equal(invalid.calls.length, 2);
  const race = remote({ failAt: (url, opts) => url === RC && opts.method === 'PUT' });
  await assert.rejects(sync({ request: race.request, candidates: { ios: '2.0.4' }, publish: true }));
  assert.equal(race.calls.length, 3);
});
test('backup failure prevents publication, missing ETag stops and mismatch fails readback', async () => {
  const x = remote();
  await assert.rejects(sync({ request: x.request, candidates: { ios: '2.0.4' }, publish: true, backup: () => { throw new Error(); } }));
  assert.equal(x.calls.length, 2);
  await assert.rejects(sync({ request: remote({ noEtag: true }).request, candidates: { ios: '2.0.4' }, publish: true }), /ETAG_MISSING/);
  await assert.rejects(sync({ request: remote({ mismatch: true }).request, candidates: { ios: '2.0.4' }, publish: true }), /PUBLISH_READBACK_MISMATCH/);
});
test('Play probe cleans up its own uncommitted edit even after read failure', async () => {
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url.endsWith('/releases')) return { data: { releases: [] } };
    if (url.endsWith('/edits')) return { data: { id: 'probe-123' } };
    if (options.method === 'DELETE') return { data: null };
    throw new Error('Read failed');
  };
  await assert.rejects(readAndroid(request, ['US', 'KR'], {}));
  assert.equal(calls.at(-1).url, `${PLAY}/edits/probe-123`);
  assert.equal(calls.at(-1).method, 'DELETE');
  assert.equal(calls.some(x => /:commit|upload/.test(x.url)), false);
});
test('Play probe requires cleanup success before returning a candidate', async () => {
  const request = async (url, opts = {}) => {
    if (opts.method === 'DELETE') throw new Error('cleanup failed');
    if (url.endsWith('/edits')) return { data: { id: 'probe' } };
    if (url.includes('countryAvailability')) return { data: { countries: [{ countryCode: 'US' }] } };
    if (url.endsWith('/releases')) return { data: { releases: [] } };
    return { data: { track: 'production', releases: [] } };
  };
  await assert.rejects(readAndroid(request, ['US'], {}), /cleanup failed/);
});
test('Apple requests all configured storefronts without authenticated requests', async () => {
  const calls = [];
  const result = await readIos(async (...args) => {
    calls.push(args); return { data: { results: [{ trackId: 6790968637, bundleId: 'dev.pages.blccalendar', version: '2.0.3' }] } };
  }, ['US', 'KR']);
  assert.equal(result, '2.0.3'); assert.equal(calls.length, 2);
  assert.match(calls[0][0], /country=us/); assert.match(calls[1][0], /country=kr/);
  assert.equal(calls[0][1], undefined);
});
test('HTTP layer does not leak response bodies/tokens and refuses redirects', async () => {
  let seen;
  const request = http(async (url, options) => { seen = options; return { ok: false, status: 403 }; }, 'fixture-secret');
  await assert.rejects(request(RC, { authenticated: true }), /^Error: HTTP_403$/);
  assert.equal(seen.redirect, 'error');
  await assert.rejects(http(async () => { throw new Error('sensitive URL'); })(RC), /^Error: NETWORK_OR_TIMEOUT$/);
  await assert.rejects(http()(RC, { authenticated: true }), /GOOGLE_TOKEN_MISSING/);
});
