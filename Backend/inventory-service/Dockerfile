FROM node:22-alpine
WORKDIR /app
COPY inventory-service/package*.json ./
RUN npm install --omit=dev
COPY inventory-service/src/ ./src/
COPY shared/ ./shared/
EXPOSE 8082
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://localhost:8082/health || exit 1
USER node
CMD ["node", "src/index.js"]
