FROM node:24-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3000
ENV DB_PATH=/app/data/citas.db

VOLUME /app/data

EXPOSE 3000

CMD ["node", "server.js"]