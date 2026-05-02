# APIAutopsy

APIAutopsy is a production-ready MVP for API testing and automated API monitoring. It combines the core workflow of Postman with scheduled monitoring inspired by APImetrics.

## Project Overview

APIAutopsy lets teams create workspaces, organize API collections, execute requests, inspect responses, schedule recurring checks, and review execution history. The backend is a secure modular monolith, and the frontend is a Postman-like React workspace designed for developers and non-technical users.

## Features

- API Testing: method/url builder, params, headers, body modes, auth, response body, response headers, status, latency.
- Collections: workspace-scoped collections with saved API requests.
- Scheduler: separate monitoring dashboard with interval and cron schedules.
- Reports: persisted execution history, success rate, latency, failures.
- Google Login: OAuth2 entrypoint plus email/password fallback.
- Security: JWT auth, AES-GCM encrypted secrets, SSRF protection, Redis rate limiting.
- Certificates: encrypted SSL/client certificate storage.

## Tech Stack

- Backend: Java 21, Spring Boot 3, Spring Security, PostgreSQL, Redis, Flyway, Spring Scheduler, Docker.
- Frontend: React, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query.
- CI/CD: GitHub Actions.
- Free deployment: Render for backend, Vercel for frontend.

## Project Structure

```text
backend/              Spring Boot API
frontend/             React Vite app
infra/                Docker Compose
docs/                 Deployment and design documentation
samples/              Sample API collection JSON
.github/workflows/   CI/CD workflows
```

## Local Setup

Start backend dependencies and API:

```bash
cd infra
docker compose up --build
```

Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Default local test user:

```text
founder@apiautopsy.com
ChangeMe123!
```

## Environment Variables

Backend:

```text
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
REDIS_HOST
REDIS_PORT
JWT_SECRET
CRYPTO_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
CORS_ALLOWED_ORIGINS
```

Frontend:

```text
VITE_API_URL
VITE_API_BASE
```

## Deployment Guide

Detailed deployment steps are in [docs/deployment.md](docs/deployment.md).

Summary:

1. Push repo to GitHub as `apiautopsy`.
2. Connect backend to Render using `render.yaml` or Docker service settings.
3. Connect frontend to Vercel using `frontend/vercel.json`.
4. Add GitHub secrets:

```text
RENDER_DEPLOY_HOOK_URL
VERCEL_DEPLOY_HOOK_URL
```

5. Configure DNS:

```text
apiautopsy.com      -> Vercel
www.apiautopsy.com  -> Vercel CNAME
api.apiautopsy.com  -> Render custom domain
```

## CI/CD

Main workflow:

```text
.github/workflows/deploy.yml
```

It builds and tests the backend, builds the Docker image, installs/builds the frontend, and can trigger Render/Vercel deploy hooks on `main`.

## Screenshots

Add screenshots after deployment:

```text
docs/screenshots/api-lab.png
docs/screenshots/scheduler.png
docs/screenshots/settings.png
```

## Figma Design System

Figma-ready design specification:

```text
docs/figma-design-system.md
```

Includes dashboard layout, scheduler page, settings page, design tokens, typography, and component rules.
