## TheSweetBaker Co.

Full-stack demo in development for a custom bakery: multi-page static frontend plus an Express + PostgreSQL backend for products, cart, authentication, and email-driven flows.

![Main Page](./main_page_0.png)
--
## Features
- Multi-page marketing site (home/order/school/books) with modals for login, register, profile, cart, contact, and welcome prompt.
- Product catalog with filters, add-to-cart, and profile data stored in localStorage for smoother UX.
- Auth flows with email verification codes, password resets, and welcome emails via Nodemailer.
- Express API backed by PostgreSQL; passwords hashed with scrypt; tokens signed with `AUTH_JWT_SECRET`.
- Smoke script to exercise health, products, register/login, and password reset.

## Stack
- Frontend: HTML, CSS, vanilla JS.
- Backend: Node.js 18, Express 5, PostgreSQL, Nodemailer, dotenv, cors.
- Auth/security: scrypt password hashing, HMAC-signed JWTs.

## Project Structure
```text

Fullstack-Bakery/
 ├─ backend/                         # Express + PostgreSQL API
 │  ├─ src/
 │  │  ├─ routes/
 │  │  │  ├─ auth.js                 # Register/login/send-code/reset
 │  │  │  ├─ products.js             # Products listing, optional category filter
 │  │  │  └─ cart.js                 # In-memory cart add/update/remove
 │  │  ├─ mailer.js                  # Nodemailer transport, HTML templates, token helpers
 │  │  └─ index.js                   # Server entry, mounts routes, health check
 │  ├─ smoke.js                      # End-to-end smoke test script
 │  ├─ package.json                  # Backend dependencies/scripts
 │  ├─ package-lock.json             # Backend lock file
 │  ├─ .env.example                  # Sample environment (copy to .env)
 │  ├─ .env                          # Local environment (not committed)
 │  └─ .gitignore                    # Backend ignores
 │
 ├─ frontend/                        # Static site
 │  ├─ html/
 │  │  ├─ index.html                 # Landing/login/register/reset
 │  │  ├─ order.html                 # Products grid, cart/profile modals, welcome prompt
 │  │  ├─ school.html                # Baking school page
 │  │  └─ books.html                 # Baking books page
 │  ├─ css/
 │  │  ├─ about.css
 │  │  ├─ banner.css
 │  │  ├─ buttons.css
 │  │  ├─ cards.css
 │  │  ├─ cartModal.css
 │  │  ├─ contactModal.css
 │  │  ├─ decorations.css
 │  │  ├─ faq.css
 │  │  ├─ footer.css
 │  │  ├─ images.css
 │  │  ├─ login.css
 │  │  ├─ navbar.css
 │  │  ├─ paymentModal.css
 │  │  ├─ productsSection.css
 │  │  ├─ profileModal.css
 │  │  ├─ styles.css
 │  │  └─ welcomeModal.css
 │  ├─ js/
 │  │  ├─ navbar.js                  # Navigation interactions
 │  │  ├─ footer.js                  # Footer behaviors
 │  │  ├─ login.js                   # Login/register/reset UI wiring
 │  │  ├─ cartModal.js               # Cart modal interactions and totals
 │  │  ├─ profileModal.js            # Profile modal (localStorage-backed)
 │  │  ├─ welcomeModal.js            # Welcome prompt (address/email capture)
 │  │  ├─ contactModal.js            # Contact overlay handling
 │  │  ├─ toast.js                   # Toast notifications
 │  │  ├─ pdf.js                     # Catalog download helper
 │  │  └─ courses.js                 # Course page behaviors
 │  ├─ assets/                       # Images and PDF catalog
 │  └─ node_modules/                 # Frontend deps (not stored; created by npm install)
 │
 ├─ demos/                           # Stand-alone HTML prototypes
 ├─ README.md                        # Project guide
 ├─ .gitignore                       # Repo-level ignores
 └─ (node_modules/)                  # Root-level deps if ever used (not stored; created by npm install)


```
## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

## Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # then fill values
npm run dev            # starts API on PORT
```

## PostgreSQL Setup (local)
Example for Ubuntu/Debian; adapt for your OS:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create user/db (match your `.env`):
```bash
sudo -u postgres createuser --interactive   # e.g., bakery_user (no superuser)
sudo -u postgres createdb bakery_db -O bakery_user
sudo -u postgres psql -c "ALTER USER bakery_user WITH PASSWORD 'change_me';"
```

Create tables:
```bash
sudo -u postgres psql -d bakery_db <<'SQL'
CREATE TABLE IF NOT EXISTS products (
  sku text PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  level text,
  format text,
  duration text,
  price numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  account_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  token_hash text PRIMARY KEY,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
SQL
```

Seed at least one product (example):
```bash
sudo -u postgres psql -d bakery_db -c "
INSERT INTO products (sku, title, description, category, level, format, duration, price)
VALUES ('CAKE-001','Chocolate Cake','Rich chocolate sponge','Cakes','Beginner','Regular','8-inch',25.00)
ON CONFLICT (sku) DO NOTHING;
"
```

Set connection values in `backend/.env`:
```
PGHOST=localhost
PGPORT=5432
PGDATABASE=bakery_db
PGUSER=bakery_user
PGPASSWORD=change_me
```

## Environment (.env)
Copy `backend/.env.example` to `.env` and set:
- `PORT` — API port (e.g., 4000)
- `AUTH_JWT_SECRET` — secret for JWT signing
- PostgreSQL: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- Mail: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- `RESET_URL_BASE` — base URL used in reset links (e.g., `http://localhost:5500/frontend/html/index.html`)
- `BASE_URL` — optional base URL for `smoke.js` (defaults to `http://localhost:4000`)

Keep `.env` out of version control.

## Frontend Preview
Serve statically (example):
```bash
# from repo root
python -m http.server 5500
# Then open http://localhost:5500/frontend/html/index.html
# Or just run live server with VS code 
```
Pages:
- `index.html` — landing with login/register/reset and contact overlay.
- `order.html` — product grid, filters, cart/profile modals, welcome prompt.
- `school.html`, `books.html` — themed pages for courses/books.

## API Overview
- `GET /health` — DB connectivity check.
- `GET /api/products?category=` — list products (optional filter).
- `POST /api/cart/item` — add item `{ sku, qty }` (cart is in-memory for demo).
- `PATCH /api/cart/item` — update qty or remove with `qty <= 0`.
- `DELETE /api/cart/item/:sku` — remove item.
- `POST /api/auth/send-code` — email a registration code.
- `POST /api/auth/register` — `{ email, password, fullName?, accountNumber?, verificationCode }`.
- `POST /api/auth/login` — returns `{ token, user }`.
- `POST /api/auth/request-reset` — send reset link if user exists.
- `POST /api/auth/reset-password` — set new password with reset token.

Passwords are salted/hashed with scrypt; tokens are HMAC-signed.

## Smoke Test
With API running and DB seeded:
```bash
cd backend
node smoke.js
```
This registers a temp user, logs in, resets password, and re-logs in.

## Scripts
- `npm run dev` — start backend with nodemon.
- `node smoke.js` — run backend smoke checks.


