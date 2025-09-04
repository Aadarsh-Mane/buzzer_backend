# auth-service/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
# Faster + reproducible installs; omit dev deps in prod
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=6003           # <— set the service's PORT here

# (Optional) run as non-root
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 6003

# Healthcheck expects /health to respond 200
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD node -e "require('http').get('http://localhost:6003/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node","index.js"]
