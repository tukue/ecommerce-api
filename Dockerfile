FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5004

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

CMD ["node", "server.js"]
