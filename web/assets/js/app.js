import { ALERTS, CATEGORIES, DOCUMENTS, SERVICES, STATES, STATS } from './content.js';
import { getLang, localizeName, localizeState, setLang, t } from './i18n.js';
import { buildIndex } from './rag.js';
import { photos, store } from './store.js';
import { icon, categoryIcon, levelIcon } from './icons.js';
import {
  $,
  $$,
  confirmDialog,
  dataUrlSize,
  debounce,
  downloadJson,
  escapeHtml,
  formatBytes,
  formatDate,
  mountToasts,
  resizeImage,
  toast,
  trackingCode,
  uid,
} from './util.js';

const VERSION = '0.3.0';
const APP_TITLE = 'SSDDH';
const MAX_DESCRIPTION = 1000;
const MIN_DESCRIPTION = 20;
const LAST_SYNC_FALLBACK = SERVICES.map((s) => s.lastVerified)
  .filter(Boolean)
  .sort()
  .slice(-1)[0];

const index = buildIndex(DOCUMENTS);

const app = {
  route: 'home',
  serviceFilters: { query: '', category: 'all', state: 'all', sort: 'recent', savedOnly: false },
  reportForm: null,
  pendingPhoto: null,
  syncing: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  installPrompt: null,
};

/* ------------------------------ helpers --------------------------------- */

function tt(key, vars) {
  return t(key, vars);
}

function lang() {
  return getLang();
}

function serviceStateLabel(id) {
  return localizeState(id);
}

function statusLabel(status) {
  return tt(`status.${status}`);
}

function statusChip(status) {
  return `<span class="chip chip--status chip--${status}">${escapeHtml(statusLabel(status))}</span>`;
}

function verifiedChip(service) {
  if (service.verified) {
    return `<span class="chip chip--ok">${icon('shield', { size: 14 })} ${escapeHtml(
      tt('services.verified'),
    )}</span>`;
  }
  return `<span class="chip chip--pending">${icon('clock', { size: 14 })} ${escapeHtml(
    tt('services.unverified'),
  )}</span>`;
}

function facilityById(id) {
  return SERVICES.find((service) => service.id === id) || null;
}

function lastSyncDate() {
  const sync = store.getState().lastSync;
  return formatDate(sync || LAST_SYNC_FALLBACK, lang());
}

