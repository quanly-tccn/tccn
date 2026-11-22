/* Finance Manager — iOS safe date/month picker.
   Presentation only: original input ids/types/values and input/change events are retained.
   Dashboard reference month field is intentionally untouched. */
(() => {
  'use strict';
  const isiOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isiOS) return;

  const PICKERS = '#tx-date, #fm-budget-month, #stats-month, #stats-from, #stats-to, #report-month, #report-from, #report-to, .fm-search-field input[type="date"]';
  const two = n => String(n).padStart(2, '0');
  const valid = (y, m, d) => Number.isInteger(y) && y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();
  const human = input => {
    const v = input.value;
    const month = /^(\d{4})-(\d{2})$/.exec(v);
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (input.type === 'month') return month ? `${month[2]}/${month[1]}` : 'Chọn tháng';
    return date ? `${date[3]}/${date[2]}/${date[1]}` : 'Chọn ngày';
  };
  let activePanel = null;
  function hidePanel() {
    if (!activePanel) return;
    activePanel.remove();
    activePanel = null;
    document.body.classList.remove('fm-date-dialog-open');
  }
  function picker(input) {
    hidePanel();
    const isMonth = input.type === 'month';
    const current = input.value;
    const parts = current.match(isMonth ? /^(\d{4})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/);
    const now = new Date();
    const y0 = parts ? +parts[1] : now.getFullYear();
    const m0 = parts ? +parts[2] : now.getMonth() + 1;
    const d0 = parts && !isMonth ? +parts[3] : now.getDate();

    const overlay = document.createElement('div');
    overlay.className = 'fm-date-overlay';
    overlay.setAttribute('role', 'presentation');
    const panel = document.createElement('section');
    panel.className = 'fm-date-dialog';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', isMonth ? 'Chọn tháng' : 'Chọn ngày');
    const heading = document.createElement('h3');
    heading.textContent = isMonth ? 'Chọn tháng' : 'Chọn ngày';
    const group = document.createElement('div');
    group.className = 'fm-date-dialog-fields';

    function field(title, control) {
      const label = document.createElement('label');
      const t = document.createElement('span'); t.textContent = title;
      label.append(t, control);
      group.append(label);
      return control;
    }
    const month = document.createElement('select');
    month.setAttribute('aria-label', 'Tháng');
    for (let m = 1; m <= 12; m++) month.add(new Option(`Tháng ${m}`, String(m)));
    month.value = String(m0);
    let day;
    if (!isMonth) {
      day = document.createElement('select');
      day.setAttribute('aria-label', 'Ngày');
      field('Ngày', day);
    }
    field('Tháng', month);
    const year = document.createElement('input');
    year.type = 'number'; year.min = '1900'; year.max = '2100'; year.step = '1';
    year.inputMode = 'numeric'; year.value = String(y0);
    year.setAttribute('aria-label', 'Năm');
    field('Năm', year);

    const error = document.createElement('p');
    error.className = 'fm-date-dialog-error'; error.setAttribute('role', 'alert');
    function updateDays() {
      if (!day) return;
      const previous = Number(day.value || d0);
      const y = Number(year.value), m = Number(month.value);
      const length = Number.isInteger(y) && y >= 1900 && y <= 2100 ? new Date(y, m, 0).getDate() : 31;
      day.replaceChildren();
      for (let d = 1; d <= length; d++) day.add(new Option(String(d), String(d)));
      day.value = String(Math.min(previous, length));
    }
    updateDays();
    if (day) { day.value = String(d0); month.addEventListener('change', updateDays); year.addEventListener('change', updateDays); }
    const buttons = document.createElement('div'); buttons.className = 'fm-date-dialog-actions';
    function action(name, klass, callback) {
      const b = document.createElement('button'); b.type = 'button'; b.className = klass; b.textContent = name;
      b.addEventListener('click', callback); buttons.append(b);
      return b;
    }
    const optional = !input.required;
    if (optional) action('Xóa ngày', 'fm-date-action-clear', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      hidePanel();
    });
    action('Hủy', 'fm-date-action-cancel', hidePanel);
    const apply = action('Áp dụng', 'fm-date-action-apply', () => {
      const y = Number(year.value), m = Number(month.value), d = day ? Number(day.value) : 1;
      if (!valid(y, m, d)) { error.textContent = 'Ngày/tháng/năm không hợp lệ.'; return; }
      const result = isMonth ? `${y}-${two(m)}` : `${y}-${two(m)}-${two(d)}`;
      if (input.min && result < input.min || input.max && result > input.max) {
        error.textContent = 'Ngày được chọn nằm ngoài khoảng cho phép.'; return;
      }
      input.value = result;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      hidePanel();
    });
    panel.append(heading, group, error, buttons);
    overlay.append(panel);
    overlay.addEventListener('click', e => { if (e.target === overlay) hidePanel(); });
    document.body.append(overlay);
    document.body.classList.add('fm-date-dialog-open');
    activePanel = overlay;
    apply.focus({ preventScroll: true });
  }

  function wrap(input) {
    if (!input || input.dataset.fmDateReady || !['date', 'month'].includes(input.type)) return;
    input.dataset.fmDateReady = '1';
    const outer = document.createElement('span');
    outer.className = 'fm-date-compact';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'fm-date-display';
    button.setAttribute('aria-label', input.type === 'month' ? 'Chọn tháng' : 'Chọn ngày');
    const value = document.createElement('span'); value.className = 'fm-date-value';
    const icon = document.createElement('span'); icon.className = 'fm-date-glyph'; icon.textContent = '▦'; icon.setAttribute('aria-hidden','true');
    button.append(value, icon);
    input.parentNode.insertBefore(outer, input);
    outer.append(input, button);
    const sync = () => { value.textContent = human(input); };
    sync();
    input.addEventListener('change', sync);
    input.addEventListener('input', sync);
    button.addEventListener('click', () => { sync(); picker(input); });
    // DOM sources may set input.value programmatically without emitting change.
    // Refresh when screen is touched; no polling or global prototype modification.
    button.addEventListener('focus', sync);
    input.addEventListener('invalid', event => {
      event.preventDefault();
      button.focus();
      picker(input);
    });
  }
  function scan(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && root.matches(PICKERS)) wrap(root);
    root.querySelectorAll(PICKERS).forEach(wrap);
  }
  function init() {
    scan(document);
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1 && !node.classList.contains('fm-date-compact') && !node.classList.contains('fm-date-overlay')) scan(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hidePanel(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
