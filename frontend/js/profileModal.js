
/* ---------- PROFILE (Pro) ---------- */
const profileModal = document.getElementById('profileModal');
const openProfileBtn = document.getElementById('openProfile');
const closeProfileBtn = document.getElementById('profileClose');
const avatarInitial = document.getElementById('avatarInitial');
const memberSince = document.getElementById('memberSince');
const PROFILE_ORDERS_STORAGE_KEY = 'blush_orders';
const AUTH_API_BASE = 'http://localhost:4000/api/auth';

// Panels
const navButtons = Array.from(document.querySelectorAll('.p-nav .nav-btn'));
const panels = {
  account: document.getElementById('panel-account'),
  security: document.getElementById('panel-security'),
  orders: document.getElementById('panel-orders'),
  logout: document.getElementById('panel-logout'),
};
function setPanel(id) {
  Object.entries(panels).forEach(([key, el]) => { el.setAttribute('aria-hidden', key === id ? 'false' : 'true'); });
  navButtons.forEach(btn => btn.setAttribute('aria-current', btn.dataset.panel === id ? 'page' : 'false'));
}
navButtons.forEach(btn => btn.addEventListener('click', () => setPanel(btn.dataset.panel)));

function openProfile() {
  const storedProfile = JSON.parse(localStorage.getItem('blush_profile') || '{}');
  const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const profileData = { ...storedProfile };

  if (authUser.fullName && !profileData.fullName) profileData.fullName = authUser.fullName;
  if (authUser.email && !profileData.emailP) profileData.emailP = authUser.email;
  if (authUser.createdAt && !profileData.memberSince) profileData.memberSince = authUser.createdAt.slice(0, 10);

  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('emailP');
  const addressInput = document.getElementById('address');
  if (fullNameInput) fullNameInput.value = profileData.fullName || '';
  if (emailInput) emailInput.value = profileData.emailP || '';
  if (addressInput) addressInput.value = profileData.address || '';

  document.getElementById('marketing').checked = !!profileData.marketing;

  const displayName = (fullNameInput?.value || 'Guest').trim() || 'Guest';
  avatarInitial.textContent = (displayName[0] || 'G').toUpperCase();

  const sinceValue = profileData.memberSince || new Date().toISOString().slice(0, 10);
  memberSince.textContent = sinceValue;
  profileData.memberSince = sinceValue;

  localStorage.setItem('blush_profile', JSON.stringify(profileData));
  setPanel('account');
  profileModal.setAttribute('aria-hidden', 'false');
  profileModal.querySelector('.profile-dialog').focus();
  renderOrders();
}
function closeProfile() { profileModal.setAttribute('aria-hidden', 'true'); }
openProfileBtn.addEventListener('click', openProfile);
closeProfileBtn.addEventListener('click', closeProfile);
profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeProfile(); });
document.addEventListener('keydown', (e) => { if (profileModal.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') closeProfile(); });

// Enable/disable edits via "Change" buttons (keeps style but gives clear action)
document.querySelectorAll('[data-edit]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-edit');
    const input = document.getElementById(id);
    input.focus();
    toast('You can edit and click “Save changes”.');
  });
});

// Save profile
document.getElementById('saveProfile').addEventListener('click', (e) => {
  e.preventDefault();
  const data = {
    fullName: document.getElementById('fullName').value.trim(),
    emailP: document.getElementById('emailP').value.trim(),
    address: document.getElementById('address').value.trim(),
    marketing: document.getElementById('marketing').checked,
    memberSince: memberSince.textContent
  };
  if (data.emailP && !/.+@.+\..+/.test(data.emailP)) { toast('Please enter a valid email.'); return; }
  localStorage.setItem('blush_profile', JSON.stringify(data));
  toast('Profile saved');
});

// Logout (panel + quick)
const confirmLogoutBtn = document.getElementById('confirmLogout');
if (confirmLogoutBtn) {
  confirmLogoutBtn.addEventListener('click', () => {
    localStorage.removeItem('blush_profile');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('showWelcomeModal');
    toast('Logged out');
    closeProfile();
    window.location.href = 'index.html';
  });
}

const logoutPanelBtn = document.getElementById('logoutBtn');
if (logoutPanelBtn) {
  logoutPanelBtn.addEventListener('click', () => setPanel('logout'));
}

