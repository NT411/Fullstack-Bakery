(() => {
  const overlay = document.getElementById('contact-pastel');
  const form = document.getElementById('pc-form');
  const feedback = document.getElementById('pc-feedback');

  // Open/close helpers (not on window)
  const open = () => {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    // Focus first field for accessibility
    const first = document.getElementById('pc-name');
    if (first) first.focus();
  };
  const close = () => {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  };

  // Triggers
  document.querySelectorAll('[data-contact-pastel-open]').forEach(btn =>
    btn.addEventListener('click', open)
  );
  document.querySelectorAll('[data-contact-pastel-close]').forEach(btn =>
    btn.addEventListener('click', close)
  );

  // Close on backdrop click (but not when clicking inside dialog)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
  });

  // Submit handling (no network call; plug your API here)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const valid = data.name?.trim() && data.email?.trim() && data.message?.trim();

    if (!valid) {
      alert('Please fill out all fields.');
      return;
    }

    // TODO: replace with your fetch() to backend/endpoint
    // fetch('/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })

    feedback.hidden = false;
    form.reset();
    setTimeout(() => { feedback.hidden = true; close(); }, 1000);
  });
})();