function initials(text) {
  return text
    .replace(/\[DEMO\]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function mapUrl(service) {
  const query = `${service.name} ${service.city} ${serviceStateLabel(service.state)}`;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return tt('home.greetMorning');
  if (hour < 17) return tt('home.greetAfternoon');
  return tt('home.greetEvening');
}

/* ------------------------------- chrome --------------------------------- */

const NAV_ITEMS = [
  { name: 'home', icon: 'home' },
  { name: 'services', icon: 'directory' },
  { name: 'report', icon: 'megaphone' },
  { name: 'assistant', icon: 'sparkles' },
  { name: 'more', icon: 'more' },
];

function renderNav() {
  const tabbar = $('#tabbar');
  if (tabbar) {
    tabbar.innerHTML = NAV_ITEMS.map(
      ({ name, icon: iconName }) => `
        <a class="tabbar__link" href="#/${name}" data-nav="${name}">
          ${icon(iconName, { size: 21 })}
          <span>${escapeHtml(t(`nav.${name}`))}</span>
        </a>`,
    ).join('');
  }
  const topnav = $('#topnav');
  if (topnav) {
    topnav.innerHTML = NAV_ITEMS.map(
      ({ name }) =>
        `<a class="topnav__link" href="#/${name}" data-nav="${name}">${escapeHtml(t(`nav.${name}`))}</a>`,
    ).join('');
  }
}

function applyChrome() {
  const state = store.getState();
  const root = document.documentElement;
  root.lang = lang();
  root.dir = lang() === 'ar' ? 'rtl' : 'ltr';
  root.dataset.lang = lang();

  if (state.theme && state.theme !== 'system') root.dataset.theme = state.theme;
  else delete root.dataset.theme;

  document.title =
    lang() === 'ar'
      ? 'مركز جنوب السودان للتنمية الرقمية — خدمات موثقة'
      : 'South Sudan Digital Development Hub — verified public services';

  $$('[data-i18n]').forEach((node) => {
    node.textContent = tt(node.dataset.i18n);
  });

  const tagline = $('[data-i18n="app.tagline"]');
  if (tagline) tagline.textContent = tt('app.tagline');

  const netPill = $('#net-pill');
  if (netPill) {
    const online = app.online;
    netPill.innerHTML = `${icon(online ? 'wifi' : 'wifiOff', { size: 15 })}
      <span>${escapeHtml(online ? tt('state.online') : tt('state.offlineShort'))}</span>`;
    netPill.classList.toggle('pill--offline', !online);
    netPill.title = online ? tt('state.online') : tt('state.offline');
  }

  const langButton = $('#lang-toggle');
  if (langButton) {
    langButton.dataset.action = 'toggle-lang';
    langButton.setAttribute('aria-label', `${tt('more.language')}: ${lang() === 'en' ? 'العربية' : 'English'}`);
    langButton.innerHTML = `<span class="lang-toggle__label">${lang() === 'en' ? 'ع' : 'EN'}</span>`;
  }

  const themeButton = $('#theme-toggle');
  if (themeButton) {
    const theme = document.documentElement.dataset.theme;
    const next = theme === 'dark' ? 'sun' : 'moon';
    themeButton.dataset.action = 'toggle-theme';
    themeButton.setAttribute('aria-label', tt('action.theme'));
    themeButton.innerHTML = icon(next, { size: 19 });
  }

  $$('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === app.route || (app.route === 'service' && link.dataset.nav === 'services');
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const fab = $('#install-button');
  if (fab) fab.hidden = !app.installPrompt;

  const footer = $('#app-footer');
  if (footer) {
    footer.innerHTML = `<p>${escapeHtml(tt('footer.demo'))}</p>
      <p class="footer__meta">${escapeHtml(APP_TITLE)} v${VERSION} · ${escapeHtml(tt('footer.rights'))}</p>`;
  }
}

/* -------------------------------- router -------------------------------- */

function parseRoute() {
  const hash = (typeof location !== 'undefined' && location.hash) || '';
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  const [name] = path.split('/');
  const known = ['services', 'saved', 'report', 'assistant', 'more'];
  app.route = known.includes(name) ? name : 'home';
}

function navigate(route) {
  if (typeof location === 'undefined') return;
  const target = `#/${route}`;
  if (location.hash === target) {
    render();
  } else {
    location.hash = target;
  }
}

/* -------------------------------- views --------------------------------- */

function heroSearch() {
  return `
    <form class="searchbar" role="search" id="home-search">
      <label class="visually-hidden" for="home-search-input">${escapeHtml(tt('action.search'))}</label>
      ${icon('search', { size: 20, className: 'searchbar__icon' })}
      <input id="home-search-input" type="search" name="q" autocomplete="off"
        placeholder="${escapeHtml(tt('home.searchPlaceholder'))}" />
      <button class="btn btn--primary searchbar__button" type="submit">${escapeHtml(tt('action.search'))}</button>
    </form>`;
}

function quickActions() {
  const savedCount = store.getState().savedIds.length;
  const items = [
    { route: 'services', icon: 'directory', title: 'home.quickFind', sub: 'home.quickFindSub' },
    { route: 'report', icon: 'megaphone', title: 'home.quickReport', sub: 'home.quickReportSub' },
    { route: 'assistant', icon: 'sparkles', title: 'home.quickAsk', sub: 'home.quickAskSub' },
    {
      route: 'saved',
      icon: 'bookmark',
      title: 'home.quickSaved',
      sub: 'home.quickSavedSub',
      meta: savedCount ? `<span class="chip chip--count">${savedCount}</span>` : '',
    },
  ];
  return `<div class="quick-grid">${items
    .map(
      (item) => `
      <a class="quick-card" href="#/${item.route}">
        <span class="quick-card__icon">${icon(item.icon, { size: 22 })}</span>
        <span class="quick-card__text">
          <strong>${escapeHtml(tt(item.title))}</strong>
          <span>${escapeHtml(tt(item.sub))}</span>
        </span>
        ${item.meta || ''}
        ${icon('chevronRight', { size: 18, className: 'quick-card__chevron' })}
      </a>`,
    )
    .join('')}</div>`;
}

function statsStrip() {
  const items = [
    { value: STATS.services, label: 'home.statsServices', icon: 'directory' },
    { value: STATS.verified, label: 'home.statsVerified', icon: 'shield' },
    { value: STATS.states, label: 'home.statsStates', icon: 'pin' },
    { value: STATS.documents, label: 'home.statsDocs', icon: 'doc' },
  ];
  return `<dl class="stats">${items
    .map(
      (item) => `
      <div class="stats__item">
        <dt>${icon(item.icon, { size: 18 })}<span>${escapeHtml(tt(item.label))}</span></dt>
        <dd>${item.value}</dd>
      </div>`,
    )
    .join('')}</dl>`;
}

function alertsList() {
  return `<ul class="alerts">${ALERTS.map((alert) => {
    const stateLabel = alert.state ? serviceStateLabel(alert.state) : null;
    return `
      <li class="alert alert--${alert.level}">
        <span class="alert__icon">${levelIcon(alert.level, { size: 18 })}</span>
        <div class="alert__body">
          <p class="alert__title">${escapeHtml(alert.title)}</p>
          <p class="alert__text">${escapeHtml(alert.body)}</p>
          <p class="alert__meta">${escapeHtml(tt(`level.${alert.level}`))} · ${formatDate(alert.published, lang())}${
            stateLabel ? ` · ${escapeHtml(stateLabel)}` : ''
          }</p>
        </div>
      </li>`;
  }).join('')}</ul>`;
}

function viewHome() {
  return `
    <section class="hero">
      <p class="hero__greeting">${escapeHtml(greeting())}</p>
      <h1 class="hero__title">${escapeHtml(tt('home.title'))}</h1>
      <p class="hero__subtitle">${escapeHtml(tt('home.subtitle'))}</p>
      ${heroSearch()}
      <p class="hero__hint">${icon('lock', { size: 14 })} ${escapeHtml(tt('home.privacyBody'))}</p>
    </section>

    ${quickActions()}

    <section class="section">
      <div class="section__head">
        <h2>${escapeHtml(tt('home.alertsTitle'))}</h2>
        <p class="section__sub">${escapeHtml(tt('home.alertsSub'))}</p>
      </div>
      ${alertsList()}
    </section>

    <section class="section">${statsStrip()}</section>

    <div class="duo">
      <article class="info-card">
        <span class="info-card__icon">${icon('shield', { size: 20 })}</span>
        <h2>${escapeHtml(tt('home.offlineTitle'))}</h2>
        <p>${escapeHtml(tt('home.offlineBody'))}</p>
      </article>
      <article class="info-card">
        <span class="info-card__icon">${icon('lock', { size: 20 })}</span>
        <h2>${escapeHtml(tt('home.privacyTitle'))}</h2>
        <p>${escapeHtml(tt('home.privacyBody'))}</p>
      </article>
    </div>

    <p class="demo-note">${icon('info', { size: 15 })} <span>${escapeHtml(tt('demo.notice'))}</span></p>`;
}

function categoryChips() {
  const { category } = app.serviceFilters;
  const options = [{ id: 'all', label: tt('services.allCategories'), icon: 'directory' }, ...CATEGORIES.map((c) => ({ ...c, label: tt(`cat.${c.id}`) }))];
  return `<div class="chips" role="group" aria-label="${escapeHtml(tt('report.category'))}">
    ${options
      .map(
        (option) => `
        <button type="button" class="chip chip--filter ${category === option.id ? 'is-active' : ''}"
          data-action="set-category" data-category="${option.id}"
          aria-pressed="${category === option.id}">
          ${categoryIcon(option.icon, 16)} ${escapeHtml(option.label)}
        </button>`,
      )
      .join('')}
  </div>`;
}

function serviceCard(service) {
  const saved = store.isSaved(service.id);
  return `
    <article class="service-card" data-service="${service.id}">
      <div class="service-card__top">
        <span class="service-card__icon cat--${service.category}">${categoryIcon(service.category, 22)}</span>
        <div class="service-card__heading">
          <h3>${escapeHtml(localizeName(service))}</h3>
          <p class="service-card__meta">${escapeHtml(tt(`cat.${service.category}`))} · ${escapeHtml(
            service.city,
          )}, ${escapeHtml(serviceStateLabel(service.state))}</p>
        </div>
        <button type="button" class="save-btn ${saved ? 'is-saved' : ''}" data-action="toggle-save"
          data-id="${service.id}" aria-pressed="${saved}"
          aria-label="${escapeHtml(tt(saved ? 'action.saved' : 'action.save'))}: ${escapeHtml(localizeName(service))}">
          ${icon(saved ? 'bookmarkFilled' : 'bookmark', { size: 18 })}
        </button>
      </div>
      <div class="service-card__chips">
        ${verifiedChip(service)}
        <span class="chip chip--demo">[DEMO]</span>
        ${service.verified && service.lastVerified
          ? `<span class="service-card__checked">${escapeHtml(
              tt('services.lastVerified', { date: formatDate(service.lastVerified, lang()) }),
            )}</span>`
          : ''}
      </div>
      <p class="service-card__line">${icon('clock', { size: 15 })} <span>${escapeHtml(service.hours)}</span></p>
      <p class="service-card__line">${icon('pin', { size: 15 })} <span>${escapeHtml(service.address)}</span></p>
      <div class="service-card__actions">
        <button type="button" class="btn btn--soft btn--sm" data-action="open-service" data-id="${service.id}">
          ${escapeHtml(tt('action.details'))} ${icon('chevronRight', { size: 15 })}
        </button>
        <a class="btn btn--ghost btn--sm" href="${mapUrl(service)}" target="_blank" rel="noopener noreferrer">
          ${icon('map', { size: 15 })} ${escapeHtml(tt('action.map'))}
        </a>
      </div>
    </article>`;
}

function filteredServices() {
  const { query, category, state, sort } = app.serviceFilters;
  const savedOnly = app.serviceFilters.savedOnly || app.route === 'saved';
  const needle = query.trim().toLowerCase();
  const savedIds = store.getState().savedIds;
  let list = SERVICES.filter((service) => {
    if (savedOnly && !savedIds.includes(service.id)) return false;
    if (category !== 'all' && service.category !== category) return false;
    if (state !== 'all' && service.state !== state) return false;
    if (!needle) return true;
    const haystack = [
      service.name,
      service.nameAr,
      service.city,
      service.address,
      serviceStateLabel(service.state),
      tt(`cat.${service.category}`),
      ...service.services,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });

  if (sort === 'name') list = [...list].sort((a, b) => localizeName(a).localeCompare(localizeName(b)));
  else if (sort === 'state')
    list = [...list].sort(
      (a, b) =>
        serviceStateLabel(a.state).localeCompare(serviceStateLabel(b.state)) ||
        localizeName(a).localeCompare(localizeName(b)),
    );
  else
    list = [...list].sort((a, b) => {
      const av = a.verified ? a.lastVerified || '' : '0000';
      const bv = b.verified ? b.lastVerified || '' : '0000';
      return bv.localeCompare(av);
    });
  return list;
}

function resultsMarkup() {
  const list = filteredServices();
  const count = list.length;
  const countText = count === 1 ? tt('services.result') : tt('services.results', { count });
  return {
    count,
    html: `
      <div class="results-bar">
        <p class="results-bar__count" id="results-count" aria-live="polite">${escapeHtml(countText)}</p>
        ${!app.online ? `<p class="results-bar__stale">${icon('wifiOff', { size: 15 })} ${escapeHtml(
          tt('services.staleBody', { date: lastSyncDate() }),
        )}</p>` : ''}
      </div>
      ${
        count
          ? `<div class="service-list">${list.map(serviceCard).join('')}</div>`
          : `<div class="empty">
              <span class="empty__icon">${icon('search', { size: 26 })}</span>
              <h3>${escapeHtml(tt('services.none'))}</h3>
              <p>${escapeHtml(tt('services.noneHint'))}</p>
              <button type="button" class="btn btn--soft" data-action="clear-filters">${escapeHtml(
                tt('services.clearFilters'),
              )}</button>
            </div>`
      }`,
  };
}

function viewServices() {
  const { query, state, sort } = app.serviceFilters;
  const savedOnly = app.serviceFilters.savedOnly || app.route === 'saved';
  const result = resultsMarkup();
  const title = app.route === 'saved' ? tt('home.quickSaved') : tt('services.title');
  return `
    <header class="page-head">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(tt('services.subtitle', { count: STATS.services, states: STATS.states }))}</p>
    </header>

    <div class="filters">
      <div class="searchbar searchbar--compact">
        <label class="visually-hidden" for="service-search">${escapeHtml(tt('action.search'))}</label>
        ${icon('search', { size: 19, className: 'searchbar__icon' })}
        <input id="service-search" type="search" autocomplete="off" value="${escapeHtml(query)}"
          placeholder="${escapeHtml(tt('services.searchPlaceholder'))}" data-role="service-search" />
      </div>
      ${categoryChips()}
      <div class="filters__row">
        <label class="field field--inline">
          <span class="field__label">${escapeHtml(tt('services.allStates'))}</span>
          <select data-role="state-filter">
            <option value="all"${state === 'all' ? ' selected' : ''}>${escapeHtml(tt('services.allStates'))}</option>
            ${STATES.map(
              (item) =>
                `<option value="${item.id}"${state === item.id ? ' selected' : ''}>${escapeHtml(
                  lang() === 'ar' ? item.ar : item.en,
                )}</option>`,
            ).join('')}
          </select>
        </label>
        <label class="field field--inline">
          <span class="field__label">${escapeHtml(tt('services.sort'))}</span>
          <select data-role="sort-filter">
            <option value="recent"${sort === 'recent' ? ' selected' : ''}>${escapeHtml(tt('services.sortRecent'))}</option>
            <option value="name"${sort === 'name' ? ' selected' : ''}>${escapeHtml(tt('services.sortName'))}</option>
            <option value="state"${sort === 'state' ? ' selected' : ''}>${escapeHtml(tt('services.sortState'))}</option>
          </select>
        </label>
        <label class="toggle">
          <input type="checkbox" data-role="saved-filter" ${savedOnly ? 'checked' : ''} />
          <span>${escapeHtml(tt('services.savedOnly'))}</span>
        </label>
      </div>
    </div>

    <div id="results">${result.html}</div>`;
}

function reportDraftDefaults() {
  return {
    category: '',
    facilityId: '',
    description: '',
    photoId: null,
    photoSize: 0,
    location: null,
    consent: false,
  };
}

function ensureReportForm() {
  if (!app.reportForm) {
    const draft = store.getState().draft;
    app.reportForm = { ...reportDraftDefaults(), ...(draft || {}) };
  }
  return app.reportForm;
}

function viewReport() {
  const form = ensureReportForm();
  const queued = store.queue();
  const reports = store.getState().reports;
  return `
    <header class="page-head">
      <h1>${escapeHtml(tt('report.title'))}</h1>
      <p>${escapeHtml(tt('report.subtitle'))}</p>
    </header>

    <p class="callout callout--info">${icon('info', { size: 17 })}<span>${escapeHtml(
      tt('report.demoNotice'),
    )}</span></p>

    <form class="card form" id="report-form" novalidate>
      <fieldset class="form__group">
        <legend class="form__legend">${escapeHtml(tt('report.category'))}</legend>
        <div class="chips chips--wrap" role="radiogroup" aria-label="${escapeHtml(tt('report.category'))}">
          ${CATEGORIES.map(
            (category) => `
            <label class="chip chip--radio ${form.category === category.id ? 'is-active' : ''}">
              <input type="radio" name="category" value="${category.id}" ${
                form.category === category.id ? 'checked' : ''
              } />
              ${categoryIcon(category.icon, 16)} ${escapeHtml(tt(`cat.${category.id}`))}
            </label>`,
          ).join('')}
        </div>
      </fieldset>

      <label class="field">
        <span class="field__label">${escapeHtml(tt('report.facility'))}</span>
        <select data-role="facility-select">
          <option value="">${escapeHtml(tt('report.facilityNone'))}</option>
          ${SERVICES.map(
            (service) =>
              `<option value="${service.id}"${form.facilityId === service.id ? ' selected' : ''}>${escapeHtml(
                localizeName(service),
              )} — ${escapeHtml(service.city)}</option>`,
          ).join('')}
        </select>
      </label>

      <label class="field">
        <span class="field__label">${escapeHtml(tt('report.description'))}</span>
        <textarea data-role="description" rows="5" maxlength="${MAX_DESCRIPTION}"
          placeholder="${escapeHtml(tt('report.descriptionPlaceholder'))}">${escapeHtml(form.description)}</textarea>
        <span class="field__hint" data-role="description-hint">${escapeHtml(
          tt('report.descriptionHint', { count: form.description.length }),
        )}</span>
      </label>

      <div class="field">
        <span class="field__label">${escapeHtml(tt('report.photo'))}</span>
        <div class="photo-field" data-role="photo-field">
          <div class="photo-field__preview" data-role="photo-preview">
            ${
              form.photoId
                ? `<span class="photo-field__placeholder">${icon('image', { size: 22 })}</span>`
                : `<span class="photo-field__placeholder">${icon('camera', { size: 22 })}</span>`
            }
          </div>
          <div class="photo-field__actions">
            <label class="btn btn--soft btn--sm">
              ${escapeHtml(tt(form.photoId ? 'report.photoChange' : 'report.photoChoose'))}
              <input type="file" accept="image/*" data-role="photo-input" class="visually-hidden" />
            </label>
            ${
              form.photoId
                ? `<button type="button" class="btn btn--ghost btn--sm" data-action="remove-photo">${escapeHtml(
                    tt('report.photoRemove'),
                  )}</button>`
                : ''
            }
          </div>
        </div>
        <span class="field__hint">${escapeHtml(tt('report.photoHint', { size: '1024 px / ≈150 KB' }))}</span>
      </div>

      <div class="field">
        <span class="field__label">${escapeHtml(tt('report.location'))}</span>
        <div class="location-row">
          ${
            form.location
              ? `<span class="chip chip--ok">${icon('pin', { size: 14 })} ${escapeHtml(
                  `${form.location.lat.toFixed(2)}, ${form.location.lng.toFixed(2)} (±1 km)`,
                )}</span>`
              : `<span class="field__hint">${escapeHtml(tt('report.locationHint'))}</span>`
          }
          <button type="button" class="btn btn--soft btn--sm" data-action="add-location">
            ${icon('pin', { size: 15 })} ${escapeHtml(tt('report.locationAdd'))}
          </button>
        </div>
      </div>

      <label class="checkbox">
        <input type="checkbox" data-role="consent" ${form.consent ? 'checked' : ''} />
        <span>${escapeHtml(tt('report.consent'))}</span>
      </label>

      <div class="form__actions">
        <button type="button" class="btn btn--ghost" data-action="save-draft">${escapeHtml(
          tt('report.saveDraft'),
        )}</button>
        <button type="submit" class="btn btn--primary">${escapeHtml(tt('report.submit'))}</button>
      </div>
    </form>

    <section class="card queue">
      <div class="card__head">
        <h2>${icon('upload', { size: 18 })} ${escapeHtml(tt('report.queue'))}</h2>
        <span class="chip chip--count">${escapeHtml(
          queued.length ? tt('report.queuePending', { count: queued.length }) : '0',
        )}</span>
      </div>
      ${
        queued.length
          ? `<ul class="queue__list">${queued
              .map(
                (report) => `
                <li class="queue__item">
                  <div>
                    <strong>${escapeHtml(report.code)}</strong>
                    <p>${escapeHtml(
                      tt(`cat.${report.category}`),
                    )} · ${escapeHtml(formatDate(report.createdAt, lang()))}</p>
                  </div>
                  ${statusChip(report.status)}
                </li>`,
              )
              .join('')}</ul>`
          : `<p class="muted">${escapeHtml(tt('report.queueEmpty'))}</p>`
      }
      <button type="button" class="btn btn--soft btn--sm" data-action="sync-now" ${
        queued.length ? '' : 'disabled'
      }>${icon('refresh', { size: 15 })} ${escapeHtml(tt('report.syncNow'))}</button>
    </section>

    <section class="section">
      <div class="section__head"><h2>${escapeHtml(tt('report.myReports'))}</h2></div>
      ${
        reports.length
          ? `<ul class="report-list">${reports
              .map(
                (report) => `
                <li class="card report-item">
                  <div class="report-item__head">
                    <div>
                      <p class="report-item__code">${escapeHtml(report.code)}</p>
                      <p class="muted">${escapeHtml(tt(`cat.${report.category}`))} · ${escapeHtml(
                        formatDate(report.createdAt, lang()),
                      )}</p>
                    </div>
                    ${statusChip(report.status)}
                  </div>
                  <p class="report-item__text">${escapeHtml(report.description.slice(0, 140))}${
                    report.description.length > 140 ? '…' : ''
                  }</p>
                  <div class="report-item__actions">
                    <button type="button" class="btn btn--soft btn--sm" data-action="view-report" data-code="${escapeHtml(
                      report.code,
                    )}">${escapeHtml(tt('report.viewReport'))}</button>
                    <button type="button" class="btn btn--ghost btn--sm" data-action="delete-report" data-code="${escapeHtml(
                      report.code,
                    )}">${icon('trash', { size: 15 })} ${escapeHtml(tt('action.delete'))}</button>
                  </div>
                </li>`,
              )
              .join('')}</ul>`
          : `<p class="empty empty--inline">${escapeHtml(tt('report.noReports'))}</p>`
      }
    </section>

    <section class="card">
      <h2 class="card__title">${icon('search', { size: 18 })} ${escapeHtml(tt('report.track'))}</h2>
      <p class="muted">${escapeHtml(tt('report.trackHint'))}</p>
      <form class="filters__row" id="track-form">
        <label class="field" style="flex:1 1 200px">
          <span class="field__label">${escapeHtml(tt('report.trackingCode'))}</span>
          <input type="text" id="track-input" name="code" autocomplete="off" spellcheck="false"
            placeholder="${escapeHtml(tt('report.trackPlaceholder'))}" />
        </label>
        <button type="submit" class="btn btn--soft">${escapeHtml(tt('report.trackButton'))}</button>
      </form>
    </section>`;
}

function chatMessages() {
  const chat = store.getState().chat;
  if (!chat.length) {
    return `<div class="msg msg--bot">
      <div class="msg__avatar">${icon('sparkles', { size: 18 })}</div>
      <div class="msg__body"><p>${escapeHtml(tt('assistant.greeting'))}</p></div>
    </div>`;
  }
  return chat
    .map((message) => {
      if (message.role === 'user') {
        return `<div class="msg msg--user">
          <div class="msg__body"><p>${escapeHtml(message.text)}</p></div>
        </div>`;
      }
      if (message.kind === 'refusal') {
        return `<div class="msg msg--bot">
          <div class="msg__avatar">${icon('sparkles', { size: 18 })}</div>
          <div class="msg__body">
            <p>${escapeHtml(tt('assistant.refusal'))}</p>
          </div>
        </div>`;
      }
      const citations = (message.citations || [])
        .map(
          (citation) => `
          <li class="citation">
            <div class="citation__head">
              <span class="citation__n">${citation.n}</span>
              <strong>${escapeHtml(citation.docTitle)}</strong>
              <span class="chip chip--ok">${escapeHtml(tt('assistant.approved'))}</span>
            </div>
            <p class="citation__meta">§ ${escapeHtml(citation.heading)} · ${escapeHtml(
              citation.authority,
            )} · ${escapeHtml(formatDate(citation.approvedOn, lang()))}</p>
            <p class="citation__snippet">“${escapeHtml(citation.snippet)}”</p>
          </li>`,
        )
        .join('');
      return `<div class="msg msg--bot">
        <div class="msg__avatar">${icon('sparkles', { size: 18 })}</div>
        <div class="msg__body">
          <p>${escapeHtml(message.answer)}</p>
          ${
            citations
              ? `<div class="citations">
                  <p class="citations__title">${icon('doc', { size: 15 })} ${escapeHtml(tt('assistant.sources'))}</p>
                  <ol class="citations__list">${citations}</ol>
                </div>`
              : ''
          }
        </div>
      </div>`;
    })
    .join('');
}

function viewAssistant() {
  const suggestions = ['assistant.suggest1', 'assistant.suggest2', 'assistant.suggest3', 'assistant.suggest4'];
  return `
    <header class="page-head">
      <h1>${escapeHtml(tt('assistant.title'))}</h1>
      <p>${escapeHtml(tt('assistant.subtitle', { docs: STATS.documents, passages: STATS.passages }))}</p>
    </header>

    <p class="callout callout--info">${icon('lock', { size: 17 })}<span>${escapeHtml(
      tt('assistant.disclaimer'),
    )}</span></p>

    <div class="assistant card">
      <div class="assistant__log" id="chat-log" role="log" aria-live="polite" aria-label="${escapeHtml(
        tt('assistant.title'),
      )}">
        ${chatMessages()}
      </div>
      <div class="assistant__suggestions">
        ${suggestions
          .map(
            (key) =>
              `<button type="button" class="chip chip--filter" data-action="ask-suggestion" data-question="${escapeHtml(
                tt(key),
              )}">${escapeHtml(tt(key))}</button>`,
          )
          .join('')}
      </div>
      <form class="assistant__composer" id="assistant-form">
        <label class="visually-hidden" for="assistant-input">${escapeHtml(tt('assistant.placeholder'))}</label>
        <input id="assistant-input" type="text" autocomplete="off"
          placeholder="${escapeHtml(tt('assistant.placeholder'))}" />
        <button type="submit" class="btn btn--primary btn--icon" aria-label="${escapeHtml(tt('action.send'))}">
          ${icon('send', { size: 18 })}
        </button>
      </form>
      <div class="assistant__footer">
        <span>${escapeHtml(tt('assistant.arabicNote'))}</span>
        <button type="button" class="link-btn" data-action="clear-chat">${escapeHtml(tt('assistant.clear'))}</button>
      </div>
    </div>`;
}

function themeValue() {
  return store.getState().theme || 'system';
}

function viewMore() {
  const state = store.getState();
  const size = store.approximateSize();
  const themes = [
    { id: 'system', label: 'more.themeSystem' },
    { id: 'light', label: 'more.themeLight' },
    { id: 'dark', label: 'more.themeDark' },
  ];
  return `
    <header class="page-head">
      <h1>${escapeHtml(tt('more.title'))}</h1>
      <p>${escapeHtml(tt('more.aboutBody'))}</p>
    </header>

    <section class="card">
      <h2 class="card__title">${icon('globe', { size: 18 })} ${escapeHtml(tt('more.language'))}</h2>
      <p class="muted">${escapeHtml(tt('more.languageHint'))}</p>
      <div class="segmented" role="group" aria-label="${escapeHtml(tt('more.language'))}">
        <button type="button" class="segmented__btn ${lang() === 'en' ? 'is-active' : ''}"
          data-action="set-lang" data-lang="en" aria-pressed="${lang() === 'en'}">English</button>
        <button type="button" class="segmented__btn ${lang() === 'ar' ? 'is-active' : ''}"
          data-action="set-lang" data-lang="ar" aria-pressed="${lang() === 'ar'}">العربية</button>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">${icon('sun', { size: 18 })} ${escapeHtml(tt('more.theme'))}</h2>
      <div class="segmented" role="group" aria-label="${escapeHtml(tt('more.theme'))}">
        ${themes
          .map(
            (theme) => `
            <button type="button" class="segmented__btn ${themeValue() === theme.id ? 'is-active' : ''}"
              data-action="set-theme" data-theme="${theme.id}"
              aria-pressed="${themeValue() === theme.id}">${escapeHtml(tt(theme.label))}</button>`,
          )
          .join('')}
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">${icon('lock', { size: 18 })} ${escapeHtml(tt('more.storage'))}</h2>
      <dl class="kv">
        <div><dt>${escapeHtml(tt('more.storageSaved'))}</dt><dd>${state.savedIds.length}</dd></div>
        <div><dt>${escapeHtml(tt('more.storageReports'))}</dt><dd>${state.reports.length}</dd></div>
        <div><dt>${escapeHtml(tt('more.storageDrafts'))}</dt><dd>${state.draft ? 1 : 0}</dd></div>
        <div><dt>${escapeHtml(tt('more.storageSize'))}</dt><dd>${escapeHtml(formatBytes(size))}</dd></div>
      </dl>
      <p class="muted">${escapeHtml(tt('more.exportHint'))}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--soft" data-action="export-data">
          ${icon('download', { size: 16 })} ${escapeHtml(tt('more.export'))}
        </button>
        <button type="button" class="btn btn--danger-ghost" data-action="delete-all">
          ${icon('trash', { size: 16 })} ${escapeHtml(tt('more.deleteAll'))}
        </button>
      </div>
      <p class="muted small">${escapeHtml(tt('more.deleteHint'))}</p>
    </section>

    <section class="card">
      <h2 class="card__title">${icon('info', { size: 18 })} ${escapeHtml(tt('more.about'))}</h2>
      <p>${escapeHtml(tt('more.sourcesBody'))}</p>
      <dl class="kv">
        <div><dt>${escapeHtml(tt('more.version'))}</dt><dd>${VERSION}</dd></div>
        <div><dt>${escapeHtml(tt('more.sources'))}</dt><dd>${STATS.services} ${escapeHtml(tt('home.statsServices'))}</dd></div>
        <div><dt>${escapeHtml(tt('more.privacy'))}</dt><dd>${escapeHtml(tt('demo.badge'))}</dd></div>
      </dl>
      <ul class="link-list">
        <li><a href="https://github.com/lastkingmk24/South-Sudan-Digital-Development-Hub-SSDDH-" target="_blank" rel="noopener noreferrer">
          ${icon('external', { size: 15 })} ${escapeHtml(tt('more.github'))}</a></li>
        <li><a href="https://github.com/lastkingmk24/South-Sudan-Digital-Development-Hub-SSDDH-/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener noreferrer">
          ${icon('doc', { size: 15 })} ${escapeHtml(tt('more.docs'))}</a></li>
      </ul>
      <p class="muted small">${escapeHtml(tt('more.builtBy'))}</p>
    </section>`;
}

/* ------------------------------- render --------------------------------- */

const ROUTES = {
  home: viewHome,
  services: viewServices,
  saved: viewServices,
  report: viewReport,
  assistant: viewAssistant,
  more: viewMore,
};

function render({ keepFocus = false } = {}) {
  parseRoute();
  const view = $('#view');
  if (!view) return;
  const active = keepFocus ? document.activeElement : null;
  view.innerHTML = ROUTES[app.route] ? ROUTES[app.route]() : viewHome();
  applyChrome();
  bindViewEvents();

  if (app.route === 'assistant') {
    const input = $('#assistant-input');
    if (input && !keepFocus) input.focus({ preventScroll: true });
    scrollChat();
  }
  if (active && keepFocus) {
    const selector = active.id ? `#${active.id}` : active.dataset?.role ? `[data-role="${active.dataset.role}"]` : null;
    if (selector) {
      const restored = document.querySelector(selector);
      if (restored && typeof restored.focus === 'function') {
        restored.focus({ preventScroll: true });
        if ('selectionStart' in restored && typeof active.selectionStart === 'number') {
          try {
            restored.setSelectionRange(active.selectionStart, active.selectionStart);
          } catch (error) {
            /* not a text input */
          }
        }
      }
    }
  }
}

