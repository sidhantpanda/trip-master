# Development image
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
COPY apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html ./apps/web/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
RUN npm install
WORKDIR /app/apps/web
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Production build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN npm install && npm run build --workspace packages/shared && npm run build:web

FROM nginx:1.27-alpine AS prod
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/apps/web/dist .
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
