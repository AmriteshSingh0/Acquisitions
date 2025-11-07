# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project type: Node.js (ESM) Express API with Drizzle ORM (PostgreSQL), Winston logging, Zod validation, and Arcjet middleware.

Commands
- Install deps
  - npm install
- Start (development)
  - npm run dev
- Start (production)
  - Set environment and run the entrypoint:
    - PowerShell: $env:NODE_ENV = 'production'; node src/index.js
    - bash/zsh: NODE_ENV=production node src/index.js
- Lint/format
  - Lint: npm run lint
  - Lint (fix): npm run lint:fix
  - Format (write): npm run format
  - Format (check): npm run format:check
- Database (Drizzle)
  - Generation (from models in src/models/*.js):
    - PowerShell: $env:NODE_ENV = 'development'; npm run db:generate
  - Apply migrations:
    - PowerShell: $env:NODE_ENV = 'development'; npm run db:migrate
  - Studio: npm run db:studio

Notes:
- Drizzle reads DATABASE_URL from .env.{NODE_ENV}. Ensure the matching file exists (e.g., .env.development) before running db:* scripts. The runtime also loads .env via dotenv; if both are present, values from .env.{NODE_ENV} should be set for Drizzle.
- No test runner is configured (no tests/, no test script). If you add Jest/Vitest later, update this file with how to run all tests and a single test.

High-level architecture
- Entry
  - src/index.js loads environment via dotenv/config, then imports src/server.js, which starts the HTTP server on PORT (default 3000).
- HTTP app
  - src/app.js constructs the Express app with helmet, cors, JSON/urlencoded parsers, cookie-parser, morgan (HTTP access logs) wired into Winston (src/config/logger.js). It mounts:
    - Security middleware (src/middleware/security.middleware.js) powered by Arcjet (src/config/arcjet.js) for basic bot detection and sliding-window rate limiting.
    - Routes: / (root), /health, /api, and feature routers, including /api/auth (src/routes/auth.routes.js).
- Auth flow
  - Routes (src/routes/auth.routes.js) → Controllers (src/controllers/auth.controller.js) perform Zod validation (src/validations/auth.validation.js), delegate to Services (src/services/auth.service.js), set JWT using utils/jwt.js and HTTP-only cookies via utils/cookies.js, and log via Winston.
- Data layer
  - PostgreSQL via Drizzle ORM. Schema in src/models/user.model.js. Connection factory in src/config/database.js selects driver by NODE_ENV:
    - development: node-postgres (pg Pool) (expects DATABASE_URL suitable for local TCP, e.g., via a local proxy)
    - production: @neondatabase/serverless + drizzle-orm/neon-http
- Logging
  - Winston JSON logs to files (combined.log, error.log) and colorized console in non-production. HTTP access logs flow from morgan → Winston.
- Module resolution
  - ESM with package.json "type": "module" and Node import aliases via package.json "imports" (e.g., #config/*, #services/*). Use these #aliases for cross-module imports.

Environment
- Expected variables (commonly used across the app):
  - DATABASE_URL (required for Drizzle and DB access)
  - JWT_SECRET (JWT signing/verification)
  - ARCJET_KEY (Arcjet middleware)
  - NODE_ENV (development/production)
  - PORT (optional, defaults to 3000)
  - LOG_LEVEL (optional, defaults to info)

Notable gaps and footguns (to address when modifying code)
- Missing file: src/routes/user.routes.js is imported by src/app.js but not present in the repo. Either add it or remove the import/mount.
- Auth error message mismatch: auth.controller.js checks for e.message === 'User with this email already exists', but auth.service.js throws 'User already exists'. This prevents the controller from returning 409 and will fall through to generic error handling.
- Security middleware (src/middleware/security.middleware.js) evaluates decision.isDenied() three times in a row; the first matching branch will short-circuit, making later branches unreachable. This likely needs consolidated logic that distinguishes reason.isBot(), reason.isShield(), and reason.isRateLimit() from a single decision.
- ESLint line endings: eslint.config.js enforces 'linebreak-style' unix. On Windows checkouts, this may cause failures unless Git normalizes line endings. Consider setting core.autocrlf=input and/or .gitattributes to enforce LF, or relax the rule for local development.
- Script reference: scripts/dev.sh is referenced by npm run dev:docker but is not present in the repo.

Drizzle migration model
- drizzle.config.js: schema: src/models/*.js; out dir: drizzle/. Use db:generate to create SQL from model changes, then db:migrate to apply.

Health checks and basic endpoints
- GET /health returns JSON status and uptime.
- GET /api returns a basic running message. Auth endpoints are under /api/auth.
