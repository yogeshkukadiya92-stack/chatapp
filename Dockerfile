FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
COPY mobile/package.json ./mobile/package.json

RUN npm install --include-workspace-root --workspace server --workspace client

COPY server ./server
COPY client ./client

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
COPY mobile/package.json ./mobile/package.json

RUN npm install --omit=dev --include-workspace-root --workspace server

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["npm", "start"]
