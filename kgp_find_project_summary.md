# KGP Find - Project Overview

**KGP Find** is an exclusive, highly secure, and intelligent lost-and-found platform built specifically for the IIT Kharagpur campus. 

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React.js powered by Vite for blazing-fast performance.
- **Styling:** Custom Vanilla CSS combined with Tailwind CSS for utility classes. Features a bespoke design system supporting dynamic Light and Dark modes, glassmorphism, and premium hover transitions.
- **Routing:** React Router DOM for seamless Single Page Application (SPA) navigation.
- **Icons:** Lucide React for modern, crisp iconography.

### Backend
- **Runtime & Framework:** Node.js with Express.js (deployed as Vercel Serverless Functions).
- **Database:** PostgreSQL (hosted on Supabase) utilizing connection pooling (`aws-1-ap-northeast-1.pooler.supabase.com`) for high concurrency.
- **ORM:** Prisma ORM for type-safe database queries and seamless schema migrations.

### Infrastructure & Services
- **Authentication:** Firebase Authentication (Google OAuth), deeply integrated with the backend.
- **Image Hosting:** Local storage architecture optimized for serverless environments.
- **Deployment:** Vercel (Monorepo setup hosting both the `client` and `server` directories).

---

## ✨ Core Features

### 1. Exclusive Campus Authentication
- **KGPians Only:** The platform strictly enforces Google OAuth login using `@iitkgp.ac.in` or `@kgpian.iitkgp.ac.in` domains.
- **Instant Verification:** Users are automatically verified upon login, establishing a 100% trusted community with zero external spam.

### 2. Intelligent Auto-Matching Algorithm
- **Proactive Discovery:** When a user posts a "Lost" item, the backend automatically scans all active "Found" items (and vice-versa).
- **Smart Scoring:** It calculates a confidence score based on category matches, date proximity, and keyword overlap in titles and descriptions.
- **Instant Alerts:** Users receive immediate in-app notifications if a high-probability match is found.

### 3. Secure Claim Workflow & Privacy Shield
- **Proof-based Claiming:** Users cannot simply reveal who has an item. They must submit a "Claim" containing identifying proof (e.g., serial numbers, specific scratches, contents of a wallet).
- **Privacy Lock:** The poster's WhatsApp number is strictly hidden from the public feed.
- **Controlled Unlocking:** Only when the poster explicitly clicks **"Accept Claim"** is their WhatsApp number revealed to the claimant, ensuring complete privacy.

### 4. Smart Feed & Advanced Filtering
- **Dynamic Search:** Users can search across titles, descriptions, and locations.
- **Synonym Recognition:** Custom location utility recognizes campus synonyms (e.g., searching "Nalanda" will match items tagged at "NRSC").
- **Categorization:** Easy filtering by status (Lost/Found) and specific categories (Electronics, IDs, Keys, etc.).

### 5. Premium UI/UX
- **Interactive Dashboard:** A stunning Hero Banner showcasing live community statistics (Items Returned, Active Posts).
- **Mobile-First:** Fully responsive design that feels like a native mobile app on phones.
- **Theming:** Seamless Light and Dark modes with vibrant gradients, soft drop-shadows, and smooth micro-animations.

### 6. Administration & Moderation
- **Report System:** Users can instantly flag inappropriate posts directly from the feed.
- **Admin Dashboard:** Special admin accounts have access to a secure dashboard to monitor system health, oversee reported items, and enforce community guidelines by forcefully deleting spam or inappropriate content.
- **Content Moderation:** Posters can mark images as "Sensitive" (e.g., ID cards), which blurs them for the public but keeps them visible to admins and the original owner.

---

## 🔒 Security Summary
1. **No Anonymous Trolls:** Firebase JWT tokens are verified on every single backend API request.
2. **Data Protection:** Users are tracked by their secure IDs; WhatsApp numbers are never leaked in the API responses for unapproved users.
3. **Database Integrity:** Prisma protects against SQL injection, and schema constraints ensure valid data relationships (e.g., an item is automatically unlinked or deleted if the user is deleted).
