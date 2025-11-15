FROM node:24.5

# corepack enable ensures pnpm is available and version-controlled.
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 8001
EXPOSE 8080

CMD ["pnpm", "start"]