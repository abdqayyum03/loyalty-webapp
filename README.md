# CartRedeem — Loyalty & Voucher Redemption System

A full‑stack **MERN** (MongoDB, Express, React, Node.js) application where users earn
loyalty **points** and redeem them for **vouchers**. Members browse a voucher catalogue,
add items to a cart, redeem with points, and receive a **PDF receipt** by email.
A separate **admin / superadmin dashboard** manages categories, vouchers, users, and orders.

---

## 📋 Requirements to copy / run this project

### Prerequisites

| Tool | Version (recommended) | Notes |
|------|----------------------|-------|
| **Node.js** | 18 LTS or newer | includes `npm` |
| **MongoDB** | Atlas cluster *or* local MongoDB | connection string goes in `.env` |
| **Git** | any recent version | to clone the repo |
| A **Gmail account** with an **App Password** | — | for OTP & receipt emails (optional but used by signup) |
| **Google OAuth 2.0 credentials** | — | for "Login with Google" (optional) |

This repo has **no root `package.json`** — the backend and frontend are installed and run
**separately** (two terminals).

### 1. Clone

```bash
git clone <your-repo-url>
cd CapstoneProjectMERN
```

### 2. Configure environment variables

The backend needs a `.env` file. A template is provided:

```bash
# from the project root
cp backend/.env.example backend/.env
```

Then edit `backend/.env` and fill in **your own** values (Mongo URI, JWT secret,
email credentials, Google OAuth keys). See the table inside `.env.example` for each field.

> ⚠️ **Never commit `backend/.env`** — it is git‑ignored. Use your own secrets.

### 3. Install & run the backend

```bash
cd backend
npm install
npm run dev        # nodemon (auto-restart)   — or:  npm start
```
Backend runs at **http://localhost:5000** (test it at `GET /api/test`).

### 4. Install & run the frontend

```bash
cd frontend
npm install
npm start
```
Frontend runs at **http://localhost:3000**.

### 5. Seed sample data (optional but recommended)

From the `backend` folder:

```bash
npm run seed          # creates sample categories, vouchers & test users
npm run superadmin -- <email> <password> [username]   # create the first admin
```

`npm run seed` prints test user credentials (all use password `password123`, e.g.
`testuser@carter.com` with 500 points).

### Backend npm scripts

| Script | Action |
|--------|--------|
| `npm start` | run the server (`node server.js`) |
| `npm run dev` | run with **nodemon** (auto‑reload on changes) |
| `npm run seed` | seed categories, vouchers and test users |
| `npm run superadmin` | create / promote a superadmin account |
| `npm run backfill-orders` | backfill `order_number` on legacy orders |

---

## 🗃️ Entities & attributes (data models)

The database (`loyaltysystem`) uses **Mongoose** models in `backend/models/`.

### User — `models/User.js`
| Field | Type | Notes |
|-------|------|-------|
| `googleId` | String | unique, sparse — set for Google‑linked accounts |
| `username` | String | required, unique |
| `email` | String | required, unique |
| `password` | String | bcrypt‑hashed via `pre('save')` hook |
| `phone` | String | default `''` |
| `avatar` | String | base64 data URL |
| `is_active` | Boolean | default `true` (admin can deactivate) |
| `points` | Number | loyalty point balance, default `0` |
| `role` | String | enum: `user` \| `admin` \| `superadmin` |
| `createdAt` | Date | default now |

### Category — `models/Category.js`
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | required, unique |
| `description` | String | default `''` |
| `image` | String | optional image URL |
| `icon` | String | optional icon |
| `is_active` | Boolean | default `true` |
| `timestamps` | — | `createdAt`, `updatedAt` |

### Voucher — `models/Voucher.js`
| Field | Type | Notes |
|-------|------|-------|
| `category_id` | ObjectId → Category | required (ref) |
| `title` | String | required, trimmed |
| `description` | String | required |
| `points` | Number | points required to redeem |
| `image` | String | optional, default `null` |
| `quantity_available` | Number | default `100` |
| `valid_until` | Date | optional expiry, default `null` (never expires when unset) |
| `terms` | [String] | redemption terms; sensible defaults provided |
| `is_active` | Boolean | default `true` |
| `is_valid` | Virtual (Boolean) | computed on read — `true` while active **and** not past `valid_until`; included in JSON output |
| `timestamps` | — | `createdAt`, `updatedAt` |

### CartItem — `models/CartItem.js`
| Field | Type | Notes |
|-------|------|-------|
| `user_id` | ObjectId → User | required |
| `voucher_id` | ObjectId → Voucher | required |
| `quantity` | Number | min `1`, default `1` |
| `points_required` | Number | required |
| `timestamps` | — | `createdAt`, `updatedAt` |

