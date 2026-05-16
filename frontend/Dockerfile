# Frontend Dockerfile - React + Vite with hot reload for development
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Cache node_modules outside /app so the bind mount can't shadow it.
# The CMD restores from here in ~10s if the named volume is empty (e.g. after
# a mode switch from prod), instead of running a full npm install (~2 min).
RUN cp -r node_modules /opt/node_modules_cache

COPY . .

EXPOSE 5173

HEALTHCHECK --interval=5s --timeout=5s --start-period=15s --retries=10 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5173 || exit 1

# On startup:
#   1. If node_modules is empty (fresh volume), restore from cache (~10s, no network)
#   2. Run npm install (no-op if packages unchanged, catches new deps after --build)
#   3. Start Vite
CMD ["sh", "-c", "\
  if [ ! -f /app/node_modules/.bin/vite ]; then \
    echo '[aida] Restoring node_modules from cache...'; \
    cp -r /opt/node_modules_cache/. /app/node_modules/; \
  fi; \
  npm run dev -- --host 0.0.0.0"]
