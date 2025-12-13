
// Hamburger toggle
const btn = document.getElementById('hamburger');
const panel = document.getElementById('mobile-panel');


function setMobilePanel(isOpen) {
  if (!btn || !panel) return;
  btn.setAttribute('aria-expanded', String(isOpen));
  panel.style.display = isOpen ? 'block' : 'none';
  lockScroll(isOpen);
}

btn?.addEventListener('click', () => {
  const open = btn.getAttribute('aria-expanded') === 'true';
  setMobilePanel(!open);
});

// Helper: close the mobile panel before opening any modal
function closeMobilePanelIfOpen() {
  if (!panel) return;
  if (panel.style.display === 'block') setMobilePanel(false);
}

