FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 DISPUTES_FILE=/app/storage/disputes.json
WORKDIR /app
COPY --chown=node:node package.json server.js healthcheck.js ./
COPY --chown=node:node public ./public
COPY --chown=node:node data/papers ./data/papers
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node healthcheck.js
CMD ["node", "server.js"]