### CartItemHistory (Order) — `models/CartItemHistory.js`
Represents a completed redemption / order.
| Field | Type | Notes |
|-------|------|-------|
| `order_number` | String | indexed, e.g. `ORD-XXXXXXXX` (derived from `_id`) |
| `user_id` | ObjectId → User | required |
| `voucher_id` | ObjectId → Voucher | required |
| `voucher_title` | String | snapshot of the voucher title |
| `quantity` | Number | required |
| `points_deducted` | Number | required |
| `order_date` | Date | default now |
| `pdf_generated` | Boolean | default `false` |
| `timestamps` | — | `createdAt`, `updatedAt` |

### OTP — `models/OTP.js`
Holds a pending signup until the emailed code is verified (auto‑expires after 10 min).
| Field | Type | Notes |
|-------|------|-------|
| `email` | String | required, lowercase |
| `otp` | String | the one‑time code |
| `username` | String | required |
| `password` | String | pending account password |
| `googleId` | String | set for a first‑time Google sign‑in |
| `expiresAt` | Date | TTL index — document auto‑deletes after expiry |

### PasswordResetOTP — `models/PasswordResetOTP.js`
One‑time code for the **forgot‑password** flow. Kept separate from the signup `OTP`
model so the two flows never collide. The account already exists, so no
username/password is stashed here — the user supplies the new password at verify time.
| Field | Type | Notes |
|-------|------|-------|
| `email` | String | required, lowercase |
| `otp` | String | the one‑time reset code |
| `expiresAt` | Date | TTL index — auto‑deletes after 10 min |

**Relationships:** `Voucher` belongs to a `Category`; `CartItem` and `CartItemHistory`
each reference a `User` and a `Voucher`.

---

## ✨ Features available

### Authentication & accounts
- Email/username + password **login** with JWT auth.
- **Sign up with email OTP verification** — account is only created after the emailed code is confirmed.
- **Login with Google (OAuth 2.0)**, including first‑time OTP verification for new Google accounts.
- **Profile management** — view & edit username, email, phone, avatar, and password.
- Passwords stored as **bcrypt** hashes; sessions kept via JWT in `localStorage`.
- **Automatic sign‑out after 30 minutes of inactivity**, with a notice shown on the login screen.

### Points & vouchers (user)
- Browse vouchers on the **Home** and **Products** pages, filtered by category.
- **Voucher detail** page with full description and points cost.
- **Points** page showing the live balance and redemption history.
- **Cart**: add vouchers, update quantity, remove items.
- **Redeem now** (single voucher) or **checkout** the whole cart — points are deducted.
- A **PDF receipt** is generated for each order and can be downloaded.
- **Redemption history** of past orders.
- **Dark / light mode** toggle (persisted, no flash on load).
- **Skeleton loading placeholders** on the vouchers grid, home teaser, and cart — content fades in with no layout shift.
- **Toast notifications** confirm actions (added to cart, removed, profile saved) and surface errors, with reduced‑motion support.

### Admin / Superadmin dashboard
- Separate admin login at the **`#admin`** route.
- **Dashboard statistics** overview.
- **Manage categories** — create, edit, delete.
- **Manage vouchers** — create, edit, delete.
- **Manage users** — list, activate / deactivate, change role (superadmin).
- **View all orders** and **download order PDFs**.

### REST API (Express, base `http://localhost:5000/api`)
| Group | Example endpoints |
|-------|-------------------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `POST /auth/send-otp`, `POST /auth/verify-otp`, `GET /auth/google` |
| Categories | `GET /categories`, `POST /categories` *(admin)* |
| Vouchers | `GET /vouchers`, `GET /vouchers/:id`, `GET /vouchers/category/:id`, `POST/PUT/DELETE /vouchers/:id` *(admin)* |
| Cart | `GET /cart`, `POST /cart`, `PUT /cart/:id`, `DELETE /cart/:id` |
| Orders | `POST /orders/checkout`, `POST /orders/redeem`, `GET /orders/history`, `GET /orders/:id`, `GET /orders/:id/pdf` |
| Admin | `POST /admin/login`, `GET /admin/statistics`, `GET /admin/users`, `GET /admin/orders`, user activate/deactivate/role |

---

## 🖥️ Demonstration pages

Start both servers, then open:

| Page | URL | Description |
|------|-----|-------------|
| **User app** | http://localhost:3000 | Login / Sign up, then Home, Products, Cart, Points, Profile |
| **Admin dashboard** | http://localhost:3000/#admin | Admin/Superadmin login & management console |
| **API health check** | http://localhost:5000/api/test | Returns `{ "message": "Server is running" }` |

### Demo logins (after running `npm run seed`)
- **User:** `testuser@carter.com` / `password123` (500 points)
- **User:** `john@carter.com` / `password123` (1000 points)
- **Admin:** create one with `npm run superadmin -- <email> <password>`, then sign in at `/#admin`

