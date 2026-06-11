FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY mock_server.js ./
COPY fifa_2026_fixtures.json ./
COPY fifa_2026_standings.json ./

EXPOSE 3000

CMD ["node", "mock_server.js"]
