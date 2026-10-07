import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as domain from '../src/lib/domain-values.mjs';
import { fetchHighUrgencyRequests } from '../src/lib/emergency-requests.mjs';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const { code } = await transform(fs.readFileSync(new URL('../src/components/utilities/summary/LGUEmergencyRequestCards.js', import.meta.url), 'utf8'), {
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2020' }, module: { type: 'commonjs' },
});

const row = (id, reason = '[Drop-off: Buaya] HIGH Urgency Request') => ({ request_id: id, request_reason: reason, status: 'Pending' });
function database(getRows, fail = false) {
  return { from() {
    let statuses;
    return { select() { return this; }, in(key, values) { statuses = values; return this; }, order() { return this; },
      range(start, end) { this.start = start; this.end = end; return this; }, async abortSignal() {
        return fail ? { error: new Error('unavailable') } : { data: getRows().filter(value => statuses.includes(value.status)).slice(this.start, this.end + 1) };
      } };
  } };
}
test('backend reads include metadata-bearing High requests beyond the first page', async () => {
  const rows = Array.from({ length: 210 }, (_, i) => row('low-' + i, 'LOW Urgency Request'));
  rows.push(row('high'));
  const result = await fetchHighUrgencyRequests(database(() => rows));
  assert.deepEqual(result.map(value => value.request_id), ['high']);
  await assert.rejects(fetchHighUrgencyRequests(database(() => [], true)), /unavailable/);
});

function card(initialRows) {
  let rows = initialRows, cursor = 0, timerId = 0;
  const slots = [], effects = [], timers = new Map(), intervals = new Map(), handlers = {};
  const state = { listeners: {} };
  const depsChanged = (a, b) => !a || a.some((value, index) => value !== b[index]);
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useCallback(fn, deps) { const index = cursor++; if (!slots[index] || depsChanged(slots[index].deps, deps)) slots[index] = { fn, deps }; return slots[index].fn; },
    useEffect(fn, deps) { const index = cursor++; if (!slots[index] || depsChanged(slots[index].deps, deps)) effects.push(() => { slots[index] = { deps, cleanup: fn() }; }); },
  };
  const db = { ...database(() => rows), channel() { return {
    on(event, filter, fn) { state.listeners[filter.table] = fn; return this; },
    subscribe(fn) { fn('SUBSCRIBED'); return this; },
  }; }, removeChannel() {} };
  const fakeWindow = { addEventListener(name, fn) { handlers[name] = fn; }, removeEventListener() {} };
  const fakeDocument = { ...fakeWindow, visibilityState: 'visible' };
  const compiledModule = { exports: {} };
  const icons = Object.fromEntries(['Package', 'Search', 'ShieldAlert', 'Zap', 'ArrowUpRight', 'Hash', 'RefreshCw'].map(name => [name, () => null]));
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'window', 'document', 'React', code)(name => {
    if (name === 'react') return react;
    if (name === 'next/navigation') return { useRouter: () => ({ push() {} }) };
    if (name.includes('domain-values')) return domain;
    if (name.includes('emergency-requests')) return { fetchHighUrgencyRequests };
    if (name.includes('supabase')) return { supabase: db };
    if (name === 'lucide-react') return icons;
    return require(name);
  }, compiledModule, compiledModule.exports,
  fn => { const id = ++timerId; timers.set(id, fn); return id; }, id => timers.delete(id),
  (fn, ms) => { const id = ++timerId; intervals.set(id, { fn, ms }); return id; }, id => intervals.delete(id), fakeWindow, fakeDocument, react);
  const render = () => { cursor = 0; const tree = compiledModule.exports.default(); while (effects.length) effects.shift()(); return tree; };
  const flush = async () => { const pending = [...timers.values()]; timers.clear(); await Promise.all(pending.map(fn => fn())); };
  return { render, flush, setRows(value) { rows = value; }, realtime() { state.listeners.resource_requests(); },
    async poll() { for (const { fn, ms } of intervals.values()) if (ms === 5000) fn(); await flush(); } };
}
test('dashboard displays new High requests and status changes without refreshing the page', async () => {
  const app = card([row('low', 'LOW Urgency Request')]);
  app.render(); await app.flush();
  assert.ok(!JSON.stringify(app.render()).includes('high-id'));
  app.setRows([row('low', 'LOW Urgency Request'), row('high-id')]);
  app.realtime(); await app.flush();
  let tree = JSON.stringify(app.render());
  assert.ok(tree.includes('high-id'));
  assert.ok(!tree.includes('"request_id":"low"'));
  app.setRows([{ ...row('high-id'), status: 'Returned' }]);
  app.realtime(); await app.flush();
  assert.ok(!JSON.stringify(app.render()).includes('high-id'));
  app.setRows([row('fallback-high')]);
  await app.poll();
  tree = JSON.stringify(app.render());
  assert.ok(tree.includes('fallback-high'));
  assert.ok(!tree.includes('"title":"Refresh"'));
});
