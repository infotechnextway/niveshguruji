# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
COPY scripts ./scripts
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production TZ=Asia/Kolkata
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER app
# APP_PROCESS selects which process this container runs: api | engine
CMD ["sh", "-c", "node dist/apps/${APP_PROCESS:-api}/apps/${APP_PROCESS:-api}/src/main.js"]
