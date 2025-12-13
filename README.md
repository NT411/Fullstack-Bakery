## Fullstack-Bakery
# TheSweetBaker Co.

A demo bakery storefront with a static multi-page frontend and an Express + PostgreSQL backend for products, carts, authentication, and email-driven flows.

## Features
- Multi-page marketing site (home, order, baking school, books) with modals for login/registration, profile, cart, contact, and a welcome prompt.
- Product catalog with filters, add-to-cart, and profile storage in localStorage for a smoother UX.
- Email-based registration codes, password resets, and welcome emails via Nodemailer.
- Express API backed by PostgreSQL for products, carts (in-memory), and auth with hashed passwords and signed tokens.
- Smoke script to exercise health, products, register/login, and password reset flows.
- Passwords are salted and hashed with scrypt; tokens are HMAC-signed JWTs using `AUTH_JWT_SECRET`.

## Repository Layout
- `frontend/` — static site assets (`html/`, `css/`, `js/`, `assets/`).
- `backend/` — Express server, routes, mailer, smoke test, and package manifest.
- `demos/` — isolated HTML prototypes.