function rerenderResults() {
  const host = $('#results');
  if (!host) return;
  const { html } = resultsMarkup();
  host.innerHTML = html;
}

/* ------------------------------ interactions ----------------------------- */

function applyFilters(patch, { focusSearch = false } = {}) {
  Object.assign(app.serviceFilters, patch);
  rerenderResults();
  if (focusSearch) {
    const input = $('[data-role="service-search"]');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}

function openServiceDialog(id) {
  const service = facilityById(id);
  const dialog = $('#detail-dialog');
  if (!service || !dialog) return;
  const saved = store.isSaved(service.id);
  dialog.innerHTML = `
    <div class="dialog__form">
      <div class="dialog__head">
        <span class="service-card__icon cat--${service.category}">${categoryIcon(service.category, 22)}</span>
        <div>
          <h2 class="dialog__title">${escapeHtml(localizeName(service))}</h2>
          <p class="muted">${escapeHtml(tt(`cat.${service.category}`))} · ${escapeHtml(service.city)}, ${escapeHtml(
            serviceStateLabel(service.state),
          )}</p>
        </div>
        <button type="button" class="icon-btn dialog__close" data-action="close-detail"
          aria-label="${escapeHtml(tt('action.close'))}">${icon('close', { size: 18 })}</button>
      </div>

      <div class="service-card__chips">
        ${verifiedChip(service)}
        <span class="chip chip--demo">[DEMO]</span>
      </div>

      <dl class="kv kv--tight">
        <div><dt>${escapeHtml(tt('services.address'))}</dt><dd>${escapeHtml(service.address)}</dd></div>
        <div><dt>${escapeHtml(tt('services.hours'))}</dt><dd>${escapeHtml(service.hours)}</dd></div>
        <div><dt>${escapeHtml(tt('services.phone'))}</dt><dd>
          <a href="tel:${service.phone.replace(/\s/g, '')}">${escapeHtml(service.phone)}</a>
          <span class="muted small"> — ${escapeHtml(tt('services.demoPhone'))}</span>
        </dd></div>
        ${
          service.verified
            ? `<div><dt>${escapeHtml(tt('services.verified'))}</dt><dd>${escapeHtml(
                formatDate(service.lastVerified, lang()),
              )}</dd></div>`
            : ''
        }
      </dl>

      <h3 class="dialog__subtitle">${escapeHtml(tt('services.offered'))}</h3>
      <ul class="tag-list">${service.services
        .map((item) => `<li class="tag">${escapeHtml(item)}</li>`)
        .join('')}</ul>

      <div class="dialog__actions">
        <button type="button" class="btn btn--soft" data-action="toggle-save" data-id="${service.id}">
          ${icon(saved ? 'bookmarkFilled' : 'bookmark', { size: 16 })} ${escapeHtml(
            tt(saved ? 'action.saved' : 'action.save'),
          )}
        </button>
        <button type="button" class="btn btn--ghost" data-action="report-here" data-id="${service.id}">
          ${icon('megaphone', { size: 16 })} ${escapeHtml(tt('services.reportHere'))}
        </button>
        <a class="btn btn--primary" href="${mapUrl(service)}" target="_blank" rel="noopener noreferrer">
          ${icon('map', { size: 16 })} ${escapeHtml(tt('services.openMap'))}
        </a>
      </div>
    </div>`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(selector) {
  const dialog = $(selector);
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function syncFormFromDom() {
  const description = $('[data-role="description"]');
  if (description) app.reportForm.description = description.value;
  const consent = $('[data-role="consent"]');
  if (consent) app.reportForm.consent = consent.checked;
}

function saveDraft({ silent = false } = {}) {
  const form = ensureReportForm();
  const { photoId, ...rest } = form;
  store.saveDraft({ ...rest, photoId: photoId || null });
  if (!silent) toast(tt('report.draftSaved'));
}

function submitReport() {
  const form = ensureReportForm();
  if (!form.category) {
    toast(tt('report.needCategory'), { variant: 'warning' });
    return;
  }
  if (!form.description || form.description.trim().length < MIN_DESCRIPTION) {
    toast(tt('report.needDescription'), { variant: 'warning' });
    return;
  }
  if (!form.consent) {
    toast(tt('report.needConsent'), { variant: 'warning' });
    return;
  }

  const now = new Date().toISOString();
  const code = trackingCode();
  const report = {
    code,
    category: form.category,
    facilityId: form.facilityId || null,
    description: form.description.trim(),
    photoId: form.photoId || null,
    location: form.location || null,
    createdAt: now,
    updatedAt: now,
    status: 'queued',
    idempotencyKey: `rep-${uid(10)}`,
    history: [{ status: 'queued', at: now }],
  };
  store.addReport(report);
  store.clearDraft();
  app.reportForm = reportDraftDefaults();
  app.pendingPhoto = null;
  render();
  toast(`${tt('report.submitted')} — ${code}`, { variant: 'success' });
  if (app.online) syncQueue({ silent: true });
}

function trackReport() {
  const input = $('#track-input');
  const raw = (input?.value || '').trim().toUpperCase();
  if (!raw) {
    toast(tt('report.trackEmpty'), { variant: 'warning' });
    return;
  }
  const report = store.getState().reports.find((item) => item.code.toUpperCase() === raw);
  if (!report) {
    toast(tt('report.trackNotFound'), { variant: 'warning' });
    return;
  }
  openReportDialog(report.code);
}

function syncQueue({ silent = false } = {}) {
  const queued = store.queue();
  if (!queued.length) return;
  if (!app.online) {
    if (!silent) toast(tt('report.syncOffline'), { variant: 'warning' });
    return;
  }
  if (app.syncing) return;
  app.syncing = true;
  for (const report of queued) store.advanceReport(report.code, 'received');
  store.markSynced();
  app.syncing = false;
  if (!silent) toast(tt('report.synced', { count: queued.length }), { variant: 'success' });
  render();
}

function openReportDialog(code) {
  const report = store.getReport(code);
  const dialog = $('#detail-dialog');
  if (!report || !dialog) return;
  const order = ['queued', 'received', 'in_review', 'resolved'];
  const currentIndex = order.indexOf(report.status);
  const facility = report.facilityId ? facilityById(report.facilityId) : null;

  dialog.innerHTML = `
    <div class="dialog__form">
      <div class="dialog__head">
        <div>
          <h2 class="dialog__title">${escapeHtml(tt('report.detailTitle', { code: report.code }))}</h2>
          <p class="muted">${escapeHtml(tt(`cat.${report.category}`))} · ${escapeHtml(
            formatDate(report.createdAt, lang(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          )}</p>
        </div>
        <button type="button" class="icon-btn dialog__close" data-action="close-detail"
          aria-label="${escapeHtml(tt('action.close'))}">${icon('close', { size: 18 })}</button>
      </div>

      <div class="detail-status">${statusChip(report.status)}
        <span class="muted small">${escapeHtml(tt(`statusHelp.${report.status}`))}</span>
      </div>

      <p class="report-detail__text">${escapeHtml(report.description)}</p>

      ${
        facility
          ? `<p class="muted small">${icon('pin', { size: 14 })} ${escapeHtml(localizeName(facility))} — ${escapeHtml(
              facility.address,
            )}</p>`
          : ''
      }
      <p class="muted small">${icon('map', { size: 14 })} ${
        report.location
          ? `${escapeHtml(tt('report.approxLocation'))}: ${report.location.lat.toFixed(2)}, ${report.location.lng.toFixed(
              2,
            )} (±1 km)`
          : escapeHtml(tt('report.noLocation'))
      }</p>

      <div data-role="report-photo" class="report-photo">
        ${report.photoId ? `<p class="muted small">${escapeHtml(tt('report.photoAttached'))}</p>` : ''}
      </div>

      <h3 class="dialog__subtitle">${escapeHtml(tt('report.timeline'))}</h3>
      <ol class="timeline">
        ${order
          .map((step, i) => {
            const done = report.status !== 'rejected' && i <= currentIndex;
            return `<li class="timeline__step ${done ? 'is-done' : ''}">
              <span class="timeline__dot">${done ? icon('check', { size: 12 }) : ''}</span>
              <span>${escapeHtml(tt(`status.${step}`))}</span>
            </li>`;
          })
          .join('')}
      </ol>

      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-action="copy-code" data-code="${escapeHtml(
          report.code,
        )}">${icon('copy', { size: 15 })} ${escapeHtml(tt('action.copy'))}</button>
        <button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete-report" data-code="${escapeHtml(
          report.code,
        )}">${icon('trash', { size: 15 })} ${escapeHtml(tt('report.deleteReport'))}</button>
      </div>
    </div>`;

  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');

  if (report.photoId) {
    photos.get(report.photoId).then((dataUrl) => {
      const host = dialog.querySelector('[data-role="report-photo"]');
      if (host && dataUrl) {
        host.innerHTML = `<img class="report-photo__img" src="${dataUrl}" alt="${escapeHtml(
          tt('report.photoAttached'),
        )}" />`;
      }
    });
  }
}

function scrollChat() {
  const log = $('#chat-log');
  if (log) log.scrollTop = log.scrollHeight;
}

function askAssistant(questionRaw) {
  const question = String(questionRaw || '').trim();
  if (!question) {
    toast(tt('assistant.emptyQuery'), { variant: 'warning' });
    return;
  }
  store.addMessage({ role: 'user', text: question });
  paintChat();
  const log = $('#chat-log');
  if (log) {
    const thinking = document.createElement('div');
    thinking.className = 'msg msg--bot msg--thinking';
    thinking.id = 'thinking-bubble';
    thinking.innerHTML = `<div class="msg__avatar">${icon('sparkles', { size: 18 })}</div>
      <div class="msg__body"><p class="thinking">${escapeHtml(tt('assistant.thinking'))}<span></span></p></div>`;
    log.appendChild(thinking);
    scrollChat();
  }

  setTimeout(() => {
    const result = index.answer(question);
    if (result.refused) {
      store.addMessage({ role: 'bot', kind: 'refusal', query: question });
    } else {
      store.addMessage({
        role: 'bot',
        kind: 'answer',
        query: question,
        answer: result.answer,
        citations: result.citations,
      });
    }
    paintChat();
  }, 420);
}

function paintChat() {
  const log = $('#chat-log');
  if (!log) return;
  log.innerHTML = chatMessages();
  scrollChat();
}

async function handlePhoto(file) {
  if (!file) return;
  try {
    const dataUrl = await resizeImage(file, 1024, 0.72);
    const photoId = `photo-${uid(6)}`;
    await photos.put(photoId, dataUrl);
    app.reportForm.photoId = photoId;
    app.reportForm.photoSize = dataUrlSize(dataUrl);
    app.pendingPhoto = dataUrl;
    saveDraft({ silent: true });
    const preview = $('[data-role="photo-preview"]');
    if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="${escapeHtml(tt('report.photo'))}" />`;
    const actions = $('[data-role="photo-field"] .photo-field__actions');
    if (actions && !actions.querySelector('[data-action="remove-photo"]')) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn--ghost btn--sm';
      remove.dataset.action = 'remove-photo';
      remove.textContent = tt('report.photoRemove');
      actions.appendChild(remove);
    }
    const label = actions?.querySelector('label.btn');
    if (label) label.childNodes[0].textContent = `${tt('report.photoChange')} `;
    toast(tt('report.draftSaved'));
  } catch (error) {
    toast(tt('report.photo'), { variant: 'warning' });
  }
}

async function removePhoto() {
  syncFormFromDom();
  const form = app.reportForm;
  if (form.photoId) await photos.remove(form.photoId);
  form.photoId = null;
  form.photoSize = 0;
  app.pendingPhoto = null;
  saveDraft({ silent: true });
  render();
  toast(tt('report.photoRemove'));
}

function addLocation() {
  syncFormFromDom();
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    toast(tt('report.locationDenied'), { variant: 'warning' });
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = Math.round(position.coords.latitude * 100) / 100;
      const lng = Math.round(position.coords.longitude * 100) / 100;
      app.reportForm.location = { lat, lng };
      saveDraft({ silent: true });
      toast(tt('report.locationAdded'), { variant: 'success' });
      render();
    },
    () => toast(tt('report.locationDenied'), { variant: 'warning' }),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  );
}

async function exportData() {
  downloadJson(`ssddh-data-${new Date().toISOString().slice(0, 10)}.json`, store.exportPayload({ version: VERSION }));
  toast(tt('more.exportDone'), { variant: 'success' });
}

async function deleteAll() {
  const ok = await confirmDialog({
    title: tt('more.deleteAll'),
    body: tt('more.deleteConfirm'),
    confirmLabel: tt('action.delete'),
    cancelLabel: tt('action.cancel'),
    danger: true,
  });
  if (!ok) return;
  await store.resetAll();
  app.reportForm = null;
  app.pendingPhoto = null;
  applyTheme('system');
  render();
  toast(tt('more.deleted'), { variant: 'success' });
}

/* ------------------------------ event wiring ---------------------------- */

function bindViewEvents() {
  const homeSearch = $('#home-search');
  if (homeSearch) {
    homeSearch.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = $('#home-search-input')?.value || '';
      app.serviceFilters.query = value;
      app.serviceFilters.savedOnly = false;
      navigate('services');
    });
  }

  const serviceSearch = $('[data-role="service-search"]');
  if (serviceSearch) {
    const debounced = debounce(() => applyFilters({ query: serviceSearch.value }, { focusSearch: true }), 180);
    serviceSearch.addEventListener('input', debounced);
  }

  const stateFilter = $('[data-role="state-filter"]');
  if (stateFilter) stateFilter.addEventListener('change', () => applyFilters({ state: stateFilter.value }));

  const sortFilter = $('[data-role="sort-filter"]');
  if (sortFilter) sortFilter.addEventListener('change', () => applyFilters({ sort: sortFilter.value }));

  const savedFilter = $('[data-role="saved-filter"]');
  if (savedFilter) {
    savedFilter.addEventListener('change', () => {
      app.serviceFilters.savedOnly = savedFilter.checked;
      if (savedFilter.checked && app.route !== 'saved') app.route = 'saved';
      rerenderResults();
    });
  }

  const reportForm = $('#report-form');
  if (reportForm) {
    const form = ensureReportForm();
    reportForm.addEventListener('change', (event) => {
      const target = event.target;
      if (target.name === 'category') {
        form.category = target.value;
        $$('.chip--radio', reportForm).forEach((chip) => {
          const input = chip.querySelector('input');
          chip.classList.toggle('is-active', input?.checked);
        });
      }
      if (target.dataset.role === 'consent') form.consent = target.checked;
      if (target.dataset.role === 'facility-select') form.facilityId = target.value;
      saveDraft({ silent: true });
    });

    const description = $('[data-role="description"]', reportForm);
    if (description) {
      description.addEventListener('input', debounce(() => {
        form.description = description.value;
        const hint = $('[data-role="description-hint"]', reportForm);
        if (hint) hint.textContent = tt('report.descriptionHint', { count: description.value.length });
        saveDraft({ silent: true });
      }, 300));
    }

    const photoInput = $('[data-role="photo-input"]', reportForm);
    if (photoInput) {
      photoInput.addEventListener('change', () => {
        const file = photoInput.files?.[0];
        if (file) handlePhoto(file);
      });
    }

    reportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const descriptionField = $('[data-role="description"]', reportForm);
      if (descriptionField) form.description = descriptionField.value;
      const consentField = $('[data-role="consent"]', reportForm);
      if (consentField) form.consent = consentField.checked;
      submitReport();
    });
  }

  const trackForm = $('#track-form');
  if (trackForm) {
    trackForm.addEventListener('submit', (event) => {
      event.preventDefault();
      trackReport();
    });
  }

  const assistantForm = $('#assistant-form');
  if (assistantForm) {
    assistantForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#assistant-input');
      if (!input) return;
      const question = input.value;
      input.value = '';
      askAssistant(question);
    });
  }
}

/* ------------------------------ global events --------------------------- */

function onGlobalClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const { action } = actionEl.dataset;

  switch (action) {
    case 'toggle-save': {
      const saved = store.toggleSaved(actionEl.dataset.id);
      actionEl.setAttribute('aria-pressed', String(saved));
      actionEl.classList.toggle('is-saved', saved);
      const label = actionEl.classList.contains('save-btn');
      if (label) {
        actionEl.innerHTML = icon(saved ? 'bookmarkFilled' : 'bookmark', { size: 18 });
        actionEl.setAttribute('aria-label', `${tt(saved ? 'action.saved' : 'action.save')}`);
      }
      if (app.route === 'saved') rerenderResults();
      toast(saved ? tt('services.savedToast') : tt('services.removedToast'));
      if (app.route === 'home' || app.route === 'more') render();
      break;
    }
    case 'set-category': {
      const next = app.serviceFilters.category === actionEl.dataset.category ? 'all' : actionEl.dataset.category;
      applyFilters({ category: next });
      $$('[data-action="set-category"]').forEach((chip) => {
        const active = chip.dataset.category === next;
        chip.classList.toggle('is-active', active);
        chip.setAttribute('aria-pressed', String(active));
      });
      break;
    }
    case 'clear-filters':
      app.serviceFilters = { query: '', category: 'all', state: 'all', sort: 'recent', savedOnly: false };
      render();
      break;
    case 'open-service':
      openServiceDialog(actionEl.dataset.id);
      break;
    case 'close-detail':
      closeDialog('#detail-dialog');
      break;
    case 'report-here': {
      closeDialog('#detail-dialog');
      app.reportForm = { ...ensureReportForm(), facilityId: actionEl.dataset.id };
      saveDraft({ silent: true });
      navigate('report');
      if (app.route === 'report') render();
      break;
    }
    case 'save-draft':
      saveDraft();
      break;
    case 'add-location':
      addLocation();
      break;
    case 'remove-photo':
      removePhoto();
      break;
    case 'sync-now':
      syncQueue();
      break;
    case 'view-report':
      openReportDialog(actionEl.dataset.code);
      break;
    case 'delete-report': {
      const code = actionEl.dataset.code;
      store.deleteReport(code);
      closeDialog('#detail-dialog');
      render();
      toast(tt('report.deleted'));
      break;
    }
    case 'copy-code':
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(actionEl.dataset.code).catch(() => {});
      toast(tt('action.copied'), { variant: 'success' });
      break;
    case 'ask-suggestion':
      askAssistant(actionEl.dataset.question);
      break;
    case 'clear-chat':
      store.clearChat();
      paintChat();
      toast(tt('assistant.cleared'));
      break;
    case 'set-lang':
      changeLang(actionEl.dataset.lang);
      break;
    case 'toggle-lang':
      changeLang(getLang() === 'en' ? 'ar' : 'en');
      break;
    case 'toggle-theme': {
      const current = document.documentElement.dataset.theme;
      const prefersDark =
        typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)').matches : false;
      const effective = current || (prefersDark ? 'dark' : 'light');
      applyTheme(effective === 'dark' ? 'light' : 'dark', { persist: true });
      if (app.route === 'more') render();
      break;
    }
    case 'track-report':
      trackReport();
      break;
    case 'set-theme':
      applyTheme(actionEl.dataset.theme, { persist: true });
      if (app.route === 'more') render();
      break;
    case 'export-data':
      exportData();
      break;
    case 'delete-all':
      deleteAll();
      break;
    default:
      break;
  }
}

function onGlobalKeydown(event) {
  if (event.key === 'Escape') {
    closeDialog('#detail-dialog');
  }
}

function changeLang(next) {
  if (next === getLang()) return;
  setLang(next);
  store.setLang(next);
  renderNav();
  applyChrome();
  render();
  if (app.route === 'assistant') scrollChat();
}

function applyTheme(theme, { persist = false } = {}) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  if (persist) {
    store.setTheme(theme);
    applyChrome();
  }
}

function updateNetworkStatus() {
  app.online = navigator.onLine !== false;
  applyChrome();
  if (app.online) syncQueue({ silent: true });
  if (app.route === 'services' || app.route === 'saved') rerenderResults();
}

/* --------------------------------- boot --------------------------------- */

function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is a progressive enhancement */
    });
  });
}

export function boot() {
  store.init();
  setLang(store.getState().lang || 'en');
  mountToasts($('#toasts'));
  applyTheme(store.getState().theme || 'system');
  app.online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;

  renderNav();

  document.addEventListener('click', onGlobalClick);
  document.addEventListener('keydown', onGlobalKeydown);

  window.addEventListener('hashchange', () => render());
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    app.installPrompt = event;
    applyChrome();
  });

  const installButton = $('#install-button');
  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!app.installPrompt) return;
      app.installPrompt.prompt();
      await app.installPrompt.userChoice;
      app.installPrompt = null;
      applyChrome();
    });
  }

  registerServiceWorker();

  if (!location.hash) {
    app.route = 'home';
    render();
  } else {
    render();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}

export { app, index, render };
