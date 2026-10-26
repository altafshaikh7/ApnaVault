# ApnaVault

> **Your Family. Every Important Document. One Safe Place.**

ApnaVault is a secure family document management platform designed for Indian households to safely store, organize, track, and share essential family records, identity cards, financial papers, property documents, and medical files.

---

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Backend**: Node.js, Express 4, TypeScript
- **Database**: MongoDB with Mongoose
- **API**: RESTful API versioned under `/api/v1`
- **Security Foundations**: Helmet, CORS, centralized operational error handling, environment validation with Zod
- **Architecture**: Monorepo with npm workspaces (`client`, `server`)

---

## Project Structure

```
apnavault/
├── client/                     # Frontend React + Vite application
│   ├── src/
│   │   ├── App.tsx             # Root component & health check display
│   │   ├── App.css             # Foundation styles
│   │   ├── main.tsx            # Application entry point
│   │   └── index.css           # Global typography & CSS variables
│   ├── index.html              # HTML shell
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                     # Backend Node.js + Express application
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts     # MongoDB connection management & state
│   │   │   └── env.ts          # Zod-validated environment config
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts # Centralized error handler
│   │   │   └── notFound.ts     # 404 handler
│   │   ├── routes/
│   │   │   ├── health.ts       # Health endpoint (/api/v1/health)
│   │   │   └── index.ts        # Versioned route router
│   │   ├── utils/
│   │   │   └── AppError.ts     # Operational error class
│   │   ├── app.ts              # Express application setup
│   │   └── index.ts            # Server entry point & graceful shutdown
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .env.example                # Root environment template
├── .gitignore
├── package.json                # Root workspace configuration
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later (tested on `v24.x`)
- **npm**: `v10.x` or later (tested on `v11.x`)
- **MongoDB**: MongoDB Atlas or a local replica set. Document deletion finalization uses MongoDB transactions; standalone MongoDB instances cannot complete deletion cleanup.
- **Supabase Storage**: A Supabase project with a private document bucket for upload/download/delete operations

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   cd apna-vault
   ```

2. Install all dependencies across both client and server:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy root/server `.env.example` to `server/.env`:
     ```bash
     cp server/.env.example server/.env
     ```
   - (Optional) Configure client `.env` if using a custom backend port:
     ```bash
     cp client/.env.example client/.env
     ```

### Environment Variables

| Variable | Scope | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | Server | `5000` | Port for the Express backend server |
| `CLIENT_URL` | Server | `http://localhost:5173` | Allowed origin for CORS |
| `MONGODB_URI` | Server | `mongodb://127.0.0.1:27017/apnavault` | MongoDB connection string |
| `SUPABASE_URL` | Server | — | Supabase project URL shown in the project Connect dialog |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | — | Server-only Supabase API key (`sb_secret_...` recommended) or legacy `service_role` JWT. Never configure it in the client. |
| `SUPABASE_STORAGE_AUTHORIZATION_JWT` | Server | — | Existing legacy `service_role` JWT for the Storage `Authorization` header when using `sb_secret_...`; not the JWT signing secret. Never generate it manually or configure it in the client. |
| `SUPABASE_BUCKET_NAME` | Server | `apnavault-documents` | Existing private Supabase Storage bucket |
| `APP_STORAGE_QUOTA_BYTES` | Server | `996147200` | Per-user document storage quota (950 MiB) |
| `VITE_API_URL` | Client | `http://localhost:5000/api/v1` | Base URL for API calls from client |

`APP_STORAGE_QUOTA_BYTES` is the maximum quota per user, not a global storage cap. Upload reservation enforces it for both new and existing accounts without rewriting persisted `storageQuotaBytes`; existing accounts with a lower stored quota retain that lower limit.

Create the configured Supabase Storage bucket as **private** before enabling document operations. The server rejects a missing or public bucket, and document operations remain unavailable until the server-side Supabase settings are configured.

Supabase `sb_secret_...` keys are API keys, not JWTs. The installed `@supabase/supabase-js@2.118.0` sends its configured key as `apikey` and otherwise falls back to that same value in `Authorization`. Storage requires a verifiable service-role JWT in `Authorization`; sending an `sb_secret_...` value there causes signature verification errors. When using a secret API key, configure the project's existing legacy `service_role` JWT as `SUPABASE_STORAGE_AUTHORIZATION_JWT`. The client sends the secret key as `apikey` and the JWT as `Authorization`. Retrieve that JWT from **Settings → API Keys**; it is not the JWT signing secret and must not be generated manually. A legacy `service_role` JWT can still be used alone as `SUPABASE_SERVICE_ROLE_KEY`. Do not use a publishable key or make the bucket public.

---

## Available Scripts

From the repository root:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Run both server and client concurrently in development mode |
| `npm run dev:server` | Run only the Express backend with hot-reload (`tsx watch`) |
| `npm run dev:client` | Run only the Vite development server (`localhost:5173`) |
| `npm run build` | Build both frontend and backend for production |
| `npm run build:server` | Compile backend TypeScript to `server/dist/` |
| `npm run build:client` | Compile frontend TypeScript and Vite bundle to `client/dist/` |
| `npm run type-check` | Run TypeScript type checks across all workspaces |
| `npm run type-check:server` | Run TypeScript type check on `server` (`tsc --noEmit`) |
| `npm run type-check:client` | Run TypeScript type check on `client` (`tsc -b`) |

---

### Supabase Storage Smoke Test

After configuring `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` with an `sb_secret_...` key (plus `SUPABASE_STORAGE_AUTHORIZATION_JWT` with the existing legacy `service_role` JWT) or a legacy `service_role` JWT alone, and a private `SUPABASE_BUCKET_NAME`, run `npm run test:integration:supabase`. It checks that the configured bucket is private, validates and uploads a temporary PDF, creates and fetches a short-lived signed URL, then removes the object. The command never prints credentials, signed URLs, or file contents. Without server storage credentials it reports **PENDING** and exits with status 2; mocked unit tests are not a substitute for this live check.

## Health Check Verification

When the backend server is running, the health endpoint can be queried directly:

```bash
curl http://localhost:5000/api/v1/health
```

Example response:
```json
{
  "success": true,
  "data": {
    "name": "ApnaVault API",
    "version": "1.0.0",
    "status": "healthy",
    "uptime": 12.34,
    "timestamp": "2026-10-25T14:35:00.000Z",
    "database": {
      "state": "connected",
      "readyState": 1,
      "host": "127.0.0.1",
      "name": "apnavault"
    }
  }
}
```
*(If MongoDB is not running locally, `database.state` will accurately report `disconnected` without crashing the service).*
