# One image, two containers. Coolify runs it twice with different APP_ROLE values.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && cp -R node_modules /prod_modules
RUN npm install --ignore-scripts

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts/copy-sql.mjs ./scripts/copy-sql.mjs
# tsc alone skips the .sql files the worker reads at startup (rollup.sql); the build
# script copies them into dist/.
RUN npm run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /prod_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
# The api role's port (PORT defaults to 3000). Lets Coolify detect it; the worker
# role listens on nothing and ignores it.
EXPOSE 3000
CMD ["node", "dist/main.js"]
