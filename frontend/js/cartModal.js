// ==================================================
// Payment / Profile / Cart 
// ==================================================
// Simple scroll lock for modals 
let __scrollY = 0;
function lockScroll(on = true) {
  if (on) {
    __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    // Prevent page from moving while keeping the visual position
    document.body.style.position = 'fixed';
    document.body.style.top = `-${__scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  } else {
    // Restore scrolling and jump back to original position
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, __scrollY);
  }
}


//PROFILE 
const demoAmount = document.getElementById('subtotal');
const payModal = document.getElementById('payModal');
const payClose = document.getElementById('payClose');
const payForm = document.getElementById('payForm');
const confirmBtn = document.getElementById('confirmPay');
const confirmLabel = document.getElementById('confirmLabel');
const confirmAmount = document.getElementById('confirmAmount');

function openPayment(opts = {}) {
  const amountText = demoAmount.textContent || '€0.00';
  confirmAmount.textContent = amountText;
  confirmLabel.textContent = opts.wallet ? 'Pay with Wallet' : 'Pay';
  payModal.setAttribute('aria-hidden', 'false');
  payModal.querySelector('.pay-dialog').focus();
  lockScroll(true);
}
function closePayment() { payModal.setAttribute('aria-hidden', 'true'); lockScroll(false); }

payClose?.addEventListener('click', closePayment);
payModal?.addEventListener('click', (e) => { if (e.target === payModal) closePayment(); });
document.addEventListener('keydown', (e) => { if (payModal?.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') closePayment(); });

// simple masking
const num = document.getElementById('cardNumber');
num?.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19); });
const exp = document.getElementById('exp');
exp?.addEventListener('input', (e) => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; });
const cvc = document.getElementById('cvc');
cvc?.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });

// validation helpers
function luhn(num) { num = num.replace(/\s+/g, ''); let sum = 0; let dbl = false; for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } sum += d; dbl = !dbl; } return sum % 10 === 0 && num.length >= 13; }
function futureExp(mmYY) { const m = +(mmYY.slice(0, 2)); const y = +(mmYY.slice(3)); if (!m || !y || m < 1 || m > 12) return false; const now = new Date(); const year = 2000 + y; const expD = new Date(year, m); return expD > now; }

payForm?.addEventListener('submit', (e) => e.preventDefault());
confirmBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  const fields = ['cardName', 'cardNumber', 'exp', 'cvc', 'email', 'zip'];
  let ok = true;
  fields.forEach(id => {
    const el = document.getElementById(id);
    const err = document.querySelector(`[data-error-for="${id}"]`);
    if (!el || !err) return;
    let valid = !!el.value.trim();
    if (id === 'cardNumber') valid = valid && luhn(el.value);
    if (id === 'exp') valid = valid && futureExp(el.value);
    if (id === 'cvc') valid = valid && el.value.replace(/\D/g, '').length >= 3;
    if (id === 'email') valid = valid && /.+@.+\..+/.test(el.value);
    err.hidden = valid;
    if (!valid) ok = false;
  });
  if (!ok) { toast('Please fix the highlighted fields.'); return; }
  confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="loading" aria-hidden="true"></span> Confirming…';
  setTimeout(() => { confirmBtn.innerHTML = '<span>3-D Secure</span> <span class="loading" aria-hidden="true"></span>'; }, 900);
  setTimeout(() => { confirmBtn.disabled = false; closePayment(); toast('Payment successful (demo)'); }, 2200);
});

document.getElementById('altWallet')?.addEventListener('click', () => { openPayment({ wallet: true }); toast('Opening wallet sheet… (demo)'); });

// Demo data
const state = { items: [], discount: 0, promo: null };
setCartCount(0);
// Elements
const modal = document.getElementById('cartModal');
const itemsEl = document.getElementById('items');
const emptyEl = document.getElementById('emptyState');
const subtotalEl = document.getElementById('subtotal');
const discountEl = document.getElementById('discount');
const totalEl = document.getElementById('total');
const shippingEl = document.getElementById('shipping');
const paymentEl = document.getElementById('paymentMethod');

const ORDERS_STORAGE_KEY = 'blush_orders';

function getOrdersStore() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
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
    console.warn('Could not parse authUser', err);
  }
  return 'guest';
}

function loadOrdersState() {
  const store = getOrdersStore();
  const key = getCurrentUserKey();
  const bucket = store[key];
  if (!bucket) return { ongoing: [], history: [] };
  return {
    ongoing: Array.isArray(bucket.ongoing) ? bucket.ongoing : [],
    history: Array.isArray(bucket.history) ? bucket.history : []
  };
}

function saveOrdersState(orders) {
  const store = getOrdersStore();
  const key = getCurrentUserKey();
  store[key] = orders;
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(store));
}

function generateOrderId() {
  const now = new Date();
  const stamp = now.getTime().toString().slice(-6);
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `#${day}${month}-${stamp}`;
}

function getShippingSummary() {
  const cost = parseFloat(shippingEl?.value || '0') || 0;
  const label = shippingEl?.selectedOptions?.[0]?.textContent?.trim() || 'Pickup';
  return { cost, label };
}

function notifyOrdersUpdated() {
  if (window.profileOrders?.refresh) {
    window.profileOrders.refresh();
  }
}
function syncCart(data) {
  if (!data || !Array.isArray(data.items)) return;
  state.items = data.items.map(item => ({
    id: item.sku,
    name: item.title,
    color: '—',
    price: item.price,
    qty: item.qty
  }));
  render();
}

window.syncCart = syncCart; // let other scripts reuse it

function setCartCount(n) {
  document.querySelectorAll('#floatingCartCount')
    .forEach(el => el.textContent = n);
}

function updateCheckoutButtonLabel() {
  const label = paymentEl?.value === 'cash' ? 'Place Order' : 'Pay Now';
  document.querySelectorAll('#openPay').forEach(btn => {
    btn.textContent = label;
  });
}

async function handleCheckout() {
  if (paymentEl?.value === 'cash') {
    await placeCashOrder();
  } else {
    openPayment();
  }
}

async function placeCashOrder() {
  if (!state.items.length) {
    toast('Your cart is empty.');
    return;
  }

  const { cost: shippingCost, label: shippingLabel } = getShippingSummary();
  const subtotal = sum();
  const discount = state.discount || 0;
  const total = Math.max(0, subtotal + shippingCost - discount);
  const now = new Date();

  const order = {
    id: generateOrderId(),
    createdAt: now.toISOString(),
    date: now.toLocaleDateString(),
    status: 'Awaiting cash payment',
    paymentMethod: 'cash',
    shipping: { label: shippingLabel, cost: shippingCost },
    subtotal,
    discount,
    total,
    items: state.items.map(item => ({
      sku: item.id,
      title: item.name,
      qty: item.qty,
      price: item.price
    }))
  };

  const orders = loadOrdersState();
  orders.ongoing = [order, ...(orders.ongoing || [])];
  saveOrdersState(orders);
  notifyOrdersUpdated();

  await clearCart();
  toast('Order placed for cash payment.');
  closeCart();
}

async function clearCart() {
  const currentItems = [...state.items];

  for (const item of currentItems) {
    try {
      await fetch(`http://localhost:4000/api/cart/item/${encodeURIComponent(item.id)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Failed to clear cart item', err);
    }
  }

  state.items = [];
  state.discount = 0;
  state.promo = null;

  const promoInput = document.getElementById('promo');
  if (promoInput) promoInput.value = '';
  if (shippingEl) shippingEl.value = '0';
  if (paymentEl) paymentEl.value = 'card';

  updateCheckoutButtonLabel();
  render();
}

paymentEl?.addEventListener('change', updateCheckoutButtonLabel);
updateCheckoutButtonLabel();

// Open / Close
document.querySelectorAll('#openCart, #floatingCartBtn').forEach(el => {
  el.addEventListener('click', () => {
    closeMobilePanelIfOpen();
    const isOpen = modal?.getAttribute('aria-hidden') === 'false';
    if (isOpen) closeCart();
    else openCart();
  });
});

document.querySelectorAll('#openProfile').forEach(el => {
  el.addEventListener('click', () => { closeMobilePanelIfOpen(); openProfile(); });
});

// If you have a "Pay" entry in the mobile panel:
document.querySelectorAll('#openPay').forEach(el => {
  el.addEventListener('click', async () => {
    closeMobilePanelIfOpen();
    await handleCheckout();
  });
});
document.getElementById('closeCart')?.addEventListener('click', closeCart);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeCart(); });
document.addEventListener('keydown', (e) => { if (modal?.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') closeCart(); });

function openCart() {
  modal.setAttribute('aria-hidden', 'false');
  trapFocus(modal);
  lockScroll(true);
}
function closeCart() {
  modal.setAttribute('aria-hidden', 'true');
  releaseFocus();
  lockScroll(false);
}

// Focus trap (simple)
let lastFocused = null; let trapHandler = null;

function trapFocus(container) {
  lastFocused = document.activeElement;
  const focusables = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  (first instanceof HTMLElement ? first : container).focus();

  trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', trapHandler);
}

function releaseFocus() {
  if (trapHandler && modal) modal.removeEventListener('keydown', trapHandler);
  trapHandler = null;
  if (lastFocused && lastFocused instanceof HTMLElement) lastFocused.focus();
}

// Render items
function render() {
  if (!itemsEl) return;
  itemsEl.innerHTML = '';
  emptyEl && (emptyEl.hidden = state.items.length !== 0);

  state.items.forEach(item => {
    const row = document.createElement('div'); row.className = 'item';
    row.innerHTML = `
      <div class="thumb">${item.name.split(' ')[0][0]}</div>
      <div class="meta">
        <h4>${item.name}</h4>
        <p>${item.color}</p>
        <div class="qty" aria-label="Quantity controls for ${item.name}">
          <button aria-label="Decrease" data-act="dec">–</button>
          <input type="number" value="${item.qty}" min="1" inputmode="numeric" aria-label="Quantity" />
          <button aria-label="Increase" data-act="inc">+</button>
        </div>
      </div>
      <div style="display:grid; gap:.4rem; justify-items:end;">
        <div class="price">€${(item.price * item.qty).toFixed(2)}</div>
        <button class="pay-btn" data-act="remove" aria-label="Remove ${item.name}">Remove</button>
      </div>`;

    row.querySelector('[data-act="inc"]')?.addEventListener('click', () => updateQty(item.id, item.qty + 1));
    row.querySelector('[data-act="dec"]')?.addEventListener('click', () => updateQty(item.id, Math.max(1, item.qty - 1)));
    row.querySelector('input[type="number"]')?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value || '1', 10); updateQty(item.id, Math.max(1, v));
    });
    row.querySelector('[data-act="remove"]')?.addEventListener('click', () => removeItem(item.id));

    itemsEl.appendChild(row);
  });

  updateTotals();
}

async function updateQty(id, qty) {
  try {
    const res = await fetch('http://localhost:4000/api/cart/item', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: id, qty })
    });
    if (!res.ok) throw new Error('Failed to update quantity');
    const data = await res.json();
    syncCart(data);
  } catch (err) {
    console.error('Quantity update failed', err);
    toast('Could not update quantity.');
  }
}

async function removeItem(id) {
  try {
    const res = await fetch(`http://localhost:4000/api/cart/item/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove item');
    const data = await res.json();
    syncCart(data);
  } catch (err) {
    console.error('Remove failed', err);
    toast('Could not remove item.');
  }
}


function sum() { return state.items.reduce((t, i) => t + i.price * i.qty, 0); }
function updateTotals() {
  const subtotal = sum();
  const shipping = parseFloat(shippingEl?.value || '0') || 0;
  const discount = state.discount || 0;
  const total = Math.max(0, subtotal + shipping - discount);
  if (subtotalEl) subtotalEl.textContent = `€${subtotal.toFixed(2)}`;
  if (discountEl) discountEl.textContent = `– €${discount.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
  setCartCount(state.items.reduce((n, i) => n + i.qty, 0));
  if (emptyEl) emptyEl.hidden = state.items.length !== 0;
}

// Shipping change
shippingEl?.addEventListener('change', updateTotals);

// Promo codes (demo): BLOOM10 => 10% off, PETAL5 => €5 off
document.getElementById('applyPromo')?.addEventListener('click', () => {
  const code = (document.getElementById('promo')?.value || '').trim().toUpperCase();
  const subtotal = sum();
  let discount = 0; let note = '';
  if (code === 'BLOOM10') { discount = +(subtotal * 0.10).toFixed(2); note = '10% off applied'; }
  else if (code === 'PETAL5') { discount = 5.00; note = '€5 off applied'; }
  else if (!code) { discount = 0; note = 'Promo cleared'; }
  else { alert('Sorry, that promo is not valid.'); return; }
  state.promo = code || null; state.discount = Math.min(discount, subtotal);
  updateTotals();
  if (note) toast(note);
});

// Init cart UI
render();
