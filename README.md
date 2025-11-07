# Dockerizing the app with Neon (Local for dev, Cloud for prod)

This setup gives you a single Dockerfile with two Compose files:
- docker-compose.dev.yml runs the app + Neon Local (ephemeral branches) for development
- docker-compose.prod.yml runs only the app and connects to Neon Cloud via DATABASE_URL

## Prerequisites
- Docker Desktop + Docker Compose v2
- Neon account + API key and Project ID
- A parent branch ID if you want ephemeral branches (recommended)

## Files added
- Dockerfile — multi-stage (development and production targets)
- docker-compose.dev.yml — app + Neon Local proxy
- docker-compose.prod.yml — app only; use Neon Cloud DATABASE_URL
- .env.development — dev variables (Neon Local + app)
- .env.production — prod variables (Neon Cloud + app)
- .dockerignore — trims build context

Your code already uses @neondatabase/serverless via drizzle. For development, the app is configured to detect NEON_LOCAL_URL and route serverless HTTP requests to Neon Local automatically.

## Environment variables

Switching environments is done by choosing the compose file and env file:
- Development: .env.development (Neon Local)
- Production: .env.production (Neon Cloud)

Important:
- Never commit real secrets; the sample files use placeholders like {{NEON_API_KEY}}.
- DATABASE_URL must be set via env files (not hardcoded).

## Development (Neon Local)

1) Fill .env.development
```
NEON_API_KEY={{NEON_API_KEY}}
NEON_PROJECT_ID={{NEON_PROJECT_ID}}
PARENT_BRANCH_ID={{PARENT_BRANCH_ID}}   # e.g. parent branch to fork from
DATABASE_URL=postgres://neon:npg@neon-local:5432/neondb
NEON_LOCAL_URL=http://neon-local:5432
PORT=3000
```

2) Start dev stack (app + Neon Local)
```
docker compose -f docker-compose.dev.yml --env-file .env.development up --build
```

- App: http://localhost:3000
- DB (inside compose network): postgres://neon:npg@neon-local:5432/neondb
- Neon Local will create an ephemeral branch when the container starts and delete it when it stops.

3) (Optional) Run migrations in the running app container
```
docker compose -f docker-compose.dev.yml exec app npm run db:migrate
```

Notes:
- If you want a persistent branch per Git branch, uncomment the volumes under neon-local in docker-compose.dev.yml and ensure .neon_local/ is in .gitignore.
- If you use websockets with the serverless driver, Neon Local requires HTTP-only; the code is configured for HTTP via NEON_LOCAL_URL.

## Production (Neon Cloud)

1) Fill .env.production
```
DATABASE_URL=postgresql://<user>:<password>@<project>-pooler.<region>.neon.tech/<database>?sslmode=require
ARCJET_KEY={{ARCJET_KEY_PROD}}
PORT=3000
```

2) Start prod stack (app only; Neon Cloud is external)
```
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

- App: http://localhost:3000
- No Neon Local proxy is used in production.

## How the switch works
- docker-compose.dev.yml loads .env.development and sets NEON_LOCAL_URL so the serverless driver talks to Neon Local.
- docker-compose.prod.yml loads .env.production with your Neon Cloud DATABASE_URL.

## Troubleshooting
- Connection errors in dev: verify NEON_API_KEY, NEON_PROJECT_ID, and (if used) PARENT_BRANCH_ID are correct; ensure ports 5432 and 3000 are free.
- SSL issues in dev: Neon Local uses a self-signed cert but the serverless driver uses HTTP-only when NEON_LOCAL_URL is set, as configured.
- Windows bind mounts: If you see file change delays, restarting containers can help; you can also drop the bind mount and rebuild for changes.
