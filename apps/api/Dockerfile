# Development image
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
RUN npm install
WORKDIR /app/apps/api
CMD ["npm", "run", "dev"]

# Production build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm install && npm run build --workspace packages/shared && npm run build:api

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
RUN npm install --omit=dev
CMD ["node", "dist/index.js"]
