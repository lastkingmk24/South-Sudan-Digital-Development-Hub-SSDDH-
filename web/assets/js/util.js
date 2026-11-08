/** Small DOM, formatting and feedback helpers. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function html(strings, ...values) {
  return strings.reduce((out, chunk, i) => out + chunk + (values[i] ?? ''), '');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function debounce(fn, wait = 220) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function uid(bytes = 8) {
  const array = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(array);
  else for (let i = 0; i < bytes; i += 1) array[i] = Math.floor(Math.random() * 256);
  return Array.from(array, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, bytes * 2);
}

/** Human-friendly tracking code: SSD-4K7M2Q */
export function trackingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const array = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(array);
  else for (let i = 0; i < 6; i += 1) array[i] = Math.floor(Math.random() * 256);
  for (const byte of array) out += alphabet[byte % alphabet.length];
  return `SSD-${out}`;
}

export function formatDate(value, lang = 'en', options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      numberingSystem: 'latn',
      ...options,
    }).format(date);
  } catch (error) {
    return date.toISOString().slice(0, 10);
  }
}

export function relativeDays(value) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

export function formatBytes(bytes) {
  if (!bytes) return '0';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function deburrNumber(value, lang) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { numberingSystem: 'latn' }).format(value);
}

/* ------------------------------- toasts --------------------------------- */

let toastHost = null;

export function mountToasts(host) {
  toastHost = host;
}

export function toast(message, { variant = 'default', action, duration = 4200 } = {}) {
  if (!toastHost) return;
  const node = document.createElement('div');
  node.className = `toast toast--${variant}`;
  node.setAttribute('role', 'status');
  node.innerHTML = `
    <span class="toast__dot" aria-hidden="true"></span>
    <span class="toast__text">${escapeHtml(message)}</span>`;
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast__action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
    node.appendChild(button);
  }
  const dismiss = () => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 180);
  };
  toastHost.appendChild(node);
  setTimeout(dismiss, duration);
  return dismiss;
}

/* ------------------------------ photo resize ---------------------------- */

/**
 * Resizes an image file on the device before storing it.
 * @returns {Promise<string>} a JPEG data URL
 */
export function resizeImage(file, maxSize = 1024, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('not an image'));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not read image'));
    };
    image.src = url;
  });
}

export function dataUrlSize(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

/* ------------------------------ download -------------------------------- */

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ------------------------------- confirm -------------------------------- */

/**
 * Promise-based confirmation rendered in a native <dialog>.
 * Falls back to window.confirm when the dialog API is unavailable.
 */
export function confirmDialog({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  const dialog = document.getElementById('app-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`));
  }
  dialog.innerHTML = `
    <form method="dialog" class="dialog__form">
      <h2 class="dialog__title">${escapeHtml(title)}</h2>
      <p class="dialog__body">${escapeHtml(body)}</p>
      <div class="dialog__actions">
        <button type="submit" value="cancel" class="btn btn--ghost">${escapeHtml(cancelLabel)}</button>
        <button type="submit" value="confirm" class="btn ${danger ? 'btn--danger' : 'btn--primary'}">${escapeHtml(confirmLabel)}</button>
      </div>
    </form>`;
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener(
      'close',
      () => {
        resolve(dialog.returnValue === 'confirm');
        dialog.innerHTML = '';
      },
      { once: true },
    );
  });
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
