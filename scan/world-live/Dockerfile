FROM node:22-bookworm-slim
WORKDIR /app
COPY world-live/package.json world-live/package-lock.json ./
RUN npm install --omit=dev
COPY lib ./lib
COPY world-live ./world-live
ENV WORLD_LIVE_WORKER=1
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npx", "tsx", "world-live/server.ts"]
