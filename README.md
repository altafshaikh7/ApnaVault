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
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas cluster URI

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
| `VITE_API_URL` | Client | `http://localhost:5000/api/v1` | Base URL for API calls from client |

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
