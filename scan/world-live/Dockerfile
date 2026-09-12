FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY lib ./lib
COPY world-live ./world-live
COPY tsconfig.json ./
ENV WORLD_LIVE_WORKER=1
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npx", "tsx", "world-live/server.ts"]
