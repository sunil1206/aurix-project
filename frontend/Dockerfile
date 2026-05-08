# ============================================================
# Aurix Frontend - Dev container
#
# Runs the Vite dev server with HMR. The source is bind-mounted
# from the host (see docker-compose.yml), so edits hot-reload.
# Node modules live INSIDE the container to avoid host/guest
# binary mismatches (esbuild, sharp, etc.).
# ============================================================
FROM node:20-alpine

ENV NODE_ENV=development
WORKDIR /app

# Install deps as a separate layer so code edits don't bust the cache.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Source comes from the bind mount; this COPY just seeds the image
# so it can run without the mount (e.g. CI smoke tests).
COPY . .

EXPOSE 5173

# --host 0.0.0.0 makes Vite reachable from the docker network.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
