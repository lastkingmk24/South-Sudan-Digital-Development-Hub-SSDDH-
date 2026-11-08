/**
 * End-to-end UI tests against the real index.html + app.js in a DOM.
 *
 * Skipped automatically when jsdom is not installed (dependency-free clone);
 * `npm install && npm test` runs them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { bootApp, hasDom } from './support/app-harness.mjs';

const skip = hasDom ? false : 'jsdom not installed — run `npm install` to enable UI tests';

test('ui: boots and paints the home screen', { skip }, async () => {
  const app = await bootApp();
  try {
    assert.equal(app.$$('#tabbar a').length, 5, 'bottom navigation renders five destinations');
    assert.equal(app.$$('#topnav a').length, 5, 'desktop navigation renders the same five');
    assert.ok(app.$('.hero'), 'hero section renders');
    assert.ok(app.$$('.quick-card').length >= 3, 'quick actions render');
    assert.ok(app.$$('.stats__item').length === 4, 'the four statistics render');
    assert.ok(app.$$('.alert').length >= 3, 'alerts render');
    assert.match(app.text('#app-footer'), /v0\.3\.0/, 'footer shows the build version');
    assert.match(app.text('#net-pill'), /Online/i);
    assert.deepEqual(app.errors, [], 'no uncaught errors on boot');
  } finally {
    app.destroy();
  }
});

test('ui: searching filters the directory and can be cleared', { skip }, async () => {
  const app = await bootApp({ hash: '#/services' });
  try {
    assert.equal(app.$$('.service-card').length, 20, 'all facilities are listed initially');

    await app.type('#service-search', 'water');
    const filtered = app.$$('.service-card').length;
    assert.ok(filtered > 0 && filtered < 20, `search narrows the list (got ${filtered})`);

    await app.type('#service-search', 'zzz-nothing-matches');
    assert.ok(app.$('.empty'), 'an empty state replaces the list');

    await app.type('#service-search', '');
    assert.equal(app.$$('.service-card').length, 20, 'clearing the query restores everything');
  } finally {
    app.destroy();
  }
});

test('ui: category and state filters are reversible', { skip }, async () => {
  const app = await bootApp({ hash: '#/services' });
  try {
    const chip = app.$$('[data-action="set-category"]')[1];
    const category = chip.dataset.category;
    await app.click(chip);
    const first = app.$$('.service-card').length;
    assert.ok(first > 0 && first < 20, `category "${category}" narrows the list`);

    await app.click(`[data-action="set-category"][data-category="${category}"]`);
    assert.equal(app.$$('.service-card').length, 20, 'clicking the active category clears it');

    const stateSelect = app.$('[data-role="state-filter"]');
    assert.ok(stateSelect, 'state filter exists');
    await app.type(stateSelect, stateSelect.options[1].value);
    assert.ok(app.$$('.service-card').length > 0, 'state filter keeps matching facilities');
  } finally {
    app.destroy();
  }
});

test('ui: saving a facility persists and appears in the saved view', { skip }, async () => {
  const app = await bootApp({ hash: '#/services' });
  try {
    await app.click('.save-btn');
    assert.equal(app.$$('.save-btn.is-saved').length, 1, 'the button reflects the saved state');
    assert.equal(app.state().savedIds.length, 1, 'the choice is persisted');

    await app.go('#/saved');
    assert.equal(app.$$('.service-card').length, 1, 'the saved view lists exactly the saved facility');

    await app.click('.save-btn');
    await app.settle?.();
    assert.equal(app.state().savedIds.length, 0, 'unsaving removes it');
  } finally {
    app.destroy();
  }
});

test('ui: facility details open in a dialog with actions', { skip }, async () => {
  const app = await bootApp({ hash: '#/services' });
  try {
    await app.click('[data-action="open-service"]');
    const dialog = app.$('#detail-dialog');
    assert.ok(dialog.hasAttribute('open'), 'the dialog opens');
    assert.match(dialog.textContent, /Verified|Unverified/i, 'shows verification status');
    assert.ok(dialog.querySelector('[data-action="report-here"]'), 'offers a report shortcut');
    await app.click('#detail-dialog [data-action="close-detail"]');
    assert.ok(!app.$('#detail-dialog').hasAttribute('open'), 'the dialog closes');
  } finally {
    app.destroy();
  }
});

test('ui: submitting a report validates, queues and clears the draft', { skip }, async () => {
  const app = await bootApp({ hash: '#/report' });
  try {
    await app.submit('#report-form');
    assert.equal(app.state().reports?.length ?? 0, 0, 'an empty form is rejected');
    assert.ok(app.$$('.toast').length > 0, 'the user is told why');

    await app.click('.chip--radio input');
    await app.type('[data-role="description"]', 'The borehole pump at the school has been broken for three weeks.');
    const consent = app.$('[data-role="consent"]');
    consent.checked = true;
    consent.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    await app.submit('#report-form');

    const reports = app.state().reports ?? [];
    assert.equal(reports.length, 1, 'the report is stored');
    assert.match(reports[0].code, /^SSD-[A-Z2-9]{6}$/, 'a tracking code is issued');
    assert.ok(reports[0].idempotencyKey, 'the report carries an idempotency key');
    assert.ok(app.state().draft === null || !app.state().draft.description, 'the draft is cleared');
    assert.match(app.document.body.textContent, new RegExp(reports[0].code), 'the code is shown to the user');
    assert.deepEqual(app.errors, [], 'no uncaught errors during submission');
  } finally {
    app.destroy();
  }
});

test('ui: a submitted report can be tracked and shows a timeline', { skip }, async () => {
  const app = await bootApp({ hash: '#/report' });
  try {
    await app.click('.chip--radio input');
    await app.type('[data-role="description"]', 'Water point in Gudele has been dry for two weeks and the pump handle is broken.');
    const consent = app.$('[data-role="consent"]');
    consent.checked = true;
    consent.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    await app.submit('#report-form');
    const code = app.state().reports[0].code;

    await app.type('#track-input', code);
    await app.submit('#track-form');
    const dialog = app.$('#detail-dialog');
    assert.ok(dialog.hasAttribute('open'), 'tracking opens the report detail');
    assert.ok(app.$$('.timeline__step').length >= 4, 'the lifecycle is rendered as a timeline');
    assert.ok(app.$$('.timeline__step.is-done').length >= 1, 'completed steps are marked');

    await app.click('#detail-dialog [data-action="close-detail"]');
    await app.type('#track-input', 'SSD-NOPE00');
    await app.submit('#track-form');
    assert.ok(!app.$('#detail-dialog').hasAttribute('open'), 'unknown codes do not open a dialog');
    assert.ok(app.$$('.toast').length > 0, 'unknown codes warn the user');
  } finally {
    app.destroy();
  }
});

test('ui: the assistant answers with citations and refuses outside its corpus', { skip }, async () => {
  const app = await bootApp({ hash: '#/assistant' });
  try {
    await app.type('#assistant-input', 'What do I need to register a birth?');
    await app.submit('#assistant-form');
    await app.window.setTimeout?.(0);
    await new Promise((done) => setTimeout(done, 1200));

    assert.ok(app.$$('.msg').length >= 2, 'question and answer are both shown');
    assert.ok(app.$$('.citation').length > 0, 'the answer cites approved documents');
    assert.match(app.text('#chat-log'), /birth/i);

    await app.type('#assistant-input', 'Who won the Champions League in 2018?');
    await app.submit('#assistant-form');
    await new Promise((done) => setTimeout(done, 1200));
    const bots = app.$$('.msg--bot .msg__body');
    const refusal = bots[bots.length - 1].textContent;
    assert.match(refusal, /could not find|approve|guess|rephrase/i, 'unanswerable questions are refused');
    assert.equal(app.$$('.msg--bot').length, 2, 'the refusal is a normal message, not an error');
    assert.ok(app.state().chat.length >= 4, 'the conversation is persisted');
  } finally {
    app.destroy();
  }
});

test('ui: Arabic switches the document direction and re-renders', { skip }, async () => {
  const app = await bootApp();
  try {
    await app.click('#lang-toggle');
    assert.equal(app.document.documentElement.dir, 'rtl');
    assert.equal(app.document.documentElement.lang, 'ar');
    assert.match(app.text('.hero__title'), /[\u0600-\u06FF]/, 'the hero is translated');
    assert.match(app.text('#topnav'), /[\u0600-\u06FF]/, 'navigation is translated');

    await app.go('#/services');
    assert.equal(app.$$('.service-card').length, 20, 'the directory still renders');
    assert.match(app.text('.service-card'), /[\u0600-\u06FF]/, 'facility names are localised');

    await app.go('#/home');
    await app.click('#lang-toggle');
    assert.equal(app.document.documentElement.dir, 'ltr');
    assert.equal(app.state().lang, 'en');
  } finally {
    app.destroy();
  }
});

test('ui: the theme toggle cycles and persists', { skip }, async () => {
  const app = await bootApp();
  try {
    await app.click('#theme-toggle');
    const first = app.document.documentElement.dataset.theme;
    assert.ok(['dark', 'light'].includes(first), `theme becomes explicit (got ${first})`);
    assert.equal(app.state().theme, first, 'the choice is persisted');

    await app.click('#theme-toggle');
    assert.notEqual(app.document.documentElement.dataset.theme, first, 'toggling again flips it');
  } finally {
    app.destroy();
  }
});

test('ui: offline mode keeps the app usable and defers uploads', { skip }, async () => {
  const app = await bootApp({ hash: '#/report', online: false });
  try {
    assert.match(app.text('#net-pill'), /Offline/i, 'the shell shows the offline state');

    await app.click('.chip--radio input');
    await app.type('[data-role="description"]', 'Flooding has cut the road to the health centre since Friday morning.');
    const consent = app.$('[data-role="consent"]');
    consent.checked = true;
    consent.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    await app.submit('#report-form');

    const reports = app.state().reports ?? [];
    assert.equal(reports.length, 1, 'reports can still be submitted offline');
    assert.equal(reports[0].status, 'queued', 'they wait in the upload queue');

    await app.click('[data-action="sync-now"]');
    assert.equal(app.state().reports[0].status, 'queued', 'syncing is a no-op while offline');

    // Browsers update navigator.onLine before dispatching the event.
    Object.defineProperty(app.window.navigator, 'onLine', { value: true, configurable: true });
    app.window.dispatchEvent(new app.window.Event('online'));
    await new Promise((done) => setTimeout(done, 300));
    assert.equal(app.state().reports[0].status, 'received', 'reconnecting drains the queue');
  } finally {
    app.destroy();
  }
});

test('ui: unknown routes fall back to home', { skip }, async () => {
  const app = await bootApp({ hash: '#/not-a-route' });
  try {
    assert.ok(app.$('.hero'), 'the home view renders');
    assert.match(app.text('#topnav .is-active, #tabbar .is-active'), /Home/i, 'home is marked active');
  } finally {
    app.destroy();
  }
});
