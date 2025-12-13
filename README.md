## Fullstack-Bakery
# In development 

A full-stack, web-based bakery application built with Node.js, PostgreSQL, and Vanilla JavaScript.

---

## Overview

**Fullstack Bakery** is a complete e-commerce platform designed for a bakery business.  
It provides secure authentication, order and account management, payment handling, and backend-controlled product pricing to prevent manipulation.

---

## ✨ Features

### Authentication & Security
- User registration and login
- Email verification with one-time code during registration
- Password reset with email code verification
- Unique account number generated for each user

### User Account Management
- Update personal information (name, email, password)
- Address collection during registration for order fulfillment
- Order history and order tracking
- Order statuses:
  - Ongoing
  - Completed
  - Canceled
- Order cancellation by users

### Orders & Products
- Three separate product sections with filtering:
  - Bakery Orders
  - Baking School
  - Baking Books
- Backend-rendered products and prices
- Price protection (frontend price manipulation is ignored)
- Unique discount code for newly registered users
- Shipping options:
  - Free personal pickup
  - Standard shipping $
  - Express shipping $$

### Payments & Billing
- Payment methods:
  - Cash
  - Card (card modal)
- Email subscription for:
  - Automatic billing
  - Notifications, personal offers and updates

### Additional Features
- Frequently Asked Questions (FAQ) section

---

## Backend Price Protection

All products and prices are rendered directly from the backend.  
Any attempt to modify prices on the frontend will be ignored, and the backend will always enforce the original product pricing.

---

## Tech Stack

### Backend
- Node.js
- PostgreSQL

### Frontend
- Vanilla JavaScript
- HTML
- CSS



