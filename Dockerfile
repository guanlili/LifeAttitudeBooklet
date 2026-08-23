FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/
RUN npm ci && npm ci --prefix client && npm ci --prefix server

COPY . .
RUN npm --prefix client run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/server /app/server
COPY --from=builder /app/server/node_modules /app/server/node_modules
COPY --from=builder /app/client/dist /app/client/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 3000
VOLUME /app/server/data
CMD ["npm", "--prefix", "server", "run", "start"]