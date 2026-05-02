# APIAutopsy Deployment Guide

## Free-Tier Target Architecture

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL free tier or Railway PostgreSQL free trial/free allocation
- Redis: Upstash Redis free tier or Render Redis if available in your account
- Domain: GoDaddy DNS

## GitHub

```bash
git checkout -b dev
git checkout main
git remote add origin git@github.com:<your-org-or-user>/apiautopsy.git
git push -u origin main
git push -u origin dev
```

## Render Backend

1. Create a new Render Web Service from the GitHub repo.
2. Select Docker runtime.
3. Dockerfile path: `backend/Dockerfile`.
4. Set health check path: `/actuator/health`.
5. Add environment variables:

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
CORS_ALLOWED_ORIGINS=https://apiautopsy.com,https://www.apiautopsy.com
```

6. Optional: copy the Render deploy hook URL into GitHub secret `RENDER_DEPLOY_HOOK_URL`.

## Vercel Frontend

1. Import the GitHub repo into Vercel.
2. Root directory: `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variable:

```text
VITE_API_URL=https://api.apiautopsy.com/api
VITE_API_BASE=https://api.apiautopsy.com
```

6. Optional: copy the Vercel deploy hook URL into GitHub secret `VERCEL_DEPLOY_HOOK_URL`.

## GoDaddy DNS

In Vercel, add:

```text
apiautopsy.com
www.apiautopsy.com
```

In GoDaddy DNS:

```text
Type: A
Host: @
Value: 76.76.21.21

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

For backend:

```text
Type: CNAME
Host: api
Value: <your-render-service-hostname>
```

Then add `api.apiautopsy.com` as a custom domain in Render.