> The frontend uses state‑based navigation (no React Router); the admin area is reached via
> the `#admin` URL hash.

---

## 🧱 Tech stack

**Backend:** Node.js, Express 5, MongoDB + Mongoose, JWT (`jsonwebtoken`), `bcryptjs`,
Passport + `passport-google-oauth20`, Nodemailer, PDFKit, dotenv, CORS.

**Frontend:** React 19 (Create React App), Axios.

## 📁 Project structure

```
CapstoneProjectMERN/
├─ backend/
│  ├─ config/        # database, passport (Google OAuth), email
│  ├─ controllers/   # auth, admin, cart, category, order, voucher
│  ├─ middleware/    # JWT auth (protect) + adminAuth
│  ├─ models/        # User, Category, Voucher, CartItem, CartItemHistory, OTP
│  ├─ routes/        # /auth /admin /categories /vouchers /cart /orders
│  ├─ seeds/         # seedData, seedSuperAdmin, backfillOrderNumbers
│  ├─ utils/         # email, OTP, PDF generation
│  ├─ server.js      # Express entry point
│  └─ .env.example   # copy to .env and fill in
└─ frontend/
   ├─ public/
   │  ├─ index.html              # HTML shell (title "CartRedeem App", pre-paint theme script)
   │  ├─ manifest.json
   │  ├─ robots.txt
   │  ├─ CRI_transparent.png     # logos
   │  ├─ CRI_white.png
   │  ├─ hero-banner.png         # home hero images
   │  └─ hero-banner2.png
   ├─ src/
   │  ├─ index.js                # React entry point (wraps App in ToastProvider)
   │  ├─ index.css               # global styles + theme variables
   │  ├─ App.js                  # navigation shell (state-based; #admin → AdminApp)
   │  ├─ App.css                 # app-wide styles + design tokens
   │  ├─ enhancements.css        # animations, skeletons, toasts, reduced-motion
   │  ├─ logo.svg
   │  ├─ reportWebVitals.js
   │  ├─ api/                    # Axios wrappers around the backend REST API
   │  │  ├─ auth.js              #   login, register, OTP, Google, getMe/updateMe
   │  │  ├─ cart.js              #   cart CRUD + count
   │  │  ├─ voucher.js           #   vouchers & categories
   │  │  └─ admin.js             #   admin login, stats, users, orders
   │  ├─ hooks/
   │  │  ├─ useDarkMode.js       # dark/light theme (persisted)
   │  │  ├─ useRedeem.js         # shared redeem logic
   │  │  └─ useIdleLogout.js     # auto sign-out after 30 min inactivity
   │  ├─ components/
   │  │  ├─ TopNavBar.jsx        # top navigation + cart badge + theme toggle
   │  │  ├─ Footer.jsx
   │  │  ├─ MainSection.jsx
   │  │  ├─ Skeleton.jsx         # shimmer loading placeholders
   │  │  ├─ ToastProvider.jsx    # toast/snackbar notification system + useToast hook
   │  │  ├─ VouchersSection.jsx  # grid of voucher cards
   │  │  ├─ VoucherCard.jsx      # single voucher card
   │  │  ├─ RedeemModal.jsx      # redeem confirmation dialog
   │  │  ├─ RedeemGuide.jsx      # "how to redeem" helper
   │  │  ├─ RedemptionHistory.jsx
   │  │  ├─ contactus.jsx
   │  │  └─ termncondition.jsx
   │  └─ pages/
   │     ├─ Login.jsx
   │     ├─ SignUp.jsx           # email + OTP signup
   │     ├─ GoogleVerify.jsx     # first-time Google OTP step
   │     ├─ Home.jsx
   │     ├─ Products.jsx
   │     ├─ ProductDetail.jsx
   │     ├─ Cart.jsx
   │     ├─ Points.jsx           # points balance + history
   │     ├─ Profile.jsx
   │     ├─ EditProfile.jsx
   │     └─ admin/               # standalone admin dashboard (reached via #admin)
   │        ├─ AdminApp.jsx          # admin shell / router
   │        ├─ AdminLogin.jsx
   │        ├─ AdminDashboard.jsx    # statistics overview
   │        ├─ AdminCategories.jsx
   │        ├─ AdminCategoryForm.jsx
   │        ├─ AdminVouchers.jsx
   │        ├─ AdminVoucherForm.jsx
   │        └─ AdminOrder.jsx        # orders + PDF downloads
   └─ package.json               # React 19 + react-scripts (CRA), Axios
```

> **Note:** the frontend uses **no React Router** — `App.js` switches pages via React state,
> and the admin area is reached through the `#admin` URL hash. The layering is
> `api/` (server calls) → `hooks/` + `pages/`/`components/` (UI).
