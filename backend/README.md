# 🚀 Task Manager API — Backend

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2025-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v5.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![pnpm](https://img.shields.io/badge/Maintained%20with-pnpm-F69220?style=flat&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A robust, enterprise-grade, and scalable RESTful API built with **Express 5**, **TypeScript**, and **MongoDB**. Designed following clean architecture principles, modular layering (Controller-Service-Repository), and strict type-safety.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Path Aliases](#-path-aliases)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the Application](#running-the-application)
- [API Endpoints](#-api-endpoints)
- [Upcoming Features & Roadmap](#-upcoming-features--roadmap)
- [Scripts](#-scripts)

---

## 🏛 Architectural Overview

This backend is architected using **Modular Monolith** and **3-Tier Layered Architecture** principles to ensure high maintainability, testability, and scalability:

```
[ HTTP Request ]
       │
       ▼
┌──────────────────┐
│   Routes Layer   │  ──> Route declarations, path routing & middleware bindings
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Controller Layer │  ──> Request validation, status code assignment & HTTP response formatting
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Service Layer   │  ──> Core business logic, domain rules, hashing & tokens
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Repository Layer │  ──> Direct database interaction & query abstraction (Mongoose)
└──────────────────┘
       │
       ▼
[ MongoDB Database ]
```

---

## 🛠 Tech Stack

| Technology | Purpose | Description |
| :--- | :--- | :--- |
| **Node.js** | Runtime Environment | High-performance asynchronous event-driven JavaScript runtime |
| **TypeScript** | Language | Strictly typed superset with `ES2025` target & `NodeNext` module resolution |
| **Express 5** | HTTP Framework | Modern, lightweight web server framework with native async error handling |
| **MongoDB & Mongoose** | Database & ODM | Schema-based data modeling and document database |
| **Zod** | Validation | TypeScript-first schema declaration and runtime data validation |
| **Pino & Pino-HTTP** | Logging | Extremely fast, structured JSON logger |
| **TSX** | Development Runner | TypeScript Execute and watch engine with zero-config ES modules support |

---

## 📂 Project Directory Structure

```text
backend/
├── src/
│   ├── app.ts                 # Express application initialization & middleware setup
│   ├── config/                # Global configuration & environment setup
│   │   ├── db.ts              # MongoDB connection lifecycle management
│   │   └── env.ts             # Strictly validated environment variables
│   ├── middlewares/           # Global & reusable middleware (Auth, Errors, Logging)
│   ├── modules/               # Feature-based domain modules
│   │   └── auth/              # Authentication & Authorization Module
│   │       ├── auth.controller.ts   # Handles incoming HTTP requests & responses
│   │       ├── auth.service.ts      # Core authentication business logic
│   │       ├── auth.repository.ts   # Database operations for authentication
│   │       └── auth.route.ts        # Route definitions for auth endpoints
│   ├── routes/                # Central route aggregation
│   │   └── index.ts           # Root API v1 router
│   ├── shared/                # Shared utilities, constants, and lifecycle hooks
│   ├── types/                 # Global TypeScript declarations & interface extensions
│   └── utils/                 # Utility helper functions (Logger, HTTP wrappers)
├── server.ts                  # Application entry point & server bootstrap
├── example.env                # Template for environment variables
├── package.json               # Dependencies and execution scripts
├── pnpm-lock.yaml             # Lockfile for reproducible installs
└── tsconfig.json              # TypeScript compiler configurations & path mappings
```

---

## 🔗 Path Aliases

To avoid fragile relative imports (like `../../../../`), clean path aliases are pre-configured:

| Alias | Target Path | Description |
| :--- | :--- | :--- |
| `@app` | `./src/app.ts` | Express application instance |
| `@modules/*` | `./src/modules/*` | Feature modules (e.g. auth, tasks) |
| `@config/*` | `./src/config/*` | Configuration and database setup |
| `@routes/*` | `./src/routes/*` | Route definitions |
| `@middlewares/*` | `./src/middlewares/*` | Global middlewares |
| `@shared/*` | `./src/shared/*` | Shared entities and lifecycle |
| `@utils/*` | `./src/utils/*` | Global utility helpers |
| `@dts/*` | `./src/types/*` | Custom TypeScript types |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local environment:
- **Node.js**: `v20.x` or higher (Recommended: `v22+` / `v24+`)
- **pnpm**: `v9.x` or higher (`npm install -g pnpm`)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection URI

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Environment Configuration

Create a `.env` file in the root of the `backend/` directory by copying `example.env`:

```bash
cp example.env .env
```

Configure your environment variables:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/task_manager

# Security & Tokens
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
```

### Running the Application

- **Development Mode (with Hot Reload):**
  ```bash
  pnpm dev
  ```
  The API will start at: `http://localhost:3000`

- **Build for Production:**
  ```bash
  pnpm build
  ```

---

## 📡 API Endpoints

### Base URL: `/api/v1`

#### 🔐 Authentication Module (`/auth`)

| Method | Endpoint | Description | Access | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user | Public | 🟡 In Progress |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue tokens | Public | ⚪ Planned |
| `POST` | `/api/v1/auth/refresh` | Refresh expired access token | Public | ⚪ Planned |
| `POST` | `/api/v1/auth/logout` | Invalidate user session | Private | ⚪ Planned |

---

## 🗺 Upcoming Features & Roadmap

- [x] Modular Architecture setup
- [x] Express 5 & TypeScript (ES2025/NodeNext) configuration
- [ ] Complete Authentication & RBAC (Role-Based Access Control)
- [ ] Task Management CRUD (Projects, Tasks, Subtasks)
- [ ] Task Assignment & Priority Statuses (Todo, In-Progress, Completed)
- [ ] Input Validation with Zod middleware
- [ ] Centralized Global Error Handler Middleware
- [ ] Automated Tests (Vitest / Supertest)

---

## 📜 Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `pnpm dev` | `tsx --env-file=.env --watch server.ts` | Runs the server in watch mode with automatic restarts on changes |
| `pnpm build` | `tsc` | Compiles TypeScript source files into JavaScript in `./dist` |

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
