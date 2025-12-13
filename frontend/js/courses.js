// ==================================================
// Courses: minimal filters + Add-to-cart (backend-ready)
// ==================================================

const grid = document.getElementById('courseGrid');
const q = document.getElementById('q');
const level = document.getElementById('level');
const format = document.getElementById('format');
const duration = document.getElementById('duration');
let catalog = [];
const category = grid?.dataset?.category || '';

const IMAGE_MAP = {
  Order: {
    'prod-choc-cake-8in': '/frontend/assets/Order_Page_Images/order_page_product_1_image.jpg',
    'prod-vanilla-bday-8in': '/frontend/assets/Order_Page_Images/order_page_product_2_image.jpg',
    'prod-red-velvet-6pack': '/frontend/assets/Order_Page_Images/order_page_product_3_image.jpg',
    'prod-lemon-gf-loaf': '/frontend/assets/Order_Page_Images/order_page_product_4_image.jpg',
    'prod-carrot-vegan-slice': '/frontend/assets/Order_Page_Images/order_page_product_5_image.jpg',
    'prod-assorted-cookies-12': '/frontend/assets/Order_Page_Images/order_page_product_6_image.jpg',
    'prod-choc-chip-6': '/frontend/assets/Order_Page_Images/order_page_product_7_image.jpg',
    'prod-oatmeal-vegan-6': '/frontend/assets/Order_Page_Images/order_page_product_8_image.jpg',
    'prod-macarons-12': '/frontend/assets/Order_Page_Images/order_page_product_9_image.jpg'
  }
};

if (grid) {
  async function loadCatalog() {
    try {
      const base = 'http://localhost:4000/api/products';
      const url = category ? `${base}?category=${encodeURIComponent(category)}` : base;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('Failed to load catalog');
      }
      catalog = await res.json();
      renderCatalog();

      console.log('Catalog from backend:', catalog);
    } catch (err) {
      console.error('Could not load catalog', err);
    }
  }
  loadCatalog();
  function renderCatalog() {
    // Remove any existing cards
    grid.innerHTML = '';

    catalog.forEach(product => {
      const imgSrc = IMAGE_MAP[category]?.[product.sku];
      const imageHtml = imgSrc
        ? `
      <div class="images" aria-hidden="true">
        <div class="banner-image">
          <img src="${imgSrc}" alt="${product.title}">
        </div>
      </div>`
        : '';

      const card = document.createElement('article');
      card.className = 'course-card';
      card.dataset.sku = product.sku;
      card.dataset.level = product.level || '';
      card.dataset.format = product.format || '';
      card.dataset.duration = product.duration || '';

      card.innerHTML = `
      ${imageHtml}
      <h3 class="course-title">${product.title}</h3>
      <div class="course-meta">
        ${product.level ? `<span class="tag" title="Level">${product.level}</span>` : ''}
        ${product.format ? `<span class="tag" title="Format">${product.format}</span>` : ''}
        ${product.duration ? `<span class="tag" title="Duration">${product.duration}</span>` : ''}
      </div>
      <p class="course-desc">${product.description}</p>
      <div class="meta-line">From <strong>€${Number(product.price).toFixed(2)}</strong></div>
      <div><button class="main-btn">Add To Cart</button></div>
    `;

      grid.appendChild(card);
    });
    applyFilters();
  }

  // --- Filters (hide/show only; no re-render) ---
  function applyFilters() {
    const term = (q?.value || '').toLowerCase().trim();
    const L = level?.value || '';
    const F = format?.value || '';
    const D = duration?.value || '';

    grid.querySelectorAll('.course-card').forEach(card => {
      const title = card.querySelector('.course-title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.course-desc')?.textContent.toLowerCase() || '';
      const matchQ = !term || (title + ' ' + desc).includes(term);
      const matchL = !L || card.dataset.level === L;
      const matchF = !F || card.dataset.format === F;
      const matchD = !D || card.dataset.duration === D;
      card.style.display = (matchQ && matchL && matchF && matchD) ? '' : 'none';
    });
  }

  [q, level, format, duration].forEach(el => el && el.addEventListener('input', applyFilters));


  // --- Add to cart via backend (fallback to local dev if backend missing) ---
  async function addCourseToCartBySku(sku, titleForToast) {
    try {
      const res = await fetch('http://localhost:4000/api/cart/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, qty: 1 })
      });
      if (!res.ok) throw new Error('Add failed');
      const data = await res.json();
      const updatedItem = data.items.find(i => i.sku === sku);
      const displayName = updatedItem?.title || titleForToast || 'course';
      window.syncCart?.(data);
      toast(`Added ${displayName} to cart`);
    } catch (err) {
      console.error('Add to cart failed', err);
      toast('Could not add to cart.');
    }


  }

  // Delegate clicks to existing buttons
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.main-btn');
    if (!btn) return;
    const card = btn.closest('.course-card');
    const sku = card?.dataset?.sku;
    if (!sku) return;
    const title = card.querySelector('.course-title')?.textContent.trim();
    addCourseToCartBySku(sku, title);
  });
}
