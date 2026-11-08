/** Inline 24×24 stroke icons (no icon font, no network request). */

const PATHS = {
  home: '<path d="M3.5 10.6 12 3.8l8.5 6.8"/><path d="M5.6 9.7V20h12.8V9.7"/><path d="M9.8 20v-5.2h4.4V20"/>',
  directory:
    '<rect x="3.4" y="4.2" width="17.2" height="15.6" rx="2.4"/><path d="M3.4 9.4h17.2"/><path d="M9.2 9.4V20"/><path d="M12.8 13h4.4"/><path d="M12.8 16.6h4.4"/>',
  megaphone:
    '<path d="M4 10.4v3.2a1.6 1.6 0 0 0 1.6 1.6h1.7l6.4 3.4V7l-6.4 3.4H5.6A1.6 1.6 0 0 0 4 12z"/><path d="M17.4 8.6a4.6 4.6 0 0 1 0 6.8"/><path d="M7.3 15.2v3.6a1.4 1.4 0 0 0 1.4 1.4h1.1"/>',
  sparkles:
    '<path d="M12 3.6l1.7 4.3 4.3 1.7-4.3 1.7L12 15.6l-1.7-4.3L6 9.6l4.3-1.7z"/><path d="M18.4 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/><path d="M5.4 15.6l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5L3.3 18l1.5-.6z"/>',
  more: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.6 15.6 4.1 4.1"/>',
  chevronRight: '<path d="m9.4 5.6 6.4 6.4-6.4 6.4"/>',
  chevronDown: '<path d="m5.6 9.4 6.4 6.4 6.4-6.4"/>',
  check: '<path d="m4.8 12.6 4.6 4.6 9.8-10.4"/>',
  shield:
    '<path d="M12 3.4 19 6v5.4c0 4.3-2.8 7.6-7 9.2-4.2-1.6-7-4.9-7-9.2V6z"/><path d="m8.8 11.9 2.3 2.3 4.1-4.6"/>',
  pin: '<path d="M12 21s6.3-5.6 6.3-10.4A6.3 6.3 0 0 0 5.7 10.6C5.7 15.4 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>',
  phone:
    '<path d="M7.3 3.9h2.3l1.4 3.7-1.9 1.3a11 11 0 0 0 5.9 5.9l1.3-1.9 3.7 1.4v2.3a2.1 2.1 0 0 1-2.3 2.1C11.2 17.9 6.1 12.8 5.2 6.2A2.1 2.1 0 0 1 7.3 3.9z"/>',
  clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3.3 2"/>',
  camera:
    '<path d="M4 8.6h2.8l1.4-2.1h7.6l1.4 2.1H20a.9.9 0 0 1 .9.9v9a.9.9 0 0 1-.9.9H4a.9.9 0 0 1-.9-.9v-9a.9.9 0 0 1 .9-.9z"/><circle cx="12" cy="13.6" r="3.4"/>',
  map: '<path d="m3.6 6.6 5.2-2.2 6.4 2.2 5.2-2.2v12.8l-5.2 2.2-6.4-2.2-5.2 2.2z"/><path d="M8.8 4.4v12.8"/><path d="M15.2 6.6v12.8"/>',
  close: '<path d="m6.2 6.2 11.6 11.6"/><path d="m17.8 6.2-11.6 11.6"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"/>',
  moon: '<path d="M20 13.6A8.2 8.2 0 0 1 10.4 4a8.4 8.4 0 1 0 9.6 9.6z"/>',
  download: '<path d="M12 3.8v10.4"/><path d="m7.8 10.4 4.2 4.2 4.2-4.2"/><path d="M4.6 17.4v1.4a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-1.4"/>',
  trash: '<path d="M4.8 7h14.4"/><path d="M9.2 7V4.8h5.6V7"/><path d="M6.6 7l.9 12a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12"/><path d="M10.4 10.8v6M13.6 10.8v6"/>',
  globe: '<circle cx="12" cy="12" r="8.4"/><path d="M3.8 12h16.4"/><path d="M12 3.6c2.4 2.4 3.6 5.3 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.3-3.6-8.4s1.2-6 3.6-8.4z"/>',
  wifiOff:
    '<path d="M3.4 7.6a15 15 0 0 1 4.2-2.4"/><path d="M12.8 4.9a15 15 0 0 1 7.8 2.7"/><path d="M6.6 11.4a10.4 10.4 0 0 1 3-1.5"/><path d="M13.6 10a10.4 10.4 0 0 1 3.8 1.4"/><path d="M9.6 15a5.6 5.6 0 0 1 4.8 0"/><circle cx="12" cy="18.6" r="1.1"/><path d="m3.8 3.8 16.4 16.4"/>',
  wifi: '<path d="M3.4 7.9a15 15 0 0 1 17.2 0"/><path d="M6.6 11.7a10.4 10.4 0 0 1 10.8 0"/><path d="M9.6 15.3a5.6 5.6 0 0 1 4.8 0"/><circle cx="12" cy="18.6" r="1.1"/>',
  arrowRight: '<path d="M4.6 12h14.4"/><path d="m14.2 7.2 5 4.8-5 4.8"/>',
  bookmark: '<path d="M6.6 4.4h10.8v16.2L12 16.9l-5.4 3.7z"/>',
  bookmarkFilled: '<path d="M6.6 4.4h10.8v16.2L12 16.9l-5.4 3.7z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5.2v13.6"/><path d="M5.2 12h13.6"/>',
  filter: '<path d="M4 6.4h16"/><path d="M7 12h10"/><path d="M10 17.6h4"/>',
  external: '<path d="M13.4 4.6h6v6"/><path d="m19.4 4.6-8.6 8.6"/><path d="M18 14v4.6a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 18.6V7.4A1.4 1.4 0 0 1 5.4 6H10"/>',
  copy: '<rect x="8.6" y="8.6" width="11" height="11" rx="1.8"/><path d="M15.4 5.8V5a1.4 1.4 0 0 0-1.4-1.4H5.8A1.4 1.4 0 0 0 4.4 5v8.2A1.4 1.4 0 0 0 5.8 15h.8"/>',
  refresh: '<path d="M19.2 9.4A7.6 7.6 0 0 0 5.6 7.2L4 9"/><path d="M4 4.6V9h4.4"/><path d="M4.8 14.6a7.6 7.6 0 0 0 13.6 2.2l1.6-1.8"/><path d="M20 19.4V15h-4.4"/>',
  info: '<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.4"/><circle cx="12" cy="8.1" r="1"/>',
  alert: '<path d="M12 4.2 21 19.4H3z"/><path d="M12 9.6v4.3"/><circle cx="12" cy="16.7" r="1"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.4"/><path d="m8.3 12.2 2.6 2.6 4.9-5.4"/>',
  building:
    '<path d="M4.6 20.2V5.4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 1 1v14.8"/><path d="M14.8 9.6h3.6a1 1 0 0 1 1 1v9.6"/><path d="M3 20.2h18"/><path d="M8 8.2h3.4M8 11.6h3.4M8 15h3.4"/>',
  droplet: '<path d="M12 3.4c3 3.4 5.4 6.1 5.4 9a5.4 5.4 0 0 1-10.8 0c0-2.9 2.4-5.6 5.4-9z"/>',
  book: '<path d="M4.6 4.8h5.2A3.2 3.2 0 0 1 13 8v11.2A3.2 3.2 0 0 0 9.8 16H4.6z"/><path d="M19.4 4.8h-5.2A3.2 3.2 0 0 0 11 8v11.2A3.2 3.2 0 0 1 14.2 16h5.2z"/>',
  scale: '<path d="M12 4.4v15.2"/><path d="M7.4 19.6h9.2"/><path d="M4.4 8.2h15.2"/><path d="M7 8.2 4.2 14h5.6z"/><path d="M17 8.2 14.2 14h5.6z"/>',
  leaf: '<path d="M19.4 4.6C11 4.6 5.2 8.4 5.2 14.4a4.9 4.9 0 0 0 4.9 4.9c6 0 9.3-5.9 9.3-14.7z"/><path d="M4.2 20.4c2.4-4.6 5.4-7.4 9.4-9.4"/>',
  heart: '<path d="M12 19.6s-7.4-4.3-7.4-9.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.4 3c0 4.9-7.4 9.2-7.4 9.2z"/>',
  idcard:
    '<rect x="3" y="5.2" width="18" height="13.6" rx="2"/><circle cx="8.8" cy="11" r="2.1"/><path d="M5.6 15.8c.5-1.6 1.7-2.4 3.2-2.4s2.7.8 3.2 2.4"/><path d="M14.8 10h3.4M14.8 13h3.4"/>',
  upload: '<path d="M12 16.2V5.4"/><path d="m7.8 9.4 4.2-4 4.2 4"/><path d="M4.6 15.4v3a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-3"/>',
  image: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2"/><circle cx="8.6" cy="9.6" r="1.7"/><path d="m4.2 17 4.8-4.6 3.4 3.2 2.6-2.4 4.8 4.4"/>',
  doc: '<path d="M6.4 3.6h7.2l4 4v12.8H6.4z"/><path d="M13.4 3.8V8h4"/><path d="M9 12.4h6M9 15.6h4.4"/>',
  users:
    '<circle cx="9.2" cy="8.6" r="3.2"/><path d="M3.6 19.4c.6-3 2.8-4.7 5.6-4.7s5 1.7 5.6 4.7"/><path d="M16 5.8a3.2 3.2 0 0 1 0 6"/><path d="M17.4 14.9c1.6.6 2.7 2.1 3 4.5"/>',
  lock: '<rect x="4.8" y="10.4" width="14.4" height="9.4" rx="2"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  send: '<path d="M4.2 12 20 4.6l-4.2 15.2-4-5.6z"/><path d="m11.8 14.2 8.2-9.6"/>',
};

export function icon(name, { size = 20, className = '', strokeWidth = 1.7 } = {}) {
  const path = PATHS[name] || PATHS.info;
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">${path}</svg>`;
}

export function categoryIcon(category, size = 20) {
  const map = {
    health: 'heart',
    education: 'book',
    water: 'droplet',
    civil: 'idcard',
    agriculture: 'leaf',
    justice: 'scale',
  };
  return icon(map[category] || 'building', { size });
}

export function levelIcon(level, size = 18) {
  const map = { success: 'checkCircle', warning: 'alert', info: 'info' };
  return icon(map[level] || 'info', { size });
}
