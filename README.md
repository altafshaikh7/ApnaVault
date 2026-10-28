# ApnaVault

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=36&duration=3000&pause=1000&color=6366F1&center=true&vCenter=true&width=650&lines=ApnaVault;Your+Family.+Your+Documents.;One+Safe+Place." alt="ApnaVault — Your Family. Every Important Document. One Safe Place." />

### Your Family. Every Important Document. One Safe Place.

A secure family document management platform built to help Indian households organize, access, track, and share their important records.

<br/>

<a href="https://apna-vault-pprl.vercel.app">
  <img src="https://img.shields.io/badge/Live%20Application-Visit%20ApnaVault-6366F1?style=for-the-badge&logo=vercel&logoColor=white" alt="Visit ApnaVault"/>
</a>
<a href="https://apnavault.onrender.com/api/v1/health">
  <img src="https://img.shields.io/badge/API-Health%20Check-16A34A?style=for-the-badge&logo=render&logoColor=white" alt="API Health Check"/>
</a>

<br/><br/>

<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
<img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/>
<img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"/>
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>

<br/>

[Features](#-features) · [Technology Stack](#-technology-stack) · [Architecture](#-system-architecture) · [Getting Started](#-getting-started) · [Deployment](#-deployment)

</div>

---

## About ApnaVault

ApnaVault is a family document management platform designed to bring essential household records into one organized digital space.

From identity cards and financial records to property papers and medical documents, ApnaVault aims to simplify the way families manage their important information.

**Our vision:** Make family document management simpler, more organized, and secure by design.

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🔐 Authentication & Security

- User registration and login
- Session-based authentication
- Protected application routes
- CSRF protection
- Secure cookie configuration
- Server-side request validation

</td>
<td width="50%" valign="top">

### 📁 Document Management

- Document upload and download
- Document metadata management
- Folder-based organization
- Document deletion
- Per-user storage quota enforcement
- Private cloud storage integration

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 👨‍👩‍👧‍👦 Family Collaboration

- Family invitation workflows
- Invitation status management
- Shared-resource access workflows
- Permission-aware backend operations

</td>
<td width="50%" valign="top">

### 🔔 Reminders & Dashboard

- Document-related reminders
- Notification workflows
- Dashboard and account management
- Profile and settings functionality

</td>
</tr>
</table>

> Feature availability depends on the implemented workflow and its configuration. Authentication, storage, invitations, reminders, and notifications should be verified end-to-end before being considered production-ready.

## 🧰 Technology Stack

<div align="center">

### Frontend

<a href="https://react.dev/"><img src="https://skillicons.dev/icons?i=react" width="55" alt="React"/></a>
<a href="https://vite.dev/"><img src="https://skillicons.dev/icons?i=vite" width="55" alt="Vite"/></a>
<a href="https://www.typescriptlang.org/"><img src="https://skillicons.dev/icons?i=ts" width="55" alt="TypeScript"/></a>
<a href="https://developer.mozilla.org/en-US/docs/Web/CSS"><img src="https://skillicons.dev/icons?i=css" width="55" alt="CSS"/></a>

<br/>
React 19 · Vite · TypeScript · React Router · CSS

### Backend

<a href="https://nodejs.org/"><img src="https://skillicons.dev/icons?i=nodejs" width="55" alt="Node.js"/></a>
<a href="https://expressjs.com/"><img src="https://skillicons.dev/icons?i=express" width="55" alt="Express"/></a>
<a href="https://www.typescriptlang.org/"><img src="https://skillicons.dev/icons?i=ts" width="55" alt="TypeScript"/></a>

<br/>
Node.js · Express 4 · TypeScript · REST API

### Database & Storage

<a href="https://www.mongodb.com/"><img src="https://skillicons.dev/icons?i=mongodb" width="55" alt="MongoDB"/></a>
<a href="https://supabase.com/"><img src="https://skillicons.dev/icons?i=supabase" width="55" alt="Supabase"/></a>

<br/>
MongoDB Atlas · Mongoose · Supabase Storage

### Security & Validation

<a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" height="28" alt="Zod"/></a>
<a href="https://helmetjs.github.io/"><img src="https://img.shields.io/badge/Helmet-000000?style=for-the-badge&logo=helmet&logoColor=white" height="28" alt="Helmet"/></a>

<br/>
Zod · Helmet · CORS · Session Authentication · CSRF Protection

### Deployment & Development

<a href="https://vercel.com/"><img src="https://skillicons.dev/icons?i=vercel" width="55" alt="Vercel"/></a>
<a href="https://render.com/"><img src="https://skillicons.dev/icons?i=git" width="55" alt="Git"/></a>
<a href="https://github.com/"><img src="https://skillicons.dev/icons?i=github" width="55" alt="GitHub"/></a>
<a href="https://www.npmjs.com/"><img src="https://skillicons.dev/icons?i=npm" width="55" alt="npm"/></a>

<br/>
Vercel · Render · Git · GitHub · npm Workspaces

</div>

## 🏗️ System Architecture

ApnaVault uses a monorepo architecture with separate frontend and backend workspaces.

```mermaid
flowchart TB
    U(["User / Browser"])

    subgraph FRONTEND["Frontend — Vercel"]
        UI["React 19 + TypeScript"]
        ROUTER["React Router"]
    end

    subgraph BACKEND["Backend — Render"]
        API["Express REST API"]
        SEC["Security Middleware"]
        CTRL["Controllers & Services"]
    end

    DB[("MongoDB Atlas")]
    STORAGE[("Supabase Storage<br/>Private Bucket")]

    U --> UI
    UI --> ROUTER
    ROUTER -->|"HTTPS + Credentials"| API
    API --> SEC
    SEC --> CTRL
    CTRL -->|"Application Data"| DB
    CTRL -->|"Document Operations"| STORAGE
```

### Architecture responsibilities

| Component | Responsibility |
|---|---|
| React frontend | User interface, navigation, and client-side state |
| Express API | Business logic, request handling, and API responses |
| Authentication middleware | Session validation and protected operations |
| MongoDB Atlas | Application records and document metadata |
| Supabase Storage | Document binary storage |
| Vercel | Frontend hosting |
| Render | Backend hosting |

## 🔄 Core Workflows

### Authentication

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as Express API
    participant DB as MongoDB

    User->>UI: Register or log in
    UI->>API: Submit credentials
    API->>API: Validate request and CSRF requirements
    API->>DB: Verify or create account
    DB-->>API: Account result
    API-->>UI: Response and session cookie
    UI->>API: Request protected resource
    API->>API: Validate session and authorization
    API-->>UI: Authorized response
```

### Document lifecycle

1. User selects a document.
2. The frontend submits the request to the backend.
3. The backend validates the session, request, file, and quota.
4. The server performs the storage operation.
5. Document metadata is persisted in MongoDB.
6. The frontend displays the operation result.

Downloads and deletions must also verify access on the backend. Storage paths and document IDs must not independently grant access.

## 📂 Project Structure

```text
ApnaVault/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── routes/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vercel.json
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── tests/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .env.example
├── package.json
└── README.md
```

*This is a representative structure; consult the repository for the complete current file inventory.*

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB Atlas or a suitable local replica set
- Supabase project with a private document bucket
- Git

### 1. Clone the repository

```bash
git clone https://github.com/altafshaikh7/ApnaVault.git
cd ApnaVault
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the backend

Copy the environment template.

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
```

Configure `server/.env` with the required database, session, and storage values. Never commit this file.

### 4. Configure the frontend

For local development, set the API base URL in the client environment configuration if required:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```

### 5. Start the application

Run both applications:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:server
npm run dev:client
```

| Service | Local URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:5000` |
| API health | `http://localhost:5000/api/v1/health` |

## ⚙️ Environment Variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `PORT` | Backend port; defaults to `5000` |
| `CLIENT_URL` | Allowed frontend origin |
| `FRONTEND_URL` | Frontend origin used by the backend |
| `SESSION_SECRET` | Session signing secret |
| `MONGODB_URI` | MongoDB connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase credential |
| `SUPABASE_STORAGE_AUTHORIZATION_JWT` | Existing legacy service-role JWT when required |
| `SUPABASE_BUCKET_NAME` | Private storage bucket name |
| `APP_STORAGE_QUOTA_BYTES` | Per-user storage quota; defaults to `996147200` |
| `VITE_API_URL` | Frontend API base URL |

Production requires explicit environment configuration, a unique session secret of at least 32 characters, HTTPS frontend origins, and server-only storage credentials.

**Never expose service-role credentials or session secrets in frontend variables.**

## 🛡️ Security Principles

- Session-based authentication for protected operations.
- CSRF protection for applicable browser requests.
- Secure production cookie settings.
- Explicit CORS origin configuration.
- Helmet security headers.
- Server-side request and environment validation.
- Private Supabase document bucket.
- Backend authorization for document and shared-resource access.
- Centralized operational error handling.
- No production secrets in Git.

The production frontend and backend use different hostnames. Cross-site cookies may be blocked by some browser privacy settings; a same-site custom-domain configuration is a more reliable long-term option.

## ☁️ Deployment

<div align="center">

<a href="https://vercel.com/">
<img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Frontend on Vercel"/>
</a>

<a href="https://render.com/">
<img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Backend on Render"/>
</a>

<a href="https://www.mongodb.com/atlas">
<img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas"/>
</a>

<a href="https://supabase.com/">
<img src="https://img.shields.io/badge/Storage-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase Storage"/>
</a>

</div>

### Production URLs

| Service | URL |
|---|---|
| Web application | https://apna-vault-pprl.vercel.app |
| Backend API | https://apnavault.onrender.com |
| Health endpoint | https://apnavault.onrender.com/api/v1/health |

### Vercel frontend

- Set the project root directory to `client`.
- Use the Vite build configuration.
- Set the output directory to `dist`.
- Configure `VITE_API_URL` to the production API base URL.
- Ensure `client/vercel.json` supports client-side route refreshes.

### Render backend

Build command:

```bash
npm install --include=dev && npm run build --workspace=server
```

Start command:

```bash
npm run start --workspace=server
```

Health check path:

```text
/api/v1/health
```

Configure `NODE_ENV=production` and all required backend environment variables in the Render dashboard.

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client and server |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build both workspaces |
| `npm run build:client` | Build frontend |
| `npm run build:server` | Build backend |
| `npm run type-check` | Type-check workspaces |
| `npm run type-check:client` | Type-check frontend |
| `npm run type-check:server` | Type-check backend |
| `npm run test:integration:supabase` | Run configured live Storage smoke test |

Run scripts from the repository root. Check `package.json` for the authoritative list of available scripts.

## ✅ Production Verification Checklist

- [ ] Frontend and backend builds pass.
- [ ] Health endpoint reports a connected database.
- [ ] Registration, login, and logout work.
- [ ] Authentication persists correctly after refresh.
- [ ] Protected routes load directly.
- [ ] CSRF and CORS behave correctly.
- [ ] Document upload, download, and deletion work with real storage.
- [ ] Storage quota and access permissions are enforced.
- [ ] Family invitations and sharing are tested.
- [ ] Reminder and notification workflows are tested.
- [ ] Production secrets remain server-side.

A successful deployment does not, by itself, establish that every application feature has passed production testing.

## 🗺️ Roadmap

- [ ] Complete end-to-end verification of document operations.
- [ ] Strengthen regression tests for authentication and storage.
- [ ] Verify family invitation and sharing permissions.
- [ ] Verify reminder scheduling and notifications.
- [ ] Improve operational monitoring and failure recovery.
- [ ] Consider same-site custom domains for authentication reliability.

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a focused feature branch.
3. Implement and test your changes.
4. Review the diff for unintended changes and secrets.
5. Submit a pull request with a clear description.

## 📄 License

No license is specified here yet. Add a `LICENSE` file when the project's intended license is decided.

---

<div align="center">

### ApnaVault

**Your Family. Every Important Document. One Safe Place.**

Built to make family document management simpler and more organized.

<br/>

<a href="https://github.com/altafshaikh7/ApnaVault">
<img src="https://img.shields.io/badge/Explore%20Repository-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="Explore ApnaVault on GitHub"/>
</a>

</div>