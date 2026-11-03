// Custom-drawn slider that looks the same in every browser (Opera GX renders native range inputs oddly).
// It wraps an existing <input type="range">: the input stays in the DOM (hidden) as the source of truth,
// so existing `input` / `change` listeners keep working. Call `syncSliders()` after changing a value in code.

const all = new Set();

export function upgradeSlider(input) {
  if (input.dataset.custom) return;
  input.dataset.custom = '1';
  const wrap = document.createElement('div');
  wrap.className = 'cslider';
  wrap.tabIndex = 0;
  wrap.title = input.title || '';
  wrap.setAttribute('role', 'slider');
  if (input.getAttribute('aria-label')) wrap.setAttribute('aria-label', input.getAttribute('aria-label'));
  wrap.innerHTML = '<div class="cslider-track"><div class="cslider-fill"></div></div><div class="cslider-thumb"></div>';
  if (input.style.width) wrap.style.width = input.style.width;
  if (input.id) wrap.dataset.for = input.id;
  input.classList.forEach((c) => wrap.classList.add(c));
  input.after(wrap);
  input.hidden = true;

  const num = (k) => Number(input[k]);
  const sync = () => {
    const p = (num('value') - num('min')) / (num('max') - num('min') || 1);
    const pct = Math.max(0, Math.min(1, p)) * 100;
    wrap.querySelector('.cslider-fill').style.width = `${pct}%`;
    wrap.querySelector('.cslider-thumb').style.left = `${pct}%`;
    wrap.setAttribute('aria-valuenow', input.value);
  };
  const setValue = (v, fire = 'input') => {
    const step = num('step') || 1;
    const min = num('min');
    let val = Math.round((v - min) / step) * step + min;
    val = Math.max(min, Math.min(num('max'), val));
    val = Number(val.toFixed(4));
    if (String(val) === input.value && fire === 'input') return;
    input.value = String(val);
    sync();
    input.dispatchEvent(new Event(fire, { bubbles: true }));
  };
  const fromPointer = (e) => {
    const r = wrap.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setValue(num('min') + p * (num('max') - num('min')));
  };
  wrap.addEventListener('pointerdown', (e) => {
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add('drag');
    fromPointer(e);
  });
  wrap.addEventListener('pointermove', (e) => wrap.classList.contains('drag') && fromPointer(e));
  const end = () => {
    if (!wrap.classList.contains('drag')) return;
    wrap.classList.remove('drag');
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('keydown', (e) => {
    const step = num('step') || 1;
    const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[e.key];
    if (d == null) return;
    e.preventDefault();
    e.stopPropagation();
    setValue(num('value') + d);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  input._sync = sync;
  all.add(input);
  sync();
  return wrap;
}

export function syncSliders() {
  all.forEach((i) => i._sync());
}

export function upgradeAll(root = document) {
  root.querySelectorAll('input[type="range"]').forEach(upgradeSlider);
}
