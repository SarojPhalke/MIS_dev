## Maintenance Information System (MIS) - PWA Frontend

This is the **Progressive Web Application (PWA)** frontend for the Maintenance Information System used in a manufacturing environment to support IATF 16949 and VDA 6.3 aligned maintenance processes.

Built with **React + Vite**, **Tailwind CSS**, **React Router**, **Context API**, and **Axios**, it talks to the MIS backend via:

- `POST /api/auth/login`
- `POST /api/auth/register` (Admin only)

All other modules currently use **mock data** only.

---

### System Overview

- **Purpose**: Provide a mobile-first, role-based maintenance portal for:
  - Operators
  - Engineers
  - Managers
  - Admins
- **Key frontend modules**:
  - Dashboard
  - Asset Register
  - Preventive Maintenance
  - Breakdown Maintenance
  - Spares Inventory
  - Utilities Monitoring
  - KPI Monitoring & Reports (MTTR, MTBF, uptime)
  - Analytics (placeholder)
  - User Management (Admin only)

---

### Role-based access (RBAC)

Role and allowed modules (enforced in navigation and route visibility):

- **Operator**: Dashboard, Breakdown, Assets
- **Engineer**: Dashboard, Breakdown, Preventive, Spares
- **Manager**: Dashboard, KPI
- **Admin**: All modules + User Management

The current user is held in `AuthContext` and contains:

```json
{
  "id": "uuid",
  "full_name": "Jane Admin",
  "email": "jane.admin@example.com",
  "role": "admin"
}
```

Navigation items are filtered in `MainLayout` based on `user.role`.

---

### Data Flow Diagram (text-based)

1. **Login**
   - User submits email/password in `Login` page.
   - `AuthContext.login` calls `POST /api/auth/login` via `Axios` client.
   - Backend returns `{ token, user }`.
   - Frontend stores:
     - `token` in `localStorage` (`mis_token`).
     - `user` in `localStorage` (`mis_user`) and `AuthContext`.
   - User is redirected to `/dashboard`.

2. **Protected navigation**
   - `ProtectedRoute` checks `AuthContext.isAuthenticated`.
   - If not authenticated, redirect to `/login`.
   - If authenticated, wraps `MainLayout` and module pages.

3. **Role-based visibility**
   - `MainLayout` reads `user.role` and filters side navigation items.
   - Module pages may additionally check `user.role` (e.g., `UserManagement`).

4. **User Management (Admin)**
   - Admin opens User Management page.
   - Submits `full_name`, `email`, `password`.
   - Frontend calls `POST /api/auth/register`.
   - On success, shows confirmation message to Admin.

5. **Other modules**
   - Use **mock data only** for now (no backend calls).

---

### EARS-style requirements (frontend behaviour)

- **When** a user is not authenticated, **the system shall** redirect them to the Login page for any protected route.
- **When** a user successfully logs in, **the system shall** display the Dashboard and show their name and role in the header.
- **When** the logged-in role is Operator, **the system shall** show only Dashboard, Breakdown, and Assets in the navigation menu.
- **When** the logged-in role is Engineer, **the system shall** show Dashboard, Breakdown, Preventive, and Spares in the navigation menu.
- **When** the logged-in role is Manager, **the system shall** show Dashboard and KPI in the navigation menu.
- **When** the logged-in role is Admin, **the system shall** show all modules including User Management.
- **When** an Admin submits the User Management form, **the system shall** call `POST /api/auth/register` and show a success message if creation succeeds.
- **When** a breakdown is logged via the Breakdown form, **the system shall** display the message `Breakdown submitted and marked for engineer review` (UI-only).

---

### BDD Scenario (UI simulation only)

**Feature**: Log Breakdown

**Scenario**: Operator logs a new breakdown

- **Given** the operator is logged in
- **And** they can access the Breakdown module
- **When** they fill the breakdown form with asset and description
- **And** they submit the form
- **Then** the UI shall display the message:  
  `Breakdown submitted and marked for engineer review`

This is implemented in `Breakdown.jsx` using local component state only (no backend call yet).

---

### How to run the project

1. **Prerequisites**
   - Node.js (LTS)
   - MIS backend running locally at `http://localhost:5000` with `/api/auth/login` and `/api/auth/register` implemented.

2. **Install dependencies**

```bash
cd Maintenance_Information_System/mis-pwa
npm install
```

3. **Run in development mode**

```bash
npm run dev
```

The app will start on `http://localhost:5173`. All API calls to `/api/...` will be proxied to `http://localhost:5000`.

4. **Build for production**

```bash
npm run build
```

5. **Preview production build**

```bash
npm run preview
```

---

### PWA behaviour

- `manifest.json` describes the app name, theme, and icons.
- `public/service-worker.js` provides simple offline caching of `/` and `index.html`.
- `src/main.jsx` registers the service worker at load time.
- On supported browsers, the app will be **installable** as a standalone MIS portal.

