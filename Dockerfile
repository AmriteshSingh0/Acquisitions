# syntax=docker/dockerfile:1

# Base image for both dev and prod
FROM node:20-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install dependencies based on the lockfile
COPY package*.json ./

# Development image
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production image
FROM base AS production
# Only install production deps
RUN npm ci --omit=dev
COPY . .
# Run as non-root user
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
