// ------------------------------
// Toast (single definition)
// ------------------------------
function toast(msg) {
  const t = document.createElement('div');
  t.style.position = 'fixed';
  t.style.left = '50%';
  t.style.bottom = '12px';
  t.style.transform = 'translateX(-50%)';
  t.style.background = '#fff0f0';
  t.style.border = '2px solid #b18597';
  t.style.boxShadow = '0 .6em 0 0 #ffe3e2';
  t.style.color = '#8d7b8d';
  t.style.padding = '.6rem .9rem';
  t.style.borderRadius = '.75rem';
  t.style.fontWeight = '700';
  t.style.textAlign = 'center';
  t.style.maxWidth = 'calc(100vw - 24px)';
  t.style.boxSizing = 'border-box';
  t.style.zIndex = '1001';  // above modals/backdrop
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, 1800);
}
