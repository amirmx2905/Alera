# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Inject env vars at build time (Expo bakes EXPO_PUBLIC_* into the JS bundle)
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_AI_FUNCTION
ARG EXPO_PUBLIC_METRICS_FUNCTION

# Build Expo for web → outputs to /app/dist
RUN npx expo export --platform web

# ── Stage 2: Serve ──────────────────────────────────────────────
FROM nginx:stable-alpine AS production

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy the web build from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