/* ----- Security: change password + reset link (demo flows) ----- */
const newPwd = document.getElementById('newPwd');
const pwdBar = document.getElementById('pwdBar');
const pwdHint = document.getElementById('pwdHint');
function strengthScore(v) {
  let s = 0; if (v.length >= 8) s++; if (/[A-Z]/.test(v)) s++; if (/[a-z]/.test(v)) s++; if (/[0-9]/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++; return s;
}
newPwd.addEventListener('input', (e) => {
  const v = e.target.value; const s = strengthScore(v); const pct = (s / 5) * 100; pwdBar.style.width = pct + '%';
  const labels = ['Weak', 'Weak', 'Okay', 'Good', 'Strong', 'Strong']; pwdHint.textContent = 'Strength: ' + labels[s];
});
document.getElementById('changePasswordBtn').addEventListener('click', (e) => {
  e.preventDefault();
  const current = document.getElementById('currentPwd').value;
  const n1 = document.getElementById('newPwd').value;
  const n2 = document.getElementById('confirmPwd').value;
  if (!current || !n1 || !n2) { toast('Fill all password fields.'); return; }
  if (n1 !== n2) { toast('New passwords do not match.'); return; }
  if (strengthScore(n1) < 3) { toast('Use a stronger password.'); return; }
  // Hook your backend here
  toast('Password changed.');
  document.getElementById('currentPwd').value = '';
  document.getElementById('newPwd').value = '';
  document.getElementById('confirmPwd').value = '';
  pwdBar.style.width = '0%'; pwdHint.textContent = 'Strength: —';
});
const resetEmailBtn = document.getElementById('sendResetEmail');
if (resetEmailBtn) {
  resetEmailBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('emailP');
    const savedProfile = JSON.parse(localStorage.getItem('blush_profile') || '{}');
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    const email = (emailInput?.value || savedProfile.emailP || authUser.email || '').trim();
    if (!/.+@.+\..+/.test(email)) { toast('Add a valid email to Account first.'); setPanel('account'); return; }

    resetEmailBtn.setAttribute('aria-busy', 'true');
    resetEmailBtn.disabled = true;
    try {
      const res = await fetch(`${AUTH_API_BASE}/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message = payload?.error || 'Could not send reset link';
        throw new Error(message);
      }
      toast('Check your inbox for reset instructions.');
    } catch (err) {
      console.error('Reset email error', err);
      toast(err.message || 'Could not send reset link');
    } finally {
      resetEmailBtn.removeAttribute('aria-busy');
      resetEmailBtn.disabled = false;
    }
  });
}

function getOrdersStore() {
  try {
    const raw = localStorage.getItem(PROFILE_ORDERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (err) {
    console.warn('Could not read orders store', err);
    return {};
  }
}

function getCurrentUserKey() {
  try {
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    if (authUser && typeof authUser.email === 'string' && authUser.email.trim()) {
      return authUser.email.trim().toLowerCase();
    }
  } catch (err) {
    console.warn('Could not parse authUser for orders', err);
  }
  return 'guest';
}

function loadOrders() {
  const store = getOrdersStore();
  const key = getCurrentUserKey();
  const bucket = store[key];
  if (!bucket) return { ongoing: [], history: [] };
  return {
    ongoing: Array.isArray(bucket.ongoing) ? bucket.ongoing : [],
    history: Array.isArray(bucket.history) ? bucket.history : []
  };
}

function saveOrders(orders) {
  const store = getOrdersStore();
  const key = getCurrentUserKey();
  store[key] = orders;
  localStorage.setItem(PROFILE_ORDERS_STORAGE_KEY, JSON.stringify(store));
}

function orderRow(o) {
  const el = document.createElement('div'); el.className = 'order-card';
  const itemCount = Array.isArray(o.items)
    ? o.items.reduce((sum, item) => sum + (item.qty || 0), 0)
    : o.items ?? 0;
  const totalText = typeof o.total === 'number' ? `€${o.total.toFixed(2)}` : (o.total || '—');
  const dateText = o.date || new Date(o.createdAt || Date.now()).toLocaleDateString();
  const paymentLabel = o.paymentMethod === 'cash' ? 'Cash on delivery' : 'Card';
  const shippingLabel = o.shipping?.label ? `Shipping: ${o.shipping.label}` : '';
  const statusLabel = o.status || 'Processing';
  el.innerHTML = `
        <div style="font-weight:800; color:#8d7b8d;">${o.id || '—'}</div>
        <div class="status">${statusLabel}</div>
        <div class="hint">${dateText}</div>
        <div style="font-weight:800; color:#a192a1;">${totalText}</div>
        <div class="hint" style="grid-column:1 / -1;">Items: ${itemCount}</div>
        <div class="hint" style="grid-column:1 / -1;">Payment: ${paymentLabel}</div>
        ${shippingLabel ? `<div class="hint" style="grid-column:1 / -1;">${shippingLabel}</div>` : ''}`;
  if (statusLabel.toLowerCase().includes('awaiting')) {
    const actionWrap = document.createElement('div');
    actionWrap.className = 'hint';
    actionWrap.style.gridColumn = '1 / -1';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'main-btn';
    cancelBtn.textContent = 'Cancel order';
    cancelBtn.addEventListener('click', () => cancelOrder(o.id));
    actionWrap.appendChild(cancelBtn);
    el.appendChild(actionWrap);
  }
  return el;
}

function renderOrders() {
  const { ongoing, history } = loadOrders();
  const on = document.getElementById('ordersOngoing');
  const completedEl = document.getElementById('ordersCompleted');
  const canceledEl = document.getElementById('ordersCanceled');
  if (!on || !completedEl || !canceledEl) return;

  const completed = Array.isArray(history) ? history.filter(o => o.status === 'Completed') : [];
  const canceled = Array.isArray(history) ? history.filter(o => o.status === 'Canceled') : [];

  on.innerHTML = '';
  completedEl.innerHTML = '';
  canceledEl.innerHTML = '';

  if (!ongoing.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No active orders yet.';
    on.appendChild(empty);
  } else {
    ongoing.forEach(o => on.appendChild(orderRow(o)));
  }

  if (!completed.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No completed orders yet.';
    completedEl.appendChild(empty);
  } else {
    completed.forEach(o => completedEl.appendChild(orderRow(o)));
  }

  if (!canceled.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No canceled orders.';
    canceledEl.appendChild(empty);
  } else {
    canceled.forEach(o => canceledEl.appendChild(orderRow(o)));
  }

  setOrdersTab(currentOrdersTab);
}

function addOrder(order) {
  const orders = loadOrders();
  orders.ongoing = [order, ...(orders.ongoing || [])];
  saveOrders(orders);
  renderOrders();
}

let currentOrdersTab = 'ongoing';

function setOrdersTab(tab) {
  currentOrdersTab = tab;
  const ongoingBtn = document.querySelector('[data-orders-tab="ongoing"]');
  const completedBtn = document.querySelector('[data-orders-tab="completed"]');
  const canceledBtn = document.querySelector('[data-orders-tab="canceled"]');
  ongoingBtn?.setAttribute('aria-pressed', tab === 'ongoing' ? 'true' : 'false');
  completedBtn?.setAttribute('aria-pressed', tab === 'completed' ? 'true' : 'false');
  canceledBtn?.setAttribute('aria-pressed', tab === 'canceled' ? 'true' : 'false');
  const on = document.getElementById('ordersOngoing');
  const completedEl = document.getElementById('ordersCompleted');
  const canceledEl = document.getElementById('ordersCanceled');
  if (on) on.style.display = tab === 'ongoing' ? 'grid' : 'none';
  if (completedEl) completedEl.style.display = tab === 'completed' ? 'grid' : 'none';
  if (canceledEl) canceledEl.style.display = tab === 'canceled' ? 'grid' : 'none';
}

document.querySelectorAll('[data-orders-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-orders-tab');
    if (tab === 'completed' || tab === 'canceled') {
      setOrdersTab(tab);
    } else {
      setOrdersTab('ongoing');
    }
  });
});

function cancelOrder(orderId) {
  const orders = loadOrders();
  const index = orders.ongoing.findIndex(o => o.id === orderId);
  if (index === -1) {
    toast('Order not found.');
    return;
  }
  const [order] = orders.ongoing.splice(index, 1);
  order.status = 'Canceled';
  orders.history = [{ ...order }, ...(orders.history || [])];
  saveOrders(orders);
  renderOrders();
  toast('Order canceled.');
}

window.profileOrders = {
  addOrder,
  refresh: renderOrders,
  getOrders: loadOrders
};

renderOrders();
