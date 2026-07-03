# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first to maximise layer caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

# Only production deps and the built output ship in the final image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist

# Run as the unprivileged user provided by the base image
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
