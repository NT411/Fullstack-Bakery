(() => {
  const backdrop = document.getElementById('welcomeBackdrop');
  if (!backdrop) return;

  const closeBtn = document.getElementById('welcomeClose');
  const skipBtn = document.getElementById('welcomeSkip');
  const form = document.getElementById('welcomeForm');
  const addressInput = document.getElementById('welcomeAddress');
  const emailInput = document.getElementById('welcomeEmail');

  let isOpen = false;

  function markHandled() {
    try {
      localStorage.removeItem('showWelcomeModal');
    } catch (err) {
      console.warn('Unable to update welcome modal flag', err);
    }
  }

  function lockScroll(on) {
    document.body.style.overflow = on ? 'hidden' : '';
  }

  function openModal() {
    backdrop.setAttribute('aria-hidden', 'false');
    isOpen = true;
    lockScroll(true);

    // Prefill inputs from stored profile/auth info if available
    try {
      const profile = JSON.parse(localStorage.getItem('blush_profile') || '{}');
      if (profile.address && addressInput && !addressInput.value) {
        addressInput.value = profile.address;
      }
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      const emailValue = emailInput?.value?.trim();
      if (emailInput && !emailValue) {
        const profileEmail = profile.emailP;
        if (profileEmail) emailInput.value = profileEmail;
        else if (authUser.email) emailInput.value = authUser.email;
      }
    } catch (err) {
      console.warn('Unable to prefill welcome modal', err);
    }

    setTimeout(() => addressInput?.focus(), 50);
  }

  function closeModal() {
    backdrop.setAttribute('aria-hidden', 'true');
    isOpen = false;
    lockScroll(false);
  }

  function handleClose() {
    markHandled();
    closeModal();
  }

  closeBtn?.addEventListener('click', handleClose);
  skipBtn?.addEventListener('click', handleClose);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) handleClose();
  });
  document.addEventListener('keydown', (event) => {
    if (isOpen && event.key === 'Escape') handleClose();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const address = addressInput?.value.trim();
    const email = emailInput?.value.trim();

    if (!address) {
      toast?.('Please enter your address.');
      addressInput?.focus();
      return;
    }

    try {
      const profile = JSON.parse(localStorage.getItem('blush_profile') || '{}');
      profile.address = address;
      if (email) profile.emailP = email;
      localStorage.setItem('blush_profile', JSON.stringify(profile));
    } catch (err) {
      console.warn('Unable to store profile address', err);
    }

    markHandled();
    toast?.('Address saved for next time!');
    closeModal();
  });

  const shouldShow = (() => {
    try {
      return localStorage.getItem('showWelcomeModal') === 'true';
    } catch (err) {
      console.warn('Unable to read welcome modal flag', err);
      return false;
    }
  })();

  if (shouldShow) {
    openModal();
  }
})();
