# SOFA — Ultimate Restaurant Experience Platform
> *"Restoraningiz uchun yangi raqamli tajriba."*  
> The Future of Restaurant Experience — Haute Gastronomie Meets Digital Perfection.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black?style=for-the-badge&logo=socketdotio)](https://socket.io/)

---

## 🏛️ Platform Overview

**SOFA** is an extraordinarily beautiful, luxury-tier digital restaurant menu and management SaaS platform. It transforms standard paper menus into an interactive, cinematic dining experience with short vertical food videos, editorial typography, instant table QR ordering, real-time Kitchen Display System (KDS), waiter dispatch, and multi-tenant restaurant management.

### Four Interconnected Experiences
1. **SOFA Marketing Website (`/`)**: Cinematic hero with restaurant video backdrop, interactive smartphone titanium demo, 4-step workflow, dashboard preview, pricing tiers, and luxury editorial design.
2. **Customer Digital Restaurant Menu (`/r/:restaurantSlug?table=12`)**: Mobile-first luxury experience, table recognition, sticky category navigation, visual grid and compact list modes, **"Taomlarni jonli ko'ring" (Live Video Reels)**, option customizations, instant Cart Drawer, and live Order Status Tracking modal.
3. **Restaurant Management Dashboard (`/dashboard`)**: Real-time revenue & order analytics with Recharts, live order lifecycle management, dishes CRUD with photo & video preview, tables & QR code generator with printable cards, and Smart Menu Import engine.
4. **Kitchen Display System (`/kitchen`) & Waiter Console (`/waiter`)**: High-contrast tablet-optimized KDS with audio chimes and ticket progression; mobile waiter console with guest call alerts and delivery confirmation.
5. **Super Admin Platform Console (`/super-admin`)**: Platform-wide metrics, tenant accounts, subscription tiers, and audit logging.

---

## 🎨 Luxury Design System

- **Primary Background**: `#10100F` (Rich obsidian)
- **Secondary Background**: `#1B1A18`
- **Surface**: `#24221F`
- **Cream Typography**: `#F5F0E8`
- **Luxury Gold Accents**: `#C6A76A` & `#D8B98A`
- **Muted Elements**: `#A9A39A`
- **Editorial Typography**: Google Fonts *Playfair Display* (headings), *DM Sans* (interface), *Cormorant Garamond* (decorative).

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js `v20+` or `v24+`
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
# Install root and workspace packages
npm install
```

### 2. Environment Variables Configuration
Create `.env` in the root folder:
```env
DATABASE_URL="file:./server/prisma/dev.db"
JWT_SECRET="sofa_luxury_restaurant_secret_key_2026_super_secure"
PORT=5000
NODE_ENV=development
```

### 3. Database Migration & Seed
```bash
# Push schema to SQLite database (dev)
npx prisma db push --schema server/prisma/schema.prisma --accept-data-loss

# Seed with 52 realistic luxury dishes, 15 tables with QR codes, users, and orders
npx tsx server/src/seed.ts
```

### 4. Run Development Servers
```bash
# In Terminal 1: Run Backend API & Socket.io (Port 5000)
npm run server

# In Terminal 2: Run Client Vite App (Port 3000)
npm run client
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Personas & Instant Credentials

The platform includes a 1-click quick-login panel on the `/login` page:

| Role | Email | Password | Access / Route |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `admin@sofa.uz` | `admin123` | Platform Console (`/super-admin`) |
| **🍷 Restaurant Owner** | `owner@sofa.uz` | `owner123` | Management Dashboard (`/dashboard`) |
| **👨‍🍳 Head Chef** | `chef@sofa.uz` | `chef123` | Kitchen Display System (`/kitchen`) |
| **🤵 Waiter** | `waiter@sofa.uz` | `waiter123` | Waiter Console (`/waiter`) |
| **🍽️ Customer (Guest)** | *No registration needed* | *Scan QR* | Digital Menu (`/r/sofa-signature?table=4`) |

---

## 📁 Project Architecture

```
agrobozooor/
├── client/                      # React 18 + TypeScript + Vite + Tailwind Frontend
│   ├── src/
│   │   ├── components/          # Reusable Luxury Components
│   │   │   ├── Navbar.tsx               # Luxury header with i18n & cart pill
│   │   │   ├── FoodCard.tsx             # Grid & list view food cards with badges
│   │   │   ├── FoodDetailModal.tsx      # Full-bleed modal with options & video
│   │   │   ├── VideoFoodSection.tsx     # "Taomlarni jonli ko'ring" video reels
│   │   │   ├── CartDrawer.tsx           # Slide-out drawer with table validation
│   │   │   ├── LiveOrderModal.tsx       # Real-time socket order progression tracker
│   │   │   └── InteractivePhoneMockup.tsx # Titanium interactive smartphone demo
│   │   ├── context/
│   │   │   ├── AuthContext.tsx          # JWT session & user state
│   │   │   └── CartContext.tsx          # Persistent multi-item cart state
│   │   ├── lib/
│   │   │   ├── api.ts                   # REST API client
│   │   │   └── i18n.ts                  # Uzbek, Russian, English translations
│   │   ├── pages/
│   │   │   ├── MarketingLanding.tsx     # SOFA commercial website
│   │   │   ├── CustomerMenuPage.tsx     # Mobile-first digital menu
│   │   │   ├── DashboardPage.tsx        # Restaurant management dashboard
│   │   │   ├── KitchenDisplayPage.tsx   # Tablet KDS interface
│   │   │   ├── WaiterPage.tsx           # Waiter dispatch console
│   │   │   ├── SuperAdminPage.tsx       # Platform tenant administration
│   │   │   └── LoginPage.tsx            # Persona 1-click authentication
│   │   ├── types/index.ts               # Shared TypeScript interfaces
│   │   ├── App.tsx                      # Master client routing
│   │   ├── index.css                    # Luxury scrollbars & gradients
│   │   └── main.tsx
│   ├── index.html                       # Google Fonts (Playfair, DM Sans)
│   ├── tailwind.config.js               # Luxury palette & shadows
│   └── vite.config.ts
├── server/                      # Node.js + Express + Socket.io + Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma                # SQLite development schema
│   │   └── schema.postgresql.prisma     # Production PostgreSQL schema
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts                  # JWT verification & tenant isolation
│   │   ├── routes/
│   │   │   ├── auth.ts                  # Login, register, me
│   │   │   ├── restaurants.ts           # Public by-slug & branding settings
│   │   │   ├── menu.ts                  # Categories & items CRUD
│   │   │   ├── tables.ts                # Tables CRUD & QR code generation
│   │   │   ├── orders.ts                # Server-validated orders & status updates
│   │   │   ├── import.ts                # Smart menu import & preview
│   │   │   ├── analytics.ts             # Dashboard KPIs & charts
│   │   │   ├── superAdmin.ts            # Super admin platform routes
│   │   │   └── upload.ts                # Photo & video uploads
│   │   ├── services/
│   │   │   ├── socket.ts                # Real-time Socket.io rooms & alerts
│   │   │   └── menuImportService.ts     # Schema.org, HTML, CSV parser & SSRF shield
│   │   ├── app.ts                       # Express application setup
│   │   ├── config.ts                    # Server configuration
│   │   ├── db.ts                        # Prisma Client instance
│   │   ├── index.ts                     # HTTP + Socket.io server entry
│   │   └── seed.ts                      # 52 luxury demo dishes & tables
│   └── test/
│       └── sofa.test.ts                 # Vitest automated test suite
├── package.json
└── README.md
```

---

## 🛡️ Security, Multi-Tenancy & Integrity

1. **Server-Side Price Recalculation**: The backend recalculates item and option prices directly from the database and never trusts client totals.
2. **SSRF Protection in Menu Importer**: Rejects requests targeting private ranges (`127.0.0.1`, `localhost`, `10.x.x.x`, `192.168.x.x`, `169.254.169.254`, and cloud metadata IPs).
3. **Strict Tenant Isolation**: `requireTenantAccess` middleware ensures restaurant managers and staff only read and modify their own restaurant's data.
4. **Idempotency & Status Progression**: Order status transitions follow strict valid order states (`Yangi` ➔ `Qabul qilindi` ➔ `Tayyorlanmoqda` ➔ `Tayyor` ➔ `Yetkazildi` / `Bekor qilindi`).
5. **Real-Time WebSockets**: Dispatches order events only to authenticated rooms (`restaurant_${id}`, `kitchen_${id}`, `waiter_${id}`, `order_${id}`).

---

## 🧪 Automated Test Results

Run all tests via Vitest:
```bash
npm run test
```

```text
 ✓ server/test/sofa.test.ts (8 tests)
   ✓ 1. Authentication & Security > should securely hash passwords using bcrypt
   ✓ 1. Authentication & Security > should reject incorrect password
   ✓ 2. Multi-Tenant Restaurant Isolation > should enforce distinct restaurant IDs across categories and dishes
   ✓ 3. Server-Side Price Verification & Order Submission > recalculates prices on the server and does not trust client prices
   ✓ 3. Server-Side Price Verification & Order Submission > advances order statuses smoothly through kitchen lifecycle
   ✓ 4. Smart Menu Parser & Security (SSRF Protection) > blocks dangerous internal IPs to prevent SSRF
   ✓ 4. Smart Menu Parser & Security (SSRF Protection) > parses CSV menu data accurately with confidence scores
   ✓ 4. Smart Menu Parser & Security (SSRF Protection) > parses JSON menu data correctly

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

---

## 🚢 Deployment Instructions

### Production Deployment on Render / Node.js Host
1. Set the database provider in `server/prisma/schema.prisma` to `postgresql` (or use `schema.postgresql.prisma`).
2. Set environment variables on Render:
   - `DATABASE_URL`: `postgres://...`
   - `JWT_SECRET`: A cryptographically random 64-character secret.
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
3. Build command:
   ```bash
   npm run build
   ```
4. Start command:
   ```bash
   node server/dist/index.js
   ```

### Frontend Deployment on Vercel
1. Set Root Directory to `client` or configure `vercel.json` proxy to route `/api/*` to your production backend.
2. Build command: `npm run build`
3. Output directory: `dist`

---

## 🏆 Summary

SOFA is ready for real restaurant demonstrations. It offers an unrivaled visual experience with full real-time order execution, kitchen synchronization, QR printing, and automated menu importing.
