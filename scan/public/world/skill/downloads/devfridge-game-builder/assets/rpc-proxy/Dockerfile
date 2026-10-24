# Pinned tested Node release. Re-test and pin a reviewed patch/digest when updating.
FROM node:24.18.0-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json server.mjs policy.mjs ./
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["node", "--input-type=module", "-e", "const r=await fetch('http://127.0.0.1:8787/healthz',{signal:AbortSignal.timeout(2000)});if(!r.ok)process.exit(1)"]
CMD ["node", "server.mjs"]
