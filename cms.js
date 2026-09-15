(async function () {
  try {
    const r = await fetch('/content.json', { cache: 'no-store' });
    if (!r.ok) return;
    const c = await r.json();
    document.querySelectorAll('[data-cms]').forEach(el => {
      const k = el.getAttribute('data-cms');
      if (c[k] != null && String(c[k]).trim() !== '') el.textContent = c[k];
    });
  } catch (e) {}
})();
