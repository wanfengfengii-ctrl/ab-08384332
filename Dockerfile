# syntax=docker/dockerfile:1
# 多阶段构建：builder 产出静态站点与求解器验收包；
# web 为最终静态 Web 镜像（含健康检查）；verify 为可执行验收服务。

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run typecheck && npm run build && npm run build:solver

# ---- 可执行验收服务（docker compose 服务名：verify）----
FROM node:20-alpine AS verify
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/verify/solver.bundle.cjs ./verify/solver.bundle.cjs
COPY verify/run.mjs ./verify/run.mjs
CMD ["node", "verify/run.mjs"]

# ---- 静态 Web（nginx，含健康检查）----
FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
