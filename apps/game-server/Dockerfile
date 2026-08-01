FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/game-server ./apps/game-server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ra4/game-server build

EXPOSE 8080

USER node

CMD ["node", "apps/game-server/dist/index.js"]
