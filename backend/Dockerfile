FROM node:24.18.0-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN DATABASE_URL=postgresql://build@localhost/build pnpm exec prisma generate \
  && mkdir -p media recordings && chown node:node media recordings

USER node
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && exec node src/main.ts"]
