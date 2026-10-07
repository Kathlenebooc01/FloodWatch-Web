import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const { code } = await transform(fs.readFileSync(new URL('../src/components/analytics/national-admin/AiPrioritizationCard.js', import.meta.url), 'utf8'), {
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2020' }, module: { type: 'commonjs' },
});

function setup(response = { success: true, data: { analyzed_at: '2026-10-08T01:00:00Z', prioritized_queue: [], executive_summary: {} } }) {
  const slots = [], effects = [], listeners = [];
  let cursor = 0, authChange;
  const posts = [];
  const session = { access_token: 'test-token', user: { id: 'admin', last_sign_in_at: 'first-login' } };
  const depsChanged = (a, b) => !a || a.some((value, index) => value !== b[index]);
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!slots[index] || depsChanged(slots[index].deps, deps)) slots[index] = { fn, deps };
      return slots[index].fn;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || depsChanged(slots[index].deps, deps)) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  const db = {
    auth: { async getSession() { return { data: { session } }; }, onAuthStateChange(fn) {
      authChange = fn; fn('INITIAL_SESSION', session); return { data: { subscription: { unsubscribe() {} } } };
    } },
    channel() { return { on(event, filter, fn) { listeners.push(fn); return this; }, subscribe(fn) { fn('SUBSCRIBED'); return this; } }; },
    removeChannel() {},
  };
  const compiledModule = { exports: {} };
  const icons = Object.fromEntries(['Sparkles', 'CloudRain', 'Brain', 'ShieldAlert', 'TrendingUp', 'RefreshCw', 'AlertTriangle', 'CheckCircle2', 'Clock', 'ArrowRight', 'Wind', 'Radio'].map(name => [name, () => null]));
  new Function('require', 'module', 'exports', 'fetch', code)(name => name === 'react' ? react : name.includes('supabase') ? { supabase: db } : name === 'lucide-react' ? icons : () => null,
    compiledModule, compiledModule.exports, async (url, options) => { posts.push({ url, options }); return { ok: response.success, async json() { return response; } }; });
  const Component = compiledModule.exports.default;
  const render = () => { cursor = 0; const tree = Component(); while (effects.length) effects.shift()(); return tree; };
  const allNodes = tree => [tree, ...(tree?.children || []).flat(Infinity).flatMap(child => child && typeof child === 'object' ? allNodes(child) : [])];
  const button = tree => allNodes(tree).find(node => node.type === 'button');
  return { render, button, posts, change: () => listeners[0](),
    signOut: () => authChange('SIGNED_OUT', null),
    signIn: () => authChange('SIGNED_IN', { ...session, user: { ...session.user, last_sign_in_at: 'second-login' } }) };
}
test('mount and realtime changes never call AI; only a click submits, and new logins reset', async () => {
  const app = setup();
  app.render();
  assert.equal(app.posts.length, 0);
  app.change();
  let tree = app.render();
  assert.equal(app.posts.length, 0);
  await app.button(tree).props.onClick();
  assert.equal(app.posts.length, 1);
  assert.equal(app.posts[0].options.headers.Authorization, 'Bearer test-token');
  app.signOut(); app.signIn();
  tree = app.render();
  assert.ok(JSON.stringify(tree).includes('Analyze & Prioritize Requests'));
  assert.equal(app.posts.length, 1);
});
test('concurrent clicks issue one request; failure restores an enabled Analyze button', async () => {
  const app = setup({ success: false, error: 'AI is busy. Please try again.' });
  app.render();
  const button = app.button(app.render());
  await Promise.all([button.props.onClick(), button.props.onClick()]);
  assert.equal(app.posts.length, 1);
  const tree = app.render();
  assert.equal(app.button(tree).props.disabled, false);
  assert.ok(JSON.stringify(tree).includes('AI is busy. Please try again.'));
});
