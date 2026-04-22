# p3dx-auth-ui

React + Vite frontend for the P3DX platform.

Provides login, registration, role management, workload submission, and result viewing. In production it is built as a static SPA and served by nginx at `https://auth.p3dx.iudx.org.in` alongside the p3dx-aaa backend.

---

## What this repo does

- Login and registration forms (credentials submitted to p3dx-aaa via `/p3dx/login` and `/p3dx/register`)
- Role-based dashboard — different views for regular users, data providers, and admins
- Services landing page with role-aware service cards and SSO handoff to external services (Spider anonymisation)
- Set Policy form — data providers submit dataset access policies
- Run Workload form — users select a dataset and application, triggering TEE workload execution via TOP
- Workload Result page — displays TEE status, signed contract, and one-click copy to clipboard
- Admin panel — approve or deny role requests with distinct action buttons

---

## Repository Structure

```
p3dx-auth-ui/
├── src/
│   ├── pages/
│   │   ├── Login.jsx            # Login form
│   │   ├── Register.jsx         # Registration form
│   │   ├── AppShell.jsx         # Authenticated layout wrapper
│   │   ├── ServicesLanding.jsx  # Service tiles (Spider SSO handoff, FL, SMPC, DP)
│   │   ├── AnonService.jsx      # Anonymisation service page
│   │   ├── UserDashboard.jsx    # FL / SMPC / DP placeholder dashboards
│   │   ├── PolicyForm.jsx       # Set Policy — data-provider role required
│   │   ├── WorkloadForm.jsx     # Run Workload — select dataset + application
│   │   ├── WorkloadResult.jsx   # Workload result — TEE status + signed contract
│   │   └── AdminDashboard.jsx   # Admin — role request approval
│   ├── components/
│   │   └── ProtectedRoute.jsx   # Redirects unauthenticated users to /login
│   ├── api/                     # fetch wrappers for each backend endpoint
│   ├── data/
│   │   └── catalogueData.js     # Dataset and application catalogue (ids + metadata)
│   ├── router.jsx               # React Router route definitions
│   └── config.js                # VITE_BACKEND_URL and VITE_APP_URL
├── .env.production              # Production env (VITE_BACKEND_URL, VITE_APP_URL)
├── vite.config.js               # Dev server on port 5174
└── package.json
```

---

## Routes

| Path | Auth | Component |
|---|---|---|
| `/` | No | Login |
| `/login` | No | Login |
| `/register` | No | Register |
| `/app/services` | Yes | Services landing |
| `/app/services/anon` | Yes | Anonymisation service |
| `/app/services/fl` | Yes | Federated Learning dashboard |
| `/app/services/smpc` | Yes | SMPC dashboard |
| `/app/services/dp` | Yes | Differential Privacy dashboard |
| `/app/services/policies` | Yes + `data-provider` | Set Policy form |
| `/app/services/run` | Yes + `user` | Run Workload form |
| `/app/services/run/:contractId` | Yes + `user` | Workload result |
| `/app/admin` | Yes + `admin` | Admin dashboard |

---

## Local Development

### Prerequisites

- Node.js v18+
- p3dx-aaa backend running on port 3001

### Install and run

```bash
npm install
npm run dev
```

Dev server starts at `http://localhost:5174`.

To point at a different backend:

```bash
VITE_BACKEND_URL=http://localhost:3001 npm run dev
```

### Notes

- Role requests go to `/p3dx/role-requests` on the backend.
- Policy submission uses `POST /p3dx/policy` — the backend proxies this to APD. Ensure `APD_BASE_URL` is set in the backend `.env` and APD is running.
- The Run Workload form uses dataset and application IDs from `src/data/catalogueData.js`. These IDs must match what is stored in APD policies and in the backend's `compose-urls.json`.
- Page transitions (fade + slide-up) are applied on every route change via a keyed wrapper in `AppShell.jsx`.

---

## Production Build & Deployment

### Environment

Create `.env.production` (already present in the repo):

```env
VITE_BACKEND_URL=https://auth.p3dx.iudx.org.in
VITE_APP_URL=https://auth.p3dx.iudx.org.in
```

### Build

```bash
npm run build
```

Output goes to `dist/`. nginx serves this directory as a static SPA at `auth.p3dx.iudx.org.in`.

### nginx routing

nginx serves `dist/` for all non-API paths and proxies `/anon/*` and `/p3dx/*` to the p3dx-aaa backend:

```nginx
location /assets/ { root /path/to/p3dx-auth-ui/dist; }
location /anon/   { proxy_pass http://127.0.0.1:3001; }
location /p3dx/   { proxy_pass http://127.0.0.1:3001; }
location /        { root /path/to/p3dx-auth-ui/dist; try_files $uri $uri/ /index.html; }
```

See p3dx-aaa `Setup.md §9.6–9.7` for the full nginx config and directory permission requirements.

---

## Spider SSO Handoff

When a user opens the Anonymisation service tile, the UI redirects to Spider and passes the Keycloak tokens via URL hash:

```
https://spider.p3dx.iudx.org.in/#access_token=...&refresh_token=...&expires_in=...
```

Tokens are read from `localStorage`. After Spider logout, the user is redirected back to `https://auth.p3dx.iudx.org.in/p3dx/login`.

---

## More Information

See p3dx-aaa `Setup.md` for the full platform architecture, backend setup, and end-to-end workload flow.
