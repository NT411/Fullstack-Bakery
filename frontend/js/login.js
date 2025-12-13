// ========= Modal logic (simple & accessible-ish) =========
const body = document.body;
const modalByKey = {
  login: document.getElementById('modal-login'),
  register: document.getElementById('modal-register'),
  reset: document.getElementById('modal-reset'),
  auth: document.getElementById('modal-auth'),
  contact: document.getElementById('modal-contact'),
};
let activeModal = null;
let lastTrigger = null;

// Open helper
function openModal(key, triggerEl) {
  if (!modalByKey[key]) return;
  closeModal(); // ensure only one
  activeModal = modalByKey[key];
  lastTrigger = triggerEl || null;
  activeModal.setAttribute('open', '');
  body.style.overflow = 'hidden';
  // focus first input if any
  const firstInput = activeModal.querySelector('input, button, a, [tabindex]:not([tabindex="-1"])');
  if (firstInput) firstInput.focus();
}

// Close helper
function closeModal() {
  if (!activeModal) return;
  activeModal.removeAttribute('open');
  body.style.overflow = '';
  if (lastTrigger) lastTrigger.focus();
  activeModal = null;
  lastTrigger = null;
}

// Delegated open on elements with [data-open-modal]
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open-modal]');
  if (opener) {
    e.preventDefault();
    const target = opener.getAttribute('data-target');
    openModal(target, opener);
  }
  if (e.target.matches('[data-close-modal]')) {
    e.preventDefault();
    closeModal();
  }
});

// Click outside to close
Object.values(modalByKey).forEach((overlay) => {
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
});

// ESC to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ========= Auth submissions =========
const API_BASE = 'http://localhost:4000';
const ORDER_PAGE = 'order.html';

function storeSession(token, user) {
  try {
    if (token) localStorage.setItem('authToken', token);
    if (user) localStorage.setItem('authUser', JSON.stringify(user));
  } catch (err) {
    console.warn('Could not persist auth session', err);
  }
}

async function loginRequest(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch (err) {
    payload = null;
  }
  if (!res.ok) {
    const message = payload?.error || 'Login failed';
    throw new Error(message);
  }
  return payload;
}

const loginForm = modalByKey.login?.querySelector('form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email?.value.trim();
    const password = loginForm.password?.value;

    if (!email || !password) {
      toast('Enter email and password');
      return;
    }

    try {
      const data = await loginRequest(email, password);
      storeSession(data.token, data.user);
      closeModal();
      window.location.href = ORDER_PAGE;
    } catch (err) {
      console.error('Login error', err);
      toast(err.message || 'Login failed');
    }
  });
}

const registerForm = modalByKey.register?.querySelector('form');
const sendCodeBtn = document.getElementById('send-code-btn');
if (sendCodeBtn && registerForm) {
  sendCodeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = registerForm.email?.value.trim();
    if (!email) {
      toast('Enter your email first');
      registerForm.email?.focus();
      return;
    }
    sendCodeBtn.setAttribute('aria-busy', 'true');
    sendCodeBtn.classList.add('disabled');
    sendCodeBtn.style.pointerEvents = 'none';
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message = payload?.error || 'Could not send code';
        throw new Error(message);
      }
      toast('We emailed you a code.');
    } catch (err) {
      console.error('Send code error', err);
      toast(err.message || 'Could not send code');
    } finally {
      sendCodeBtn.removeAttribute('aria-busy');
      sendCodeBtn.classList.remove('disabled');
      sendCodeBtn.style.pointerEvents = '';
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm.email?.value.trim();
    const password = registerForm.password?.value;
    const confirm = registerForm.confirm_password?.value;
    const name = registerForm.full_name?.value.trim();
    const verificationCode = registerForm.email_code?.value.trim();

    if (!name) {
      toast('Enter your name');
      return;
    }
    if (!email) {
      toast('Enter your email');
      return;
    }
    if (!verificationCode) {
      toast('Enter the confirmation code');
      return;
    }
    if (!password || password.length < 8) {
      toast('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast('Passwords do not match');
      return;
    }

    try {
      const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: name,
          verificationCode
        })
      });
      const registerPayload = await registerRes.json().catch(() => null);
      if (!registerRes.ok) {
        const message = registerPayload?.error || 'Registration failed';
        throw new Error(message);
      }

      // Automatically log the user in after successful registration
      const data = await loginRequest(email, password);
      storeSession(data.token, data.user);
      try {
        const profile = JSON.parse(localStorage.getItem('blush_profile') || '{}');
        if (name) profile.fullName = name;
        if (email) profile.emailP = email;
        if (!profile.memberSince) {
          profile.memberSince = new Date().toISOString().slice(0, 10);
        }
        localStorage.setItem('blush_profile', JSON.stringify(profile));
        localStorage.setItem('showWelcomeModal', 'true');
      } catch (storageErr) {
        console.warn('Unable to persist profile after registration', storageErr);
      }
      closeModal();
      window.location.href = ORDER_PAGE;
    } catch (err) {
      console.error('Registration error', err);
      toast(err.message || 'Registration failed');
    }
  });
}

const resetForm = modalByKey.reset?.querySelector('form');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetForm.email?.value.trim();
    if (!email) {
      toast('Enter the email you used to register');
      resetForm.email?.focus();
      return;
    }
    const submitBtn = resetForm.querySelector('button[type="submit"]');
    submitBtn?.setAttribute('aria-busy', 'true');
    submitBtn?.setAttribute('disabled', 'disabled');
    try {
      const res = await fetch(`${API_BASE}/api/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message = payload?.error || 'Could not start reset';
        throw new Error(message);
      }
      toast('If that email exists, a reset link is on the way.');
      closeModal();
    } catch (err) {
      console.error('Reset request error', err);
      toast(err.message || 'Could not start reset');
    } finally {
      submitBtn?.removeAttribute('aria-busy');
      submitBtn?.removeAttribute('disabled');
    }
  });
}
